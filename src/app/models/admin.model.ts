export enum UserRole {
  REGULAR = 'regular',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin'
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminToken {
  access_token: string;
  token_type: string;
  admin_role: string;
  expires_in: number;
}

export interface AdminUserCreate {
  email: string;
  password: string;
  role: UserRole;
}

export interface AdminUserInDB {
  id: string;
  email: string;
  role: UserRole;
  is_admin: boolean;
  created_at?: string;
  last_login?: string;
}

export interface AdminActivityLog {
  id?: string;
  admin_email: string;
  action: string;
  timestamp: string;
  ip_address?: string;
  endpoint?: string;
  details?: string;
}

export interface AdminActivityLogResponse {
  logs: AdminActivityLog[];
  total: number;
  limit: number;
  skip: number;
}

export interface AdminProfileResponse {
  data: AdminUserInDB;
  message: string;
}

export interface AdminCreateResponse {
  data: AdminUserInDB;
  message: string;
}

export interface AdminTokenVerification {
  valid: boolean;
  admin_email: string;
  admin_role: string;
}

// Login credentials interface
export interface AdminLoginCredentials {
  email: string;
  password: string;
}

// Create admin form interface
export interface CreateAdminForm {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

// Admin session interface
export interface AdminSession {
  token: string;
  adminEmail: string;
  adminRole: UserRole;
  expiresAt: Date;
}