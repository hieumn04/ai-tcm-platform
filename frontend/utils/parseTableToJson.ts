export function parseTableToJson(data: string): any[] {
  // Trim and split into lines
  const lines = data.trim().split('\n');
  if (lines.length === 0) return [];

  // Check the first non-empty line to decide the data format.

  let result: any[] = parseMarkdownTable(data);

  if (result.length <= 0 || !result[0].hasOwnProperty('id')) {
    // Otherwise assume Google Sheets data (e.g., tab-separated)
    result = parseGoogleSheetData(data, getHeaders(data));
  }

  // Normalize data types to prevent backend issues
  const normalizedResult = result.map((row: any) => {
    const normalizedRow: any = {};
    
    Object.keys(row).forEach(key => {
      const value = row[key];
      
      // Convert all values to appropriate types
      if (value === null || value === undefined || value === '') {
        normalizedRow[key] = '';
      } else if (typeof value === 'string') {
        const trimmedValue = value.trim();
        
        // Check if it's a number that should remain as string (like IDs)
        const keyLower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isNumeric = /^\d+$/.test(trimmedValue);
        
        if (isNumeric && (keyLower.includes('id') || keyLower === 'customid' || keyLower === 'testid')) {
          // Keep as string for ID fields
          normalizedRow[key] = trimmedValue;
        } else if (isNumeric && (keyLower === 'priority' || keyLower === 'state' || keyLower === 'type')) {
          // Convert to number for numeric fields
          normalizedRow[key] = parseInt(trimmedValue);
        } else if (keyLower === 'complexity') {
          // Keep complexity as string (backend expects '1', '2', '3')
          normalizedRow[key] = trimmedValue;
        } else {
          // Clean up string values and handle line breaks
          normalizedRow[key] = trimmedValue.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        }
      } else {
        // For other types, convert to string and normalize
        const stringValue = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
        normalizedRow[key] = stringValue;
      }
    });
    
    return normalizedRow;
  });


  return normalizedResult;
}

/**
 * Parses a markdown table to JSON.
 *
 * Expected markdown table format (with pipes):
 *
 * | Header 1 | Header 2 | Header 3 |
 * | -------- | -------- | -------- |
 * | value1   | value2   | value3   |
 *
 * Leading and trailing pipes are optional.
 */
function parseMarkdownTable(data: string): any[] {
  const lines = data.trim().split('\n');
  if (lines.length === 0) return [];

  let headers: string[] = [];
  let jsonData: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // The first non-empty line is assumed to be the header row
    if (headers.length === 0) {
      headers = line
        .split('|')
        .slice(1, -1) // remove the first and last empty elements if pipes are at the ends
        .map((header) => header.trim().replace(/\s+/g, '_').toLowerCase());
      continue;
    }

    // Skip separator rows (which usually contain dashes or colons)
    if (/^[:\-|\s]+$/.test(line)) continue;

    // Process a data row
    const values = line
      .split('|')
      .slice(1, -1)
      .map((value) => value.trim().replace(/<br>/g, ' '));

    // Skip rows that are completely empty
    if (values.every((value) => value === '')) continue;

    // Skip rows that look like headers (contain header-like text)
    const firstValue = values[0]?.toLowerCase().trim();
    const isLikelyHeaderRow = headers.some(header => 
      header === firstValue ||
      firstValue === 'id' ||
      firstValue === 'test suite/function' ||
      firstValue === 'summary' ||
      firstValue === 'steps' ||
      firstValue === 'expected result' ||
      firstValue === 'priority'
    );
    
    if (isLikelyHeaderRow) continue;

    // Pad the values array if necessary
    while (values.length < headers.length) {
      values.push('');
    }

    // Build an object for this row
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    jsonData.push(row);
  }
  return jsonData;
}

/**
 * Parses Google Sheets data (assumed to be tab-separated values) to JSON.
 *
 * The first line is assumed to contain headers.
 */
function getHeaders(data: string) {
  let headers = data.split('\n')[0].split('\t');
  headers = headers.map((header) =>
    header.trim().replace(/ /g, '_').replace(/\//g, '_').replace(/__+/g, '_').toLowerCase()
  );
  return headers;
}

function parseGoogleSheetData(data: string | any[], headers: string[]): any[] {
  function standardString(s: string) {
    return s.replace(/"/g, '').trim();
  }

  let items = [];
  let s = '';
  let isDoubleQuoteStart = false;

  for (let i = 0; i < data.length; i++) {
    let char = data[i];

    if (char === '"') {
      isDoubleQuoteStart = !isDoubleQuoteStart;
    }

    if (char === '\n' && !isDoubleQuoteStart) {
      items.push(standardString(s));
      s = '';
    } else if (char === '\t' && !isDoubleQuoteStart) {
      items.push(standardString(s));
      s = '';
    } else {
      s += char;
    }
  }

  if (s) {
    items.push(standardString(s));
  }

  let rows = [];
  for (let i = 0; i < items.length; i += headers.length) {
    rows.push(items.slice(i, i + headers.length));
  }

  // Skip the first row (header row) and only process data rows
  let jsonData = rows.slice(1).map((row) => {
    let obj: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
  
  // Filter out any rows that are essentially empty or contain only header-like values
  jsonData = jsonData.filter(row => {
    const values = Object.values(row);
    // Skip rows where the first column matches any of the headers (case-insensitive)
    const firstValue = values[0]?.toLowerCase().trim();
    const isHeaderRow = headers.some(header => 
      header.toLowerCase().trim() === firstValue ||
      firstValue.includes('id') && firstValue.length < 10
    );
    
    // Also skip completely empty rows
    const isEmpty = values.every(value => !value || value.trim() === '');
    
    return !isHeaderRow && !isEmpty;
  });
  
  return jsonData;
}
