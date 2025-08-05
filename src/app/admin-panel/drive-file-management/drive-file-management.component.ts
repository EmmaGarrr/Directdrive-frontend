import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminStatsService } from '../../services/admin-stats.service';

interface DriveFileItem {
  _id: string;
  filename: string;
  size_bytes: number;
  size_formatted: string;
  content_type: string;
  file_type: string;
  upload_date: string;
  owner_email: string;
  status: string;
  storage_location: string;
  backup_status: string;
  gdrive_account_id: string;
  download_url: string;
  preview_available?: boolean;
}

interface DriveFileListResponse {
  files: DriveFileItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  drive_stats: {
    total_files: number;
    total_storage: number;
    total_storage_formatted: string;
    transferring_to_hetzner: number;
    backed_up_to_hetzner: number;
    failed_backups: number;
  };
}

interface DriveFileTypeAnalytics {
  file_types: {
    _id: string;
    count: number;
    total_size: number;
    percentage: number;
    size_formatted: string;
  }[];
  total_files: number;
  backup_distribution: { [key: string]: number };
  account_distribution: {
    account_id: string;
    count: number;
    total_size: number;
    size_formatted: string;
  }[];
}

@Component({
  selector: 'app-drive-file-management',
  templateUrl: './drive-file-management.component.html',
  styleUrls: ['./drive-file-management.component.css']
})
export class DriveFileManagementComponent implements OnInit {
  Math = Math; // Make Math available to template
  files: DriveFileItem[] = [];
  selectedFiles: string[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalFiles = 0;
  totalPages = 0;
  
  // Filters
  searchTerm = '';
  fileTypeFilter = '';
  ownerFilter = '';
  backupStatusFilter = '';
  sizeMinFilter: number | null = null;
  sizeMaxFilter: number | null = null;
  
  // Sorting
  sortBy = 'upload_date';
  sortOrder = 'desc';
  
  // UI state
  loading = false;
  error = '';
  showFilters = false;
  viewMode: 'list' | 'grid' = 'list';
  
  // Statistics
  driveStats: any = {};
  fileTypeAnalytics: DriveFileTypeAnalytics | null = null;
  
  // Bulk actions
  showBulkActions = false;
  bulkActionType = '';
  bulkActionReason = '';
  
  constructor(
    private http: HttpClient,
    private adminAuthService: AdminAuthService,
    private adminStatsService: AdminStatsService
  ) {}
  
  ngOnInit(): void {
    this.loadFiles();
    this.loadFileTypeAnalytics();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  
  loadFiles(): void {
    this.loading = true;
    this.error = '';
    
    let params = new HttpParams()
      .set('page', this.currentPage.toString())
      .set('limit', this.pageSize.toString())
      .set('sort_by', this.sortBy)
      .set('sort_order', this.sortOrder);
    
    if (this.searchTerm) {
      params = params.set('search', this.searchTerm);
    }
    if (this.fileTypeFilter) {
      params = params.set('file_type', this.fileTypeFilter);
    }
    if (this.ownerFilter) {
      params = params.set('owner_email', this.ownerFilter);
    }
    if (this.backupStatusFilter) {
      params = params.set('backup_status', this.backupStatusFilter);
    }
    if (this.sizeMinFilter !== null) {
      // Convert MB to bytes (1 MB = 1024 * 1024 bytes)
      const sizeMinBytes = this.sizeMinFilter * 1024 * 1024;
      params = params.set('size_min', sizeMinBytes.toString());
    }
    if (this.sizeMaxFilter !== null) {
      // Convert MB to bytes (1 MB = 1024 * 1024 bytes)
      const sizeMaxBytes = this.sizeMaxFilter * 1024 * 1024;
      params = params.set('size_max', sizeMaxBytes.toString());
    }
    
    this.http.get<DriveFileListResponse>(`${environment.apiUrl}/api/v1/admin/drive/files`, { 
      params,
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response) => {
          this.files = response.files;
          this.totalFiles = response.total;
          this.totalPages = response.total_pages;
          this.driveStats = response.drive_stats;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load drive files. Please try again.';
          this.loading = false;
          console.error('Error loading drive files:', error);
        }
      });
  }
  
  loadFileTypeAnalytics(): void {
    this.http.get<DriveFileTypeAnalytics>(`${environment.apiUrl}/api/v1/admin/drive/analytics`, {
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response) => {
          this.fileTypeAnalytics = response;
        },
        error: (error) => {
          console.error('Error loading drive analytics:', error);
        }
      });
  }
  
