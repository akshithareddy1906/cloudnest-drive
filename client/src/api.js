const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(
  endpoint,
  { method = 'GET', token, body, isFormData = false } = {}
) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';

  const data = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data;
}

export const authAPI = {
  register: (body) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body,
    }),

  login: (body) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body,
    }),

  me: (token) =>
    apiRequest('/users/me', { token }),
};

export const filesAPI = {
  list: (token, folderId = 'root') =>
    apiRequest(
      `/files?folderId=${encodeURIComponent(folderId)}`,
      { token }
    ),

  upload: (token, file, folderId = 'root') => {
    const formData = new FormData();

    formData.append('file', file);

    if (folderId && folderId !== 'root') {
      formData.append('folderId', folderId);
    }

    return apiRequest('/files/upload', {
      method: 'POST',
      token,
      body: formData,
      isFormData: true,
    });
  },

  downloadUrl: (id) => `${API_URL}/files/${id}/download`,

  previewUrl: (id) => `${API_URL}/files/${id}/preview`,

  rename: (token, id, originalName) =>
    apiRequest(`/files/${id}/rename`, {
      method: 'PATCH',
      token,
      body: { originalName },
    }),

  move: (token, id, folderId) =>
    apiRequest(`/files/${id}/move`, {
      method: 'PATCH',
      token,
      body: { folderId },
    }),

  delete: (token, id) =>
    apiRequest(`/files/${id}`, {
      method: 'DELETE',
      token,
    }),

  trash: (token) =>
    apiRequest('/files/trash', { token }),

  restore: (token, id) =>
    apiRequest(`/files/${id}/restore`, {
      method: 'PATCH',
      token,
    }),
};

export const foldersAPI = {
  list: (token, parentId = 'root') =>
    apiRequest(
      `/folders?parentId=${encodeURIComponent(parentId)}`,
      { token }
    ),

  create: (token, name, parentId = 'root') =>
    apiRequest('/folders', {
      method: 'POST',
      token,
      body: {
        name,
        ...(parentId !== 'root' ? { parentId } : {}),
      },
    }),

  rename: (token, id, name) =>
    apiRequest(`/folders/${id}`, {
      method: 'PATCH',
      token,
      body: { name },
    }),

  delete: (token, id) =>
    apiRequest(`/folders/${id}`, {
      method: 'DELETE',
      token,
    }),
};

export const sharesAPI = {
  create: (token, fileId, expiresInHours = 24, password) =>
    apiRequest('/shares', {
      method: 'POST',
      token,
      body: {
        fileId,
        expiresInHours,
        ...(password ? { password } : {}),
      },
    }),

  list: (token) =>
    apiRequest('/shares', { token }),

  info: (shareToken) =>
    apiRequest(`/shares/${shareToken}`),

  revoke: (token, id) =>
    apiRequest(`/shares/${id}`, {
      method: 'DELETE',
      token,
    }),
};