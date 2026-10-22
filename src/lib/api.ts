// Thin client for the Mendyr API. Every call goes to this app's own `/api/v1/*`, which
// next.config.ts proxies to the backend — so the httponly session cookies the backend sets
// ride along automatically and no token is ever handled in JavaScript.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string } | null;
}

// Auth calls that must never trigger a silent session refresh (they're how a session
// starts or ends, or the refresh itself).
const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/token/refresh", "/auth/logout"];

let refreshInFlight: Promise<boolean> | null = null;

/** Swap the refresh cookie for a new access cookie. Concurrent 401s share one attempt. */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch("/api/v1/auth/token/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function api<T>(
  path: string,
  { method = "GET", body }: { method?: Method; body?: unknown } = {},
  retried = false,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach Mendyr right now. Check your connection.", 0, "network");
  }

  if (response.status === 401 && !retried && !NO_REFRESH.some((p) => path.startsWith(p))) {
    if (await refreshSession()) return api<T>(path, { method, body }, true);
  }

  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    // Non-JSON (e.g. a proxy error page) — handled below.
  }
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message ?? `Something went wrong (${response.status}).`,
      response.status,
      payload?.error?.code ?? "http_error",
    );
  }
  return payload.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

/** Build a query string, skipping empty values. */
export function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
