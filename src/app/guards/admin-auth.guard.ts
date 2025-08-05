import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AdminAuthService } from '../services/admin-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthGuard implements CanActivate {

  constructor(
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // Check if admin is authenticated
    if (!this.adminAuthService.isAdminAuthenticated()) {
      this.router.navigate(['/admin-auth/login']);
      return false;
    }

    // If we have a token but no session, verify the token asynchronously
    const token = this.adminAuthService.getAdminToken();
    const session = this.adminAuthService.getCurrentAdminSession();
    
    if (token && !session) {
      // Verify token asynchronously
      return this.adminAuthService.verifyAdminToken().pipe(
        map(() => {
          // Token is valid, allow access
          return true;
        }),
        catchError(() => {
          // Token is invalid, redirect to login
          this.adminAuthService.clearAdminSession();
          this.router.navigate(['/admin-auth/login']);
          return of(false);
        })
      );
    }

    return true;
  }
}