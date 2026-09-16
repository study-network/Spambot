export type ServerCategory = 'Working' | 'Error' | 'Some Error' | 'Unfilter' | 'Testing';

export interface PublicServer {
  id: string;
  name: string; // Dynamic "Server 1", "Server 2", etc.
  category: ServerCategory;
}

export interface PublicWebApp {
  id: string;
  name: string;
  icon: string;
  servers: PublicServer[];
}

export interface AdminServer {
  id: string;
  webAppId: string;
  url: string;
  category: ServerCategory;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWebApp {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  servers: AdminServer[];
}

export interface DashboardStats {
  totalWebApps: number;
  totalServers: number;
  workingServers: number;
  errorServers: number;
  someErrorServers: number;
  unfilterServers: number;
  testingServers: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AdminUser;
}
