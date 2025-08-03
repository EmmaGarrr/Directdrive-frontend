import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminUserCreate, UserRole } from '../../models/admin.model';

@Component({
  selector: 'app-create-admin',
  templateUrl: './create-admin.component.html',
  styleUrls: ['./create-admin.component.css']
})
export class CreateAdminComponent implements OnInit {
  createAdminForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  userRoles = UserRole;
  isSuperAdmin = false;

  constructor(
    private formBuilder: FormBuilder,
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {
    this.createAdminForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      role: [UserRole.ADMIN, [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Check if current user is superadmin
    this.isSuperAdmin = this.adminAuthService.isSuperAdmin();
    
    if (!this.isSuperAdmin) {
      this.error = 'Only superadmin can create new admin users';
      return;
    }

    // Check admin authentication
    if (!this.adminAuthService.isAdminAuthenticated()) {
      this.router.navigate(['/admin-login']);
    }
  }

  get f() {
    return this.createAdminForm.controls;
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.createAdminForm.invalid || !this.isSuperAdmin) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const adminData: AdminUserCreate = {
      email: this.f['email'].value,
      password: this.f['password'].value,
      role: this.f['role'].value
    };

    this.adminAuthService.createAdminUser(adminData).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = `Admin user ${response.data.email} created successfully with role ${response.data.role}`;
        this.createAdminForm.reset();
        this.createAdminForm.patchValue({ role: UserRole.ADMIN });
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Failed to create admin user';
      }
    });
  }

  // goBack method removed - now part of admin panel layout

  getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.SUPERADMIN:
        return 'Super Admin';
      default:
        return 'Unknown';
    }
  }
}