import Config from '@/config/config';
const apiServer = Config.apiServer;

/**
 * Adds test cases to a run
 */
export async function addRunCases(
  jwt: string,
  caseIds: number[],
  projectId: number,
  runId: number | null,
  folderId: number,
  selectAllPages = false,
  customRunName?: string,
  description?: string
) {
  let url = `${apiServer}/runcases/add?projectId=${projectId}`;

  if (runId) {
    url += `&runId=${runId}`;
  }

  const bodyData: {
    caseIds?: number[];
    folderId: number;
    selectAllPages?: boolean;
    customRunName?: string;
    description?: string;
  } = {
    folderId,
    selectAllPages,
  };

  if (!selectAllPages) {
    bodyData.caseIds = caseIds;
  }

  if (customRunName) {
    bodyData.customRunName = customRunName;
  }

  if (description) {
    bodyData.description = description;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(bodyData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error adding run cases:', error.message);
    return null;
  }
}

/**
 * Fetches run cases with optional filtering and sorting
 */
export async function fetchRunCases(
  jwt: string,
  projectId: number,
  runId: number,
  page: number,
  query?: string,
  sortColumn?: string,
  sortDirection?: 'ASC' | 'DESC'
) {
  let url = `${apiServer}/runcases/byrun?projectId=${projectId}&runId=${runId}&page=${page}`;

  if (query) {
    url += `&search=${encodeURIComponent(query)}`;
  }

  // Convert customId to caseId for API compatibility
  let apiSortColumn = sortColumn;
  if (apiSortColumn === 'customId') {
    apiSortColumn = 'caseId';
  }

  // Only add sort parameters if column is provided and not empty
  if (apiSortColumn?.trim()) {
    url += `&sortColumn=${encodeURIComponent(apiSortColumn)}&sortDirection=${sortDirection || 'ASC'}`;
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
      const errorText = await response.text();
      let errorMessage = `HTTP error! Status: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = `${errorMessage}, Details: ${errorData.message || errorText}`;
      } catch (e) {
        errorMessage = `${errorMessage}, Details: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return (
      result.data || {
        runCases: [],
        filteredTotal: 0,
        totalRunCases: 0,
        totalPages: 0,
      }
    );
  } catch (error: any) {
    console.error('Error fetching run cases:', error.message);
    return {
      runCases: [],
      filteredTotal: 0,
      totalRunCases: 0,
      totalPages: 0,
    };
  }
}

/**
 * Removes test cases from a run
 */
export async function removeRunCases(jwt: string, runId: number, runCaseIds: number[]) {
  try {
    const url = `${apiServer}/runcases/remove?runId=${runId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ runCaseIds }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error removing run cases:', error.message);
    return null;
  }
}
