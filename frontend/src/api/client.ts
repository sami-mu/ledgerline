type Query = Record<string, string | number | undefined>;

function withQuery(path: string, query?: Query): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

/** Field errors are keyed by dotted path, e.g. "line_items.0.quantity". */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, code?: string, fieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type ErrorBody = {
  detail?: string | { loc: (string | number)[]; msg: string }[];
  code?: string;
};

async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Not JSON (proxy down, HTML error page): use a generic message.
  }
  if (Array.isArray(body.detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of body.detail) {
      const path = issue.loc.slice(1).join(".");
      fieldErrors[path] ??= issue.msg.replace(/^Value error, /, "");
    }
    return new ApiError(
      response.status,
      "Some fields need attention.",
      "validation_error",
      fieldErrors,
    );
  }
  const fallback =
    response.status >= 500 ? "The server ran into a problem. Try again." : "Request failed.";
  return new ApiError(response.status, body.detail ?? fallback, body.code);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    // Superseded queries abort their request; TanStack Query handles that.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Can't reach the server. Check that the backend is running.", "network");
  }
  if (!response.ok) throw await toApiError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Shared HTTP client. Endpoint functions live in the domain modules beside this file. */
export const http = {
  get: <T>(path: string, options?: { query?: Query; signal?: AbortSignal }) =>
    request<T>(withQuery(path, options?.query), { signal: options?.signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
