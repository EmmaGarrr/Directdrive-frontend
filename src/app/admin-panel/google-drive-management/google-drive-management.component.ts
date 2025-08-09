import { Component, OnInit } from '@angular/core';
import { AdminAuthService } from '../../services/admin-auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface GoogleDriveAccount {
  account_id: string;
  email: string;
  alias?: string;
  is_active: boolean;
  storage_used: number;
  storage_quota: number;
  storage_used_formatted?: string;
  storage_quota_formatted?: string;
  storage_percentage?: number;
  files_count: number;
  last_activity: string;
  health_status: string;
  performance_score: number;
  created_at?: string;
  updated_at?: string;
  folder_id?: string | null;
  folder_name?: string | null;
  folder_path?: string | null;
}

interface GoogleDriveAccountsResponse {
  accounts: GoogleDriveAccount[];
  statistics: {
    total_accounts: number;
    active_accounts: number;
    total_storage_used: number;
    total_storage_quota: number;
    average_performance: number;
  };
}

interface AddAccountRequest {
  service_account_key: string;
  account_email: string;
  account_alias: string;
}

@Component({
  selector: 'app-google-drive-management',
  templateUrl: './google-drive-management.component.html',
  styleUrls: ['./google-drive-management.component.css']
})
export class GoogleDriveManagementComponent implements OnInit {
  accounts: GoogleDriveAccount[] = [];
  loading = false;
  error = '';
  
  // Statistics
  totalAccounts = 0;
  activeAccounts = 0;
  totalStorageUsed = 0;
  totalStorageQuota = 0;
  averagePerformance = 0;
  
  // Add account modal
  showAddAccountModal = false;
  addAccountForm = {
    service_account_key: '',
    account_email: '',
    account_alias: ''
  };
  
  // Account details modal
  showAccountDetailsModal = false;
  selectedAccount: GoogleDriveAccount | null = null;
  
  constructor(
    private adminAuthService: AdminAuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadAccounts();
  }

  private getHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async loadAccounts(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const response = await this.http.get<GoogleDriveAccountsResponse>(
        `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts`,
        { headers: this.getHeaders() }
      ).toPromise();

      if (response) {
        this.accounts = response.accounts;
        this.totalAccounts = response.statistics.total_accounts;
        this.activeAccounts = response.statistics.active_accounts;
        this.totalStorageUsed = response.statistics.total_storage_used;
        this.totalStorageQuota = response.statistics.total_storage_quota;
        this.averagePerformance = response.statistics.average_performance;
      }
    } catch (error: any) {
      console.error('Error loading Google Drive accounts:', error);
      this.error = error.error?.detail || 'Failed to load Google Drive accounts';
    } finally {
      this.loading = false;
    }
  }

  async toggleAccount(accountId: string): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      await this.http.post(
        `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts/${accountId}/toggle`,
        {},
        { headers: this.getHeaders() }
      ).toPromise();

      // Reload accounts to reflect changes
      await this.loadAccounts();
    } catch (error: any) {
      console.error('Error toggling account:', error);
      this.error = error.error?.detail || 'Failed to toggle account status';
    } finally {
      this.loading = false;
    }
  }

  async removeAccount(accountId: string, force: boolean = false): Promise<void> {
    if (!confirm('Are you sure you want to remove this Google Drive account?')) {
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      await this.http.delete(
        `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts/${accountId}?force=${force}`,
        { headers: this.getHeaders() }
      ).toPromise();

      // Reload accounts to reflect changes
      await this.loadAccounts();
    } catch (error: any) {
      console.error('Error removing account:', error);
      this.error = error.error?.detail || 'Failed to remove account';
    } finally {
      this.loading = false;
    }
  }

  async addAccount(): Promise<void> {
    if (!this.addAccountForm.service_account_key || !this.addAccountForm.account_email || !this.addAccountForm.account_alias) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      await this.http.post<any>(
        `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts`,
        this.addAccountForm,
        { headers: this.getHeaders() }
      ).toPromise();

      // Reset form and close modal
      this.addAccountForm = {
        service_account_key: '',
        account_email: '',
        account_alias: ''
      };
      this.showAddAccountModal = false;

      // Reload accounts to reflect changes
      await this.loadAccounts();
    } catch (error: any) {
      console.error('Error adding account:', error);
      this.error = error.error?.detail || 'Failed to add account';
    } finally {
      this.loading = false;
    }
  }

  async viewAccountDetails(accountId: string): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const response = await this.http.get<GoogleDriveAccount>(
        `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts/${accountId}`,
        { headers: this.getHeaders() }
      ).toPromise();

      if (response) {
        this.selectedAccount = response;
        this.showAccountDetailsModal = true;
      }
    } catch (error: any) {
      console.error('Error loading account details:', error);
      this.error = error.error?.detail || 'Failed to load account details';
    } finally {
      this.loading = false;
    }
  }

  closeAddAccountModal(): void {
    this.showAddAccountModal = false;
    this.addAccountForm = {
      service_account_key: '',
      account_email: '',
      account_alias: ''
    };
    this.error = '';
  }

  closeAccountDetailsModal(): void {
    this.showAccountDetailsModal = false;
    this.selectedAccount = null;
  }

  // Utility methods
  formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getStoragePercentage(used: number, quota: number): number {
    if (quota === 0) return 0;
    return Math.round((used / quota) * 100);
  }

  getHealthStatusClass(status: string): string {
    switch (status) {
      case 'healthy': return 'status-healthy';
      case 'warning': return 'status-warning';
      case 'quota_warning': return 'status-quota-warning';
      case 'critical': return 'status-critical';
      default: return 'status-unknown';
    }
  }

  getHealthStatusText(status: string): string {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Warning';
      case 'quota_warning': return 'Quota Warning';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  }

  getPerformanceClass(score: number): string {
    if (score >= 90) return 'performance-excellent';
    if (score >= 70) return 'performance-good';
    if (score >= 50) return 'performance-fair';
    return 'performance-poor';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }
}