  onSearch(): void {
    this.currentPage = 1;
    this.loadFiles();
  }
  
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadFiles();
  }
  
  onSortChange(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
    this.loadFiles();
  }
  
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadFiles();
  }
  
  toggleFileSelection(fileId: string): void {
    const index = this.selectedFiles.indexOf(fileId);
    if (index > -1) {
      this.selectedFiles.splice(index, 1);
    } else {
      this.selectedFiles.push(fileId);
    }
    this.showBulkActions = this.selectedFiles.length > 0;
  }
  
  selectAllFiles(): void {
    if (this.selectedFiles.length === this.files.length) {
      this.selectedFiles = [];
    } else {
      this.selectedFiles = this.files.map(f => f._id);
    }
    this.showBulkActions = this.selectedFiles.length > 0;
  }
  
  downloadFile(file: DriveFileItem): void {
    const token = this.adminAuthService.getAdminToken();
    if (token) {
      const downloadUrl = `${environment.apiUrl}${file.download_url}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  
  // === FILE OPERATIONS ===
  
  checkFileIntegrity(file: DriveFileItem): void {
    const operationData = {
      operation: 'integrity_check',
      reason: 'Manual integrity check from drive management'
    };
    
    this.http.post(`${environment.apiUrl}/api/v1/admin/files/${file._id}/operation`, operationData, {
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response: any) => {
          const result = response.integrity_check;
          const status = result.status;
          
          if (status === 'verified') {
            alert(`File integrity check passed!\n\nStatus: ${status}\nChecksum match: ${result.checksum_match}\nLast check: ${new Date(result.last_check).toLocaleString()}`);
          } else if (status === 'corrupted') {
            alert(`WARNING: File integrity check failed!\n\nStatus: ${status}\nCorruption detected: ${result.corruption_detected}\nCorruption type: ${result.corruption_type || 'Unknown'}\n\nPlease consider recovering from backup.`);
          } else if (status === 'inaccessible') {
            alert(`ERROR: File is inaccessible!\n\nStatus: ${status}\nError: ${result.error}\n\nFile may need to be recovered from backup.`);
          }
        },
        error: (error) => {
          alert('Failed to check file integrity');
          console.error('Error checking file integrity:', error);
        }
      });
  }
  
  moveFile(file: DriveFileItem): void {
    const targetLocation = prompt('Enter target Google Drive account ID (e.g., account_1, account_2, account_3):');
    if (!targetLocation) return;
    
    const reason = prompt('Reason for moving file (optional):');
    
    const operationData = {
      operation: 'move',
      target_location: targetLocation,
      reason: reason || undefined
    };
    
    this.http.post(`${environment.apiUrl}/api/v1/admin/files/${file._id}/operation`, operationData, {
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response: any) => {
          alert(`File moved successfully to ${response.target_location}`);
          this.loadFiles(); // Refresh the file list
        },
        error: (error) => {
          alert('Failed to move file');
          console.error('Error moving file:', error);
        }
      });
  }
  
  forceBackup(file: DriveFileItem): void {
    if (confirm(`Force backup for "${file.filename}" to Hetzner storage?`)) {
      const reason = prompt('Reason for force backup (optional):');
      
      const operationData = {
        operation: 'force_backup',
        reason: reason || undefined
      };
      
      this.http.post(`${environment.apiUrl}/api/v1/admin/files/${file._id}/operation`, operationData, {
        headers: this.getAuthHeaders()
      })
        .subscribe({
          next: (response: any) => {
            alert(`File backup completed!\nBackup path: ${response.backup_path}`);
            this.loadFiles(); // Refresh the file list
          },
          error: (error) => {
            alert('Failed to backup file');
            console.error('Error backing up file:', error);
          }
        });
    }
  }
  
  recoverFile(file: DriveFileItem): void {
    if (confirm(`Recover "${file.filename}" from backup? This will restore the file if it's corrupted or missing.`)) {
      const reason = prompt('Reason for file recovery (optional):');
      
      const operationData = {
        operation: 'recover',
        reason: reason || undefined
      };
      
      this.http.post(`${environment.apiUrl}/api/v1/admin/files/${file._id}/operation`, operationData, {
        headers: this.getAuthHeaders()
      })
        .subscribe({
          next: (response: any) => {
            alert('File recovered successfully from backup!');
            this.loadFiles(); // Refresh the file list
          },
          error: (error) => {
            if (error.error?.detail?.includes('no completed backup')) {
              alert('Cannot recover file: No completed backup available');
            } else {
              alert('Failed to recover file');
            }
            console.error('Error recovering file:', error);
          }
        });
    }
  }
  
  previewFile(file: DriveFileItem): void {
    if (file.preview_available) {
      this.http.get(`${environment.apiUrl}/api/v1/admin/files/${file._id}/preview`, {
        headers: this.getAuthHeaders()
      })
        .subscribe({
          next: (previewData: any) => {
            // Open preview in modal or new window
            window.open(previewData.preview_url, '_blank');
          },
          error: (error) => {
            console.error('Error loading preview:', error);
          }
        });
    }
  }
  
  deleteFile(file: DriveFileItem): void {
    if (confirm(`Are you sure you want to delete "${file.filename}"?`)) {
      const reason = prompt('Reason for deletion (optional):');
      
      let params = new HttpParams();
      if (reason) {
        params = params.set('reason', reason);
      }
      
      this.http.delete(`${environment.apiUrl}/api/v1/admin/files/${file._id}`, { 
        params,
        headers: this.getAuthHeaders()
      })
        .subscribe({
          next: () => {
            // Refresh both files and analytics to update storage stats
            this.loadFiles();
            this.loadFileTypeAnalytics();
            // Trigger admin panel stats update
            this.adminStatsService.triggerStatsUpdate();
            alert('File deleted successfully');
          },
          error: (error) => {
            alert('Failed to delete file');
            console.error('Error deleting file:', error);
          }
        });
    }
  }
  
  executeBulkAction(): void {
    if (!this.bulkActionType || this.selectedFiles.length === 0) {
      return;
    }
    
    const actionData = {
      file_ids: this.selectedFiles,
      action: this.bulkActionType,
      reason: this.bulkActionReason || undefined
    };
    
    this.http.post(`${environment.apiUrl}/api/v1/admin/files/bulk-action`, actionData, {
      headers: this.getAuthHeaders()
    })
              .subscribe({
          next: (response: any) => {
            alert(response.message);
            this.selectedFiles = [];
            this.showBulkActions = false;
            this.bulkActionType = '';
            this.bulkActionReason = '';
            // Refresh both files and analytics to update storage stats
            this.loadFiles();
            this.loadFileTypeAnalytics();
            // Trigger admin panel stats update
            this.adminStatsService.triggerStatsUpdate();
          },
        error: (error) => {
          alert('Bulk action failed');
          console.error('Error executing bulk action:', error);
        }
      });
  }
  
  clearFilters(): void {
    this.searchTerm = '';
    this.fileTypeFilter = '';
    this.ownerFilter = '';
    this.backupStatusFilter = '';
    this.sizeMinFilter = null;
    this.sizeMaxFilter = null;
    this.currentPage = 1;
    this.loadFiles();
  }
  
  getFileIcon(fileType: string): string {
    const icons: { [key: string]: string } = {
      'image': 'fas fa-image',
      'video': 'fas fa-video',
      'audio': 'fas fa-music',
      'document': 'fas fa-file-text',
      'archive': 'fas fa-file-archive',
      'other': 'fas fa-file'
    };
    return icons[fileType] || icons['other'];
  }
  
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
  
  getBackupStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'none': 'Not Backed Up',
      'in_progress': 'Transferring to Hetzner',
      'completed': 'Backed Up to Hetzner',
      'failed': 'Backup Failed'
    };
    return statusMap[status] || status;
  }
  
  getBackupStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'none': 'status-pending',
      'in_progress': 'status-uploading',
      'completed': 'status-completed',
      'failed': 'status-failed'
    };
    return classMap[status] || 'status-unknown';
  }
} 