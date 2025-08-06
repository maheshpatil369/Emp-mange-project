import { Request, Response } from "express";
import ExcelJS from "exceljs";
import * as firebaseService from "../../services/firebase.service";
import { Readable } from "stream";

/**
 * Controller to handle large Excel file uploads in batches.
 * It parses the file, creates a metadata record, and then uploads the content
 * in smaller chunks to avoid hitting Firebase's write size limits.
 */
export const uploadFile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Bad Request: No file uploaded." });
    }

    const location = req.params.location;
    const BATCH_SIZE = 20000; // You can adjust this size as needed

    // 1. Create the metadata record first to get a fileId
    const fileMetadata = {
      name: req.file.originalname,
      size: req.file.size,
      location: location,
      uploadDate: new Date().toISOString(),
    };

    const fileId = await firebaseService.createFileMetadataInDB(
      location as string,
      fileMetadata
    );

    // 2. Parse the entire Excel file into an in-memory array
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(req.file.buffer);
    await workbook.xlsx.read(stream);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res
        .status(400)
        .json({ message: "Bad Request: No worksheet found in the file." });
    }

    const headers = (worksheet.getRow(1).values as string[]).filter(Boolean);
    const allRows: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Skip header row
        const rowData: { [key: string]: any } = {};
        const values = row.values as any[];
        headers.forEach((header, index) => {
          const cellValue = values[index + 1];
          rowData[header] =
            cellValue !== undefined && cellValue !== null ? cellValue : null;
        });

        if (Object.values(rowData).some((v) => v !== null)) {
          allRows.push(rowData);
        }
      }
    });

    // 3. Upload the data in batches
    const uploadPromises = [];
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      // Add the promise for this batch upload to our array
      uploadPromises.push(
        firebaseService.saveContentBatchToDB(location as string, fileId, batch)
      );
    }

    // Wait for all batch uploads to complete
    await Promise.all(uploadPromises);

    return res.status(201).json({
      message: `File uploaded successfully for ${location}.`,
      fileId: fileId,
      recordsParsed: allRows.length,
    });
  } catch (error) {
    console.error("Error uploading file in batches:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error: Could not process file." });
  }
};

/**
 * Controller to get a list of uploaded file names for a location.
 */
export const getFilesByLocation = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { location } = req.params;
    const files = await firebaseService.getFilesByLocationFromDB(
      location as string
    );
    return res.status(200).json(files);
  } catch (error) {
    console.error("Error fetching files by location:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to assign a new work bundle to the authenticated user.
 */
export const assignBundle = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      // This should technically be caught by middleware, but it's good practice
      return res
        .status(401)
        .json({ message: "Unauthorized: User not authenticated." });
    }

    const { taluka } = req.body;
    if (!taluka) {
      return res
        .status(400)
        .json({ message: 'Bad Request: "taluka" is required.' });
    }

    // We need the user's location, which is stored in their profile.
    const user = await firebaseService.getUserFromDB(userId);
    if (!user || !user.location) {
      return res
        .status(404)
        .json({ message: "User profile or location not found." });
    }

    // Call the service to perform the transactional assignment
    const newBundle = await firebaseService.assignNewBundleToUser(
      userId,
      user.location,
      taluka
    );

    return res.status(200).json({
      message: `Successfully assigned bundle #${newBundle.bundleNo} for ${taluka}.`,
      bundle: newBundle,
    });
  } catch (error: any) {
    if (error.message.includes("User already has an active bundle")) {
      return res.status(409).json({ message: error.message });
    }
    console.error("Error assigning bundle:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error: Could not assign bundle." });
  }
};

/**
 * Controller to receive and save a batch of processed records.
 */
export const syncRecords = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not authenticated." });
    }

    // Updated to include sourceFile
    const { taluka, bundleNo, records, sourceFile } = req.body;

    // Basic validation
    if (
      !taluka ||
      !bundleNo ||
      !sourceFile ||
      !Array.isArray(records) ||
      records.length === 0
    ) {
      return res.status(400).json({
        message:
          'Bad Request: "taluka", "bundleNo", "sourceFile", and a non-empty "records" array are required.',
      });
    }

    const user = await firebaseService.getUserFromDB(userId);
    if (!user || !user.location) {
      return res
        .status(404)
        .json({ message: "User profile or location not found." });
    }

    // Call the service to save the batch of records
    await firebaseService.saveProcessedRecordsToDB(
      userId,
      user.location,
      taluka,
      bundleNo,
      records,
      sourceFile
    );

    return res.status(200).json({
      message: `Successfully synced ${records.length} records for bundle #${bundleNo}.`,
    });
  } catch (error: any) {
    console.error("Error syncing records:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error: Could not sync records." });
  }
};

