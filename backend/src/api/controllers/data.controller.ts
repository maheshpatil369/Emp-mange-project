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
    // 1. Check if a file was actually uploaded by Multer.
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Bad Request: No file uploaded." });
    }

    // 2. Extract location and file metadata.
    const location = req.params.location;
    const fileData = {
      name: req.file.originalname,
      size: req.file.size,
      location: location,
      uploadDate: new Date().toISOString(),
      content: [] as any[], // Initialize content as an empty array
    };

    // 3. Parse the Excel file from a stream.
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

    // 5. Call the service to save the parsed data to Firebase.
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
