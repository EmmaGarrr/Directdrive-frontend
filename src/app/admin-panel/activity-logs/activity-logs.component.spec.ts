import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ActivityLogsComponent } from './activity-logs.component';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminActivityLog, AdminActivityLogResponse } from '../../models/admin.model';

describe('ActivityLogsComponent', () => {
  let component: ActivityLogsComponent;
  let fixture: ComponentFixture<ActivityLogsComponent>;
  let adminAuthService: jasmine.SpyObj<AdminAuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockAdminAuthService = {
    getActivityLogs: jasmine.createSpy('getActivityLogs'),
    isAdminAuthenticated: jasmine.createSpy('isAdminAuthenticated')
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  const mockLogs: AdminActivityLog[] = [
    {
      id: '1',
      admin_email: 'admin@test.com',
      action: 'login',
      timestamp: '2024-01-15T10:30:00Z',
      ip_address: '192.168.1.1',
      endpoint: '/api/v1/admin/auth/token',
      details: 'Admin login successful'
    },
    {
      id: '2',
      admin_email: 'superadmin@test.com',
      action: 'create_admin',
      timestamp: '2024-01-15T11:00:00Z',
      ip_address: '192.168.1.2',
      endpoint: '/api/v1/admin/auth/create-admin',
      details: 'Created new admin user'
    }
  ];

  const mockResponse: AdminActivityLogResponse = {
    logs: mockLogs,
    total: 2,
    limit: 25,
    skip: 0
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActivityLogsComponent ],
      providers: [
        { provide: AdminAuthService, useValue: mockAdminAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivityLogsComponent);
    component = fixture.componentInstance;
    adminAuthService = TestBed.inject(AdminAuthService) as jasmine.SpyObj<AdminAuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.logs).toEqual([]);
    expect(component.loading).toBeFalsy();
    expect(component.error).toBe('');
    expect(component.currentPage).toBe(1);
    expect(component.limit).toBe(25);
    expect(component.total).toBe(0);
    expect(component.totalPages).toBe(0);
  });

  it('should redirect to admin login if not authenticated', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(false);
    
    component.ngOnInit();
    
    expect(router.navigate).toHaveBeenCalledWith(['/admin-login']);
  });

  it('should load activity logs on initialization', fakeAsync(() => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.getActivityLogs.and.returnValue(of(mockResponse));
    
    component.ngOnInit();
    tick();
    
    expect(adminAuthService.getActivityLogs).toHaveBeenCalledWith(25, 0);
    expect(component.logs).toEqual(mockLogs);
    expect(component.total).toBe(2);
    expect(component.totalPages).toBe(1);
    expect(component.loading).toBeFalsy();
  }));

  it('should handle loading error', fakeAsync(() => {
    const errorMessage = 'Failed to load activity logs';
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.getActivityLogs.and.returnValue(throwError(() => new Error(errorMessage)));
    
    component.ngOnInit();
    tick();
    
    expect(component.error).toBe(errorMessage);
    expect(component.loading).toBeFalsy();
  }));

  it('should extract filter options from logs', fakeAsync(() => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.getActivityLogs.and.returnValue(of(mockResponse));
    
    component.ngOnInit();
    tick();
    
    expect(component.availableActions).toEqual(['create_admin', 'login']);
    expect(component.availableAdmins).toEqual(['admin@test.com', 'superadmin@test.com']);
  }));

  it('should filter logs by action', () => {
    component.logs = mockLogs;
    component.selectedAction = 'login';
    
    const filteredLogs = component.getFilteredLogs();
    
    expect(filteredLogs.length).toBe(1);
    expect(filteredLogs[0].action).toBe('login');
  });

  it('should filter logs by admin email', () => {
    component.logs = mockLogs;
    component.selectedAdmin = 'admin@test.com';
    
    const filteredLogs = component.getFilteredLogs();
    
    expect(filteredLogs.length).toBe(1);
    expect(filteredLogs[0].admin_email).toBe('admin@test.com');
  });

  it('should filter logs by date range', () => {
    component.logs = mockLogs;
    component.dateFrom = '2024-01-15T10:00:00Z';
    component.dateTo = '2024-01-15T10:45:00Z';
    
    const filteredLogs = component.getFilteredLogs();
    
    expect(filteredLogs.length).toBe(1);
    expect(filteredLogs[0].action).toBe('login');
  });

  it('should combine multiple filters', () => {
    component.logs = mockLogs;
    component.selectedAction = 'login';
    component.selectedAdmin = 'admin@test.com';
    
    const filteredLogs = component.getFilteredLogs();
    
    expect(filteredLogs.length).toBe(1);
    expect(filteredLogs[0].action).toBe('login');
    expect(filteredLogs[0].admin_email).toBe('admin@test.com');
  });

  it('should change page and reload logs', fakeAsync(() => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.getActivityLogs.and.returnValue(of(mockResponse));
    
    component.ngOnInit();
    tick();
    
    const newResponse = { ...mockResponse, skip: 25 };
    mockAdminAuthService.getActivityLogs.and.returnValue(of(newResponse));
    
    component.onPageChange(2);
    tick();
    
    expect(component.currentPage).toBe(2);
    expect(adminAuthService.getActivityLogs).toHaveBeenCalledWith(25, 25);
  }));

  it('should not change page if invalid', () => {
    component.totalPages = 5;
    component.currentPage = 1;
    
    component.onPageChange(0); // Invalid page
    expect(component.currentPage).toBe(1);
    
    component.onPageChange(6); // Invalid page
    expect(component.currentPage).toBe(1);
  });

  it('should reset filters and reload', fakeAsync(() => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.getActivityLogs.and.returnValue(of(mockResponse));
    
    component.selectedAction = 'login';
    component.selectedAdmin = 'admin@test.com';
    component.dateFrom = '2024-01-15';
    component.dateTo = '2024-01-16';
    component.currentPage = 2;
    
    component.clearFilters();
    tick();
    
    expect(component.selectedAction).toBe('');
    expect(component.selectedAdmin).toBe('');
    expect(component.dateFrom).toBe('');
    expect(component.dateTo).toBe('');
    expect(component.currentPage).toBe(1);
  }));

  it('should refresh logs', fakeAsync(() => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.getActivityLogs.and.returnValue(of(mockResponse));
    
    component.currentPage = 2;
    component.refreshLogs();
    tick();
    
    expect(component.currentPage).toBe(1);
    expect(adminAuthService.getActivityLogs).toHaveBeenCalledWith(25, 0);
  }));

  it('should provide action badge classes', () => {
    expect(component.getActionBadgeClass('login')).toContain('bg-green-100');
    expect(component.getActionBadgeClass('login_failed')).toContain('bg-red-100');
    expect(component.getActionBadgeClass('create_admin')).toContain('bg-blue-100');
    expect(component.getActionBadgeClass('view_profile')).toContain('bg-gray-100');
    expect(component.getActionBadgeClass('unknown_action')).toContain('bg-gray-100');
  });

  it('should format action names', () => {
    expect(component.formatAction('login')).toBe('Login');
    expect(component.formatAction('create_admin')).toBe('Create Admin');
    expect(component.formatAction('view_activity_logs')).toBe('View Activity Logs');
  });

  it('should format timestamps', () => {
    const timestamp = '2024-01-15T10:30:00Z';
    const formatted = component.formatTimestamp(timestamp);
    
    expect(formatted).toContain('2024');
    expect(formatted).toContain('10:30');
  });

  it('should navigate back to admin panel', () => {
    component.goBack();
    
    expect(router.navigate).toHaveBeenCalledWith(['/admin-panel']);
  });

  it('should export logs as CSV', () => {
    component.logs = mockLogs;
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:url');
    spyOn(window.URL, 'revokeObjectURL');
    spyOn(document, 'createElement').and.returnValue({
      href: '',
      download: '',
      click: jasmine.createSpy('click')
    } as any);
    
    component.exportLogs();
    
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should update pagination pages', () => {
    component.totalPages = 10;
    component.updatePaginationPages();
    
    expect(component.paginationPages.length).toBe(5);
    expect(component.paginationPages[0]).toBe(1);
    expect(component.paginationPages[4]).toBe(5);
  });

  it('should limit pagination pages to total pages', () => {
    component.totalPages = 3;
    component.updatePaginationPages();
    
    expect(component.paginationPages.length).toBe(3);
    expect(component.paginationPages[2]).toBe(3);
  });
}); 