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

/* ── Reactions ─────────────────────────────────────── */

export interface ReactionSummary {
  helpful: number;
  applied: number;
  insightful: number;
  outdated: number;
  user_reactions: string[];
}

export async function addReaction(rexId: number, type: string): Promise<void> {
  await fetch(`${BASE}/api/learnings/${rexId}/react`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ type }),
  });
}

export async function removeReaction(rexId: number, type: string): Promise<void> {
  await fetch(`${BASE}/api/learnings/${rexId}/react/${type}`, { method: "DELETE", headers: authHeaders() });
}

export async function getReactions(rexId: number): Promise<ReactionSummary> {
  const res = await fetch(`${BASE}/api/learnings/${rexId}/reactions`, { headers: authHeaders() });
  return handleRes<ReactionSummary>(res);
}

/* ── Saved Searches ────────────────────────────────── */

export interface SavedSearchOut {
  id: number;
  name: string;
  filters_json: string;
  notify: boolean;
  created_at: string;
}

export async function getSavedSearches(): Promise<SavedSearchOut[]> {
  const res = await fetch(`${BASE}/api/saved-searches`, { headers: authHeaders() });
  return handleRes<SavedSearchOut[]>(res);
}

export async function createSavedSearch(data: { name: string; filters_json: string; notify?: boolean }): Promise<SavedSearchOut> {
  const res = await fetch(`${BASE}/api/saved-searches`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<SavedSearchOut>(res);
}

export async function deleteSavedSearch(id: number): Promise<void> {
  await fetch(`${BASE}/api/saved-searches/${id}`, { method: "DELETE", headers: authHeaders() });
}

/* ── Attachments ───────────────────────────────────── */

export interface AttachmentOut {
  id: number;
  rex_id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export async function getAttachments(rexId: number): Promise<AttachmentOut[]> {
  const res = await fetch(`${BASE}/api/attachments/learnings/${rexId}`, { headers: authHeaders() });
  return handleRes<AttachmentOut[]>(res);
}

export async function uploadAttachment(rexId: number, file: File): Promise<AttachmentOut> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const hdrs: Record<string, string> = {};
  if (token) hdrs["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/attachments/learnings/${rexId}/upload`, {
    method: "POST", headers: hdrs, body: form,
  });
  return handleRes<AttachmentOut>(res);
}

export async function deleteAttachment(id: number): Promise<void> {
  await fetch(`${BASE}/api/attachments/${id}`, { method: "DELETE", headers: authHeaders() });
}

export function getAttachmentDownloadUrl(id: number): string {
  return `${BASE}/api/attachments/${id}/download`;
}

/* ── REX Templates ─────────────────────────────────── */

export interface RexTemplateOut {
  id: number;
  name: string;
  description: string;
  category: string;
  fields_json: string;
  is_system: boolean;
  created_at: string;
}

export async function getTemplates(): Promise<RexTemplateOut[]> {
  const res = await fetch(`${BASE}/api/templates`, { headers: authHeaders() });
  return handleRes<RexTemplateOut[]>(res);
}

export async function getTemplate(id: number): Promise<RexTemplateOut> {
  const res = await fetch(`${BASE}/api/templates/${id}`, { headers: authHeaders() });
  return handleRes<RexTemplateOut>(res);
}

export async function createTemplate(data: { name: string; description?: string; category?: string; fields_json?: string }): Promise<RexTemplateOut> {
  const res = await fetch(`${BASE}/api/templates`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<RexTemplateOut>(res);
}

/* ── Trending ──────────────────────────────────────── */

export async function getTrending(days?: number, limit?: number): Promise<RexOut[]> {
  const sp = new URLSearchParams();
  if (days) sp.set("days", String(days));
  if (limit) sp.set("limit", String(limit));
  const res = await fetch(`${BASE}/api/learnings/trending?${sp}`, { headers: authHeaders() });
  return handleRes<RexOut[]>(res);
}

/* ── Chat Threads ──────────────────────────────────── */

export interface ChatThreadOut {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageOut {
  id: number;
  thread_id: number;
  role: string;
  content: string;
  references_json: string;
  created_at: string;
}

export interface ChatThreadDetail extends ChatThreadOut {
  messages: ChatMessageOut[];
}

export async function getChatThreads(): Promise<ChatThreadOut[]> {
  const res = await fetch(`${BASE}/api/ai/threads`, { headers: authHeaders() });
  return handleRes<ChatThreadOut[]>(res);
}

export async function getChatThread(id: number): Promise<ChatThreadDetail> {
  const res = await fetch(`${BASE}/api/ai/threads/${id}`, { headers: authHeaders() });
  return handleRes<ChatThreadDetail>(res);
}

export async function deleteChatThread(id: number): Promise<void> {
  await fetch(`${BASE}/api/ai/threads/${id}`, { method: "DELETE", headers: authHeaders() });
}

export async function aiChatWithThread(question: string, threadId?: number): Promise<{ answer: string; references: { id: number; title: string; author?: string; department?: string }[]; thread_id: number }> {
  const body: Record<string, unknown> = { question };
  if (threadId) body.thread_id = threadId;
  const res = await fetch(`${BASE}/api/ai/chat`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleRes<{ answer: string; references: { id: number; title: string; author?: string; department?: string }[]; thread_id: number }>(res);
}

/* ── Endorsements ──────────────────────────────────── */

export interface SkillEndorsementOut {
  skill: SkillOut;
  count: number;
  endorsed_by_me: boolean;
}

export async function endorseUser(userId: number, skillId: number): Promise<void> {
  await fetch(`${BASE}/api/users/${userId}/endorse`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ skill_id: skillId }),
  });
}

