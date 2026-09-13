import Config from '@/config/config';
const apiServer = Config.apiServer;
import { CaseType } from '@/types/case';

// Declare global handler type
declare global {
  interface Window {
    __removeCaseFromSelection?: (caseId: number) => void;
  }
}

async function fetchCase(jwt: string, caseId: number) {
  const url = `${apiServer}/cases/${caseId}`;

  // Trigger global handler to remove case from selection if it exists
  if (typeof window !== 'undefined' && window.__removeCaseFromSelection) {
    window.__removeCaseFromSelection(caseId);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error fetching case:', error.message);
    return null;
  }
}

async function fetchCases(
  jwt: string,
  folderId: number,
  page: number = 1,
  query?: string,
  sortColumn?: string,
  sortDirection?: 'ASC' | 'DESC'
) {
  let url = `${apiServer}/cases?folderId=${folderId}&page=${page}`;

  if (query) {
    url += `&search=${encodeURIComponent(query)}`;
  }

  // Only add sort parameters if column is provided and not empty
  if (sortColumn?.trim()) {
    // Map frontend column names to backend field names
    let backendSortField = sortColumn;

    // No need to map customId anymore since backend now supports it
    // if (sortColumn === 'customId') {
    //   backendSortField = 'id'; // fallback to id since customId is not in allowed fields
    // }

    // Map direction to backend format (lowercase)
    const backendSortOrder = sortDirection?.toLowerCase() || 'asc';

    // Use backend parameter names: sortBy and sortOrder instead of sortColumn and sortDirection
    url += `&sortBy=${backendSortField}&sortOrder=${backendSortOrder}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    // Add debugging to understand what the backend is returning

    // Restructure the response to match frontend expectations
    // Backend returns { success, message, data: [...], pagination }
    // Frontend expects { cases: [...], totalCases, filteredTotal, totalPages, ... }
    if (data.success && data.data) {
      const restructuredData = {
        cases: data.data,
        totalCases: data.pagination?.total || 0,
        filteredTotal: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
        totalUseAICases: 0, // TODO: Add this to backend if needed
        ...data.pagination,
      };
      return restructuredData;
    }

    return data;
  } catch (error: any) {
    // Return a default structure instead of undefined to prevent crashes
    return {
      cases: [],
      totalCases: 0,
      filteredTotal: 0,
      totalPages: 0,
      totalUseAICases: 0,
    };
  }
}

async function createCase(
  jwt: string,
  folderId: string,
  title: string,
  description: string,
  userId: number | null,
  customId: string
) {
  const newCase = {
    title: title,
    state: 0,
    priority: 2,
    type: 0,
    automationStatus: 0,
    description: description,
    template: 0,
    preConditions: '',
    expectedResults: '',
    userId: userId ?? null,
    customId: customId ?? null,
    complexity: '1',
  };

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(newCase),
  };

  const url = `${apiServer}/cases?folderId=${folderId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error creating case:', error);
    return null;
  }
}

async function importCases(
  jwt: string,
  folderId: string,
  jsonData: Record<string, any>[],
  title: string,
  description: string,
  priority: string,
  preConditions: string,
  expectedResults: string,
  stepsDetail: string,
  isAuto: string,
  useAI: string,
  customId: string,
  complexity: string,
  userId?: number | null
) {
  const priorityMap: Record<string, number> = {
    critical: 0,
    p1: 0,
    high: 1,
    p2: 1,
    medium: 2,
    p3: 2,
    low: 3,
    p4: 3,
  };

  const complexityMap: Record<string, string> = {
    easy: '1',
    simple: '1',
    low: '1',
    '1': '1',
    medium: '2',
    normal: '2',
    '2': '2',
    hard: '3',
    difficult: '3',
    complex: '3',
    high: '3',
    '3': '3',
  };

  const convertToBoolean = (input: string): boolean => {
    const normalizedInput = input.normalize('NFC').toLowerCase(); // Normalize and lowercase
    const trueValues = ['yes', 'có', 'x'].map((val) => val.normalize('NFC'));

    const result = trueValues.includes(normalizedInput);
    return result;
  };

  const cases = jsonData.map((item, index) => {
    const originalComplexity = item[complexity];
    const mappedComplexity = originalComplexity?.trim() ? 
      (complexityMap[String(originalComplexity).toLowerCase().trim()] || '1') : '1';

    const processedCase = {
      title: item[title] ?? 'Default title',
      state: 0,
      priority: priorityMap[item[priority]?.toLowerCase()] ?? 2,
      type: 0,
      automationStatus: 0,
      description: item[description] ?? '',
      template: 0,
      preConditions: item[preConditions] ?? '',
      expectedResults: item[expectedResults] ?? '',
      stepsDetail: item[stepsDetail] ?? '',
      isAuto: item[isAuto] ? item[isAuto].toLowerCase() : 'manual',
      useAI: convertToBoolean(item[useAI] || 'no'),
      customId: item[customId] ?? '1',
      complexity: mappedComplexity,
      userId: userId,
    };
    
    return processedCase;
  });

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ cases }),
  };

  const url = `${apiServer}/cases/import?folderId=${folderId}`;

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      // Pass through the error information directly from the backend
      const errorData = {
        message: data.error || 'Unknown error occurred',
        cause: data.cause,
        details: data.details,
        failedCases: data.failedCases,
        statusCode: response.status,
        ...data, // Include any other fields from the backend response
      };

      throw errorData;
    }

    return data;
  } catch (error: any) {
    console.error('Error importing cases:', error);
    throw error;
  }
}

async function updateCase(jwt: string, updateCaseData: CaseType) {
  const fetchOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(updateCaseData),
  };

  const url = `${apiServer}/cases/${updateCaseData.id}`;
  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error updating case:', error);
    return null;
  }
}

async function deleteCases(
  jwt: string,
  deleteCaseIds: number[],
  projectId: number,
  folderId: number,
  deleteAll = false
) {
  const bodyData: any = { deleteAll };
  if (!deleteAll) {
    bodyData.caseIds = deleteCaseIds; // Send case IDs only if not deleting all
  } else {
    bodyData.folderId = folderId; // Send folder ID when deleting all
  }

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(bodyData),
  };

  const url = `${apiServer}/cases/bulkdelete?projectId=${projectId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error deleting cases:', error);
    throw error;
  }
}

async function duplicateCase(jwt: string, caseId: number, title?: string) {
  const url = `${apiServer}/cases/duplicate`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ id: caseId, title }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error duplicating test case:', error);
    throw error;
  }
}

export { fetchCase, fetchCases, updateCase, createCase, deleteCases, importCases, duplicateCase };
