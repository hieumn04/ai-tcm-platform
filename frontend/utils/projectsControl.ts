import Config from '@/config/config';
const apiServer = Config.apiServer;

/**
 * fetch project
 */
async function fetchProject(jwt: string, projectId: number) {
  const url = `${apiServer}/projects/${projectId}`;

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
    console.error('Error fetching project:', error.message);
    return null;
  }
}

/**
 * fetch projects (public and user own projects)
 */
async function fetchProjects(jwt: string) {
  const url = `${apiServer}/projects`;

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
    return result;
  } catch (error: any) {
    console.error('Error fetching projects:', error.message);
    return [];
  }
}

/**
 * fetch projects (user own projects)
 */
async function fetchMyProjects(jwt: string) {
  const url = `${apiServer}/projects?onlyUserProjects=true`;

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

    // Handle both response formats:
    // 1. Wrapped: { success: true, data: [...] }
    // 2. Direct array: [...]
    if (Array.isArray(result)) {
      return result;
    } else if (result?.data) {
      return result.data;
    } else {
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching my projects:', error.message);
    return [];
  }
}

/**
 * Create project
 */
async function createProject(jwt: string, name: string, detail: string, isPublic: boolean) {
  const newProjectData = {
    name,
    detail,
    isPublic,
  };

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(newProjectData),
  };

  const url = `${apiServer}/projects`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error creating new project:', error);
    throw error;
  }
}

/**
 * Update project
 */
async function updateProject(jwt: string, projectId: number, name: string, detail: string, isPublic: boolean) {
  const updatedProjectData = {
    name,
    detail,
    isPublic,
  };

  const fetchOptions = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(updatedProjectData),
  };

  const url = `${apiServer}/projects/${projectId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || result;
  } catch (error: any) {
    console.error('Error updating project:', error);
    throw error;
  }
}

/**
 * Delete project
 */
async function deleteProject(jwt: string, projectId: number) {
  const fetchOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  const url = `${apiServer}/projects/${projectId}`;

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

export { fetchProject, fetchProjects, fetchMyProjects, createProject, updateProject, deleteProject };
