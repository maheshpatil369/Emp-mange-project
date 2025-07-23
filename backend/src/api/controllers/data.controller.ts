import { Request, Response } from "express";
import ExcelJS from "exceljs";
import * as firebaseService from "../../services/firebase.service";
import { Readable } from "stream";

/**
 * Controller to handle Excel file uploads.
 * It parses the file and saves its content to the database.
 */

export const uploadFile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    //  Check if a file was actually uploaded by Multer.
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Bad Request: No file uploaded." });
    }

    // Extract location and file metadata.
    const location = req.params.location;
    const fileData = {
      name: req.file.originalname,
      size: req.file.size,
      location: location,
      uploadDate: new Date().toISOString(),
      content: [] as any[], // Initialize content as an empty array
    };

    // Parse the Excel file from a stream.
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from(req.file.buffer);
    await workbook.xlsx.read(stream); // Use .read() for streams

    const worksheet = workbook.worksheets[0]; // Get the first worksheet

    if (!worksheet) {
      return res.status(402).json({ message: "worksheet doesnt exist" });
    }

    // Convert worksheet rows to a JSON array.
    const headers = (worksheet.getRow(1).values as string[]).filter(Boolean); // Filter out any empty header cells
    worksheet.eachRow((row, rowNumber) => {
      // Skip the header row
      if (rowNumber > 1) {
        const rowData: { [key: string]: any } = {};
        const values = row.values as any[];

        headers.forEach((header, index) => {
          const cellValue = values[index + 1];
          rowData[header] =
            cellValue !== undefined && cellValue !== null ? cellValue : null;
        });

        // Only push the row if it contains some data
        if (Object.values(rowData).some((v) => v !== null)) {
          fileData.content.push(rowData);
        }
      }
    });

    // Call the service to save the parsed data to Firebase.
    const fileId = await firebaseService.saveUploadedFileToDB(
      location as string,
      fileData
    );

    return res.status(201).json({
      message: `File uploaded successfully for ${location}.`,
      fileId: fileId,
      recordsParsed: fileData.content.length,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error: Could not process file." });
  }
};




/**
 * Controller to get a list of uploaded file names for a location.
 */
export const getFilesByLocation = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { location } = req.params;
        const files = await firebaseService.getFilesByLocationFromDB(location as string);
        return res.status(200).json(files);
    } catch (error) {
        console.error('Error fetching files by location:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};



/**
 * Controller to assign a new work bundle to the authenticated user.
 */
export const assignBundle = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            // This should technically be caught by middleware, but it's good practice
            return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
        }

        const { taluka } = req.body;
        if (!taluka) {
            return res.status(400).json({ message: 'Bad Request: "taluka" is required.' });
        }
        
        // We need the user's location, which is stored in their profile.
        const user = await firebaseService.getUserFromDB(userId);
        if (!user || !user.location) {
            return res.status(404).json({ message: 'User profile or location not found.' });
        }
        
        // Call the service to perform the transactional assignment
        const newBundle = await firebaseService.assignNewBundleToUser(userId, user.location, taluka);

        return res.status(200).json({
            message: `Successfully assigned bundle #${newBundle.bundleNo} for ${taluka}.`,
            bundle: newBundle,
        });

    } catch (error: any) {
        if (error.message.includes('User already has an active bundle')) {
            return res.status(409).json({ message: error.message });
        }
        console.error('Error assigning bundle:', error);
        return res.status(500).json({ message: 'Internal Server Error: Could not assign bundle.' });
    }
};




/**
 * Controller to receive and save a batch of processed records.
 */
export const syncRecords = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
        }

        // Updated to include sourceFile
        const { taluka, bundleNo, records, sourceFile } = req.body;

        // Basic validation
        if (!taluka || !bundleNo || !sourceFile || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'Bad Request: "taluka", "bundleNo", "sourceFile", and a non-empty "records" array are required.' });
        }

        const user = await firebaseService.getUserFromDB(userId);
        if (!user || !user.location) {
            return res.status(404).json({ message: 'User profile or location not found.' });
        }

        // Call the service to save the batch of records
        await firebaseService.saveProcessedRecordsToDB(userId, user.location, taluka, bundleNo, records, sourceFile);

        return res.status(200).json({
            message: `Successfully synced ${records.length} records for bundle #${bundleNo}.`
        });

    } catch (error: any) {
        console.error('Error syncing records:', error);
        return res.status(500).json({ message: 'Internal Server Error: Could not sync records.' });
    }
};



/**
 * Controller to mark the authenticated user's active bundle as complete.
 */
export const completeBundle = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
        }

        const { taluka } = req.body;
        if (!taluka) {
            return res.status(400).json({ message: 'Bad Request: "taluka" is required.' });
        }

        await firebaseService.markBundleAsCompleteInDB(userId, taluka);

        return res.status(200).json({
            message: `Successfully marked bundle for ${taluka} as complete. You can now assign a new one.`
        });

    } catch (error: any) {
        // Handle specific error from our service if no active bundle was found.
        if (error.message.includes('No active bundle found')) {
            return res.status(404).json({ message: error.message });
        }
        console.error('Error completing bundle:', error);
        return res.status(500).json({ message: 'Internal Server Error: Could not complete bundle.' });
    }
};


/**
 * Controller to get the authenticated user's active work bundles.
 */
export const getActiveBundles = async (req: Request, res: Response): Promise<Response> => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
        }

        const activeBundles = await firebaseService.getActiveBundlesFromDB(userId);

        if (!activeBundles) {
            return res.status(200).json({ message: 'User has no active bundles.' });
        }

        return res.status(200).json(activeBundles);

    } catch (error: any) {
        console.error('Error fetching active bundles:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};


/**
 * Controller to get a single uploaded file by its ID.
 */
export const getFileById = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { location, fileId } = req.params;
        const file = await firebaseService.getFileByIdFromDB(location as string, fileId as string);

        if (!file) {
            return res.status(404).json({ message: `File with ID ${fileId} not found in location ${location}.` });
        }

        return res.status(200).json(file);
    } catch (error) {
        console.error('Error fetching file by ID:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};