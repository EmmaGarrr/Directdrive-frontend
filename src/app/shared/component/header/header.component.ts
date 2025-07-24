import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;
  currentUser: any = null;

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check initial authentication state
    this.checkAuthState();
    
    // Listen to router events to update auth state
    this.router.events.subscribe(() => {
      this.checkAuthState();
    });
  }

  private checkAuthState(): void {
    // Use token-based check that should work with any AuthService implementation
    const token = localStorage.getItem('access_token');
    this.isLoggedIn = !!token && !this.isTokenExpired(token);
    
    // Try to get current user from localStorage
    if (this.isLoggedIn) {
      // Try to get user from localStorage if available
      const userStr = localStorage.getItem('current_user');
      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
        } catch (e) {
          this.currentUser = { email: 'User' }; // Fallback display
        }
      } else {
        // If no user data in localStorage, create minimal user object
        this.currentUser = { email: 'User' };
      }
    } else {
      this.currentUser = null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true; // If we can't parse the token, consider it expired
    }
  }

  logout(): void {
    console.log('[HEADER] Logout initiated by user');
    this.authService.logout();
    
    // Clear local state immediately
    this.isLoggedIn = false;
    this.currentUser = null;
    
    // Navigate to home page after logout
    this.router.navigate(['/']);
  }
}
