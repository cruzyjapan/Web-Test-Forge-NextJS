/**
 * Authenticated fetch wrapper that includes credentials
 * This ensures cookies (including session) are sent with requests
 */
export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/**
 * Helper for GET requests with authentication
 */
export async function getWithAuth(url: string): Promise<Response> {
  return fetchWithAuth(url, { method: 'GET' });
}

/**
 * Helper for POST requests with authentication
 */
export async function postWithAuth(url: string, body?: any): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper for PUT requests with authentication
 */
export async function putWithAuth(url: string, body?: any): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper for DELETE requests with authentication
 */
export async function deleteWithAuth(url: string): Promise<Response> {
  return fetchWithAuth(url, { method: 'DELETE' });
}