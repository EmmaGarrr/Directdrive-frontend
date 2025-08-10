import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminStatsService } from '../../services/admin-stats.service';

interface HetznerFileItem {
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
  backup_location: string;
  hetzner_remote_path: string;
  gdrive_account_id: string;
  download_url: string;
  preview_available?: boolean;
}

interface HetznerFileListResponse {
  files: HetznerFileItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  hetzner_stats: {
    total_files: number;
    total_storage: number;
    total_storage_formatted: string;
    recent_backups: number;
    failed_backups: number;
  };
}

interface HetznerFileTypeAnalytics {
  file_types: {
    _id: string;
    count: number;
    total_size: number;
    percentage: number;
    size_formatted: string;
  }[];
  total_files: number;
  backup_timeline: {
    date: string;
    count: number;
    total_size: number;
    size_formatted: string;
  }[];
  account_distribution: {
    account_id: string;
    count: number;
    total_size: number;
    size_formatted: string;
  }[];
}

@Component({
  selector: 'app-hetzner-file-management',
  templateUrl: './hetzner-file-management.component.html',
  styleUrls: ['./hetzner-file-management.component.css']
})
export class HetznerFileManagementComponent implements OnInit {
  Math = Math; // Make Math available to template
  files: HetznerFileItem[] = [];
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
  hetznerStats: any = {};
  fileTypeAnalytics: HetznerFileTypeAnalytics | null = null;
  realStorageInfo: any = null;
  orphanedFilesCount: number = 0;
  
  // Bulk actions
  showBulkActions = false;
  bulkActionType = '';
  bulkActionReason = '';
  
  // Progress tracking for parallel scanning
  scanningProgress: number = 0;
  scannedFiles: number = 0;
  isScanning: boolean = false;

  constructor(
    private http: HttpClient,
    private adminAuthService: AdminAuthService,
    private adminStatsService: AdminStatsService
  ) {}
  
  ngOnInit(): void {
    // Load files first to get hetznerStats
    this.loadFiles();
    this.loadFileTypeAnalytics();
    
    // Wait for files to load, then start storage scan
    setTimeout(() => {
      this.loadRealStorageInfo();
      this.startAutoParallelScan();
    }, 1000); // Give time for loadFiles to complete
    
    this.adminStatsService.triggerStatsUpdate();
  }

