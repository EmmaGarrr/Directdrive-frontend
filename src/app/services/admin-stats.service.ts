import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminStatsService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/admin`;
  private statsUpdateSubject = new Subject<void>();
  public statsUpdate$ = this.statsUpdateSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Method to trigger stats update from any component
  public triggerStatsUpdate(): void {
    this.statsUpdateSubject.next();
  }

  // Process Queue Status
  getProcessQueueStatus(): Observable<any> {
    return this.http.get(`${this.API_URL}/processes/status`);
  }

  // Active Processes
  getActiveProcesses(adminOnly: boolean = false): Observable<any[]> {
    let params = new HttpParams();
    if (adminOnly) {
      params = params.set('admin_only', 'true');
    }
    return this.http.get<any[]>(`${this.API_URL}/processes/active`, { params });
  }

  // Process Details
  getProcessDetails(processId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/processes/${processId}`);
  }

  // Cancel Process
  cancelProcess(processId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/processes/${processId}/cancel`, {});
  }

  // Trigger Quota Refresh
  triggerQuotaRefresh(): Observable<any> {
    return this.http.post(`${this.API_URL}/processes/refresh-quota`, {});
  }

  // Priority System Info
  getPrioritySystemInfo(): Observable<any> {
    return this.http.get(`${this.API_URL}/processes/priority-info`);
  }
} 