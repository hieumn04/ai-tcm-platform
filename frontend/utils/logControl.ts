import Config from '@/config/config';
const apiServer = Config.apiServer;

export async function fetchCaseLog(jwt: string, caseId: number) {
  const url = `${apiServer}/change-logs/${caseId}`;

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
    console.error('Error fetching case log:', error.message);
    return [];
  }
}
