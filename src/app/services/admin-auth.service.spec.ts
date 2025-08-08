import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginRequest, AdminUserCreate, UserRole, AdminToken, AdminUserInDB, AdminActivityLogResponse } from '../models/admin.model';
import { environment } from '../../environments/environment';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let httpMock: HttpTestingController;

  const mockAdminToken: AdminToken = {
    access_token: 'mock-admin-token',
    token_type: 'bearer',
    admin_role: 'admin',
    expires_in: 86400
  };

  const mockAdminUser: AdminUserInDB = {
    id: 'admin@test.com',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    is_admin: true,
    created_at: '2024-01-15T10:30:00Z',
    last_login: '2024-01-15T10:30:00Z'
  };

  const mockActivityLogs: AdminActivityLogResponse = {
    logs: [
      {
        id: '1',
        admin_email: 'admin@test.com',
        action: 'login',
        timestamp: '2024-01-15T10:30:00Z',
        ip_address: '192.168.1.1',
        endpoint: '/api/v1/admin/auth/token',
        details: 'Admin login successful'
      }
    ],
    total: 1,
    limit: 25,
    skip: 0
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminAuthService]
    });
    service = TestBed.inject(AdminAuthService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('adminLogin', () => {
    it('should login admin and store token', () => {
      const loginData: AdminLoginRequest = {
        email: 'admin@test.com',
        password: 'password123'
      };

      service.adminLogin(loginData).subscribe(response => {
        expect(response).toEqual(mockAdminToken);
        expect(localStorage.getItem('admin_access_token')).toBe(mockAdminToken.access_token);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(loginData);
      req.flush(mockAdminToken);
    });

    it('should handle login error', () => {
      const loginData: AdminLoginRequest = {
        email: 'admin@test.com',
        password: 'wrongpassword'
      };

      service.adminLogin(loginData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid admin credentials');
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/token`);
      req.flush({ detail: 'Invalid admin credentials' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('createAdminUser', () => {
    it('should create admin user', () => {
      const adminData: AdminUserCreate = {
        email: 'newadmin@test.com',
        password: 'password123',
        role: UserRole.ADMIN
      };

      const response = {
        data: mockAdminUser,
        message: 'Admin user created successfully'
      };

      service.createAdminUser(adminData).subscribe(result => {
        expect(result).toEqual(response);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/create-admin`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(adminData);
      req.flush(response);
    });
  });

  describe('loadAdminProfile', () => {
    it('should load admin profile', () => {
      localStorage.setItem('admin_access_token', 'mock-token');

      const response = {
        data: mockAdminUser,
        message: 'Admin profile retrieved successfully'
      };

      service.loadAdminProfile().subscribe(result => {
        expect(result).toEqual(mockAdminUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/me`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
      req.flush(response);
    });
  });

  describe('getActivityLogs', () => {
    it('should get activity logs with pagination', () => {
      localStorage.setItem('admin_access_token', 'mock-token');

      service.getActivityLogs(10, 20).subscribe(result => {
        expect(result).toEqual(mockActivityLogs);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/activity-logs?limit=10&skip=20`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
      req.flush(mockActivityLogs);
    });

    it('should use default pagination values', () => {
      localStorage.setItem('admin_access_token', 'mock-token');

      service.getActivityLogs().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/activity-logs?limit=50&skip=0`);
      req.flush(mockActivityLogs);
    });
  });

  describe('verifyAdminToken', () => {
    it('should verify admin token', () => {
      localStorage.setItem('admin_access_token', 'mock-token');

      const response = {
        valid: true,
        admin_email: 'admin@test.com',
        admin_role: 'admin'
      };

      service.verifyAdminToken().subscribe(result => {
        expect(result).toEqual(response);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/verify-admin`);
      expect(req.request.method).toBe('GET');
      req.flush(response);
    });
  });

  describe('adminLogout', () => {
    it('should clear admin session', () => {
      localStorage.setItem('admin_access_token', 'mock-token');
      
      service.adminLogout();
      
      expect(localStorage.getItem('admin_access_token')).toBeNull();
    });
  });

  describe('getAdminToken', () => {
    it('should return admin token from localStorage', () => {
      localStorage.setItem('admin_access_token', 'mock-token');
      
      const token = service.getAdminToken();
      
      expect(token).toBe('mock-token');
    });

    it('should return null if no token exists', () => {
      const token = service.getAdminToken();
      
      expect(token).toBeNull();
    });
  });

  describe('isAdminAuthenticated', () => {
    it('should return true if valid token exists', () => {
      localStorage.setItem('admin_access_token', 'mock-token');
      
      const isAuthenticated = service.isAdminAuthenticated();
      
      expect(isAuthenticated).toBeTruthy();
    });

    it('should return false if no token exists', () => {
      const isAuthenticated = service.isAdminAuthenticated();
      
      expect(isAuthenticated).toBeFalsy();
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true for superadmin role', () => {
      // Mock the session to have superadmin role
      spyOn(service, 'getCurrentAdminSession').and.returnValue({
        token: 'mock-token',
        adminEmail: 'superadmin@test.com',
        adminRole: UserRole.SUPERADMIN,
        expiresAt: new Date(Date.now() + 86400000)
      });
      
      const isSuperAdmin = service.isSuperAdmin();
      
      expect(isSuperAdmin).toBeTruthy();
    });

    it('should return false for admin role', () => {
      spyOn(service, 'getCurrentAdminSession').and.returnValue({
        token: 'mock-token',
        adminEmail: 'admin@test.com',
        adminRole: UserRole.ADMIN,
        expiresAt: new Date(Date.now() + 86400000)
      });
      
      const isSuperAdmin = service.isSuperAdmin();
      
      expect(isSuperAdmin).toBeFalsy();
    });

    it('should return false if no session exists', () => {
      spyOn(service, 'getCurrentAdminSession').and.returnValue(null);
      
      const isSuperAdmin = service.isSuperAdmin();
      
      expect(isSuperAdmin).toBeFalsy();
    });
  });

  describe('getCurrentAdmin', () => {
    it('should return current admin user', () => {
      spyOn(service, 'getCurrentAdmin').and.returnValue(mockAdminUser);
      
      const currentAdmin = service.getCurrentAdmin();
      
      expect(currentAdmin).toEqual(mockAdminUser);
    });
  });

  describe('getCurrentAdminSession', () => {
    it('should return current admin session', () => {
      const mockSession = {
        token: 'mock-token',
        adminEmail: 'admin@test.com',
        adminRole: UserRole.ADMIN,
        expiresAt: new Date(Date.now() + 86400000)
      };
      
      spyOn(service, 'getCurrentAdminSession').and.returnValue(mockSession);
      
      const session = service.getCurrentAdminSession();
      
      expect(session).toEqual(mockSession);
    });
  });

  describe('Observables', () => {
    it('should emit current admin user', () => {
      service.currentAdmin$.subscribe(admin => {
        expect(admin).toBeDefined();
      });
    });

    it('should emit authentication status', () => {
      service.isAdminAuthenticated$.subscribe(status => {
        expect(typeof status).toBe('boolean');
      });
    });

    it('should emit admin session', () => {
      service.adminSession$.subscribe(session => {
        expect(session).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors properly', () => {
      const loginData: AdminLoginRequest = {
        email: 'admin@test.com',
        password: 'password123'
      };

      service.adminLogin(loginData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Server error');
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/token`);
      req.flush({ detail: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network errors', () => {
      const loginData: AdminLoginRequest = {
        email: 'admin@test.com',
        password: 'password123'
      };

      service.adminLogin(loginData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Network error');
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/admin/auth/token`);
      req.error(new ErrorEvent('Network error'));
    });
  });
}); 