import { isBrowser } from "@/lib/env";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  url?: string;

  constructor(status: number, message: string, details?: unknown, url?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.url = url;
  }
}

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  tokenOverride?: string;
  baseUrl?: string;
};

export const API_BASE_URL =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function resolveApiUrl(path: string, baseUrl = API_BASE_URL) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  if (!normalizedBase) {
    return `/${normalizedPath}`;
  }
  return `${normalizedBase}/${normalizedPath}`;
}

function getAuthToken(): string | undefined {
  if (!isBrowser()) return undefined;
  try {
    return localStorage.getItem("token") ?? undefined;
  } catch {
    return undefined;
  }
}

function buildHeaders(
  initHeaders: HeadersInit | undefined,
  hasJsonBody: boolean,
  token?: string
): Headers {
  const headers = new Headers(initHeaders);
  headers.set("Accept", "application/json");
  if (hasJsonBody) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  // Fallback to text for unexpected responses.
  const text = await res.text();
  return text as unknown as T;
}

export async function requestJson<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, auth, tokenOverride, baseUrl, ...rest } = options;
  const hasBody = body !== undefined;
  const token = auth ? tokenOverride ?? getAuthToken() : undefined;
  const url = resolveApiUrl(path, baseUrl);

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: buildHeaders(rest.headers, hasBody, token),
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch (err: any) {
    throw new ApiError(
      0,
      err?.message || "Network error",
      { original: err },
      url
    );
  }

  if (!res.ok) {
    const errorPayload = (await parseResponse<unknown>(res).catch(
      () => undefined
    )) as any;
    const message =
      (errorPayload && (errorPayload.error || errorPayload.message)) ||
      res.statusText ||
      "Request failed";
    throw new ApiError(res.status, message, errorPayload, url);
  }

  return parseResponse<T>(res);
}

export async function requestForm<T = unknown>(
  path: string,
  formData: FormData,
  options: RequestOptions = {}
): Promise<T> {
  const { auth, tokenOverride, baseUrl, ...rest } = options;
  const token = auth ? tokenOverride ?? getAuthToken() : undefined;
  const url = resolveApiUrl(path, baseUrl);

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      method: rest.method ?? "POST",
      headers: buildHeaders(rest.headers, false, token),
      body: formData,
    });
  } catch (err: any) {
    throw new ApiError(
      0,
      err?.message || "Network error",
      { original: err },
      url
    );
  }

  if (!res.ok) {
    const errorPayload = (await parseResponse<unknown>(res).catch(
      () => undefined
    )) as any;
    const message =
      (errorPayload && (errorPayload.error || errorPayload.message)) ||
      res.statusText ||
      "Request failed";
    throw new ApiError(res.status, message, errorPayload, url);
  }

  return parseResponse<T>(res);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
