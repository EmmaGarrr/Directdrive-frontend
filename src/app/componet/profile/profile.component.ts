import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User, PasswordChangeData } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  passwordForm!: FormGroup;
  isChangingPassword = false;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializePasswordForm();
    this.loadUserProfile();
    
    // Subscribe to user changes
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.user = user;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializePasswordForm(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(formGroup: FormGroup): { [key: string]: boolean } | null {
    const newPassword = formGroup.get('newPassword');
    const confirmPassword = formGroup.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  private loadUserProfile(): void {
    this.authService.loadUserProfile().subscribe({
      next: (user) => {
        this.user = user;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.snackBar.open('Failed to load profile', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.valid && !this.loading) {
      this.loading = true;
      
      const passwordData: PasswordChangeData = {
        current_password: this.passwordForm.value.currentPassword,
        new_password: this.passwordForm.value.newPassword
      };

      this.authService.changePassword(passwordData).subscribe({
        next: (response) => {
          console.log('Password changed successfully:', response);
          this.snackBar.open('Password changed successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.passwordForm.reset();
          this.isChangingPassword = false;
        },
        error: (error) => {
          console.error('Password change error:', error);
          this.snackBar.open(error.message || 'Failed to change password', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        },
        complete: () => {
          this.loading = false;
        }
      });
    }
  }

  onLogout(): void {
    // Optional: Show confirmation dialog
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      this.authService.logout();
      this.snackBar.open('Logged out successfully', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      this.router.navigate(['/']);
    }
  }

  togglePasswordChange(): void {
    this.isChangingPassword = !this.isChangingPassword;
    if (!this.isChangingPassword) {
      this.passwordForm.reset();
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    if (i >= sizes.length) return `${(bytes / Math.pow(1024, sizes.length - 1)).toFixed(2)} ${sizes[sizes.length - 1]}`;
    
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
  }

  getStorageColor(): string {
    const percentage = this.user?.storage_percentage || 0;
    if (percentage >= 90) return 'warn';
    if (percentage >= 70) return 'accent';
    return 'primary';
  }

  // Form validation helpers
  getCurrentPasswordErrorMessage(): string {
    const control = this.passwordForm.get('currentPassword');
    if (control?.hasError('required')) {
      return 'Current password is required';
    }
    return '';
  }

  getNewPasswordErrorMessage(): string {
    const control = this.passwordForm.get('newPassword');
    if (control?.hasError('required')) {
      return 'New password is required';
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  }

  getConfirmPasswordErrorMessage(): string {
    const control = this.passwordForm.get('confirmPassword');
    if (control?.hasError('required')) {
      return 'Please confirm your new password';
    }
    if (this.passwordForm.hasError('passwordMismatch') && control?.touched) {
      return 'Passwords do not match';
    }
    return '';
  }

  navigateHome(): void {
    this.router.navigate(['/']);
  }
}
