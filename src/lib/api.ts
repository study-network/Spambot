import { 
  PublicWebApp, 
  AdminWebApp, 
  DashboardStats, 
  AuthResponse 
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
  servers: Array<{ url: string; category: string }>;
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
    servers: Array<{ id?: string; url: string; category: string }>;
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
