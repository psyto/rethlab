export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/rethlab';

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Prefix relative API paths with basePath so they route to RethLab's API
  const fullUrl = url.startsWith('/') ? `${BASE_PATH}${url}` : url;
  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }

  return res.json();
}
