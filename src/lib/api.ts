import { 
  PublicWebApp, 
  AdminWebApp, 
  DashboardStats, 
  AuthResponse,
  SiteSettings,
  Achievement,
  AchievementMessage,
  TeamMember,
  OtherAdminUser,
  AdminPermission,
  NoticeMessage,
  AdminUser,
} from '../types.ts';

const TOKEN_KEY = 'web_app_admin_token';
const USER_KEY = 'web_app_admin_user';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(auth: AuthResponse | null) {
  try {
    if (auth) {
      localStorage.setItem(TOKEN_KEY, auth.token);
      localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.error('Failed to update auth storage:', err);
  }
}

export function getStoredUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getHeaders(authRequired = false): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authRequired) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Safely parse JSON responses from the server.
 * If the server returns HTML or non-JSON (e.g. Vercel 404, 502 Bad Gateway, or CDN error page),
 * it displays a clean "Server/API is unavailable. Please try again." message instead of
 * crashing with "Unexpected token 'T'".
 */
async function safeJsonParse<T = any>(res: Response, defaultError = 'Request failed'): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    throw new Error('Server/API is unavailable. Please try again.');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Server/API is unavailable. Please try again.');
  }

  if (!res.ok) {
    throw new Error(data?.error || defaultError);
  }

  return data as T;
}

async function safeEmptyParse(res: Response, defaultError = 'Request failed'): Promise<void> {
  if (res.ok) return;

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Server/API is unavailable. Please try again.');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Server/API is unavailable. Please try again.');
  }

  throw new Error(data?.error || defaultError);
}

// Public API
export async function fetchPublicWebApps(): Promise<PublicWebApp[]> {
  const res = await fetch('/api/webapps');
  return safeJsonParse<PublicWebApp[]>(res, 'Failed to fetch web apps');
}

export async function launchServer(webAppId: string, serverId: string): Promise<string> {
  const res = await fetch(`/api/webapps/${encodeURIComponent(webAppId)}/servers/${encodeURIComponent(serverId)}/launch`);
  const data = await safeJsonParse<{ url: string }>(res, 'Failed to get server launch URL');
  return data.url;
}

// Auth API
export async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email, password }),
  });

  const data = await safeJsonParse<AuthResponse>(res, 'Authentication failed');
  setAuthSession(data);
  return data;
}

export async function checkAuthMe(): Promise<AdminUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: getHeaders(true),
    });
    if (!res.ok) {
      setAuthSession(null);
      return null;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return getStoredUser();
    }
    const data = await res.json();
    if (data.user) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {}
      return data.user as AdminUser;
    }
    return getStoredUser();
  } catch {
    return null;
  }
}

// Admin API
export async function fetchAdminStats(): Promise<DashboardStats> {
  const res = await fetch('/api/admin/stats', {
    headers: getHeaders(true),
  });
  return safeJsonParse<DashboardStats>(res, 'Failed to fetch dashboard statistics');
}

export async function fetchAdminWebApps(): Promise<AdminWebApp[]> {
  const res = await fetch('/api/admin/webapps', {
    headers: getHeaders(true),
  });
  return safeJsonParse<AdminWebApp[]>(res, 'Failed to fetch admin web apps');
}

