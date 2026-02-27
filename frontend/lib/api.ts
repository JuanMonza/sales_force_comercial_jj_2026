const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '';

export async function apiFetch<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID
  };

  if (options?.headers) {
    const incoming = new Headers(options.headers);
    incoming.forEach((value, key) => {
      headers[key] = value;
    });
  }

  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (typeof payload === 'object' && payload && 'message' in payload ? String(payload.message) : null) ||
      'Error de API';
    throw new Error(message);
  }

  return payload as T;
}

export { TENANT_ID };
