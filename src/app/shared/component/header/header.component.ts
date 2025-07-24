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
  currentUser: any = null; // Using any to avoid import issues for now

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check initial authentication state
    this.updateAuthState();
    
    // Listen to router events to update auth state
    this.router.events.subscribe(() => {
      this.updateAuthState();
    });

    // Set up periodic check for authentication state changes
    setInterval(() => {
      this.updateAuthState();
    }, 1000); // Check every second for auth changes
  }

  private updateAuthState(): void {
    const wasLoggedIn = this.isLoggedIn;
    this.isLoggedIn = this.authService.isAuthenticated();
    this.currentUser = this.authService.getCurrentUser();
    
    if (wasLoggedIn !== this.isLoggedIn) {
      console.log('[HEADER] Authentication state changed:', this.isLoggedIn);
      if (this.currentUser) {
        console.log('[HEADER] Current user:', this.currentUser.email);
      }
    }
  }

  logout(): void {
    console.log('[HEADER] Logout initiated by user');
    this.authService.logout();
    this.updateAuthState(); // Force immediate update
    
    // Navigate to home page after logout
    this.router.navigate(['/']);
  }
}
