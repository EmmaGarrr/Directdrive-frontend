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
  
  // Statistics
  hetznerStats: any = {};
  
  // Delete confirmation
  showDeleteModal = false;
  fileToDelete: HetznerFile | null = null;
  deleteReason = '';
  deleting = false;
  
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
      if (this.sizeMinFilter) {
        params = params.set('size_min', this.sizeMinFilter.toString());
      }
      if (this.sizeMaxFilter) {
        params = params.set('size_max', this.sizeMaxFilter.toString());
      }

      const response = await this.http.get<HetznerFileListResponse>(
        `${environment.apiUrl}/api/v1/admin/hetzner/files`,
        { headers: this.getHeaders(), params }
      ).toPromise();

      if (response) {
        this.files = response.files;
        this.totalFiles = response.total;
        this.totalPages = response.total_pages;
        this.hetznerStats = response.hetzner_stats;
      }
    } catch (error: any) {
      console.error('Error loading Hetzner files:', error);
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
      this.selectedFiles = this.files.map(f => f._id);
    }
  }

  downloadFile(file: HetznerFile): void {
    if (file.download_url) {
      window.open(file.download_url, '_blank');
    }
  }

  previewFile(file: HetznerFile): void {
    if (file.preview_available) {
      window.open(`${environment.apiUrl}/api/v1/admin/files/${file._id}/preview`, '_blank');
    }
  }

  confirmDeleteFile(file: HetznerFile): void {
    this.fileToDelete = file;
    this.deleteReason = '';
    this.showDeleteModal = true;
  }

  async deleteFile(): Promise<void> {
    if (!this.fileToDelete) return;

    this.deleting = true;
    try {
      let params = new HttpParams();
      if (this.deleteReason) {
        params = params.set('reason', this.deleteReason);
      }

      await this.http.delete(
        `${environment.apiUrl}/api/v1/admin/hetzner/files/${this.fileToDelete._id}`,
        { headers: this.getHeaders(), params }
      ).toPromise();

      this.showDeleteModal = false;
      this.fileToDelete = null;
      this.deleteReason = '';
      
      // Reload files
      this.loadFiles();
      
    } catch (error: any) {
      console.error('Error deleting file:', error);
      this.error = error.error?.detail || 'Failed to delete file';
    } finally {
      this.deleting = false;
    }
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.fileToDelete = null;
    this.deleteReason = '';
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
      'archive': 'fas fa-file-archive',
      'other': 'fas fa-file'
    };
    return iconMap[fileType] || 'fas fa-file';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getStorageStatus(file: HetznerFile): { text: string; class: string; tooltip: string } {
    if (file.backup_status === 'completed') {
      return { text: 'Hetzner', class: 'status-completed', tooltip: 'File successfully backed up to Hetzner' };
    } else if (file.backup_status === 'in_progress') {
      return { text: 'Pending', class: 'status-pending', tooltip: 'File is being backed up to Hetzner' };
    } else if (file.backup_status === 'failed') {
      return { text: 'Failed', class: 'status-failed', tooltip: 'Failed to backup to Hetzner' };
    } else {
      return { text: 'Unknown', class: 'status-unknown', tooltip: 'Unknown backup status' };
    }
  }

  canDeleteFile(file: HetznerFile): boolean {
    // Only allow deletion if file is backed up to Hetzner
    return file.backup_status === 'completed' && file.backup_location === 'hetzner';
  }

  getDeleteButtonClass(file: HetznerFile): string {
    return this.canDeleteFile(file) ? 'btn-delete' : 'btn-delete-disabled';
  }
}