/**
 * Controller to mark the authenticated user's active bundle as complete.
 */
export const completeBundle = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not authenticated." });
    }

    const { taluka } = req.body;
    if (!taluka) {
      return res
        .status(400)
        .json({ message: 'Bad Request: "taluka" is required.' });
    }

    await firebaseService.markBundleAsCompleteInDB(userId, taluka);

    return res.status(200).json({
      message: `Successfully marked bundle for ${taluka} as complete. You can now assign a new one.`,
    });
  } catch (error: any) {
    // Handle specific error from our service if no active bundle was found.
    if (error.message.includes("No active bundle found")) {
      return res.status(404).json({ message: error.message });
    }
    console.error("Error completing bundle:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error: Could not complete bundle." });
  }
};

/**
 * Controller to get the authenticated user's active work bundles.
 */
export const getActiveBundles = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not authenticated." });
    }

    const activeBundles = await firebaseService.getActiveBundlesFromDB(userId);

    if (!activeBundles) {
      return res.status(200).json({ message: "User has no active bundles." });
    }

    return res.status(200).json(activeBundles);
  } catch (error: any) {
    console.error("Error fetching active bundles:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to get a single uploaded file by its ID.
 */
export const getFileById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { location, fileId } = req.params;
    const file = await firebaseService.getFileByIdFromDB(
      location as string,
      fileId as string
    );

    if (!file) {
      return res.status(404).json({
        message: `File with ID ${fileId} not found in location ${location}.`,
      });
    }

    return res.status(200).json(file);
  } catch (error) {
    console.error("Error fetching file by ID:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to get the application configuration (locations, talukas).
 */
export const getConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const config = await firebaseService.getConfigFromDB();
    if (!config) {
      return res.status(404).json({ message: "Configuration data not found." });
    }
    return res.status(200).json(config);
  } catch (error) {
    console.error("Error fetching config:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller for a user to fetch their assigned raw data file.
 */
export const getAssignedFile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user!.uid;
    const user = await firebaseService.getUserFromDB(userId);

    const fileContent = await firebaseService.getAssignedFileContentFromDB(
      userId
    );

    if (!user || user.canDownloadFiles === false) {
      return res
        .status(403)
        .json({ message: "You do not have permission to download files." });
    }

    if (fileContent === null) {
      return res
        .status(404)
        .json({ message: "Assigned file not found for this user." });
    }
    return res.status(200).json(fileContent);
  } catch (error: any) {
    console.error("Error fetching assigned file:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * Controller to search for a raw record by its 'Search from' ID.
 */
export const searchRecord = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user!.uid;
    const { searchId } = req.query;

    if (!searchId) {
      return res.status(400).json({
        message: 'Bad Request: "searchId" query parameter is required.',
      });
    }

    const record = await firebaseService.searchRawRecordFromDB(
      userId,
      searchId as string
    );
    if (!record) {
      return res.status(404).json({
        message: `Record with Search ID "${searchId}" not found in your assigned file.`,
      });
    }
    return res.status(200).json(record);
  } catch (error: any) {
    console.error("Error searching record:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * Controller to generate the next unique ID for a record.
 */
export const getNextUniqueId = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user!.uid;
    const { taluka } = req.query;

    if (!taluka) {
      return res.status(400).json({
        message: 'Bad Request: "taluka" query parameter is required.',
      });
    }

    const user = await firebaseService.getUserFromDB(userId);
    if (!user || !user.location) {
      return res
        .status(404)
        .json({ message: "User profile or location not found." });
    }

    const uniqueId = await firebaseService.getNextUniqueIdFromDB(
      user.location,
      taluka as string
    );
    return res.status(200).json({ uniqueId });
  } catch (error: any) {
    console.error("Error generating next unique ID:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to delete an uploaded file record.
 */
export const deleteFile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { location, fileId } = req.params;
    await firebaseService.deleteFileFromDB(
      location as string,
      fileId as string
    );
    return res.status(200).json({ message: "File deleted successfully." });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    console.error("Error deleting file:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
