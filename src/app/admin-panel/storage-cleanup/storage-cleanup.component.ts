import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';

interface ResetResult {
  message: string;
  mode: 'soft' | 'hard';
  files_marked_deleted: number;
  files_hard_deleted: number;
  batches_deleted: number;
  gdrive: {
    summary: { deleted: number; errors: number };
    per_account: Record<string, { deleted: number; errors: number; message?: string }>;
  };
}

@Component({
  selector: 'app-storage-cleanup',
  templateUrl: './storage-cleanup.component.html',
  styleUrls: ['./storage-cleanup.component.css']
})
export class StorageCleanupComponent {
  logs: string[] = [];
  loading = false;
  result: ResetResult | null = null;
  useHardDelete = false;

  constructor(private http: HttpClient, private adminAuth: AdminAuthService) {}

  private headers(): HttpHeaders {
    const token = this.adminAuth.getAdminToken();
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  appendLog(line: string) {
    const stamp = new Date().toLocaleString();
    this.logs.unshift(`[${stamp}] ${line}`);
  }

  async runCleanup() {
    if (!confirm(`Are you sure you want to run a ${this.useHardDelete ? 'HARD' : 'SOFT'} reset? This cannot be undone.`)) return;
    this.loading = true;
    this.result = null;
    this.logs = [];
    this.appendLog(`Starting ${this.useHardDelete ? 'HARD' : 'SOFT'} storage reset...`);

    try {
      const res = await this.http.post<ResetResult>(
        `${environment.apiUrl}/api/v1/admin/storage/google-drive/reset-all${this.useHardDelete ? '?hard=true' : ''}`,
        {},
        { headers: this.headers() }
      ).toPromise();

      if (res) {
        this.result = res;
        this.appendLog(`Reset completed: ${res.message}`);
        this.appendLog(`GDrive deleted=${res.gdrive.summary.deleted}, errors=${res.gdrive.summary.errors}`);
        Object.entries(res.gdrive.per_account || {}).forEach(([account, info]) => {
          this.appendLog(`Account ${account}: deleted=${info.deleted}, errors=${info.errors}${info.message ? `, note=${info.message}` : ''}`);
        });
        this.appendLog(`DB files marked deleted=${res.files_marked_deleted}, hard deleted=${res.files_hard_deleted}, batches deleted=${res.batches_deleted}`);
      }
    } catch (e: any) {
      this.appendLog(`Reset failed: ${e?.error?.detail || e.message || e}`);
    } finally {
      this.loading = false;
    }
  }
}


