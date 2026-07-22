const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7000/api';

const ACCOUNT_TYPE_KEY = 'crm_account_type';

function getAccountTypeHeader(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCOUNT_TYPE_KEY);
}

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const accountType = getAccountTypeHeader();
  if (accountType) {
    authHeaders['X-Account-Type'] = accountType;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      ...authHeaders,
      ...headers,
    },
    ...rest,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'เกิดข้อผิดพลาด' }));
    throw new ApiError(response.status, error.message || 'เกิดข้อผิดพลาด', error.errors, error);
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, data?: unknown, token?: string) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data), token }),

  put: <T>(endpoint: string, data?: unknown, token?: string) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data), token }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: 'DELETE', token }),

  upload: <T>(endpoint: string, formData: FormData, token?: string) => {
    const authHeaders: Record<string, string> = { 'Accept': 'application/json' };
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;
    const accountType = getAccountTypeHeader();
    if (accountType) authHeaders['X-Account-Type'] = accountType;
    return fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: authHeaders, body: formData })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json().catch(() => ({ message: 'เกิดข้อผิดพลาด' }));
          throw new ApiError(res.status, error.message || 'เกิดข้อผิดพลาด', error.errors, error);
        }
        return res.json() as Promise<T>;
      });
  },
};
