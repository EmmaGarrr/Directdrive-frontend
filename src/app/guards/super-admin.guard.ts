import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AdminAuthService } from '../services/admin-auth.service';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {

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

    // Check if admin is superadmin
    if (this.adminAuthService.isSuperAdmin()) {
      return true;
    }

    // Redirect to admin panel if not superadmin
    this.router.navigate(['/admin-panel']);
    return false;
  }
}