export async function createAdminWebApp(payload: {
  name: string;
  icon: string;
  servers: Array<{ url: string; category: string; isActive?: boolean }>;
}): Promise<AdminWebApp> {
  const res = await fetch('/api/admin/webapps', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<AdminWebApp>(res, 'Failed to create web app');
}

export async function updateAdminWebApp(
  id: string,
  payload: {
    name: string;
    icon: string;
    servers: Array<{ id?: string; url: string; category: string; isActive?: boolean }>;
  }
): Promise<AdminWebApp> {
  const res = await fetch(`/api/admin/webapps/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<AdminWebApp>(res, 'Failed to update web app');
}

export async function updateServerStatus(serverId: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> {
  const res = await fetch(`/api/admin/servers/${encodeURIComponent(serverId)}/status`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({ isActive }),
  });
  return safeJsonParse<{ id: string; isActive: boolean }>(res, 'Failed to update server status');
}

export async function deleteAdminWebApp(id: string): Promise<void> {
  const res = await fetch(`/api/admin/webapps/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  return safeEmptyParse(res, 'Failed to delete web app');
}

// Site Settings API
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await fetch('/api/settings');
  return safeJsonParse<SiteSettings>(res, 'Failed to fetch site settings');
}

export async function fetchAdminSettings(): Promise<SiteSettings> {
  const res = await fetch('/api/admin/settings', {
    headers: getHeaders(true),
  });
  return safeJsonParse<SiteSettings>(res, 'Failed to fetch admin settings');
}

export async function saveAdminSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const res = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(settings),
  });
  return safeJsonParse<SiteSettings>(res, 'Failed to save site settings');
}

// Achievements API
export async function fetchPublicAchievements(): Promise<Achievement[]> {
  const res = await fetch('/api/achievements');
  return safeJsonParse<Achievement[]>(res, 'Failed to fetch achievements');
}

export async function fetchPublicAchievementMessage(): Promise<AchievementMessage> {
  const res = await fetch('/api/achievements/message');
  return safeJsonParse<AchievementMessage>(res, 'Failed to fetch achievement message');
}

export async function fetchAdminAchievements(): Promise<Achievement[]> {
  const res = await fetch('/api/admin/achievements', {
    headers: getHeaders(true),
  });
  return safeJsonParse<Achievement[]>(res, 'Failed to fetch admin achievements');
}

export async function fetchAdminAchievementMessage(): Promise<AchievementMessage> {
  const res = await fetch('/api/admin/achievements/message', {
    headers: getHeaders(true),
  });
  return safeJsonParse<AchievementMessage>(res, 'Failed to fetch admin achievement message');
}

export async function saveAdminAchievementMessage(payload: { title: string; content: string }): Promise<AchievementMessage> {
  const res = await fetch('/api/admin/achievements/message', {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<AchievementMessage>(res, 'Failed to save achievement message');
}

export async function createAchievement(payload: { imageUrl: string; comment: string; isPinned?: boolean }): Promise<Achievement> {
  const res = await fetch('/api/admin/achievements', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<Achievement>(res, 'Failed to create achievement');
}

export async function updateAchievement(id: string, payload: { imageUrl: string; comment: string; isPinned?: boolean }): Promise<Achievement> {
  const res = await fetch(`/api/admin/achievements/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<Achievement>(res, 'Failed to update achievement');
}

export async function toggleAchievementPin(id: string, isPinned?: boolean): Promise<Achievement> {
  const res = await fetch(`/api/admin/achievements/${encodeURIComponent(id)}/pin`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ isPinned }),
  });
  return safeJsonParse<Achievement>(res, 'Failed to update pin status');
}

export async function deleteAchievement(id: string): Promise<void> {
  const res = await fetch(`/api/admin/achievements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  return safeEmptyParse(res, 'Failed to delete achievement');
}

// Team Members API
export async function fetchPublicTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/team-members');
  return safeJsonParse<TeamMember[]>(res, 'Failed to fetch team members');
}

export async function fetchAdminTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/admin/team-members', {
    headers: getHeaders(true),
  });
  return safeJsonParse<TeamMember[]>(res, 'Failed to fetch admin team members');
}

