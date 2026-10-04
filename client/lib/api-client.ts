const API_BASE_URL = '/api/v1';
const inFlightGetRequests = new Map<string, Promise<unknown>>();

type ApiRequestOptions = RequestInit & {
  token?: string | null;
  idempotencyKey?: string;
};

export type ApiResponse<T> = {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export const apiFetch = async <T>(
  path: string,
  { token, idempotencyKey, headers, ...init }: ApiRequestOptions = {}
): Promise<T> => {
  const method = (init.method ?? 'GET').toUpperCase();
  const shouldDedupe = method === 'GET' && !init.body;
  const requestKey = shouldDedupe ? `${path}:${token ?? 'anonymous'}` : null;
  const pending = requestKey ? inFlightGetRequests.get(requestKey) : undefined;
  if (pending) return pending as Promise<T>;

  const request = (async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...headers,
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | ApiResponse<T>
      | null;

    if (!response.ok || !payload?.success) {
      throw new ApiClientError(
        payload?.message || 'API request failed',
        response.status
      );
    }

    return payload.data;
  })();

  if (requestKey) inFlightGetRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    if (requestKey) inFlightGetRequests.delete(requestKey);
  }
};

export const createIdempotencyKey = () => globalThis.crypto.randomUUID();

export const shouldRetainIdempotencyKey = (error: unknown) =>
  !(error instanceof ApiClientError) || error.statusCode === 425;
