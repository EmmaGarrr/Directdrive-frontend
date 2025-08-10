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
  cache_info?: {
    status: 'fresh' | 'stale' | 'error';
    last_updated: string;
    cache_expiry_seconds: number;
    is_forced_refresh: boolean;
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
  
  // Cache management
  cacheStatus: 'fresh' | 'stale' | 'error' = 'fresh';
  lastUpdated: string = '';
  isRefreshing = false;
  backgroundRefreshInProgress = false;
  
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
    // Smart loading: Load cached data first, then refresh in background if needed
    this.loadAccountsSmart();
    
    // Subscribe to stats updates to auto-refresh when files are deleted/added
    this.statsSubscription = this.adminStatsService.statsUpdate$.subscribe(() => {
      this.loadAccountsSmart();
    });
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

  async loadAccountsSmart(): Promise<void> {
    // Step 1: Load cached data immediately (fast)
    await this.loadAccounts(false);
    
    // Step 2: Check if we need background refresh
    if (this.cacheStatus === 'stale' && !this.backgroundRefreshInProgress) {
      this.backgroundRefreshInProgress = true;
      
      // Refresh in background without blocking UI
      setTimeout(async () => {
        try {
          await this.loadAccounts(true);
          this.backgroundRefreshInProgress = false;
        } catch (error) {
          console.error('Background refresh failed:', error);
          this.backgroundRefreshInProgress = false;
        }
      }, 1000); // Small delay to ensure UI is responsive
    }
  }

  async loadAccounts(forceRefresh: boolean = false): Promise<void> {
    if (forceRefresh) {
      this.isRefreshing = true;
    } else {
      this.loading = true;
    }
    
    this.error = '';

    try {
      // Add refresh parameter to get real Google Drive data
      const timestamp = new Date().getTime();
      const url = `${environment.apiUrl}/api/v1/admin/storage/google-drive/accounts` + 
                  (forceRefresh ? `?refresh=true&_t=${timestamp}` : `?_t=${timestamp}`);
      
      const headers = this.getHeaders()
        .set('Cache-Control', 'no-cache, no-store, must-revalidate')
        .set('Pragma', 'no-cache')
        .set('Expires', '0');

      const response = await this.http.get<GoogleDriveAccountsResponse>(
        url,
        { headers: headers }
      ).toPromise();

      if (response) {
        this.accounts = response.accounts;
        this.totalAccounts = response.statistics.total_accounts;
        this.activeAccounts = response.statistics.active_accounts;
        this.totalStorageUsed = response.statistics.total_storage_used;
        this.totalStorageQuota = response.statistics.total_storage_quota;
        this.averagePerformance = response.statistics.average_performance;
        
        // Update cache information
        if (response.cache_info) {
          this.cacheStatus = response.cache_info.status;
          this.lastUpdated = response.cache_info.last_updated;
        }
      }
    } catch (error: any) {
      console.error('Error loading Google Drive accounts:', error);
      this.error = error.error?.detail || 'Failed to load Google Drive accounts';
      this.cacheStatus = 'error';
    } finally {
      this.loading = false;
      this.isRefreshing = false;
    }
  }
  
  async refreshAllAccounts(): Promise<void> {
    // Manual refresh: Force update from Google Drive API
    this.isRefreshing = true;
    this.error = '';
    
    try {
      await this.loadAccounts(true);
      // Show success feedback
      console.log('Manual refresh completed successfully');
    } catch (error) {
      console.error('Manual refresh failed:', error);
      this.error = 'Manual refresh failed. Please try again.';
    } finally {
      this.isRefreshing = false;
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
  
  formatDateTime(dateString: string): string {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString();
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

  // Cache status helper methods
  getCacheIcon(status: 'fresh' | 'stale' | 'error'): string {
    switch (status) {
      case 'fresh': return 'fa-check-circle';
      case 'stale': return 'fa-clock';
      case 'error': return 'fa-exclamation-triangle';
      default: return 'fa-question-circle';
    }
  }

  getCacheStatusText(status: 'fresh' | 'stale' | 'error'): string {
    switch (status) {
      case 'fresh': return 'Data Fresh';
      case 'stale': return 'Data Stale';
      case 'error': return 'Update Error';
      default: return 'Unknown';
    }
  }
}