export async function removeEndorsement(userId: number, skillId: number): Promise<void> {
  await fetch(`${BASE}/api/users/${userId}/endorse/${skillId}`, { method: "DELETE", headers: authHeaders() });
}

export async function getUserEndorsements(userId: number): Promise<SkillEndorsementOut[]> {
  const res = await fetch(`${BASE}/api/users/${userId}/endorsements`, { headers: authHeaders() });
  return handleRes<SkillEndorsementOut[]>(res);
}

/* ── Badges ────────────────────────────────────────── */

export interface BadgeOut {
  id: number;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
}

export interface UserBadgeOut {
  badge: BadgeOut;
  awarded_at: string;
}

export async function getAllBadges(): Promise<BadgeOut[]> {
  const res = await fetch(`${BASE}/api/badges`, { headers: authHeaders() });
  return handleRes<BadgeOut[]>(res);
}

export async function getUserBadges(userId: number): Promise<UserBadgeOut[]> {
  const res = await fetch(`${BASE}/api/badges/users/${userId}`, { headers: authHeaders() });
  return handleRes<UserBadgeOut[]>(res);
}

export async function checkBadges(): Promise<UserBadgeOut[]> {
  const res = await fetch(`${BASE}/api/badges/check`, { method: "POST", headers: authHeaders() });
  return handleRes<UserBadgeOut[]>(res);
}

/* ── Collections ───────────────────────────────────── */

export interface CollectionOut {
  id: number;
  title: string;
  description: string;
  is_public: boolean;
  creator_id: number;
  creator_name: string;
  item_count: number;
  created_at: string;
}

export interface CollectionItemOut {
  id: number;
  rex_id: number;
  position: number;
  note: string;
  rex_title: string;
}

export interface CollectionDetail extends CollectionOut {
  items: CollectionItemOut[];
}

export async function getCollections(): Promise<CollectionOut[]> {
  const res = await fetch(`${BASE}/api/collections`, { headers: authHeaders() });
  return handleRes<CollectionOut[]>(res);
}

export async function getCollection(id: number): Promise<CollectionDetail> {
  const res = await fetch(`${BASE}/api/collections/${id}`, { headers: authHeaders() });
  return handleRes<CollectionDetail>(res);
}

export async function createCollection(data: { title: string; description?: string; is_public?: boolean }): Promise<CollectionOut> {
  const res = await fetch(`${BASE}/api/collections`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<CollectionOut>(res);
}

export async function updateCollection(id: number, data: { title?: string; description?: string; is_public?: boolean }): Promise<CollectionOut> {
  const res = await fetch(`${BASE}/api/collections/${id}`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<CollectionOut>(res);
}

export async function deleteCollection(id: number): Promise<void> {
  await fetch(`${BASE}/api/collections/${id}`, { method: "DELETE", headers: authHeaders() });
}

export async function addToCollection(collectionId: number, rexId: number, note?: string): Promise<void> {
  await fetch(`${BASE}/api/collections/${collectionId}/items`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ rex_id: rexId, note: note || "" }),
  });
}

export async function removeFromCollection(collectionId: number, itemId: number): Promise<void> {
  await fetch(`${BASE}/api/collections/${collectionId}/items/${itemId}`, { method: "DELETE", headers: authHeaders() });
}

/* ── Compliance ────────────────────────────────────── */

export async function getMandatoryRex(): Promise<RexOut[]> {
  const res = await fetch(`${BASE}/api/compliance/mandatory`, { headers: authHeaders() });
  return handleRes<RexOut[]>(res);
}

export async function attestRex(rexId: number): Promise<void> {
  await fetch(`${BASE}/api/compliance/attest/${rexId}`, { method: "POST", headers: authHeaders() });
}

