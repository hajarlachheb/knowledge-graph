const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── Types ─────────────────────────────────────────── */

export interface DepartmentOut {
  id: number;
  name: string;
  description: string | null;
  member_count: number;
}

export interface SkillOut {
  id: number;
  name: string;
  user_count?: number;
}

export interface UserOut {
  id: number;
  username: string;
  email: string;
  full_name: string;
  position: string;
  department: DepartmentOut | null;
  skills: SkillOut[];
  bio: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface UserProfile extends UserOut {
  rex_count: number;
  contributor_score: number;
  is_trusted: boolean;
  follower_count: number;
  following_count: number;
  is_followed: boolean;
  total_views: number;
}

export interface TagOut {
  id: number;
  name: string;
  rex_count: number;
}

export interface RexOut {
  id: number;
  title: string;
  problematic: string;
  solution: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  author: UserOut;
  tags: TagOut[];
  bookmark_count: number;
  is_bookmarked: boolean;
  vote_score: number;
  user_vote: number;
  view_count: number;
  comment_count: number;
}

export interface CommentOut {
  id: number;
  rex_id: number;
  author: UserOut;
  text: string;
  is_question: boolean;
  parent_id: number | null;
  created_at: string;
}

export interface NotificationOut {
  id: number;
  type: string;
  rex_id: number | null;
  actor_id: number | null;
  actor_name: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  actor_name: string;
  actor_id: number;
  message: string;
  rex_id: number | null;
  rex_title: string | null;
  created_at: string;
}

export interface ContributorOut {
  id: number;
  full_name: string;
  position: string;
  department: DepartmentOut | null;
  rex_count: number;
  total_votes: number;
  contributor_score: number;
  is_trusted: boolean;
  top_tags: string[];
}

export interface RexListOut {
  items: RexOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  meta?: Record<string, string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DashboardData {
  stats: {
    my_rex_count: number;
    my_bookmark_count: number;
    total_rex: number;
    total_users: number;
    dept_member_count: number;
  };
  my_rex_sheets: RexOut[];
  department_feed: RexOut[];
  recommended: RexOut[];
}

export interface WhoKnowsResult {
  id: number;
  full_name: string;
  position: string;
  department: { id: number; name: string } | null;
  skills: string[];
  relevance_score: number;
  rex_count: number;
}

export interface AdminStats {
  total_users: number;
  total_rex: number;
  total_comments: number;
  total_votes: number;
  total_views: number;
  total_departments: number;
  departments: { name: string; member_count: number }[];
}

/* ── Helpers ───────────────────────────────────────── */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

/* ── Auth ──────────────────────────────────────────── */

export async function register(username: string, email: string, password: string): Promise<Token> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return handleRes<Token>(res);
}

export async function login(email: string, password: string): Promise<Token> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleRes<Token>(res);
}

export async function getMe(): Promise<UserOut> {
  const res = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders() });
  return handleRes<UserOut>(res);
}

/* ── Dashboard ─────────────────────────────────────── */

