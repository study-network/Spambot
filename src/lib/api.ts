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

export function getStoredUser() {
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

// Public API
export async function fetchPublicWebApps(): Promise<PublicWebApp[]> {
  const res = await fetch('/api/webapps');
  if (!res.ok) {
    throw new Error('Failed to fetch web apps');
  }
  return res.json();
}

export async function launchServer(webAppId: string, serverId: string): Promise<string> {
  const res = await fetch(`/api/webapps/${encodeURIComponent(webAppId)}/servers/${encodeURIComponent(serverId)}/launch`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to get server launch URL');
  }
  const data = await res.json();
  return data.url;
}

// Auth API
export async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  setAuthSession(data);
  return data;
}

export async function checkAuthMe(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const res = await fetch('/api/auth/me', {
      headers: getHeaders(true),
    });
    if (!res.ok) {
      setAuthSession(null);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Admin API
export async function fetchAdminStats(): Promise<DashboardStats> {
  const res = await fetch('/api/admin/stats', {
    headers: getHeaders(true),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch dashboard statistics');
  }
  return res.json();
}

export async function fetchAdminWebApps(): Promise<AdminWebApp[]> {
  const res = await fetch('/api/admin/webapps', {
    headers: getHeaders(true),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin web apps');
  }
  return res.json();
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create web app');
  }
  return data;
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update web app');
  }
  return data;
}

export async function updateServerStatus(serverId: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> {
  const res = await fetch(`/api/admin/servers/${encodeURIComponent(serverId)}/status`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update server status');
  }
  return data;
}

export async function deleteAdminWebApp(id: string): Promise<void> {
  const res = await fetch(`/api/admin/webapps/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete web app');
  }
}

// Site Settings API
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) {
    throw new Error('Failed to fetch site settings');
  }
  return res.json();
}

export async function fetchAdminSettings(): Promise<SiteSettings> {
  const res = await fetch('/api/admin/settings', {
    headers: getHeaders(true),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin settings');
  }
  return res.json();
}

export async function saveAdminSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const res = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save site settings');
  }
  return data;
}

// Achievements API
export async function fetchPublicAchievements(): Promise<Achievement[]> {
  const res = await fetch('/api/achievements');
  if (!res.ok) {
    throw new Error('Failed to fetch achievements');
  }
  return res.json();
}

export async function fetchPublicAchievementMessage(): Promise<AchievementMessage> {
  const res = await fetch('/api/achievements/message');
  if (!res.ok) {
    throw new Error('Failed to fetch achievement message');
  }
  return res.json();
}

export async function fetchAdminAchievements(): Promise<Achievement[]> {
  const res = await fetch('/api/admin/achievements', {
    headers: getHeaders(true),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin achievements');
  }
  return res.json();
}

export async function fetchAdminAchievementMessage(): Promise<AchievementMessage> {
  const res = await fetch('/api/admin/achievements/message', {
    headers: getHeaders(true),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin achievement message');
  }
  return res.json();
}

export async function saveAdminAchievementMessage(payload: { title: string; content: string }): Promise<AchievementMessage> {
  const res = await fetch('/api/admin/achievements/message', {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save achievement message');
  }
  return data;
}

export async function createAchievement(payload: { imageUrl: string; comment: string; isPinned?: boolean }): Promise<Achievement> {
  const res = await fetch('/api/admin/achievements', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create achievement');
  }
  return data;
}

export async function updateAchievement(id: string, payload: { imageUrl: string; comment: string; isPinned?: boolean }): Promise<Achievement> {
  const res = await fetch(`/api/admin/achievements/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update achievement');
  }
  return data;
}

export async function toggleAchievementPin(id: string, isPinned?: boolean): Promise<Achievement> {
  const res = await fetch(`/api/admin/achievements/${encodeURIComponent(id)}/pin`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ isPinned }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update pin status');
  }
  return data;
}

export async function deleteAchievement(id: string): Promise<void> {
  const res = await fetch(`/api/admin/achievements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete achievement');
  }
}

// Team Members API
export async function fetchPublicTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/team-members');
  if (!res.ok) {
    throw new Error('Failed to fetch team members');
  }
  return res.json();
}

export async function fetchAdminTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/admin/team-members', {
    headers: getHeaders(true),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin team members');
  }
  return res.json();
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create team member');
  }
  return data;
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update team member');
  }
  return data;
}

export async function deleteTeamMember(id: string): Promise<void> {
  const res = await fetch(`/api/admin/team-members/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete team member');
  }
}

export async function reorderTeamMembers(ids: string[]): Promise<TeamMember[]> {
  const res = await fetch('/api/admin/team-members/reorder', {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reorder team members');
  }
  return data.members;
}

// Other Admins Management API (MAIN ADMIN only)
export async function fetchOtherAdmins(): Promise<OtherAdminUser[]> {
  const res = await fetch('/api/admin/other-admins', {
    headers: getHeaders(true),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch other admins');
  }
  return res.json();
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create other admin');
  }
  return data;
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update other admin');
  }
  return data;
}

export async function toggleOtherAdminStatus(id: string, isActive?: boolean): Promise<OtherAdminUser> {
  const res = await fetch(`/api/admin/other-admins/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to toggle admin status');
  }
  return data;
}

export async function deleteOtherAdmin(id: string): Promise<void> {
  const res = await fetch(`/api/admin/other-admins/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete other admin');
  }
}