/* ── Moderation ────────────────────────────────────── */

export async function flagRex(rexId: number, reason: string): Promise<void> {
  await fetch(`${BASE}/api/learnings/${rexId}/flag`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify({ reason }),
  });
}

export async function getModerationQueue(): Promise<unknown[]> {
  const res = await fetch(`${BASE}/api/admin/moderation`, { headers: authHeaders() });
  return handleRes<unknown[]>(res);
}

export async function approveRex(rexId: number): Promise<void> {
  await fetch(`${BASE}/api/admin/moderation/${rexId}/approve`, { method: "POST", headers: authHeaders() });
}

export async function rejectRex(rexId: number): Promise<void> {
  await fetch(`${BASE}/api/admin/moderation/${rexId}/reject`, { method: "POST", headers: authHeaders() });
}

/* ── Roles ─────────────────────────────────────────── */

export interface RoleOut {
  id: number;
  name: string;
  permissions_json: string;
}

export async function getRoles(): Promise<RoleOut[]> {
  const res = await fetch(`${BASE}/api/admin/roles`, { headers: authHeaders() });
  return handleRes<RoleOut[]>(res);
}

export async function createRole(data: { name: string; permissions_json?: string }): Promise<RoleOut> {
  const res = await fetch(`${BASE}/api/admin/roles`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<RoleOut>(res);
}

export async function assignRole(userId: number, roleId: number): Promise<void> {
  await fetch(`${BASE}/api/admin/roles/assign/${userId}/${roleId}`, { method: "POST", headers: authHeaders() });
}

/* ── Shared Links ──────────────────────────────────── */

export interface SharedLinkOut {
  id: number;
  rex_id: number;
  token: string;
  expires_at: string | null;
  has_password: boolean;
  created_at: string;
}

export async function createShareLink(rexId: number, expiresHours?: number, password?: string): Promise<SharedLinkOut> {
  const body: Record<string, unknown> = {};
  if (expiresHours) body.expires_hours = expiresHours;
  if (password) body.password = password;
  const res = await fetch(`${BASE}/api/shared/learnings/${rexId}`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleRes<SharedLinkOut>(res);
}

export async function getSharedRex(token: string, password?: string): Promise<RexOut> {
  const sp = password ? `?password=${encodeURIComponent(password)}` : "";
  const res = await fetch(`${BASE}/api/shared/${token}${sp}`);
  return handleRes<RexOut>(res);
}

/* ── Email Preferences ─────────────────────────────── */

export interface EmailPreferenceOut {
  weekly_digest: boolean;
  new_from_followed: boolean;
  saved_search_alerts: boolean;
}

export async function getEmailPreferences(): Promise<EmailPreferenceOut> {
  const res = await fetch(`${BASE}/api/users/me/email-preferences`, { headers: authHeaders() });
  return handleRes<EmailPreferenceOut>(res);
}

export async function updateEmailPreferences(data: Partial<EmailPreferenceOut>): Promise<EmailPreferenceOut> {
  const res = await fetch(`${BASE}/api/users/me/email-preferences`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(data),
  });
  return handleRes<EmailPreferenceOut>(res);
}

/* ── Admin Analytics ───────────────────────────────── */

export async function getAdminAnalytics(): Promise<unknown> {
  const res = await fetch(`${BASE}/api/admin/analytics`, { headers: authHeaders() });
  return handleRes<unknown>(res);
}

export async function getAdminAuditLog(params?: { page?: number; action?: string; user_id?: number }): Promise<unknown[]> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.action) sp.set("action", params.action);
  if (params?.user_id) sp.set("user_id", String(params.user_id));
  const res = await fetch(`${BASE}/api/admin/audit-log?${sp}`, { headers: authHeaders() });
  return handleRes<unknown[]>(res);
}

export async function getContentHealth(): Promise<unknown[]> {
  const res = await fetch(`${BASE}/api/admin/content-health`, { headers: authHeaders() });
  return handleRes<unknown[]>(res);
}

/* ── Bulk Import ───────────────────────────────────── */

export function getImportTemplateUrl(): string {
  return `${BASE}/api/admin/import/template`;
}

export async function importPreview(file: File): Promise<unknown[]> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const hdrs: Record<string, string> = {};
  if (token) hdrs["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/admin/import/preview`, { method: "POST", headers: hdrs, body: form });
  return handleRes<unknown[]>(res);
}

export async function importExecute(file: File): Promise<{ created: number; skipped: number; errors: string[] }> {
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const hdrs: Record<string, string> = {};
  if (token) hdrs["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/admin/import/execute`, { method: "POST", headers: hdrs, body: form });
  return handleRes<{ created: number; skipped: number; errors: string[] }>(res);
}
