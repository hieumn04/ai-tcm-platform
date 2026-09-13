import Config from '@/config/config';
const apiServer = Config.apiServer;

async function findUser(jwt: string, userId: number) {
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  const url = `${apiServer}/users/find/${userId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error finding user:', error.message);
    return null;
  }
}

async function searchUsers(jwt: string, projectId: number, searchText: string) {
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  const url = `${apiServer}/users/search?projectId=${projectId}&search=${searchText}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
  } catch (error: any) {
    console.error('Error searching users:', error.message);
    return [];
  }
}

async function updateUserRole(jwt: string, userId: number, newRole: number) {
  const updateUserData = {
    newRole,
  };

  const fetchOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(updateUserData),
  };

  const url = `${apiServer}/users/${userId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || null;
  } catch (error: any) {
    console.error('Error updating user role:', error.message);
    return null;
  }
}

export { findUser, searchUsers, updateUserRole };
