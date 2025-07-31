import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, LoginCredentials } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  hidePassword = true;
  rememberMe = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Check for remembered email
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      this.loginForm.patchValue({ email: rememberedEmail });
      this.rememberMe = true;
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.loading) {
      this.loading = true;
      
      const credentials: LoginCredentials = {
        username: this.loginForm.value.email, // API expects username field
        password: this.loginForm.value.password
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('Login successful:', response);
          
          // Handle remember me functionality
          if (this.rememberMe) {
            localStorage.setItem('remembered_email', this.loginForm.value.email);
          } else {
            localStorage.removeItem('remembered_email');
          }

          // Show success message with enhanced styling
          this.snackBar.open('Login successful! Welcome back!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar', 'enhanced-snackbar']
          });
          
          this.router.navigate(['/']); // Navigate to home
        },
        error: (error) => {
          console.error('Login error:', error);
          
          // Enhanced error handling with better UX
          let errorMessage = 'Login failed. Please check your credentials and try again.';
          
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
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  getEmailErrorMessage(): string {
    const emailControl = this.loginForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'Email address is required';
    }
    if (emailControl?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    return '';
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.loginForm.get('password');
    if (passwordControl?.hasError('required')) {
      return 'Password is required';
    }
    if (passwordControl?.hasError('minlength')) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  // Enhanced form validation helpers
  isFieldValid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.valid && field.touched : false;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  // Social login handlers (placeholder for future implementation)
  onGoogleSignIn(): void {
    // TODO: Implement Google OAuth integration
    this.snackBar.open('Google sign-in coming soon!', 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar', 'enhanced-snackbar']
    });
  }

  onAppleSignIn(): void {
    // TODO: Implement Apple OAuth integration
    this.snackBar.open('Apple sign-in coming soon!', 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar', 'enhanced-snackbar']
    });
  }
}
