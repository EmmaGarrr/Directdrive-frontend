import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminLoginRequest } from '../../models/admin.model';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Force clear any stale admin sessions when landing on login page
    this.adminAuthService.forceClearSession();
    
    // Check if we came here due to authentication issues
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['authError']) {
      this.error = 'Your session has expired. Please log in again.';
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const loginData: AdminLoginRequest = {
      email: this.f['email'].value,
      password: this.f['password'].value
    };

    this.adminAuthService.adminLogin(loginData).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/admin-panel']);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Login failed. Please check your credentials.';
      }
    });
  }

  // Navigate to regular user login
  goToUserLogin(): void {
    this.router.navigate(['/login']);
  }
}