import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
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

    return true;
  }
}