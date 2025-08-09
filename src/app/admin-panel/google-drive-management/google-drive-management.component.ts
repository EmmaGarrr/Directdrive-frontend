import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminStatsService } from '../../services/admin-stats.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

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
  folder_info?: {
    folder_id: string;
    folder_name: string;
    folder_path: string;
  };
  last_quota_check?: string;
  data_freshness?: 'fresh' | 'stale';
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
export class GoogleDriveManagementComponent implements OnInit, OnDestroy {
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
  
  // Subscription for auto-refresh
  private statsSubscription?: Subscription;
  
  constructor(
    private adminAuthService: AdminAuthService,
    private adminStatsService: AdminStatsService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    console.log('🚀 [GoogleDriveManagement] Component initializing...');
    
    // Force refresh on initial load to get real Google Drive data
    try {
      console.log('🚀 [GoogleDriveManagement] Calling refreshAllAccounts...');
      this.refreshAllAccounts();
    } catch (error) {
      console.error('🚀 [GoogleDriveManagement] ERROR in refreshAllAccounts:', error);
    }
    
    // Subscribe to stats updates to auto-refresh when files are deleted/added
    this.statsSubscription = this.adminStatsService.statsUpdate$.subscribe(() => {
      console.log('[GoogleDriveManagement] Stats update triggered, refreshing accounts...');
      this.refreshAllAccounts();
    });
    
    console.log('🚀 [GoogleDriveManagement] Component initialization complete');
  }
  
  ngOnDestroy(): void {
    if (this.statsSubscription) {
      this.statsSubscription.unsubscribe();
    }
  }

  private getHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async loadAccounts(forceRefresh: boolean = false): Promise<void> {
    console.log(`🚀 [GoogleDriveManagement] loadAccounts called with forceRefresh=${forceRefresh}`);
    this.loading = true;
    this.error = '';

    try {
      // Add refresh parameter to get real Google Drive data
      const timestamp = new Date().getTime();
      const url = `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts` + 
                  (forceRefresh ? `?refresh=true&_t=${timestamp}` : `?_t=${timestamp}`);
      
      console.log(`🚀 [GoogleDriveManagement] Making API call to: ${url}`);
      console.log(`Loading accounts... (force refresh: ${forceRefresh})`);
      
      const headers = this.getHeaders()
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('Expires', '0');

      console.log(`🚀 [GoogleDriveManagement] About to make HTTP GET request...`);
      const response = await this.http.get<GoogleDriveAccountsResponse>(
        url,
        { headers: headers }
      ).toPromise();

      console.log(`🚀 [GoogleDriveManagement] API response received:`, response);
      if (response) {
        this.accounts = response.accounts;
        this.totalAccounts = response.statistics.total_accounts;
        this.activeAccounts = response.statistics.active_accounts;
        this.totalStorageUsed = response.statistics.total_storage_used;
        this.totalStorageQuota = response.statistics.total_storage_quota;
        this.averagePerformance = response.statistics.average_performance;
        
        console.log(`Loaded ${this.accounts.length} accounts:`, this.accounts.map(acc => ({
          id: acc.account_id,
          files: acc.files_count,
          storage: acc.storage_used_formatted,
          freshness: acc.data_freshness,
          folder: acc.folder_info?.folder_path,
          last_quota_check: acc.last_quota_check,
          timestamp_formatted: this.formatDateTime(acc.last_quota_check || '')
        })));
      }
    } catch (error: any) {
      console.error('🚀 [GoogleDriveManagement] ERROR loading Google Drive accounts:', error);
      console.error('🚀 [GoogleDriveManagement] Error details:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error
      });
      this.error = error.error?.detail || 'Failed to load Google Drive accounts';
    } finally {
      console.log(`🚀 [GoogleDriveManagement] loadAccounts finished, loading=${this.loading}`);
      this.loading = false;
    }
  }
  
  async refreshAllAccounts(): Promise<void> {
    console.log('Refreshing all accounts from Google Drive API...');
    await this.loadAccounts(true);
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
  
  formatDateTime(dateString: string): string {
    console.log(`🚀 [formatDateTime] Input: "${dateString}"`);
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    console.log(`🚀 [formatDateTime] Parsed date: ${date.toISOString()}`);
    console.log(`🚀 [formatDateTime] Current time: ${now.toISOString()}`);
    console.log(`🚀 [formatDateTime] Diff ms: ${diffMs}, diff mins: ${diffMins}`);
    
    let result: string;
    if (diffMins < 1) result = 'Just now';
    else if (diffMins < 60) result = `${diffMins}m ago`;
    else if (diffMins < 1440) result = `${Math.floor(diffMins / 60)}h ago`;
    else result = date.toLocaleDateString();
    
    console.log(`🚀 [formatDateTime] Result: "${result}"`);
    return result;
  }
  
  async refreshAccountStats(accountId: string): Promise<void> {
    if (!confirm(`Refresh stats for account ${accountId}? This will fetch current data from Google Drive.`)) {
      return;
    }
    
    this.loading = true;
    try {
      const response = await this.http.post(
        `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts/${accountId}/refresh-stats`,
        {},
        { headers: this.getHeaders() }
      ).toPromise();
      
      console.log('Account stats refreshed:', response);
      
      // Reload accounts to show updated stats
      await this.refreshAllAccounts();
      alert(`Stats refreshed successfully for account ${accountId}`);
      
    } catch (error: any) {
      console.error('Error refreshing account stats:', error);
      alert(`Failed to refresh stats: ${error.error?.detail || 'Unknown error'}`);
    } finally {
      this.loading = false;
    }
  }
  
  async deleteAllAccountFiles(accountId: string): Promise<void> {
    const confirmation = prompt(
      `⚠️ DANGER: This will DELETE ALL FILES from Google Drive account ${accountId}!\n\n` +
      `This includes:\n` +
      `- All files uploaded via the app\n` +
      `- All files manually uploaded to the folder\n` +
      `- This action cannot be undone!\n\n` +
      `Type "DELETE ALL FILES" to confirm:`
    );
    
    if (confirmation !== 'DELETE ALL FILES') {
      alert('Operation cancelled. Files were not deleted.');
      return;
    }
    
    this.loading = true;
    try {
      const response = await this.http.post<any>(
        `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts/${accountId}/delete-all-files`,
        {},
        { headers: this.getHeaders() }
      ).toPromise();
      
      console.log('All account files deleted:', response);
      
      // Reload accounts to show updated stats
      await this.refreshAllAccounts();
      
      alert(
        `All files deleted successfully!\n\n` +
        `Google Drive: ${response?.gdrive_deleted || 0} files deleted\n` +
        `Database: ${response?.mongodb_soft_deleted || 0} records marked as deleted\n` +
        `Errors: ${response?.gdrive_errors || 0}`
      );
      
    } catch (error: any) {
      console.error('Error deleting all account files:', error);
      alert(`Failed to delete files: ${error.error?.detail || 'Unknown error'}`);
    } finally {
      this.loading = false;
    }
  }
}