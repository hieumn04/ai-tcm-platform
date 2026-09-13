import Config from '@/config/config';
const apiServer = Config.apiServer;

/**
 * fetch project records
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
    return result.data || [];
  } catch (error: any) {
    console.error('Error fetching projects:', error.message);
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
    return result.data || null;
  } catch (error: any) {
    console.error('Error creating new project:', error);
    return null;
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
    return result.data || null;
  } catch (error: any) {
    console.error('Error updating project:', error);
    return null;
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
  } catch (error: any) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

export { fetchProjects, createProject, updateProject, deleteProject };
