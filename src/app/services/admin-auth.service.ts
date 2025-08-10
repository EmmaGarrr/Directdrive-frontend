import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AdminLoginRequest,
  AdminToken,
  AdminUserCreate,
  AdminUserInDB,
  AdminActivityLog,
  AdminActivityLogResponse,
  AdminProfileResponse,
  AdminCreateResponse,
  AdminTokenVerification,
  AdminSession,
  UserRole
} from '../models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/admin/auth`;
  private currentAdminSubject = new BehaviorSubject<AdminUserInDB | null>(null);
  private isAdminAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private adminSessionSubject = new BehaviorSubject<AdminSession | null>(null);

  public currentAdmin$ = this.currentAdminSubject.asObservable();
  public isAdminAuthenticated$ = this.isAdminAuthenticatedSubject.asObservable();
  public adminSession$ = this.adminSessionSubject.asObservable();

  constructor(private http: HttpClient) {
    // Re-enabled session restoration after fixing API spam
    this.initializeAdminAuth();
  }

  private initializeAdminAuth(): void {
    const token = this.getAdminToken();
    if (token) {
      // Validate token format first
      if (!this.isValidTokenFormat(token)) {
        console.log('Invalid token format detected - clearing stale session');
        this.clearAdminSession();
        return;
      }
      
      // Check if we already have a valid session
      const currentSession = this.adminSessionSubject.value;
      if (currentSession && currentSession.token === token) {
        return; // Already initialized
      }
      
      // Try to verify the token immediately
      this.verifyAdminToken().subscribe({
        next: (verification) => {
          // Token is valid, create session with verified data
          const session: AdminSession = {
            token: token,
            adminEmail: verification.admin_email,
            adminRole: verification.admin_role === 'superadmin' ? UserRole.SUPERADMIN : UserRole.ADMIN,
            expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
          };
          
          this.adminSessionSubject.next(session);
          this.isAdminAuthenticatedSubject.next(true);
          
          // Load full profile
          this.loadAdminProfile().subscribe({
            next: (admin) => {
              // Update session with complete admin data
              session.adminEmail = admin.email;
              session.adminRole = admin.role;
              this.adminSessionSubject.next(session);
            },
            error: (error) => {
              console.log('Profile load failed after token verification:', error);
            }
          });
        },
        error: (error) => {
          // Token verification failed - clear invalid session
          console.log('Token verification failed - clearing invalid session:', error.message);
          this.clearAdminSession();
        }
      });
    }
  }

  /**
   * Check if token has valid JWT format
   */
  private isValidTokenFormat(token: string): boolean {
    try {
      const parts = token.split('.');
      return parts.length === 3 && parts.every(part => part.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Admin login
   */
  adminLogin(credentials: AdminLoginRequest): Observable<AdminToken> {
    return this.http.post<AdminToken>(`${this.API_URL}/token`, credentials)
      .pipe(
        tap(response => {
          // Store admin token
          localStorage.setItem('admin_access_token', response.access_token);
          
          // Map the role string to UserRole enum
          let adminRole: UserRole;
          switch (response.admin_role) {
            case 'superadmin':
              adminRole = UserRole.SUPERADMIN;
              break;
            case 'admin':
              adminRole = UserRole.ADMIN;
              break;
            default:
              adminRole = UserRole.REGULAR;
          }
          
          // Create admin session
          const session: AdminSession = {
            token: response.access_token,
            adminEmail: '', // Will be populated when profile is loaded
            adminRole: adminRole,
            expiresAt: new Date(Date.now() + (response.expires_in * 1000))
          };
          
          this.adminSessionSubject.next(session);
          this.isAdminAuthenticatedSubject.next(true);
          
          // Load admin profile after successful login
          this.loadAdminProfile().subscribe({
            next: (admin) => {
              // Update session with actual admin data
              session.adminEmail = admin.email;
              session.adminRole = admin.role;
              this.adminSessionSubject.next(session);
            },
            error: (error) => {
              console.log('Profile load failed after login:', error);
              // If profile load fails after login, there might be a backend issue
              // but don't clear the session since login was successful
            }
          });
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Create new admin user (superadmin only)
   */
  createAdminUser(adminData: AdminUserCreate): Observable<AdminCreateResponse> {
    return this.http.post<AdminCreateResponse>(`${this.API_URL}/create-admin`, adminData, {
      headers: this.getAdminAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get current admin profile
   */
  loadAdminProfile(): Observable<AdminUserInDB> {
    return this.http.get<AdminProfileResponse>(`${this.API_URL}/me`, {
      headers: this.getAdminAuthHeaders()
    }).pipe(
      map(response => {
        const admin = response.data;
        this.currentAdminSubject.next(admin);
        
        // Update session with admin email
        const currentSession = this.adminSessionSubject.value;
        if (currentSession) {
          currentSession.adminEmail = admin.email;
          this.adminSessionSubject.next(currentSession);
        }
        
        return admin;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get admin activity logs
   */
  getActivityLogs(limit: number = 50, skip: number = 0): Observable<AdminActivityLogResponse> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('skip', skip.toString());

    return this.http.get<AdminActivityLogResponse>(`${this.API_URL}/activity-logs`, {
      headers: this.getAdminAuthHeaders(),
      params: params
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Verify admin token
   */
  verifyAdminToken(): Observable<AdminTokenVerification> {
    return this.http.get<AdminTokenVerification>(`${this.API_URL}/verify-admin`, {
      headers: this.getAdminAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Admin logout
   */
  adminLogout(): void {
    this.clearAdminSession();
  }

  /**
   * Force clear all admin session data (useful for fixing stale token issues)
   */
  forceClearSession(): void {
    console.log('Force clearing admin session...');
    this.clearAdminSession();
    // Also clear any other related storage
    localStorage.removeItem('access_token'); // Regular user token
    console.log('All admin session data cleared');
  }

  /**
   * Refresh admin session (useful when navigating between routes)
   */
  refreshAdminSession(): void {
    this.initializeAdminAuth();
  }

  /**
   * Get admin token from localStorage
   */
  getAdminToken(): string | null {
    return localStorage.getItem('admin_access_token');
  }

  /**
   * Check if user is authenticated as admin
   */
  isAdminAuthenticated(): boolean {
    const token = this.getAdminToken();
    if (!token) {
      return false;
    }

    // Check if token is expired
    const session = this.adminSessionSubject.value;
    if (session && session.expiresAt < new Date()) {
      this.clearAdminSession();
      return false;
    }

    // If we have a token but no session, return true to allow initialization
    // The session will be created during the async verification process
    if (token && !session) {
      return true;
    }

    return this.isAdminAuthenticatedSubject.value;
  }

  /**
   * Check if current admin is superadmin
   */
  isSuperAdmin(): boolean {
    const session = this.adminSessionSubject.value;
    return session?.adminRole === UserRole.SUPERADMIN;
  }

  /**
   * Get current admin user
   */
  getCurrentAdmin(): AdminUserInDB | null {
    return this.currentAdminSubject.value;
  }

  /**
   * Get current admin session
   */
  getCurrentAdminSession(): AdminSession | null {
    return this.adminSessionSubject.value;
  }

  /**
   * Clear admin session and logout
   */
  clearAdminSession(): void {
    localStorage.removeItem('admin_access_token');
    this.currentAdminSubject.next(null);
    this.isAdminAuthenticatedSubject.next(false);
    this.adminSessionSubject.next(null);
  }

  /**
   * Get admin auth headers
   */
  public getAdminAuthHeaders(): HttpHeaders {
    const token = this.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.status === 401) {
        errorMessage = 'Unauthorized: Invalid admin credentials';
        // Clear stale admin session on 401 errors
        this.clearAdminSession();
      } else if (error.status === 403) {
        errorMessage = 'Forbidden: Insufficient admin permissions';
      } else if (error.error && error.error.detail) {
        errorMessage = error.error.detail;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }
    
    console.error('Admin Auth Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}