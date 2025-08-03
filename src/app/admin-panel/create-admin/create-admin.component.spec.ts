import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CreateAdminComponent } from './create-admin.component';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminUserCreate, UserRole } from '../../models/admin.model';

describe('CreateAdminComponent', () => {
  let component: CreateAdminComponent;
  let fixture: ComponentFixture<CreateAdminComponent>;
  let adminAuthService: jasmine.SpyObj<AdminAuthService>;
  let router: jasmine.SpyObj<Router>;

  const mockAdminAuthService = {
    createAdminUser: jasmine.createSpy('createAdminUser'),
    isAdminAuthenticated: jasmine.createSpy('isAdminAuthenticated'),
    isSuperAdmin: jasmine.createSpy('isSuperAdmin')
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateAdminComponent ],
      imports: [ ReactiveFormsModule ],
      providers: [
        { provide: AdminAuthService, useValue: mockAdminAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateAdminComponent);
    component = fixture.componentInstance;
    adminAuthService = TestBed.inject(AdminAuthService) as jasmine.SpyObj<AdminAuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default form values', () => {
    expect(component.createAdminForm.get('email')?.value).toBe('');
    expect(component.createAdminForm.get('password')?.value).toBe('');
    expect(component.createAdminForm.get('confirmPassword')?.value).toBe('');
    expect(component.createAdminForm.get('role')?.value).toBe(UserRole.ADMIN);
  });

  it('should redirect to admin login if not authenticated', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(false);
    
    component.ngOnInit();
    
    expect(router.navigate).toHaveBeenCalledWith(['/admin-login']);
  });

  it('should set error if not superadmin', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.isSuperAdmin.and.returnValue(false);
    
    component.ngOnInit();
    
    expect(component.error).toBe('Only superadmin can create new admin users');
  });

  it('should allow access if superadmin', () => {
    mockAdminAuthService.isAdminAuthenticated.and.returnValue(true);
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);
    
    component.ngOnInit();
    
    expect(component.error).toBe('');
    expect(component.isSuperAdmin).toBeTruthy();
  });

  it('should validate email format', () => {
    const emailControl = component.createAdminForm.get('email');
    
    emailControl?.setValue('invalid-email');
    expect(emailControl?.errors?.['email']).toBeTruthy();
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.errors?.['email']).toBeFalsy();
  });

  it('should validate password minimum length', () => {
    const passwordControl = component.createAdminForm.get('password');
    
    passwordControl?.setValue('123');
    expect(passwordControl?.errors?.['minlength']).toBeTruthy();
    
    passwordControl?.setValue('12345678');
    expect(passwordControl?.errors?.['minlength']).toBeFalsy();
  });

  it('should validate password confirmation match', () => {
    component.createAdminForm.patchValue({
      password: 'password123',
      confirmPassword: 'differentpassword'
    });
    
    expect(component.createAdminForm.errors?.['passwordMismatch']).toBeTruthy();
    
    component.createAdminForm.patchValue({
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    expect(component.createAdminForm.errors?.['passwordMismatch']).toBeFalsy();
  });

  it('should require all fields', () => {
    expect(component.createAdminForm.valid).toBeFalsy();
    
    component.createAdminForm.patchValue({
      email: 'admin@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: UserRole.ADMIN
    });
    
    expect(component.createAdminForm.valid).toBeTruthy();
  });

  it('should call create admin service on form submission', fakeAsync(() => {
    const adminData: AdminUserCreate = {
      email: 'newadmin@test.com',
      password: 'password123',
      role: UserRole.ADMIN
    };
    
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);
    mockAdminAuthService.createAdminUser.and.returnValue(of({
      data: { email: 'newadmin@test.com', role: UserRole.ADMIN },
      message: 'Admin user created successfully'
    }));
    
    component.createAdminForm.patchValue({
      email: adminData.email,
      password: adminData.password,
      confirmPassword: adminData.password,
      role: adminData.role
    });
    component.onSubmit();
    tick();
    
    expect(adminAuthService.createAdminUser).toHaveBeenCalledWith(adminData);
  }));

  it('should handle successful admin creation', fakeAsync(() => {
    const response = {
      data: { email: 'newadmin@test.com', role: UserRole.ADMIN },
      message: 'Admin user created successfully'
    };
    
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);
    mockAdminAuthService.createAdminUser.and.returnValue(of(response));
    
    component.createAdminForm.patchValue({
      email: 'newadmin@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: UserRole.ADMIN
    });
    component.onSubmit();
    tick();
    
    expect(component.success).toContain('newadmin@test.com');
    expect(component.success).toContain('admin');
    expect(component.loading).toBeFalsy();
  }));

  it('should handle creation error', fakeAsync(() => {
    const errorMessage = 'Failed to create admin user';
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);
    mockAdminAuthService.createAdminUser.and.returnValue(throwError(() => new Error(errorMessage)));
    
    component.createAdminForm.patchValue({
      email: 'newadmin@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: UserRole.ADMIN
    });
    component.onSubmit();
    tick();
    
    expect(component.error).toBe(errorMessage);
    expect(component.loading).toBeFalsy();
  }));

  it('should set loading state during creation', fakeAsync(() => {
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);
    mockAdminAuthService.createAdminUser.and.returnValue(of({}));
    
    component.createAdminForm.patchValue({
      email: 'newadmin@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: UserRole.ADMIN
    });
    component.onSubmit();
    
    expect(component.loading).toBeTruthy();
    tick();
    expect(component.loading).toBeFalsy();
  }));

  it('should reset form after successful creation', fakeAsync(() => {
    mockAdminAuthService.isSuperAdmin.and.returnValue(true);
    mockAdminAuthService.createAdminUser.and.returnValue(of({}));
    
    component.createAdminForm.patchValue({
      email: 'newadmin@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: UserRole.SUPERADMIN
    });
    component.onSubmit();
    tick();
    
    expect(component.createAdminForm.get('email')?.value).toBe('');
    expect(component.createAdminForm.get('role')?.value).toBe(UserRole.ADMIN);
  }));

  it('should not submit if form is invalid', () => {
    component.createAdminForm.patchValue({
      email: 'invalid-email',
      password: '123',
      confirmPassword: 'different'
    });
    
    component.onSubmit();
    
    expect(adminAuthService.createAdminUser).not.toHaveBeenCalled();
  });

  it('should not submit if not superadmin', () => {
    mockAdminAuthService.isSuperAdmin.and.returnValue(false);
    
    component.createAdminForm.patchValue({
      email: 'newadmin@test.com',
      password: 'password123',
      confirmPassword: 'password123',
      role: UserRole.ADMIN
    });
    
    component.onSubmit();
    
    expect(adminAuthService.createAdminUser).not.toHaveBeenCalled();
  });

  it('should navigate back to admin panel', () => {
    component.goBack();
    
    expect(router.navigate).toHaveBeenCalledWith(['/admin-panel']);
  });

  it('should provide role display names', () => {
    expect(component.getRoleDisplayName(UserRole.ADMIN)).toBe('Admin');
    expect(component.getRoleDisplayName(UserRole.SUPERADMIN)).toBe('Super Admin');
    expect(component.getRoleDisplayName(UserRole.REGULAR)).toBe('Unknown');
  });

  it('should provide access to form controls', () => {
    expect(component.f).toBe(component.createAdminForm.controls);
  });
}); 