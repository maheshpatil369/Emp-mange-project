import ExcelJS from 'exceljs';
import { ProcessedRecord, User } from '../types';

/**
 * Separates records into two arrays: one for unique records and one for duplicates.
 * The separation is based on a provided comparison key.
 * @param records - An array of all processed records to be sorted.
 * @param comparisonKey - The name of the field in the record object to check for duplicates.
 * @returns An object containing two arrays: `uniqueRecords` and `duplicateRecords`.
 */
export function separateRecords(
    records: ProcessedRecord[],
    comparisonKey: string
): { uniqueRecords: ProcessedRecord[], duplicateRecords: ProcessedRecord[] } {
    const seenKeys = new Set<any>();
    const uniqueRecords: ProcessedRecord[] = [];
    const duplicateRecords: ProcessedRecord[] = [];

    if (!records.length || records[0]![comparisonKey as keyof ProcessedRecord] === undefined) {
        console.warn(`Comparison key "${comparisonKey}" does not exist on the records. Returning all records as unique.`);
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
 * @param workbook - The ExcelJS workbook instance.
 * @param records - The array of records to add to the sheet.
 * @param users - The array of all users for data enrichment.
 * @param worksheetName - The name for the new worksheet.
 */
const addSheetToWorkbook = (
    workbook: ExcelJS.Workbook,
    records: ProcessedRecord[],
    users: User[],
    worksheetName: string
) => {
    const worksheet = workbook.addWorksheet(worksheetName);
    const userMap = new Map(users.map(user => [user.id, user]));

    const allKeys = new Set<string>();
    records.forEach(record => {
        Object.keys(record).forEach(key => allKeys.add(key));
    });

    const orderedHeaders = ['uniqueId', 'processedBy_userName', 'processedBy_mobile', 'processedAt', 'taluka', 'bundleNo', 'sourceFile'];
    const dynamicHeaders = [...allKeys].filter(key => !orderedHeaders.includes(key) && key !== 'processedBy');
    const finalHeaders = [...orderedHeaders, ...dynamicHeaders];

    worksheet.columns = finalHeaders.map(key => ({
        header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        key: key,
        width: 20
    }));

    records.forEach(record => {
        const user = userMap.get(record.processedBy);
        const rowData: any = { ...record };
        rowData.processedBy_userName = user ? user.name : 'N/A';
        rowData.processedBy_mobile = user ? user.mobile : 'N/A';
        worksheet.addRow(rowData);
    });
};

/**
 * Generates a single Excel file with two sheets: one for unique records and one for duplicates.
 * This is the main function to be called by the controller.
 * @param uniqueRecords - Array of unique processed records.
 * @param duplicateRecords - Array of duplicate processed records.
 * @param users - Array of all users for enriching data.
 * @returns A promise that resolves to the combined Excel file as a Buffer.
 */
export async function generateCombinedExportExcel(
    uniqueRecords: ProcessedRecord[],
    duplicateRecords: ProcessedRecord[],
    users: User[]
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Add the "Unique Records" sheet if there is data for it
    if (uniqueRecords.length > 0) {
        addSheetToWorkbook(workbook, uniqueRecords, users, 'Unique Records');
    }

    // Add the "Duplicate Records" sheet if there is data for it
    if (duplicateRecords.length > 0) {
        addSheetToWorkbook(workbook, duplicateRecords, users, 'Duplicate Records');
    }

    // Write the entire workbook with both sheets to a buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}