import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';

interface HetznerFile {
  _id: string;
  filename: string;
  size_bytes: number;
  size_formatted: string;
  content_type: string;
  file_type: string;
  upload_date: string;
  owner_email: string;
  status: string;
  backup_status: string;
  backup_location: string;
  hetzner_remote_path: string;
  download_url: string;
  preview_available?: boolean;
  // NEW: Archive and quarantine fields
  archived?: boolean;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  quarantined?: boolean;
  quarantined_at?: string;
  quarantined_by?: string;
  quarantine_reason?: string;
  // NEW: Integrity checking fields
  integrity_status?: string;
  last_integrity_check?: string;
  // NEW: Action history
  action_history?: any[];
}

interface HetznerFileListResponse {
  files: HetznerFile[];
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

interface ActionHistory {
  action: string;
  performed_by: string;
  performed_at: string;
  reason?: string;
  details?: string;
  ip_address?: string;
}

@Component({
  selector: 'app-hetzner-management',
  templateUrl: './hetzner-management.component.html',
  styleUrls: ['./hetzner-management.component.css']
})
export class HetznerManagementComponent implements OnInit {
  files: HetznerFile[] = [];
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
  viewingArchived = false; // NEW: Track if viewing archived files
  
  // Statistics
  hetznerStats: any = {};
  
  // NEW: Archive confirmation
  showArchiveModal = false;
  fileToArchive: HetznerFile | null = null;
  archiveReason = '';
  archiving = false;
  
  // NEW: Action history modal
  showActionHistoryModal = false;
  selectedFileActionHistory: ActionHistory[] = [];
  selectedFileName = '';
  
  // NEW: Download progress
  downloadingFiles: Set<string> = new Set();
  
  constructor(
    private http: HttpClient,
    private adminAuthService: AdminAuthService
  ) { }

  ngOnInit(): void {
    this.loadFiles();
  }

  private getHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async loadFiles(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const params = new HttpParams()
        .set('page', this.currentPage.toString())
        .set('limit', this.pageSize.toString())
        .set('sort_by', this.sortBy)
        .set('sort_order', this.sortOrder)
        .set('search', this.searchTerm || '')
        .set('file_type', this.fileTypeFilter || '')
        .set('owner_email', this.ownerFilter || '')
        .set('backup_status', this.backupStatusFilter || '');

      if (this.sizeMinFilter !== null) {
        params.set('size_min', this.sizeMinFilter.toString());
      }
      if (this.sizeMaxFilter !== null) {
        params.set('size_max', this.sizeMaxFilter.toString());
      }

      // Choose endpoint based on whether we're viewing archived files
      const endpoint = this.viewingArchived 
        ? `${environment.apiUrl}/api/v1/admin/hetzner/files/archived`
        : `${environment.apiUrl}/api/v1/admin/hetzner/files`;

      const response = await this.http.get<HetznerFileListResponse>(
        endpoint,
        { headers: this.getHeaders(), params }
      ).toPromise();

      this.files = response!.files;
      this.totalFiles = response!.total;
      this.totalPages = response!.total_pages;
      this.hetznerStats = response!.hetzner_stats;

    } catch (error: any) {
      console.error('Error loading files:', error);
      this.error = error.error?.detail || 'Failed to load files';
    } finally {
      this.loading = false;
    }
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
  }

  selectAllFiles(): void {
    if (this.selectedFiles.length === this.files.length) {
      this.selectedFiles = [];
    } else {
      this.selectedFiles = this.files.map(file => file._id);
    }
  }

