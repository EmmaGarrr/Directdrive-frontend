import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminLoginComponent } from './admin-login.component';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminLoginRequest } from '../../models/admin.model';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let adminAuthService: jasmine.SpyObj<AdminAuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockAdminAuthService = {
    adminLogin: jasmine.createSpy('adminLogin'),
    isAdminAuthenticated: jasmine.createSpy('isAdminAuthenticated')
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminLoginComponent ],
      imports: [ ReactiveFormsModule ],
      providers: [
        { provide: AdminAuthService, useValue: mockAdminAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    adminAuthService = TestBed.inject(AdminAuthService) as jasmine.SpyObj<AdminAuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should redirect to admin panel if already authenticated', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    
    component.ngOnInit();
    
    expect(router.navigate).toHaveBeenCalledWith(['/admin-panel']);
  });

  it('should not redirect if not authenticated', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(false);
    
    component.ngOnInit();
    
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should validate email format', () => {
    const emailControl = component.loginForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.errors?.['email']).toBeTruthy();
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.errors?.['email']).toBeFalsy();
  });

  it('should validate password minimum length', () => {
    const passwordControl = component.loginForm.get('password');
    
    passwordControl?.setValue('123');
    expect(passwordControl?.errors?.['minlength']).toBeTruthy();
    
    passwordControl?.setValue('123456');
    expect(passwordControl?.errors?.['minlength']).toBeFalsy();
  });

  it('should require email and password', () => {
    expect(component.loginForm.valid).toBeFalsy();
    
    component.loginForm.patchValue({
      email: 'admin@test.com',
      password: 'password123'
    });
    
    expect(component.loginForm.valid).toBeTruthy();
  });

  it('should call admin login service on form submission', fakeAsync(() => {
    const loginData: AdminLoginRequest = {
      email: 'admin@test.com',
      password: 'password123'
    };
    
    mockAdminAuthService.adminLogin.and.returnValue(of({}));
    
    component.loginForm.patchValue(loginData);
    component.onSubmit();
    tick();
    
    expect(adminAuthService.adminLogin).toHaveBeenCalledWith(loginData);
  }));

  it('should navigate to admin panel on successful login', fakeAsync(() => {
    mockAdminAuthService.adminLogin.and.returnValue(of({}));
    
    component.loginForm.patchValue({
      email: 'admin@test.com',
      password: 'password123'
    });
    component.onSubmit();
    tick();
    
    expect(router.navigate).toHaveBeenCalledWith(['/admin-panel']);
  }));

  it('should handle login error', fakeAsync(() => {
    const errorMessage = 'Invalid credentials';
    mockAdminAuthService.adminLogin.and.returnValue(throwError(() => new Error(errorMessage)));
    
    component.loginForm.patchValue({
      email: 'admin@test.com',
      password: 'wrongpassword'
    });
    component.onSubmit();
    tick();
    
    expect(component.error).toBe(errorMessage);
    expect(component.loading).toBeFalsy();
  }));

  it('should set loading state during login', fakeAsync(() => {
    mockAdminAuthService.adminLogin.and.returnValue(of({}));
    
    component.loginForm.patchValue({
      email: 'admin@test.com',
      password: 'password123'
    });
    component.onSubmit();
    
    expect(component.loading).toBeTruthy();
    tick();
    expect(component.loading).toBeFalsy();
  }));

  it('should clear error on new submission', fakeAsync(() => {
    component.error = 'Previous error';
    mockAdminAuthService.adminLogin.and.returnValue(of({}));
    
    component.loginForm.patchValue({
      email: 'admin@test.com',
      password: 'password123'
    });
    component.onSubmit();
    tick();
    
    expect(component.error).toBe('');
  }));

  it('should not submit if form is invalid', () => {
    component.loginForm.patchValue({
      email: 'invalid-email',
      password: '123'
    });
    
    component.onSubmit();
    
    expect(adminAuthService.adminLogin).not.toHaveBeenCalled();
  });

  it('should navigate to user login', () => {
    component.goToUserLogin();
    
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should provide access to form controls', () => {
    expect(component.f).toBe(component.loginForm.controls);
  });
}); 