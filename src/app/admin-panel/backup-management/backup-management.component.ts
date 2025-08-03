import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';

interface BackupStatus {
  backup_summary: {
    total_files: number;
    backed_up_files: number;
    backup_percentage: number;
    in_progress: number;
    failed: number;
    total_backup_size: number;
  };
  hetzner_status: string;
  recent_failures: any[];
}

interface BackupQueue {
  queue_files: any[];
  total_in_queue: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface BackupFailures {
  failed_backups: any[];
  total_failures: number;
  failure_patterns: any[];
  page: number;
  limit: number;
  total_pages: number;
  period_days: number;
}

@Component({
  selector: 'app-backup-management',
  templateUrl: './backup-management.component.html',
  styleUrls: ['./backup-management.component.css']
})
export class BackupManagementComponent implements OnInit {
  backupStatus: BackupStatus | null = null;
  backupQueue: BackupQueue | null = null;
  backupFailures: BackupFailures | null = null;
  
  loading = {
    status: false,
    queue: false,
    failures: false,
    massBackup: false,
    cleanup: false
  };
  
  error = {
    status: '',
    queue: '',
    failures: '',
    massBackup: '',
    cleanup: ''
  };
  
  queuePage = 1;
  failuresPage = 1;
  failurePeriodDays = 30;

  constructor(
    private http: HttpClient,
    private adminAuthService: AdminAuthService
  ) { }

  ngOnInit(): void {
    this.loadBackupStatus();
    this.loadBackupQueue();
    this.loadBackupFailures();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  loadBackupStatus(): void {
    this.loading.status = true;
    this.error.status = '';
    
    this.http.get<BackupStatus>(`${environment.apiUrl}/api/v1/admin/backup/status`, { 
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (data) => {
          this.backupStatus = data;
          this.loading.status = false;
        },
        error: (err) => {
          this.error.status = err.error?.detail || 'Failed to load backup status';
          this.loading.status = false;
        }
      });
  }

  loadBackupQueue(page: number = 1): void {
    this.loading.queue = true;
    this.error.queue = '';
    this.queuePage = page;
    
    this.http.get<BackupQueue>(`${environment.apiUrl}/api/v1/admin/backup/queue?page=${page}&limit=20`, { 
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (data) => {
          this.backupQueue = data;
          this.loading.queue = false;
        },
        error: (err) => {
          this.error.queue = err.error?.detail || 'Failed to load backup queue';
          this.loading.queue = false;
        }
      });
  }

  loadBackupFailures(page: number = 1, days: number = 30): void {
    this.loading.failures = true;
    this.error.failures = '';
    this.failuresPage = page;
    this.failurePeriodDays = days;
    
    this.http.get<BackupFailures>(`${environment.apiUrl}/api/v1/admin/backup/failures?page=${page}&limit=20&days=${days}`, { 
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (data) => {
          this.backupFailures = data;
          this.loading.failures = false;
        },
        error: (err) => {
          this.error.failures = err.error?.detail || 'Failed to load backup failures';
          this.loading.failures = false;
        }
      });
  }

  triggerMassBackup(): void {
    if (!confirm('This will trigger backup for up to 50 files without backup. Continue?')) {
      return;
    }
    
    this.loading.massBackup = true;
    this.error.massBackup = '';
    
    this.http.post(`${environment.apiUrl}/api/v1/admin/backup/trigger-mass`, {}, { 
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response: any) => {
          alert(response.message);
          this.loading.massBackup = false;
          this.loadBackupStatus();
          this.loadBackupQueue();
        },
        error: (err) => {
          this.error.massBackup = err.error?.detail || 'Failed to trigger mass backup';
          this.loading.massBackup = false;
        }
      });
  }

  runCleanup(): void {
    if (!confirm('This will reset old failed backups and clean stuck processes. Continue?')) {
      return;
    }
    
    this.loading.cleanup = true;
    this.error.cleanup = '';
    
    this.http.post(`${environment.apiUrl}/api/v1/admin/backup/cleanup`, {}, { 
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response: any) => {
          alert(response.message);
          this.loading.cleanup = false;
          this.loadBackupStatus();
          this.loadBackupFailures();
        },
        error: (err) => {
          this.error.cleanup = err.error?.detail || 'Failed to run cleanup';
          this.loading.cleanup = false;
        }
      });
  }

  getHetznerStatusClass(): string {
    if (!this.backupStatus) return 'text-gray-500';
    
    const status = this.backupStatus.hetzner_status;
    if (status === 'connected') return 'text-green-600';
    if (status === 'not_configured') return 'text-yellow-600';
    return 'text-red-600';
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  refreshAll(): void {
    this.loadBackupStatus();
    this.loadBackupQueue(this.queuePage);
    this.loadBackupFailures(this.failuresPage, this.failurePeriodDays);
  }
}