  startAutoParallelScan(): void {
    console.log('🚀 Starting auto parallel scan...');
    this.isScanning = true;
    this.scanningProgress = 0;
    this.scannedFiles = 0;
    
    // Start with a much slower, more realistic progress simulation
    const progressInterval = setInterval(() => {
      if (this.scanningProgress < 60) { // Only go up to 60% in simulation
        this.scanningProgress += Math.random() * 1 + 0.5; // Very slow increments
        this.scannedFiles = Math.floor((this.scanningProgress / 100) * 30); // Conservative estimate
      }
    }, 500); // Much slower updates (500ms)
    
    // Call the backend to start real scanning
    this.loadRealStorageInfo().then(() => {
      clearInterval(progressInterval);
      console.log('✅ Auto parallel scan completed');
    }).catch((error) => {
      clearInterval(progressInterval);
      console.error('❌ Auto parallel scan failed:', error);
      this.isScanning = false;
      this.scanningProgress = 0;
    });
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
    
    this.http.get<HetznerFileListResponse>(`${environment.apiUrl}/api/v1/admin/hetzner/files`, { 
      params,
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response) => {
          this.files = response.files;
          this.totalFiles = response.total;
          this.totalPages = response.total_pages;
          this.hetznerStats = response.hetzner_stats;
          this.loading = false;
          
          // Recalculate orphaned files count now that we have hetznerStats
          if (this.realStorageInfo) {
            this.calculateOrphanedFilesCount();
          }
        },
        error: (error) => {
          this.error = 'Failed to load Hetzner files. Please try again.';
          this.loading = false;
          console.error('Error loading Hetzner files:', error);
        }
      });
  }
  
  loadFileTypeAnalytics(): void {
    this.http.get<HetznerFileTypeAnalytics>(`${environment.apiUrl}/api/v1/admin/hetzner/analytics`, {
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response) => {
          this.fileTypeAnalytics = response;
        },
        error: (error) => {
          console.error('Error loading Hetzner analytics:', error);
        }
      });
  }

  async loadRealStorageInfo(): Promise<void> {
    try {
      console.log('🔍 Loading real storage info...');
      
      const response: any = await this.http.get(`${environment.apiUrl}/api/v1/admin/hetzner/storage-info`, {
        headers: this.getAuthHeaders()
      }).toPromise();
      
      console.log('📊 Storage info response:', response);
      
      if (response && response.parallel_mode) {
        // Update progress based on backend response
        this.scanningProgress = response.progress || 100;
        this.scannedFiles = response.total_files || 0;
        
        // Update the real storage info with proper property mapping
        this.realStorageInfo = {
          total_files: response.total_files || 0,
          total_size: response.total_size || 0,
          total_size_formatted: response.total_size_formatted || '0 B',
          used_formatted: response.total_size_formatted || '0 B', // Map to used_formatted for HTML
          message: response.message || 'Scan completed',
          parallel_mode: true,
          workers_used: response.workers_used || 5
        };
        
        // Calculate orphaned files count (files on Hetzner but not in database)
        this.calculateOrphanedFilesCount();
        
        // Only mark as complete when backend actually finishes
        if (response.status === 'completed') {
          this.isScanning = false;
          this.scanningProgress = 100;
          console.log('✅ Backend scan completed, progress bar hidden');
          
          // Show completion message
          if (response.total_files > 0) {
            setTimeout(() => {
              alert(`✅ Scan completed successfully!\n\nFound ${response.total_files} files\nTotal size: ${response.total_size_formatted}\nUsed ${response.workers_used} parallel workers`);
            }, 500);
          }
        } else if (response.status === 'error') {
          this.isScanning = false;
          this.scanningProgress = 0;
          console.error('❌ Backend scan failed');
          alert(`❌ Scan failed: ${response.message || 'Unknown error'}`);
        }
      } else {
        // Fallback to regular storage info
        this.realStorageInfo = response;
        this.isScanning = false;
        this.scanningProgress = 100;
        
        // Calculate orphaned files count for fallback case too
        this.calculateOrphanedFilesCount();
      }
      
      console.log('✅ Real storage info loaded successfully');
      
    } catch (error: any) {
      console.error('❌ Error loading real storage info:', error);
      this.isScanning = false;
      this.scanningProgress = 0;
      this.scannedFiles = 0;
      
      // Show error message to user
      const errorMessage = error?.error?.detail || error?.message || 'Unknown error';
      alert(`❌ Failed to load storage info: ${errorMessage}`);
    }
  }

  // Calculate orphaned files count (files on Hetzner but not in database)
  private calculateOrphanedFilesCount(): void {
    console.log('📊 Calculating orphaned files count...');
    console.log('📊 realStorageInfo:', this.realStorageInfo);
    console.log('📊 hetznerStats:', this.hetznerStats);
    
    if (this.realStorageInfo && this.hetznerStats && Object.keys(this.hetznerStats).length > 0) {
      const hetznerFiles = this.realStorageInfo.total_files || 0;
      const dbFiles = this.hetznerStats.total_files || 0;
      this.orphanedFilesCount = Math.max(0, hetznerFiles - dbFiles);
      
      console.log(`📊 Orphaned files calculation: Hetzner(${hetznerFiles}) - DB(${dbFiles}) = ${this.orphanedFilesCount}`);
    } else {
      console.log('📊 Cannot calculate orphaned files: missing data');
      if (!this.realStorageInfo) console.log('❌ realStorageInfo is null/undefined');
      if (!this.hetznerStats || Object.keys(this.hetznerStats).length === 0) console.log('❌ hetznerStats is null/undefined or empty');
      
      this.orphanedFilesCount = 0;
    }
  }

  // Method to manually refresh storage info
  refreshStorageInfo(): void {
    this.isScanning = true;
    this.scanningProgress = 0;
    this.scannedFiles = 0;
    this.loadRealStorageInfo();
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
  
  downloadFile(file: HetznerFileItem): void {
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
  
  checkFileIntegrity(file: HetznerFileItem): void {
    const operationData = {
      operation: 'integrity_check',
      reason: 'Manual integrity check from Hetzner management'
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
  
  recoverFile(file: HetznerFileItem): void {
    if (confirm(`Recover "${file.filename}" from Hetzner backup? This will restore the file if it's corrupted or missing.`)) {
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
            alert('File recovered successfully from Hetzner backup!');
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
  
  previewFile(file: HetznerFileItem): void {
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
  
  deleteFile(file: HetznerFileItem): void {
    if (confirm(`Are you sure you want to delete "${file.filename}" from Hetzner backup?`)) {
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
            this.loadRealStorageInfo(); // Refresh real storage info
            // Trigger admin panel stats update
            this.adminStatsService.triggerStatsUpdate();
            alert('File deleted successfully from Hetzner backup');
          },
          error: (error) => {
            alert('Failed to delete file from Hetzner backup');
            console.error('Error deleting file:', error);
          }
        });
    }
  }





  fastParallelCleanup(): void {
    if (!confirm('🚀 FAST PARALLEL CLEANUP: This will delete ALL files using 5 parallel workers!\n\nThis cleans both Hetzner storage AND your database.\n\nThis action cannot be undone. Are you sure you want to continue?')) {
      return;
    }
    
    const reason = prompt('Reason for fast parallel cleanup (optional):');
    
    // Show loading state
    this.loading = true;
    
    // Prepare request parameters
    let params = new HttpParams();
    if (reason) {
      params = params.set('reason', reason);
    }
    
    // Call the parallel cleanup endpoint
    this.http.post(`${environment.apiUrl}/api/v1/admin/hetzner/parallel-cleanup`, {}, { 
      params,
      headers: this.getAuthHeaders()
    })
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          
          // Show success message with complete cleanup details
          const successMessage = 
            `🚀 FAST PARALLEL CLEANUP COMPLETED!\n\n` +
            `Performance Results:\n` +
            `• Total Time: ${response.total_time?.toFixed(2) || 'Unknown'} seconds\n` +
            `• Scan Time: ${response.scan_time?.toFixed(2) || 'Unknown'} seconds\n` +
            `• Delete Time: ${response.delete_time?.toFixed(2) || 'Unknown'} seconds\n` +
            `• Workers Used: ${response.workers_used || 5}\n` +
            `• Performance: ${response.performance_improvement || '5x faster'}\n\n` +
            `Complete Cleanup Results:\n` +
            `• Hetzner Storage: ${response.deleted_files || 0} files, ${response.deleted_dirs || 0} directories\n` +
            `• Database Records: ${response.database_records_cleaned || 0} cleaned\n` +
            `• Total Items: ${response.total_items || 0}\n` +
            `• Errors: ${response.errors || 0}\n\n` +
            `✅ Both Hetzner storage and database have been cleaned!`;
          
          alert(successMessage);
          
          // Refresh all data
          this.loadFiles();
          this.loadFileTypeAnalytics();
          this.loadRealStorageInfo();
          this.adminStatsService.triggerStatsUpdate();
          
          // Reset selections and progress
          this.selectedFiles = [];
          this.showBulkActions = false;
          this.scanningProgress = 0;
          this.scannedFiles = 0;
          
          console.log('Fast parallel cleanup completed:', response);
        },
        error: (error) => {
          this.loading = false;
          
          const errorMessage = error.error?.detail || 'Unknown error occurred';
          alert(`❌ Failed to perform fast parallel cleanup: ${errorMessage}`);
          console.error('Error in fast parallel cleanup:', error);
        }
      });
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
  
  getHetznerPath(file: HetznerFileItem): string {
    return file.hetzner_remote_path || 'Unknown path';
  }
} 