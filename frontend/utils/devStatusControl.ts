import Config from '@/config/config';
import { DevStatus } from '@/types/devStatus';

const apiServer = Config.apiServer;

export async function saveDevStatus(jwt: string, devStatuses: DevStatus[], caseId: number): Promise<DevStatus[]> {
  const results: DevStatus[] = [];

  // Process each dev status individually since backend expects single requests
  for (const devStatus of devStatuses) {
    try {
      const requestBody = {
        case_id: caseId,
        role: devStatus.role,
        status: devStatus.status,
      };

      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(requestBody),
      };

      const url = `${apiServer}/dev-status/${caseId}`;
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error saving dev status:', errorData);
        throw new Error(`HTTP error! Status: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      if (result.data) {
        results.push(result.data);
      }
    } catch (error: any) {
      console.error('Error saving development status:', error);
      // Continue processing other statuses even if one fails
    }
  }

  return results;
}

export async function fetchDevStatus(jwt: string, caseId: number): Promise<DevStatus[]> {
  const url = `${apiServer}/dev-status/${caseId}`;

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
    console.error('Error fetching dev status:', error.message);
    return [];
  }
}

export async function deleteDevStatusEntry(jwt: string, entryId: string, caseId: number) {
  const url = `${apiServer}/dev-status/${caseId}/${entryId}`;
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete Dev Status entry');
    }
  } catch (error) {
    console.error('Error deleting dev status:', error);
  }
}
