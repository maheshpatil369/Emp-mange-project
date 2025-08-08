import ExcelJS from "exceljs";
import { ProcessedRecord, User } from "../types";

/**
 * Separates records into two arrays: one for unique records and one for duplicates.
 * (This function remains unchanged)
 */
export function separateRecords(
  records: ProcessedRecord[],
  comparisonKey: string
): { uniqueRecords: ProcessedRecord[]; duplicateRecords: ProcessedRecord[] } {
  const seenKeys = new Set<any>();
  const uniqueRecords: ProcessedRecord[] = [];
  const duplicateRecords: ProcessedRecord[] = [];

  if (
    !records.length ||
    records[0]?.[comparisonKey as keyof ProcessedRecord] === undefined
  ) {
    console.warn(
      `Comparison key "${comparisonKey}" does not exist on the records. Returning all records as unique.`
    );
    return { uniqueRecords: records, duplicateRecords: [] };
  }

  for (const record of records) {
    const key = record[comparisonKey as keyof ProcessedRecord];

    if (key === null || key === undefined) {
      uniqueRecords.push(record);
      continue;
    }

    if (seenKeys.has(key)) {
      duplicateRecords.push(record);
    } else {
      seenKeys.add(key);
      uniqueRecords.push(record);
    }
  }

  return { uniqueRecords, duplicateRecords };
}

/**
 * Helper function to add a worksheet to a workbook and populate it with data.
 */
const addSheetToWorkbook = (
  workbook: ExcelJS.Workbook,
  records: ProcessedRecord[],
  users: User[],
  worksheetName: string
) => {
  const worksheet = workbook.addWorksheet(worksheetName);
  const userMap = new Map(users.map((user) => [user.id, user]));

  const allKeys = new Set<string>();
  records.forEach((record) => {
    Object.keys(record).forEach((key) => allKeys.add(key));
  });

  const orderedHeaders = [
    "UniqueId", 
    "processedBy_userName",
    "processedBy_mobile",
    "processedAt",
    "taluka",
    "bundleNo",
    "sourceFile",
  ];

  const dynamicHeaders = [...allKeys]
    .filter(
      (key) =>
        !orderedHeaders.includes(key) &&
        key !== "processedBy" &&
        // This filter correctly removes the original "UniqueId" field
        key
          .trim()
          .toLowerCase()
          .replace(/[\s_-]/g, "") !== "uniqueid"
    )
    .sort();

  const finalHeaders = [...orderedHeaders, ...dynamicHeaders];

  worksheet.columns = finalHeaders.map((key) => {
    let headerText: string;

    // --- FIX #2: Check for the 'id' key and rename its header to 'UniqueId' ---
    if (key === "id") {
      headerText = "UniqueId";
    } else {
      headerText = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return {
      header: headerText,
      key: key,
      width: 20,
    };
  });

  records.forEach((record) => {
    const user = userMap.get(record.processedBy);
    const rowData: any = { ...record };
    rowData.processedBy_userName = user ? user.name : "N/A";
    rowData.processedBy_mobile = user ? user.mobile : "N/A";
    worksheet.addRow(rowData);
  });
};

/**
 * Generates a single Excel file with two sheets.
 * (This function remains unchanged)
 */
export async function generateCombinedExportExcel(
  uniqueRecords: ProcessedRecord[],
  duplicateRecords: ProcessedRecord[],
  users: User[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  if (uniqueRecords.length > 0) {
    addSheetToWorkbook(workbook, uniqueRecords, users, "Unique Records");
  }

  if (duplicateRecords.length > 0) {
    addSheetToWorkbook(workbook, duplicateRecords, users, "Duplicate Records");
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates an Excel file for the log of submitted duplicate records.
 * (This function remains unchanged)
 */
export async function generateDuplicateLogExcel(
  records: any[],
  users: User[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  addSheetToWorkbook(workbook, records, users, "Duplicate Submission Log");
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
