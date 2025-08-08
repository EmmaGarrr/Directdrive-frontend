import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from '../services/admin-auth.service';

describe('AdminAuthGuard', () => {
  let guard: AdminAuthGuard;
  let adminAuthService: jasmine.SpyObj<AdminAuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockAdminAuthService = {
    isAdminAuthenticated: jasmine.createSpy('isAdminAuthenticated')
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminAuthGuard,
        { provide: AdminAuthService, useValue: mockAdminAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
    guard = TestBed.inject(AdminAuthGuard);
    adminAuthService = TestBed.inject(AdminAuthService) as jasmine.SpyObj<AdminAuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access when admin is authenticated', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);

    const result = guard.canActivate(null!, null!);

    expect(result).toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect when admin is not authenticated', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(false);

    const result = guard.canActivate(null!, null!);

    expect(result).toBeFalsy();
    expect(router.navigate).toHaveBeenCalledWith(['/admin-auth/login']);
  });

  it('should work with route snapshot', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);

    const mockRouteSnapshot = {
      url: [{ path: 'admin-auth' }],
      params: {},
      queryParams: {},
      fragment: null,
      data: {},
      outlet: 'primary',
      component: null,
      routeConfig: null,
      root: null,
      parent: null,
      firstChild: null,
      children: [],
      pathFromRoot: [],
      paramMap: null,
      queryParamMap: null,
      title: undefined
    } as any;

    const mockRouterStateSnapshot = {
      url: '/admin-auth/activity-logs',
      root: null
    } as any;

    const result = guard.canActivate(mockRouteSnapshot, mockRouterStateSnapshot);

    expect(result).toBeTruthy();
  });

  it('should work with different route configurations', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);

    // Test with different route paths
    const routes = [
      '/admin-auth/activity-logs',
      '/admin-auth/create-admin',
      '/admin-auth/login'
    ];

    routes.forEach(route => {
      const mockRouterStateSnapshot = { url: route, root: null } as any;
      const result = guard.canActivate(null!, mockRouterStateSnapshot);
      expect(result).toBeTruthy();
    });
  });

  it('should handle authentication service errors gracefully', () => {
    mockAdminAuthService.isAdminAuthenticated.and.throwError('Service error');

    const result = guard.canActivate(null!, null!);

    expect(result).toBeFalsy();
    expect(router.navigate).toHaveBeenCalledWith(['/admin-auth/login']);
  });

  it('should work with async authentication checks', (done) => {
    // Simulate async authentication check
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(Promise.resolve(true));

    const result = guard.canActivate(null!, null!);

    if (result instanceof Promise) {
      result.then(canActivate => {
        expect(canActivate).toBeTruthy();
        expect(router.navigate).not.toHaveBeenCalled();
        done();
      });
    } else {
      expect(result).toBeTruthy();
      done();
    }
  });

  it('should handle async authentication failures', (done) => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(Promise.resolve(false));

    const result = guard.canActivate(null!, null!);

    if (result instanceof Promise) {
      result.then(canActivate => {
        expect(canActivate).toBeFalsy();
        expect(router.navigate).toHaveBeenCalledWith(['/admin-auth/login']);
        done();
      });
    } else {
      expect(result).toBeFalsy();
      done();
    }
  });



  it('should be reusable across multiple route activations', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);

    // First activation
    const result1 = guard.canActivate(null!, null!);
    expect(result1).toBeTruthy();

    // Second activation
    const result2 = guard.canActivate(null!, null!);
    expect(result2).toBeTruthy();

    // Verify service was called twice
    expect(adminAuthService.isAdminAuthenticated).toHaveBeenCalledTimes(2);
  });

  it('should handle route data if provided', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);

    const mockRouteSnapshot = {
      url: [{ path: 'admin-auth' }],
      params: {},
      queryParams: {},
      fragment: null,
      data: { requiresAdmin: true, role: 'admin' },
      outlet: 'primary',
      routeConfig: null,
      root: null,
      parent: null,
      firstChild: null,
      children: [],
      pathFromRoot: [],
      paramMap: null,
      queryParamMap: null,
      component: null,
      title: undefined
    } as any;

    const result = guard.canActivate(mockRouteSnapshot, null!);

    expect(result).toBeTruthy();
  });

  it('should work with child routes', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);

    const mockRouteSnapshot = {
      url: [{ path: 'activity-logs' }],
      params: {},
      queryParams: {},
      fragment: null,
      data: {},
      outlet: 'primary',
      routeConfig: null,
      root: null,
      parent: {
        url: [{ path: 'admin-auth' }],
        data: { requiresAdmin: true }
      },
      firstChild: null,
      children: [],
      pathFromRoot: [],
      paramMap: null,
      queryParamMap: null,
      component: null,
      title: undefined
    } as any;

    const result = guard.canActivate(mockRouteSnapshot, null!);

    expect(result).toBeTruthy();
  });
}); 