export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${BASE}/api/dashboard`, { headers: authHeaders() });
  return handleRes<DashboardData>(res);
}

/* ── REX Sheets ────────────────────────────────────── */

export async function getRexSheets(params: {
  page?: number; page_size?: number; tag?: string; author_id?: number;
  department_id?: number; category?: string; q?: string; sort?: string;
} = {}): Promise<RexListOut> {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.page_size) sp.set("page_size", String(params.page_size));
  if (params.tag) sp.set("tag", params.tag);
  if (params.author_id) sp.set("author_id", String(params.author_id));
  if (params.department_id) sp.set("department_id", String(params.department_id));
  if (params.category) sp.set("category", params.category);
  if (params.q) sp.set("q", params.q);
  if (params.sort) sp.set("sort", params.sort);
  const res = await fetch(`${BASE}/api/learnings?${sp}`, { headers: authHeaders() });
  return handleRes<RexListOut>(res);
}

export async function getRexSheet(id: number): Promise<RexOut> {
  const res = await fetch(`${BASE}/api/learnings/${id}`, { headers: authHeaders() });
  return handleRes<RexOut>(res);
}

export async function getMyDrafts(): Promise<RexOut[]> {
  const res = await fetch(`${BASE}/api/learnings/my-drafts`, { headers: authHeaders() });
  return handleRes<RexOut[]>(res);
}

export async function createRexSheet(data: {
  title: string; problematic: string; solution: string; tags: string[];
  category?: string; status?: string;
}): Promise<RexOut> {
  const res = await fetch(`${BASE}/api/learnings`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<RexOut>(res);
}

export async function updateRexSheet(id: number, data: {
  title?: string; problematic?: string; solution?: string; tags?: string[];
  category?: string; status?: string;
}): Promise<RexOut> {
  const res = await fetch(`${BASE}/api/learnings/${id}`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<RexOut>(res);
}

export async function deleteRexSheet(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/learnings/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || `Delete failed`); }
}

/* ── Comments ─────────────────────────────────────── */

export async function getComments(rexId: number): Promise<CommentOut[]> {
  const res = await fetch(`${BASE}/api/learnings/${rexId}/comments`, { headers: authHeaders() });
  return handleRes<CommentOut[]>(res);
}

export async function createComment(rexId: number, text: string, parentId?: number): Promise<CommentOut> {
  const body: Record<string, unknown> = { text };
  if (parentId) body.parent_id = parentId;
  const res = await fetch(`${BASE}/api/learnings/${rexId}/comments`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleRes<CommentOut>(res);
}

/* ── Users ─────────────────────────────────────────── */

export async function getUsers(department_id?: number): Promise<UserOut[]> {
  const sp = department_id ? `?department_id=${department_id}` : "";
  const res = await fetch(`${BASE}/api/users${sp}`, { headers: authHeaders() });
  return handleRes<UserOut[]>(res);
}

export async function getUserProfile(id: number): Promise<UserProfile> {
  const res = await fetch(`${BASE}/api/users/${id}`, { headers: authHeaders() });
  return handleRes<UserProfile>(res);
}

export async function getUserRexSheets(id: number, page = 1): Promise<RexListOut> {
  const res = await fetch(`${BASE}/api/users/${id}/learnings?page=${page}`, { headers: authHeaders() });
  return handleRes<RexListOut>(res);
}

export async function updateProfile(data: {
  full_name?: string; position?: string; bio?: string; department_id?: number;
}): Promise<UserOut> {
  const res = await fetch(`${BASE}/api/users/me`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<UserOut>(res);
}

export async function updateSkills(skills: string[]): Promise<UserOut> {
  const res = await fetch(`${BASE}/api/users/me/skills`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify({ skills }),
  });
  return handleRes<UserOut>(res);
}

/* ── Departments ───────────────────────────────────── */

export async function getDepartments(): Promise<DepartmentOut[]> {
  const res = await fetch(`${BASE}/api/departments`, { headers: authHeaders() });
  return handleRes<DepartmentOut[]>(res);
}

/* ── Tags ──────────────────────────────────────────── */

export async function getTags(): Promise<TagOut[]> {
  const res = await fetch(`${BASE}/api/tags`, { headers: authHeaders() });
  return handleRes<TagOut[]>(res);
}

/* ── Bookmarks ─────────────────────────────────────── */

export async function getBookmarks(): Promise<RexOut[]> {
  const res = await fetch(`${BASE}/api/bookmarks`, { headers: authHeaders() });
  return handleRes<RexOut[]>(res);
}

export async function addBookmark(rexId: number): Promise<void> {
  const res = await fetch(`${BASE}/api/bookmarks/${rexId}`, { method: "POST", headers: authHeaders() });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || `Bookmark failed`); }
}

export async function removeBookmark(rexId: number): Promise<void> {
  const res = await fetch(`${BASE}/api/bookmarks/${rexId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || `Remove failed`); }
}

/* ── Knowledge Graph ───────────────────────────────── */

export async function getKnowledgeGraph(): Promise<GraphResponse> {
  const res = await fetch(`${BASE}/api/graph`, { headers: authHeaders() });
  return handleRes<GraphResponse>(res);
}

/* ── AI ────────────────────────────────────────────── */

