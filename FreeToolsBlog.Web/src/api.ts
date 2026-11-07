export interface CommentRecord {
  id?: number;
  name: string;
  content: string;
  createdAt: string;
}

export interface PostRecord {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  isPublished: boolean;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  userId?: number;
  userName?: string;
  user?: { username?: string } | null;
  comments?: CommentRecord[];
}

export interface Page<T> {
  data: T[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface PostInput {
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImageUrl: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = "ApiError";
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt) ? undefined : Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5175" : "")).replace(/\/$/, "");

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("Could not reach the API. Check that it is running and the API URL is correct.", 0);
  }

  if (response.status === 204) return undefined as T;

  if (response.status === 401 && token) window.dispatchEvent(new Event("freetoolsblog:unauthorized"));

  const raw = await response.text();
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    body = raw;
  }

  if (!response.ok) {
    const record = body && typeof body === "object" ? body as Record<string, unknown> : undefined;
    const errors = record?.errors && typeof record.errors === "object"
      ? Object.values(record.errors).flatMap((value) => Array.isArray(value) ? value : [value]).join(" ")
      : "";
    const message = typeof record?.message === "string" ? record.message
      : typeof record?.detail === "string" ? record.detail
        : typeof record?.title === "string" ? record.title
          : errors || (typeof body === "string" && body) || `Request failed (${response.status}).`;
    throw new ApiError(message, response.status, parseRetryAfter(response.headers.get("Retry-After")));
  }

  return body as T;
}

export const api = {
  listPosts(pageNumber: number, pageSize: number, token?: string) {
    return request<Page<PostRecord>>(`/posts?pageNumber=${pageNumber}&pageSize=${pageSize}`, {}, token);
  },
  searchPosts(search: string, pageNumber: number, pageSize: number) {
    const params = new URLSearchParams({ search, pageNumber: String(pageNumber), pageSize: String(pageSize) });
    return request<Page<PostRecord>>(`/posts?${params}`);
  },
  getPost(slug: string) {
    return request<PostRecord>(`/posts/${encodeURIComponent(slug)}`);
  },
  listComments(postId: number, pageNumber = 1, pageSize = 50) {
    return request<Page<CommentRecord>>(`/posts/${postId}/comments?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  },
  addComment(postId: number, name: string, content: string) {
    return request<CommentRecord>(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ name, content }) });
  },
  async login(email: string, password: string) {
    const result = await request<{ accessToken: string }>("/login", { method: "POST", body: JSON.stringify({ email, password }) });
    return result.accessToken;
  },
  createPost(input: PostInput & { userId: number }, token: string) {
    return request<{ id: number; slug: string }>("/admin/posts/", { method: "POST", body: JSON.stringify(input) }, token);
  },
  updatePost(id: number, input: PostInput & { isPublished: boolean }, token: string) {
    return request<void>(`/admin/posts/${id}`, { method: "PUT", body: JSON.stringify(input) }, token);
  },
  deletePost(id: number, token: string) {
    return request<void>(`/admin/posts/${id}`, { method: "DELETE" }, token);
  },
};

export async function findPublishedPost(slug: string): Promise<PostRecord | null> {
  const firstPage = await api.listPosts(1, 50);
  for (let pageNumber = firstPage.totalPages; pageNumber >= 1; pageNumber -= 1) {
    const page = pageNumber === 1 ? firstPage : await api.listPosts(pageNumber, 50);
    const match = page.data.find((post) => post.slug === slug);
    if (match) return match.isPublished ? match : null;
  }
  return null;
}

export function userIdFromToken(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    const id = Number(claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ?? claims.nameid ?? claims.sub);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
