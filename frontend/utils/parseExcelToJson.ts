import * as XLSX from 'xlsx';

export function parseExcelToJson(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // First convert the entire sheet to array of arrays with header row (not JSON)
        // to easily scan for the ID column
        const sheet = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        // Find the row that contains ID in the first column
        let headerRowIndex = -1;
        for (let i = 0; i < sheet.length; i++) {
          const row = sheet[i] as any[];
          // Check if this row has any content and the first cell contains "ID"
          if (row && row.length > 0 && row[0] && String(row[0]).toLowerCase().trim() === 'id') {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          // If no ID column found in the first column, use the default parser
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Filter out any rows that might be header-like or empty
          const filteredData = jsonData.filter((row: any) => {
            if (!row || typeof row !== 'object') return false;
            
            const values = Object.values(row);
            const firstValue = String(values[0] || '').toLowerCase().trim();
            
            // Skip rows that look like headers
            const isLikelyHeaderRow = (
              firstValue === 'id' ||
              firstValue === 'test suite/function' ||
              firstValue === 'summary' ||
              firstValue === 'steps' ||
              firstValue === 'expected result' ||
              firstValue === 'priority' ||
              firstValue === 'useai' ||
              firstValue === 'complexity'
            );
            
            // Skip completely empty rows
            const isEmpty = values.every(value => 
              !value || String(value).trim() === ''
            );
            
            return !isLikelyHeaderRow && !isEmpty;
          });

          // Normalize data types to prevent backend issues
          const normalizedData = filteredData.map((row: any) => {
            const normalizedRow: any = {};
            
            Object.keys(row).forEach(key => {
              const value = row[key];
              
              // Convert all values to appropriate types
              if (value === null || value === undefined) {
                normalizedRow[key] = '';
              } else if (typeof value === 'number') {
                // For ID fields and numeric fields that backend expects as strings
                const keyLower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (keyLower.includes('id') || keyLower === 'customid' || keyLower === 'testid') {
                  normalizedRow[key] = value.toString();
                } else if (keyLower === 'complexity') {
                  // Keep complexity as string (backend expects '1', '2', '3')
                  normalizedRow[key] = value.toString();
                } else {
                  // Keep numbers as numbers for priority, state, type, etc.
                  normalizedRow[key] = value;
                }
              } else if (typeof value === 'string') {
                // Clean up string values and handle line breaks
                normalizedRow[key] = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
              } else if (typeof value === 'boolean') {
                normalizedRow[key] = value;
              } else {
                // Convert everything else to string and clean it up
                const stringValue = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
                normalizedRow[key] = stringValue;
              }
            });
            
            return normalizedRow;
          });

          
          resolve(normalizedData);
          return;
        }

        // Create a range that starts at the header row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const newRange = {
          s: { r: headerRowIndex, c: range.s.c },
          e: range.e,
        };

        // Create a new worksheet with just the rows from the header down
        const newWorksheet: XLSX.WorkSheet = {};

        // Copy all cells starting from the header row
        Object.keys(worksheet).forEach((cell) => {
          if (cell[0] !== '!') {
            const cellRef = XLSX.utils.decode_cell(cell);
            if (cellRef.r >= headerRowIndex) {
              // Adjust the row index to start from 0
              const newRow = cellRef.r - headerRowIndex;
              const newCell = XLSX.utils.encode_cell({ r: newRow, c: cellRef.c });
              newWorksheet[newCell] = worksheet[cell];
            }
          }
        });

        // Set the range reference for the new worksheet
        newWorksheet['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: newRange.s.c },
          e: { r: newRange.e.r - headerRowIndex, c: newRange.e.c },
        });

        // Copy other worksheet properties if needed
        if (worksheet['!merges']) newWorksheet['!merges'] = worksheet['!merges'];
        if (worksheet['!cols']) newWorksheet['!cols'] = worksheet['!cols'];
        if (worksheet['!rows']) newWorksheet['!rows'] = worksheet['!rows'];

        // Parse the data with the header row
        const jsonData = XLSX.utils.sheet_to_json(newWorksheet);
        
        // Filter out any rows that might be header-like or empty
        const filteredData = jsonData.filter((row: any) => {
          if (!row || typeof row !== 'object') return false;
          
          const values = Object.values(row);
          const firstValue = String(values[0] || '').toLowerCase().trim();
          
          // Skip rows that look like headers
          const isLikelyHeaderRow = (
            firstValue === 'id' ||
            firstValue === 'test suite/function' ||
            firstValue === 'summary' ||
            firstValue === 'steps' ||
            firstValue === 'expected result' ||
            firstValue === 'priority' ||
            firstValue === 'useai' ||
            firstValue === 'complexity'
          );
          
          // Skip completely empty rows
          const isEmpty = values.every(value => 
            !value || String(value).trim() === ''
          );
          
          return !isLikelyHeaderRow && !isEmpty;
        });

        // Normalize data types to prevent backend issues
        const normalizedData = filteredData.map((row: any) => {
          const normalizedRow: any = {};
          
          Object.keys(row).forEach(key => {
            const value = row[key];
            
            // Convert all values to appropriate types
            if (value === null || value === undefined) {
              normalizedRow[key] = '';
            } else if (typeof value === 'number') {
              // For ID fields and numeric fields that backend expects as strings
              const keyLower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (keyLower.includes('id') || keyLower === 'customid' || keyLower === 'testid') {
                normalizedRow[key] = value.toString();
              } else if (keyLower === 'complexity') {
                // Keep complexity as string (backend expects '1', '2', '3')
                normalizedRow[key] = value.toString();
              } else {
                // Keep numbers as numbers for priority, state, type, etc.
                normalizedRow[key] = value;
              }
            } else if (typeof value === 'string') {
              // Clean up string values and handle line breaks
              normalizedRow[key] = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
            } else if (typeof value === 'boolean') {
              normalizedRow[key] = value;
            } else {
              // Convert everything else to string and clean it up
              const stringValue = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
              normalizedRow[key] = stringValue;
            }
          });
          
          return normalizedRow;
        });
        
        
        resolve(normalizedData);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`));
      }
    };

    reader.onerror = (error) => {
      reject(new Error(`Error reading Excel file: ${error instanceof Error ? error.message : String(error)}`));
    };

    reader.readAsBinaryString(file);
  });
}
