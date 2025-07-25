import { Request, Response } from "express";
import * as firebaseService from "../../services/firebase.service";
import * as exportService from "../../services/export.service";

/**
 * Controller to get the status of all bundle counters.
 * This is an admin-only operation.
 */
export const getBundleCountersStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const counters = await firebaseService.getBundleCountersFromDB();

    if (!counters) {
      return res
        .status(404)
        .json({ message: "No bundle counters found in the database." });
    }

    return res.status(200).json(counters);
  } catch (error: any) {
    console.error("Error fetching bundle counters:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetUserProgress = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { userId, taluka } = req.body;

    if (!userId || !taluka) {
      return res
        .status(400)
        .json({ message: 'Bad Request: "userId" and "taluka" are required.' });
    }

    const recycledBundleNo = await firebaseService.resetUserProgressInDB(
      userId,
      taluka
    );

    return res.status(200).json({
      message: `Successfully reset progress for user ${userId} in ${taluka}. Bundle #${recycledBundleNo} has been recycled.`,
    });
  } catch (error: any) {
    if (
      error.message.includes("No active bundle found") ||
      error.message.includes("not found")
    ) {
      return res.status(404).json({ message: error.message });
    }
    console.error("Error resetting user progress:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to manually mark a bundle as complete.
 * This is an admin-only operation.
 */
export const forceCompleteBundle = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { userId, taluka, bundleNo } = req.body;

    if (!userId || !taluka || !bundleNo) {
      return res
        .status(400)
        .json({
          message:
            'Bad Request: "userId", "taluka", and "bundleNo" are required.',
        });
    }

    // The service needs the location, which we can get from the user's profile.
    const user = await firebaseService.getUserFromDB(userId);
    if (!user) {
      return res
        .status(404)
        .json({ message: `User with ID ${userId} not found.` });
    }

    await firebaseService.forceCompleteBundleInDB(
      userId,
      user.location,
      taluka,
      bundleNo
    );

    return res.status(200).json({
      message: `Successfully marked bundle #${bundleNo} in ${taluka} as complete.`,
    });
  } catch (error: any) {
    console.error("Error force-completing bundle:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to manually assign a specific bundle to a user.
 * This is an admin-only operation.
 */
export const manualAssignBundle = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { userId, taluka, bundleNo } = req.body;

    if (!userId || !taluka || !bundleNo) {
      return res
        .status(400)
        .json({
          message:
            'Bad Request: "userId", "taluka", and "bundleNo" are required.',
        });
    }

    const assignedBundle = await firebaseService.manualAssignBundleToUserInDB(
      userId,
      taluka,
      bundleNo
    );

    return res.status(200).json({
      message: `Successfully assigned bundle #${assignedBundle.bundleNo} to user ${userId} for ${taluka}.`,
      bundle: assignedBundle,
    });
  } catch (error: any) {
    console.error("Error manually assigning bundle:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to export all processed records for a location as an Excel file.
 * This is an admin-only operation.
 */
export const exportProcessedData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { location } = req.params;
    if (!location) {
      res
        .status(400)
        .json({ message: 'Bad Request: "location" parameter is required.' });
      return;
    }

    // Fetch all necessary data in parallel.
    const [records, users] = await Promise.all([
      firebaseService.getProcessedRecordsByLocationFromDB(location),
      firebaseService.getAllUsersFromDB(),
    ]);

    if (records.length === 0) {
      res
        .status(404)
        .json({
          message: `No processed records found for location: ${location}`,
        });
      return;
    }

    // Generate the Excel file buffer using the export service.
    const fileBuffer = await exportService.generateProcessedRecordsExcel(
      records,
      users
    );

    // Set the response headers to trigger a file download.
    const fileName = `${location}-processed-records-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    // Send the file buffer as the response.
    res.send(fileBuffer);
  } catch (error: any) {
    console.error("Error exporting processed data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * [DANGER ZONE] Controller to reset all processed data in the system.
 */
export const resetAllProcessedData = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    await firebaseService.resetAllProcessedDataInDB();
    return res
      .status(200)
      .json({
        message:
          "DANGER ZONE: All processed data has been permanently deleted.",
      });
  } catch (error: any) {
    console.error("Error resetting all processed data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * [DANGER ZONE] Controller to reset all bundle counters and user states.
 */
export const resetAllCounters = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    await firebaseService.resetAllCountersInDB();
    return res
      .status(200)
      .json({
        message:
          "DANGER ZONE: All bundle counters and user states have been reset.",
      });
  } catch (error: any) {
    console.error("Error resetting all counters:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * NEW: Controller to get the summary statistics for the dashboard.
 */

export const getDashboardSummary = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const summary = await firebaseService.getDashboardSummaryFromDB();
    return res.status(200).json(summary);
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to get all aggregated data for the Analytics page.
 */
export const getAnalyticsPageData = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // Extract optional filters for the bundle summary from query params
    const filters = {
      location: req.query.location as string | undefined,
      taluka: req.query.taluka as string | undefined,
    };

    const analyticsData = await firebaseService.getAnalyticsDataFromDB(filters);
    return res.status(200).json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics page data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



/**
 * Controller to search for a single processed record by its "Search from" ID.
 */
export const searchRecordById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    // Use a more descriptive query param name
    const { searchFromId } = req.query;
    if (!searchFromId) {
      return res
        .status(400)
        .json({
          message: 'Bad Request: "searchFromId" query parameter is required.',
        });
    }

    const record = await firebaseService.searchProcessedRecordBySearchFromId(
      searchFromId as string
    );

    if (!record) {
      return res
        .status(404)
        .json({
          message: `Record with "Search from" ID "${searchFromId}" not found.`,
        });
    }

    return res.status(200).json(record);
  } catch (error) {
    console.error("Error searching record by ID:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



/**
 * Controller to mark an incomplete bundle as complete.
 */
export const markIncompleteAsComplete = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { userId, taluka } = req.body;
    if (!userId || !taluka) {
      return res
        .status(400)
        .json({ message: 'Bad Request: "userId" and "taluka" are required.' });
    }
    await firebaseService.clearUserActiveBundleInDB(userId, taluka);
    return res
      .status(200)
      .json({
        message: `Successfully cleared active bundle for user ${userId} in ${taluka}.`,
      });
  } catch (error: any) {
    if (error.message.includes("no active bundle")) {
      return res.status(404).json({ message: error.message });
    }
    console.error("Error marking incomplete bundle as complete:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
