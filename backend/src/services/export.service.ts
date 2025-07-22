import ExcelJS from 'exceljs';
import { ProcessedRecord, User } from '../types';

/**
 * Generates an Excel file buffer from processed records and user data.
 * @param records - An array of processed records.
 * @param users - An array of all users.
 * @returns A promise that resolves to the Excel file as a Buffer.
 */
export async function generateProcessedRecordsExcel(
    records: ProcessedRecord[],
    users: User[]
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Processed Records');

    // Create a simple map for quick user lookup
    const userMap = new Map(users.map(user => [user.id, user]));

    // Dynamically determine all possible headers from the records
    const allKeys = new Set<string>();
    records.forEach(record => {
        Object.keys(record).forEach(key => allKeys.add(key));
    });

    // Define the desired order of columns, putting metadata first.
    const orderedHeaders = [
        'uniqueId', 'processedBy_userName', 'processedBy_mobile', 'processedAt', 'taluka', 'bundleNo', 'sourceFile',
    ];
    // Add the dynamic data columns after the metadata columns
    const dynamicHeaders = [...allKeys].filter(key => !orderedHeaders.includes(key) && key !== 'processedBy');
    
    // Create the final header list
    const finalHeaders = [...orderedHeaders, ...dynamicHeaders];

    worksheet.columns = finalHeaders.map(key => ({
        header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Prettify headers
        key: key,
        width: 20
    }));

    // Add the data rows
    records.forEach(record => {
        const user = userMap.get(record.processedBy);
        const rowData: any = { ...record }; // Copy the record data

        // Enrich the row with user details
        rowData.processedBy_userName = user ? user.name : 'N/A';
        rowData.processedBy_mobile = user ? user.mobile : 'N/A';
        
        worksheet.addRow(rowData);
    });

    // Write the workbook to a buffer
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}