import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminStatsService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/admin`;
  private statsUpdateSubject = new Subject<void>();
  public statsUpdate$ = this.statsUpdateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private adminAuthService: AdminAuthService
  ) { }

  // Method to trigger stats update from any component
  public triggerStatsUpdate(): void {
    this.statsUpdateSubject.next();
  }

  // Process Queue Status
  getProcessQueueStatus(): Observable<any> {
    const headers = this.adminAuthService.getAdminAuthHeaders();
    return this.http.get(`${this.API_URL}/processes/status`, { headers });
  }

  // Active Processes
  getActiveProcesses(adminOnly: boolean = false): Observable<any[]> {
    let params = new HttpParams();
    if (adminOnly) {
      params = params.set('admin_only', 'true');
    }
    const headers = this.adminAuthService.getAdminAuthHeaders();
    return this.http.get<any[]>(`${this.API_URL}/processes/active`, { headers, params });
  }

  // Process Details
  getProcessDetails(processId: string): Observable<any> {
    const headers = this.adminAuthService.getAdminAuthHeaders();
    return this.http.get(`${this.API_URL}/processes/${processId}`, { headers });
  }

  // Cancel Process
  cancelProcess(processId: string): Observable<any> {
    const headers = this.adminAuthService.getAdminAuthHeaders();
    return this.http.post(`${this.API_URL}/processes/${processId}/cancel`, {}, { headers });
  }

  // Trigger Quota Refresh
  triggerQuotaRefresh(): Observable<any> {
    const headers = this.adminAuthService.getAdminAuthHeaders();
    return this.http.post(`${this.API_URL}/processes/refresh-quota`, {}, { headers });
  }

  // Priority System Info
  getPrioritySystemInfo(): Observable<any> {
    const headers = this.adminAuthService.getAdminAuthHeaders();
    return this.http.get(`${this.API_URL}/processes/priority-info`, { headers });
  }
} 