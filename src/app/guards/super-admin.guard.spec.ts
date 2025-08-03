import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SuperAdminGuard } from './super-admin.guard';
import { AdminAuthService } from '../services/admin-auth.service';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;
  let adminAuthService: jasmine.SpyObj<AdminAuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockAdminAuthService = {
    isAdminAuthenticated: jasmine.createSpy('isAdminAuthenticated'),
    isSuperAdmin: jasmine.createSpy('isSuperAdmin')
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SuperAdminGuard,
        { provide: AdminAuthService, useValue: mockAdminAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
    guard = TestBed.inject(SuperAdminGuard);
    adminAuthService = TestBed.inject(AdminAuthService) as jasmine.SpyObj<AdminAuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access when user is superadmin', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);

    const result = guard.canActivate(null!, null!);

    expect(result).toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to admin login when not authenticated', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(false);

    const result = guard.canActivate(null!, null!);

    expect(result).toBeFalsy();
    expect(router.navigate).toHaveBeenCalledWith(['/admin-auth/login']);
    expect(adminAuthService.isSuperAdmin).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to admin panel when authenticated but not superadmin', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.isSuperAdmin.and.returnValue(false);

    const result = guard.canActivate(null!, null!);

    expect(result).toBeFalsy();
    expect(router.navigate).toHaveBeenCalledWith(['/admin-panel']);
  });

  it('should work with route snapshot', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);

    const mockRouteSnapshot = {
      url: [{ path: 'create-admin' }],
      params: {},
      queryParams: {},
      fragment: null,
      data: { requiresSuperAdmin: true },
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

    const mockRouterStateSnapshot = {
      url: '/admin-auth/create-admin',
      root: null
    } as any;

    const result = guard.canActivate(mockRouteSnapshot, mockRouterStateSnapshot);

    expect(result).toBeTruthy();
  });

  it('should work with different route configurations', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);

    // Test with different route paths
    const routes = [
      '/admin-auth/create-admin',
      '/admin-auth/manage-users',
      '/admin-auth/system-settings'
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

  it('should handle superadmin service errors gracefully', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.isSuperAdmin.and.throwError('Service error');

    const result = guard.canActivate(null!, null!);

    expect(result).toBeFalsy();
    expect(router.navigate).toHaveBeenCalledWith(['/admin-panel']);
  });

  it('should work with async authentication checks', (done) => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(Promise.resolve(true));
    mockAdminAuthService.isSuperAdmin.and.returnValue(Promise.resolve(true));

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

  it('should handle async superadmin failures', (done) => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(Promise.resolve(true));
    mockAdminAuthService.isSuperAdmin.and.returnValue(Promise.resolve(false));

    const result = guard.canActivate(null!, null!);

    if (result instanceof Promise) {
      result.then(canActivate => {
        expect(canActivate).toBeFalsy();
        expect(router.navigate).toHaveBeenCalledWith(['/admin-panel']);
        done();
      });
    } else {
      expect(result).toBeFalsy();
      done();
    }
  });



  it('should be reusable across multiple route activations', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);

    // First activation
    const result1 = guard.canActivate(null!, null!);
    expect(result1).toBeTruthy();

    // Second activation
    const result2 = guard.canActivate(null!, null!);
    expect(result2).toBeTruthy();

    // Verify services were called twice each
    expect(adminAuthService.isAdminAuthenticated).toHaveBeenCalledTimes(2);
    expect(adminAuthService.isSuperAdmin).toHaveBeenCalledTimes(2);
  });



  it('should handle mixed authentication states', () => {
    // Test different combinations of authentication states
    const testCases = [
      { isAuthenticated: false, isSuperAdmin: false, expectedResult: false, expectedRedirect: '/admin-auth/login' },
      { isAuthenticated: true, isSuperAdmin: false, expectedResult: false, expectedRedirect: '/admin-panel' },
      { isAuthenticated: true, isSuperAdmin: true, expectedResult: true, expectedRedirect: null }
    ];

    testCases.forEach(testCase => {
      mockAdminAuthService.isAdminAuthenticated.and.returnValue(testCase.isAuthenticated);
      mockAdminAuthService.isSuperAdmin.and.returnValue(testCase.isSuperAdmin);

      const result = guard.canActivate(null!, null!);

      expect(result).toBe(testCase.expectedResult);
      
      if (testCase.expectedRedirect) {
        expect(router.navigate).toHaveBeenCalledWith([testCase.expectedRedirect]);
      } else {
        expect(router.navigate).not.toHaveBeenCalled();
      }

      // Reset mocks for next iteration
      router.navigate.calls.reset();
    });
  });
}); 