import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid && !this.loading) {
      this.loading = true;
      
      const email = this.forgotPasswordForm.value.email;

      // Call the auth service to request password reset
      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          console.log('Password reset email sent:', response);
          
          // Show success message with enhanced styling
          this.snackBar.open('Password reset email sent! Please check your inbox.', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar', 'enhanced-snackbar']
          });
          
          // Navigate back to login
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Password reset error:', error);
          
          // Enhanced error handling with better UX
          let errorMessage = 'Failed to send password reset email. Please try again.';
          
          if (error.error?.detail) {
            errorMessage = error.error.detail;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar', 'enhanced-snackbar']
          });
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.forgotPasswordForm.controls).forEach(key => {
        const control = this.forgotPasswordForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  getEmailErrorMessage(): string {
    const emailControl = this.forgotPasswordForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'Email address is required';
    }
    if (emailControl?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    return '';
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Enhanced form validation helpers
  isFieldValid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return field ? field.valid && field.touched : false;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.forgotPasswordForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }
} 