  // IMPROVED: Download with progress tracking and server optimization
  async downloadFile(file: HetznerFile): Promise<void> {
    if (this.downloadingFiles.has(file._id)) {
      return; // Already downloading
    }

    this.downloadingFiles.add(file._id);

    try {
      // Use the optimized download endpoint
      const downloadUrl = `${environment.apiUrl}/api/v1/download/stream/${file._id}`;
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.filename;
      link.style.display = 'none';
      
      // Add authorization header to the link
      const token = this.adminAuthService.getAdminToken();
      if (token) {
        link.href += `?token=${encodeURIComponent(token)}`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success message
      alert(`Download started for ${file.filename}`);
      
    } catch (error: any) {
      console.error('Download error:', error);
      alert(`Download failed: ${error.error?.detail || 'Unknown error'}`);
    } finally {
      this.downloadingFiles.delete(file._id);
    }
  }

  previewFile(file: HetznerFile): void {
    if (file.preview_available) {
      const previewUrl = `${environment.apiUrl}/api/v1/admin/files/${file._id}/preview`;
      window.open(previewUrl, '_blank');
    }
  }

  // UPDATED: Archive instead of delete
  confirmArchiveFile(file: HetznerFile): void {
    this.fileToArchive = file;
    this.archiveReason = '';
    this.showArchiveModal = true;
  }

  async archiveFile(): Promise<void> {
    if (!this.fileToArchive || !this.archiveReason.trim()) {
      alert('Please provide a reason for archiving');
      return;
    }

    this.archiving = true;

    try {
      const response = await this.http.post(
        `${environment.apiUrl}/api/v1/admin/files/${this.fileToArchive._id}/archive`,
        { reason: this.archiveReason },
        { headers: this.getHeaders() }
      ).toPromise();

      alert('File archived successfully');
      this.showArchiveModal = false;
      this.fileToArchive = null;
      this.archiveReason = '';
      this.loadFiles(); // Refresh the list

    } catch (error: any) {
      console.error('Archive error:', error);
      alert(`Archive failed: ${error.error?.detail || 'Unknown error'}`);
    } finally {
      this.archiving = false;
    }
  }

  cancelArchive(): void {
    this.showArchiveModal = false;
    this.fileToArchive = null;
    this.archiveReason = '';
  }

  // NEW: View action history
  async viewActionHistory(file: HetznerFile): Promise<void> {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/api/v1/admin/files/${file._id}/action-history`,
        { headers: this.getHeaders() }
      ).toPromise();

      this.selectedFileActionHistory = response.action_history || [];
      this.selectedFileName = file.filename;
      this.showActionHistoryModal = true;

    } catch (error: any) {
      console.error('Error loading action history:', error);
      alert(`Failed to load action history: ${error.error?.detail || 'Unknown error'}`);
    }
  }

  closeActionHistoryModal(): void {
    this.showActionHistoryModal = false;
    this.selectedFileActionHistory = [];
    this.selectedFileName = '';
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
    const iconMap: { [key: string]: string } = {
      'image': 'fas fa-image',
      'video': 'fas fa-video',
      'audio': 'fas fa-music',
      'document': 'fas fa-file-alt',
      'archive': 'fas fa-archive',
      'other': 'fas fa-file'
    };
    return iconMap[fileType] || 'fas fa-file';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getStorageStatus(file: HetznerFile): { text: string; class: string; tooltip: string } {
    if (file.archived) {
      return { text: 'Archived', class: 'storage-archived', tooltip: 'File is archived' };
    }
    
    if (file.quarantined) {
      return { text: 'Quarantined', class: 'storage-quarantined', tooltip: 'File is quarantined' };
    }
    
    if (file.backup_status === 'completed') {
      return { text: 'Backed Up', class: 'storage-backed-up', tooltip: 'File backed up to Hetzner' };
    } else if (file.backup_status === 'in_progress') {
      return { text: 'Backing Up', class: 'storage-backing-up', tooltip: 'File backup in progress' };
    } else {
      return { text: 'Not Backed Up', class: 'storage-not-backed-up', tooltip: 'File not backed up to Hetzner' };
    }
  }

  canArchiveFile(file: HetznerFile): boolean {
    // Can archive if file is not already archived and has backup
    return !file.archived && file.backup_status === 'completed';
  }

  // NEW: Check if actions should be disabled for quarantined/archived files
  canPerformAction(file: HetznerFile, actionType: string): boolean {
    // If file is quarantined, only allow archive and view action history
    if (file.quarantined) {
      return actionType === 'archive' || actionType === 'view_history';
    }
    
    // If file is archived, only allow restore and view action history
    if (file.archived) {
      return actionType === 'restore' || actionType === 'view_history';
    }
    
    // For normal files, check if backup is completed
    return file.backup_status === 'completed';
  }

  getActionTooltip(file: HetznerFile, actionType: string): string {
    if (file.quarantined) {
      if (actionType === 'archive' || actionType === 'view_history') {
        return '';
      }
      return 'File is quarantined - only archive and view history actions available';
    }
    
    if (file.archived) {
      if (actionType === 'restore' || actionType === 'view_history') {
        return '';
      }
      return 'File is archived - only restore and view history actions available';
    }
    
    if (file.backup_status !== 'completed') {
      return 'File not backed up to Hetzner yet';
    }
    
    return '';
  }

  // IMPROVED: Real integrity checking
  async checkFileIntegrity(file: HetznerFile): Promise<void> {
    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/api/v1/admin/files/${file._id}/operation`,
        { operation: 'integrity_check' },
        { headers: this.getHeaders() }
      ).toPromise();

      const result = response.integrity_check;
      let message = `Integrity Check Result for ${file.filename}:\n`;
      message += `Status: ${result.status}\n`;
      message += `File Accessible: ${result.file_accessible ? 'Yes' : 'No'}\n`;
      message += `Checksum Match: ${result.checksum_match ? 'Yes' : 'No'}\n`;
      message += `Corruption Detected: ${result.corruption_detected ? 'Yes' : 'No'}\n`;
      
      if (result.details) {
        message += `Details: ${result.details}`;
      }

      alert(message);

    } catch (error: any) {
      console.error('Integrity check error:', error);
      alert(`Integrity check failed: ${error.error?.detail || 'Unknown error'}`);
    }
  }

  moveFile(file: HetznerFile): void {
    const targetLocation = prompt('Enter target Hetzner location:');
    if (!targetLocation) return;

    this.http.post(
      `${environment.apiUrl}/api/v1/admin/files/${file._id}/operation`,
      { 
        operation: 'move',
        target_location: targetLocation,
        reason: 'Admin move request'
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response: any) => {
        alert('File moved successfully');
        this.loadFiles();
      },
      error: (error: any) => {
        console.error('Move error:', error);
        alert(`Move failed: ${error.error?.detail || 'Unknown error'}`);
      }
    });
  }

  async forceBackup(file: HetznerFile): Promise<void> {
    const confirmed = confirm(`Force backup for ${file.filename}?`);
    if (!confirmed) return;

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/api/v1/admin/files/${file._id}/operation`,
        { operation: 'force_backup', reason: 'Admin force backup request' },
        { headers: this.getHeaders() }
      ).toPromise();

      alert(`Backup initiated: ${response.message}`);
      this.loadFiles(); // Refresh to show updated status

    } catch (error: any) {
      console.error('Force backup error:', error);
      alert(`Force backup failed: ${error.error?.detail || 'Unknown error'}`);
    }
  }

  async quarantineFile(file: HetznerFile): Promise<void> {
    const reason = prompt('Enter quarantine reason:');
    if (!reason) return;

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/api/v1/admin/files/bulk-action`,
        {
          file_ids: [file._id],
          action: 'quarantine',
          reason: reason
        },
        { headers: this.getHeaders() }
      ).toPromise();

      alert('File quarantined successfully');
      this.loadFiles(); // Refresh to show updated status

    } catch (error: any) {
      console.error('Quarantine error:', error);
      alert(`Quarantine failed: ${error.error?.detail || 'Unknown error'}`);
    }
  }

  async recoverFile(file: HetznerFile): Promise<void> {
    const confirmed = confirm(`Recover ${file.filename} from backup?`);
    if (!confirmed) return;

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/api/v1/admin/files/${file._id}/operation`,
        { operation: 'recover', reason: 'Admin recovery request' },
        { headers: this.getHeaders() }
      ).toPromise();

      alert(`Recovery completed: ${response.message}`);
      this.loadFiles(); // Refresh to show updated status

    } catch (error: any) {
      console.error('Recovery error:', error);
      alert(`Recovery failed: ${error.error?.detail || 'Unknown error'}`);
    }
  }

  // NEW: Restore file from archive
  async restoreFile(file: HetznerFile): Promise<void> {
    const confirmed = confirm(`Restore ${file.filename} from archive?`);
    if (!confirmed) return;

    try {
      const response = await this.http.post(
        `${environment.apiUrl}/api/v1/admin/files/${file._id}/restore`,
        { reason: 'Admin restore request' },
        { headers: this.getHeaders() }
      ).toPromise();

      alert('File restored successfully');
      this.loadFiles(); // Refresh to show updated status

    } catch (error: any) {
      console.error('Restore error:', error);
      alert(`Restore failed: ${error.error?.detail || 'Unknown error'}`);
    }
  }

  // NEW: View archived files
  viewArchivedFiles(): void {
    this.viewingArchived = !this.viewingArchived;
    this.currentPage = 1;
    this.selectedFiles = [];
    this.loadFiles();
  }

  executeBulkAction(): void {
    if (this.selectedFiles.length === 0) {
      alert('Please select files first');
      return;
    }

    const action = prompt('Enter action (delete/quarantine/backup):');
    if (!action) return;

    const reason = prompt('Enter reason (optional):');

    this.http.post(
      `${environment.apiUrl}/api/v1/admin/files/bulk-action`,
      {
        file_ids: this.selectedFiles,
        action: action,
        reason: reason
      },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response: any) => {
        alert(`Bulk action completed: ${response.message}`);
        this.selectedFiles = [];
        this.loadFiles();
      },
      error: (error: any) => {
        console.error('Bulk action error:', error);
        alert(`Bulk action failed: ${error.error?.detail || 'Unknown error'}`);
      }
    });
  }
}
