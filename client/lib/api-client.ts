const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
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
};

export const createIdempotencyKey = () => globalThis.crypto.randomUUID();

export const shouldRetainIdempotencyKey = (error: unknown) =>
  !(error instanceof ApiClientError) || error.statusCode === 425;
