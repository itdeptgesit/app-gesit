import * as XLSX from 'xlsx';

/**
 * Exports JSON data to an Excel file (.xlsx)
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Convert JSON to Worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Create a new Workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Set Auto-width for columns
    const maxWidths = data.reduce((acc: any, row: any) => {
        Object.keys(row).forEach((key, i) => {
            const value = row[key] ? row[key].toString() : '';
            const length = value.length + 2;
            if (!acc[i] || length > acc[i]) acc[i] = length;
        });
        return acc;
    }, []);

    worksheet['!cols'] = Object.keys(maxWidths).map(i => ({ wch: maxWidths[i] }));

    // Export the file
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
