import { refreshAccessToken } from '@/lib/neon-auth/client';

const API_BASE_URL = '/api/v1';
const inFlightGetRequests = new Map<string, Promise<unknown>>();

type ApiRequestOptions = RequestInit & {
  token?: string | null;
  idempotencyKey?: string;
};

export type ApiResponse<T> = {
  statusCode: number;
  data: T;
  errors?: Array<{ code?: string }>;
  message: string;
  success: boolean;
};

type ApiErrorResponse = {
  errors?: Array<{ code?: string }>;
  message?: string;
  success?: false;
};

const AUTH_FAILURE_MESSAGES = new Set([
  'Unauthorized',
  'Invalid or expired access token',
  'Access token has no subject',
  'Authenticated user no longer exists',
]);

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
    const performRequest = async (accessToken?: string | null) => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          ...headers,
        },
      });
      const payload = (await response.json().catch(() => null)) as
        | ApiResponse<T>
        | ApiErrorResponse
        | null;
      return { response, payload };
    };

    let result = await performRequest(token);
    const isAccessTokenFailure =
      Boolean(token) &&
      result.response.status === 401 &&
      (result.payload?.errors?.some(
        error => error.code === 'AUTH_SESSION_INVALID'
      ) || AUTH_FAILURE_MESSAGES.has(result.payload?.message ?? ''));

    if (isAccessTokenFailure) {
      const refreshedToken = await refreshAccessToken();
      result = await performRequest(refreshedToken);
    }

    const { response, payload } = result;

    if (!response.ok || !payload?.success) {
      throw new ApiClientError(
        payload?.message || 'API request failed',
        response.status
      );
    }

    return (payload as ApiResponse<T>).data;
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