export async function aiSearch(q: string): Promise<RexOut[]> {
  const res = await fetch(`${BASE}/api/ai/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
  return handleRes<RexOut[]>(res);
}

export async function getRelatedRex(rexId: number): Promise<RexOut[]> {
  const res = await fetch(`${BASE}/api/ai/related/${rexId}`, { headers: authHeaders() });
  return handleRes<RexOut[]>(res);
}

export async function getSummary(rexId: number): Promise<{ summary: string }> {
  const res = await fetch(`${BASE}/api/ai/summary/${rexId}`, { headers: authHeaders() });
  return handleRes<{ summary: string }>(res);
}

export async function suggestTags(data: { title: string; problematic: string; solution: string }): Promise<{ tags: string[] }> {
  const res = await fetch(`${BASE}/api/ai/suggest-tags`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<{ tags: string[] }>(res);
}

export async function whoKnows(topic: string): Promise<WhoKnowsResult[]> {
  const res = await fetch(`${BASE}/api/ai/who-knows?topic=${encodeURIComponent(topic)}`, { headers: authHeaders() });
  return handleRes<WhoKnowsResult[]>(res);
}

export async function aiChat(question: string): Promise<{ answer: string; references: { id: number; title: string }[] }> {
  const res = await fetch(`${BASE}/api/ai/chat`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ question }),
  });
  return handleRes<{ answer: string; references: { id: number; title: string }[] }>(res);
}

/* ── Votes ─────────────────────────────────────────── */

export async function castVote(rexId: number, value: number): Promise<void> {
  const res = await fetch(`${BASE}/api/votes/${rexId}`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ value }),
  });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || "Vote failed"); }
}

export async function removeVote(rexId: number): Promise<void> {
  const res = await fetch(`${BASE}/api/votes/${rexId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || "Remove vote failed"); }
}

/* ── Leaderboard ───────────────────────────────────── */

export async function getLeaderboard(): Promise<ContributorOut[]> {
  const res = await fetch(`${BASE}/api/leaderboard`, { headers: authHeaders() });
  return handleRes<ContributorOut[]>(res);
}

/* ── Notifications ─────────────────────────────────── */

export async function getNotifications(): Promise<NotificationOut[]> {
  const res = await fetch(`${BASE}/api/notifications`, { headers: authHeaders() });
  return handleRes<NotificationOut[]>(res);
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await fetch(`${BASE}/api/notifications/unread-count`, { headers: authHeaders() });
  return handleRes<{ count: number }>(res);
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${BASE}/api/notifications/read-all`, { method: "POST", headers: authHeaders() });
}

export async function markNotificationRead(id: number): Promise<void> {
  await fetch(`${BASE}/api/notifications/${id}/read`, { method: "POST", headers: authHeaders() });
}

/* ── Follows ───────────────────────────────────────── */

export async function followUser(userId: number): Promise<void> {
  await fetch(`${BASE}/api/follows/${userId}`, { method: "POST", headers: authHeaders() });
}

export async function unfollowUser(userId: number): Promise<void> {
  await fetch(`${BASE}/api/follows/${userId}`, { method: "DELETE", headers: authHeaders() });
}

/* ── Activity ──────────────────────────────────────── */

export async function getActivity(departmentId?: number): Promise<ActivityItem[]> {
  const sp = departmentId ? `?department_id=${departmentId}` : "";
  const res = await fetch(`${BASE}/api/activity${sp}`, { headers: authHeaders() });
  return handleRes<ActivityItem[]>(res);
}

/* ── Export ─────────────────────────────────────────── */

export function getExportRexUrl(rexId: number): string {
  return `${BASE}/api/export/rex/${rexId}`;
}

export function getExportAllCsvUrl(): string {
  return `${BASE}/api/export/all-rex`;
}

/* ── Admin ─────────────────────────────────────────── */

export async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${BASE}/api/admin/stats`, { headers: authHeaders() });
  return handleRes<AdminStats>(res);
}

export async function getAdminUsers(): Promise<unknown[]> {
  const res = await fetch(`${BASE}/api/admin/users`, { headers: authHeaders() });
  return handleRes<unknown[]>(res);
}

export async function toggleAdmin(userId: number): Promise<{ id: number; is_admin: boolean }> {
  const res = await fetch(`${BASE}/api/admin/users/${userId}/toggle-admin`, {
    method: "POST", headers: authHeaders(),
  });
  return handleRes<{ id: number; is_admin: boolean }>(res);
}
