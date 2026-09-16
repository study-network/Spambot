export type ServerCategory = 'Working' | 'Error' | 'Some Error' | 'Unfilter' | 'Testing';

export interface PublicServer {
  id: string;
  name: string; // Dynamic "Server 1", "Server 2", etc.
  category: ServerCategory;
  isActive: boolean;
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
  isActive: boolean;
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

export type AdminRole = 'MAIN_ADMIN' | 'OTHER_ADMIN';

export type AdminPermission =
  // Web Apps
  | 'VIEW_WEBAPPS'
  | 'ADD_WEBAPP'
  | 'EDIT_WEBAPP'
  | 'DELETE_WEBAPP'
  // Servers
  | 'VIEW_SERVERS'
  | 'ADD_SERVER'
  | 'EDIT_SERVER'
  | 'DELETE_SERVER'
  | 'CHANGE_SERVER_CATEGORY'
  // Site Settings
  | 'EDIT_TELEGRAM'
  | 'EDIT_WHATSAPP'
  | 'EDIT_STAY_HAPPY'
  // About Us & Team (Granular)
  | 'VIEW_ABOUT_US_TEAM'
  | 'EDIT_ABOUT_US'
  | 'EDIT_DEVELOPER'
  | 'ADD_TEAM_MEMBER'
  | 'EDIT_TEAM_MEMBER'
  | 'DELETE_TEAM_MEMBER'
  | 'MANAGE_TEAM_SOCIAL_LINKS'
  | 'REORDER_TEAM_MEMBERS'
  // Message / Notice (Granular)
  | 'VIEW_MESSAGES'
  | 'ADD_MESSAGE'
  | 'EDIT_MESSAGE'
  | 'DELETE_MESSAGE'
  | 'PUBLISH_MESSAGE'
  | 'REORDER_MESSAGES'
  | 'MANAGE_MESSAGE_LINKS'
  // Dashboard
  | 'VIEW_DASHBOARD';

export interface NoticeMessage {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  sortOrder: number;
  linkUrl?: string;
  linkLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OtherAdminUser {
  id: string;
  username: string;
  role: 'OTHER_ADMIN';
  isActive: boolean;
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  username?: string;
  email?: string;
  role: AdminRole | string;
  isActive?: boolean;
  permissions?: AdminPermission[];
}

export interface AuthResponse {
  token: string;
  user: AdminUser;
}

export type SocialPlatform = 
  | 'telegram' 
  | 'whatsapp' 
  | 'instagram' 
  | 'youtube' 
  | 'github' 
  | 'twitter' 
  | 'facebook' 
  | 'linkedin' 
  | 'website' 
  | 'custom';

export interface SocialLink {
  id: string;
  platform: SocialPlatform | string;
  url: string;
  customName?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  description?: string;
  photo?: string;
  sortOrder?: number;
  socialLinks: SocialLink[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteSettings {
  id?: string;
  telegramUrl: string;
  whatsappUrl: string;
  aboutTitle: string;
  aboutDescription: string;
  happyTitle: string;
  happyMessage: string;
  happyIcon?: string;
  messageTitle?: string;
  messageContent?: string;
  
  // Brand / Header section
  brandName?: string;
  brandTagline?: string;
  brandLogo?: string;

  // About message section
  aboutMessageTitle?: string;
  aboutMessageSubtitle?: string;
  aboutMessageIcon?: string;

  // Developer section
  developerName?: string;
  developerRole?: string;
  developerDescription?: string;
  developerPhoto?: string;
  developerTagline?: string;
  developerSocialLinks?: SocialLink[];

  // About footer
  aboutFooterTitle?: string;
  aboutFooterSubtitle?: string;
  aboutFooterTagline?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface Achievement {
  id: string;
  imageUrl: string;
  comment: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementMessage {
  title: string;
  content: string;
  updatedAt?: string;
}
