import { CaseType } from '@/types/case';
import { RunType, RunCaseType } from '@/types/run';
import Config from '@/config/config';
const apiServer = Config.apiServer;

async function fetchRun(jwt: string, runId: number) {
  const url = `${apiServer}/runs/${runId}`;

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
    console.error('Error fetching run:', error.message);
    return null;
  }
}

async function fetchRuns(jwt: string, projectId: number) {
  const url = `${apiServer}/runs?projectId=${projectId}`;

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
    return result.data || [];
  } catch (error: any) {
    console.error('Error fetching runs:', error.message);
    return [];
  }
}

async function createRun(jwt: string, projectId: number, name: string, description: string) {
  const newTestRun = {
    name,
    configurations: 0,
    description,
    state: 0,
  };

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(newTestRun),
  };

  const url = `${apiServer}/runs?projectId=${projectId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error creating new test run:', error);
    return null;
  }
}

async function updateRun(jwt: string, updateTestRun: RunType) {
  const fetchOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(updateTestRun),
  };

  const url = `${apiServer}/runs/${updateTestRun.id}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error updating run:', error);
    return null;
  }
}

async function deleteRun(jwt: string, runId: number) {
  const fetchOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  const url = `${apiServer}/runs/${runId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error deleting run:', error);
    throw error;
  }
}

function changeStatus(
  changeCaseId: number,
  platform: 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api',
  newStatus: number,
  currentTestCases: CaseType[]
): CaseType[] {
  const updatedTestCases = [...currentTestCases];

  const found = updatedTestCases.find((testCase) => testCase.id === changeCaseId);
  if (found && found.runCases && found.runCases.length > 0) {
    const runCase = found.runCases[0];

    if (runCase.editState !== 'deleted') {
      // Find existing status for the given platform
      const existingStatus = runCase.statuses.find((s) => s.platformStatus.platform === platform);

      if (existingStatus) {
        existingStatus.status = newStatus;
      } else {
        // If no status exists for the platform, create a new one
        runCase.statuses.push({
          runCaseId: runCase.id,
          platformStatus: { id: '', platform: platform }, // Note: platform ID might need to be fetched or passed in
          status: newStatus,
        });
      }

      // Update editState
      if (runCase.editState === 'notChanged') {
        runCase.editState = 'changed';
      }
    }
  }

  return updatedTestCases;
}

function includeExcludeTestCases(
  isInclude: boolean,
  keys: number[],
  runId: number,
  currentTestCases: CaseType[]
): CaseType[] {
  const updatedTestCases = [...currentTestCases];

  if (isInclude) {
    keys.forEach((caseId) => {
      const targetCase = updatedTestCases.find((testCase) => testCase.id === caseId);
      if (!targetCase) {
        console.error('Failed to find target case');
        return;
      }

      if (targetCase.runCases && targetCase.runCases.length > 0) {
        // If runCase already exists, handle based on editState
        const runCase = targetCase.runCases[0];

        if (runCase.editState === 'deleted') {
          runCase.editState = runCase.id > 0 ? 'changed' : 'new';
        }
      } else {
        // If no runCase exists, create a new one with empty statuses
        const newRunCase: RunCaseType = {
          id: -1, // Temporary ID, backend assigns real one
          runId: runId,
          caseId: caseId,
          editState: 'new',
          createdAt: '',
          updatedAt: '',
          statuses: [],
          Case: {
            id: targetCase.id,
            title: targetCase.title,
            priority: targetCase.priority,
            type: targetCase.type,
            folderId: targetCase.folderId || 0,
            devStatuses: [],
            platformEvidences: [],
            evidenceByPlatform: {},
          },
        };

        targetCase.runCases = [newRunCase];
      }
    });
  } else {
    // Exclude test cases by marking runCase as deleted
    keys.forEach((caseId) => {
      const targetCase = updatedTestCases.find((testCase) => testCase.id === caseId);
      if (!targetCase) {
        console.error('Failed to find target case');
        return;
      }

      if (targetCase.runCases && targetCase.runCases.length > 0) {
        const runCase = targetCase.runCases[0];
        runCase.editState = 'deleted';
        targetCase.runCases = [];
      }
    });
  }

  return updatedTestCases;
}

async function updateRunCases(jwt: string, runId: number, runCases: RunCaseType[]) {
  // Helper function to normalize platform names to lowercase
  const normalizePlatform = (platform: string | undefined): 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api' => {
    if (typeof platform !== 'string' || !platform) {
      // Return a default or handle the error as appropriate
      return 'web'; // Default to 'web' if platform is not a valid string
    }
    const lowercasePlatform = platform.toLowerCase();
    // Validate that it's a known platform
    if (['web', 'wap', 'zma', 'ios', 'android', 'api'].includes(lowercasePlatform)) {
      return lowercasePlatform as 'web' | 'wap' | 'zma' | 'ios' | 'android' | 'api';
    }
    // Fallback to original if not recognized
    return 'web';
  };

  const payload = {
    runCases: runCases.map((runCase) => ({
      id: runCase.id,
      caseId: runCase.caseId,
      runId: runId,
      createdAt: runCase.createdAt || '',
      updatedAt: new Date().toISOString(),
      statuses: (runCase.statuses || []).map((status) => ({
        id: status.id,
        runCaseId: runCase.id,
        platformId: status.platformId,
        platform: status.platformStatus.platform,
        status: status.status,
      })),
    })),
  };

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(payload),
  };

  const url = `${apiServer}/runcases/update?runId=${runId}`;
  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Error updating run cases:', error);
    throw error;
  }
}

async function fetchAllPlatformStatuses(jwt: string, runId: number) {
  try {
    const url = `${apiServer}/run-platform?runId=${runId}`;
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
    return result.data || [];
  } catch (error: any) {
    console.error('Error fetching platform statuses:', error.message);
    return [];
  }
}

async function updateRunPlatformStatus(jwt: string, runId: number, platformId: string, isInclude: boolean) {
  try {
    const url = `${apiServer}/run-platform`; // Updated endpoint
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ runId, platformId, isInclude }), // Updated request body
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json(); // Return response data if needed
  } catch (error: any) {
    console.error('Error updating run platform status:', error.message);
  }
}

async function duplicateRun(jwt: string, runId: number, name: string, description: string) {
  const url = `${apiServer}/runs/duplicate`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ id: runId, name, description }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error duplicating test run:', error);
    throw error;
  }
}

export {
  fetchRun,
  fetchRuns,
  createRun,
  updateRun,
  deleteRun,
  changeStatus,
  includeExcludeTestCases,
  updateRunCases,
  fetchAllPlatformStatuses,
  updateRunPlatformStatus,
  duplicateRun,
};