export async function createTeamMember(payload: {
  name: string;
  role: string;
  description?: string;
  photo?: string;
  sortOrder?: number;
  socialLinks?: any[];
}): Promise<TeamMember> {
  const res = await fetch('/api/admin/team-members', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<TeamMember>(res, 'Failed to create team member');
}

export async function updateTeamMember(id: string, payload: {
  name?: string;
  role?: string;
  description?: string;
  photo?: string;
  sortOrder?: number;
  socialLinks?: any[];
}): Promise<TeamMember> {
  const res = await fetch(`/api/admin/team-members/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<TeamMember>(res, 'Failed to update team member');
}

export async function deleteTeamMember(id: string): Promise<void> {
  let res = await fetch(`/api/admin/team-members/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  if (!res.ok && res.status === 404) {
    res = await fetch(`/api/team-members/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
  }
  return safeEmptyParse(res, 'Failed to delete team member');
}

export async function reorderTeamMembers(ids: string[]): Promise<TeamMember[]> {
  const res = await fetch('/api/admin/team-members/reorder', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ ids }),
  });
  const data = await safeJsonParse<{ members: TeamMember[] }>(res, 'Failed to reorder team members');
  return data.members;
}

// ==========================================
// MESSAGE / NOTICE API METHODS
// ==========================================

export async function fetchPublicMessages(): Promise<NoticeMessage[]> {
  const res = await fetch('/api/messages');
  return safeJsonParse<NoticeMessage[]>(res, 'Failed to fetch notices/messages');
}

export async function fetchAdminMessages(): Promise<NoticeMessage[]> {
  const res = await fetch('/api/admin/messages', {
    headers: getHeaders(true),
  });
  return safeJsonParse<NoticeMessage[]>(res, 'Failed to fetch admin notices/messages');
}

export async function createMessage(payload: {
  title: string;
  content: string;
  isPublished?: boolean;
  linkUrl?: string;
  linkLabel?: string;
}): Promise<NoticeMessage> {
  const res = await fetch('/api/admin/messages', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<NoticeMessage>(res, 'Failed to create notice/message');
}

export async function updateMessage(id: string, payload: {
  title?: string;
  content?: string;
  isPublished?: boolean;
  linkUrl?: string;
  linkLabel?: string;
  sortOrder?: number;
}): Promise<NoticeMessage> {
  const res = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<NoticeMessage>(res, 'Failed to update notice/message');
}

export async function deleteMessage(id: string): Promise<void> {
  const res = await fetch(`/api/admin/messages/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  return safeEmptyParse(res, 'Failed to delete notice/message');
}

export async function publishMessage(id: string, isPublished: boolean): Promise<NoticeMessage> {
  const res = await fetch(`/api/admin/messages/${encodeURIComponent(id)}/publish`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify({ isPublished }),
  });
  return safeJsonParse<NoticeMessage>(res, 'Failed to update notice publication status');
}

export async function reorderMessages(ids: string[]): Promise<NoticeMessage[]> {
  const res = await fetch('/api/admin/messages/reorder', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ ids }),
  });
  const data = await safeJsonParse<{ messages: NoticeMessage[] }>(res, 'Failed to reorder notices/messages');
  return data.messages;
}

// Other Admins Management API (MAIN ADMIN only)
export async function fetchOtherAdmins(): Promise<OtherAdminUser[]> {
  const res = await fetch('/api/admin/other-admins', {
    headers: getHeaders(true),
  });
  return safeJsonParse<OtherAdminUser[]>(res, 'Failed to fetch other admins');
}

export async function createOtherAdmin(payload: {
  username: string;
  password: string;
  permissions: AdminPermission[];
  isActive?: boolean;
}): Promise<OtherAdminUser> {
  const res = await fetch('/api/admin/other-admins', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<OtherAdminUser>(res, 'Failed to create other admin');
}

export async function updateOtherAdmin(
  id: string,
  payload: {
    username?: string;
    password?: string;
    permissions?: AdminPermission[];
    isActive?: boolean;
  }
): Promise<OtherAdminUser> {
  const res = await fetch(`/api/admin/other-admins/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  return safeJsonParse<OtherAdminUser>(res, 'Failed to update other admin');
}

export async function toggleOtherAdminStatus(id: string, isActive?: boolean): Promise<OtherAdminUser> {
  const res = await fetch(`/api/admin/other-admins/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({ isActive }),
  });
  return safeJsonParse<OtherAdminUser>(res, 'Failed to toggle admin status');
}

export async function deleteOtherAdmin(id: string): Promise<void> {
  const res = await fetch(`/api/admin/other-admins/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  return safeEmptyParse(res, 'Failed to delete other admin');
}
