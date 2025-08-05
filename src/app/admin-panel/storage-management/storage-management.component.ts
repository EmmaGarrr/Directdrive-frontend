import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { StorageManagementService } from '../../services/storage-management.service';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

interface StorageFile {
  file_id: string;
  filename: string;
  path: string;
  size_bytes: number;
  size_formatted: string;
  last_modified: string;
  content_type: string;
  is_directory: boolean;
  status?: string;
  error?: string;
  url?: string;
}

interface StorageFileListResponse {
  files: StorageFile[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface StorageStats {
  total_files: number;
  total_size_bytes: number;
  by_storage_type: {
    [key: string]: {
      count: number;
      size_bytes: number;
      size_formatted: string;
    };
  };
  by_status: {
    [key: string]: number;
  };
}

type StorageType = 'google_drive' | 'hetzner';

type ViewMode = 'list' | 'grid';

@Component({
  selector: 'app-storage-management',
  templateUrl: './storage-management.component.html',
  styleUrls: ['./storage-management.component.css']
})
export class StorageManagementComponent implements OnInit, AfterViewInit, OnDestroy {
  private subscriptions = new Subscription();
  
  constructor(
    private storageService: StorageManagementService,
    private adminAuthService: AdminAuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.dataSource = new MatTableDataSource<StorageFile>([]);
  }
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Storage type tabs
  storageTypes: {id: StorageType, name: string, icon: string}[] = [
    { id: 'google_drive', name: 'Google Drive', icon: 'fab fa-google-drive' },
    { id: 'hetzner', name: 'Hetzner Storage', icon: 'fas fa-server' }
  ];
  activeStorage: StorageType = 'google_drive';
  
  // File list
  dataSource = new MatTableDataSource<StorageFile>([]);
  displayedColumns: string[] = ['select', 'filename', 'size', 'last_modified', 'status', 'actions'];
  selection = new Set<string>();
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalFiles = 0;
  totalPages = 0;
  
  // Filters
  path = '/';
  searchTerm = '';
  
  // UI state
  isLoading = false;
  error = '';
  viewMode: 'list' | 'grid' = 'list';
  activeTabIndex = 0;
  
  // Statistics
  stats: StorageStats | null = null;
  
  ngOnInit(): void {
    // Check if user is authenticated as admin
    if (!this.adminAuthService.isAdminAuthenticated()) {
      this.showError('Please login as admin to access storage management');
      // Redirect to admin login
      window.location.href = '/admin-auth/login';
      return;
    }
    
    this.loadStats();
    this.loadFiles();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // Load storage statistics
  loadStats(): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.storageService.getStorageStats()
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (stats: any) => {
            // Backend returns: { total_files, total_size_bytes, by_storage_type, by_status }
            this.stats = {
              total_files: stats.total_files || 0,
              total_size_bytes: stats.total_size_bytes || 0,
              by_storage_type: {
                google_drive: {
                  count: stats.by_storage_type?.google_drive?.count || 0,
                  size_bytes: stats.by_storage_type?.google_drive?.size_bytes || 0,
                  size_formatted: this.formatFileSize(stats.by_storage_type?.google_drive?.size_bytes || 0)
                },
                hetzner: {
                  count: stats.by_storage_type?.hetzner?.count || 0,
                  size_bytes: stats.by_storage_type?.hetzner?.size_bytes || 0,
                  size_formatted: this.formatFileSize(stats.by_storage_type?.hetzner?.size_bytes || 0)
                }
              },
              by_status: stats.by_status || {}
            };
          },
          error: (error: any) => {
            console.error('Error loading storage stats:', error);
            this.snackBar.open('Failed to load storage statistics', 'Close', { duration: 5000 });
          }
        })
    );
  }

  // Load files based on current filters
  loadFiles(): void {
    this.isLoading = true;
    
    const storageType = this.activeTabIndex === 0 ? 'all' : 
                       this.activeTabIndex === 1 ? 'google-drive' : 'hetzner';
    
    this.subscriptions.add(
      this.storageService.getFiles(
        storageType,
        this.paginator?.pageIndex + 1 || 1,
        this.paginator?.pageSize || 20,
        this.searchTerm
      )
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: any) => {
          // Backend returns: { files: StorageFileInfo[], total, page, limit, total_pages }
          const storageFiles: StorageFile[] = response.files.map((file: any) => ({
            file_id: file.file_id,
            filename: file.filename,
            path: file.path,
            size_bytes: file.size_bytes,
            size_formatted: this.formatFileSize(file.size_bytes),
            last_modified: file.last_modified, // Backend returns as string
            content_type: file.content_type,
            is_directory: file.is_directory,
            status: 'uploaded', // Default status since backend doesn't provide it
            error: undefined,
            url: undefined
          }));
          
          this.dataSource.data = storageFiles;
          this.totalFiles = response.total;
          this.totalPages = response.total_pages;
          if (this.paginator) {
            this.paginator.length = response.total;
          }
        },
        error: (error: any) => {
          console.error('Error loading files:', error);
          this.snackBar.open('Failed to load files', 'Close', { duration: 5000 });
        }
      })
    );
  }

  // Handle storage type tab change
  onStorageChange(storageType: StorageType): void {
    this.activeStorage = storageType;
    this.path = '/';
    this.currentPage = 1;
    this.loadFiles();
  }

  // Handle file selection
  toggleFileSelection(fileId: string): void {
    if (this.selection.has(fileId)) {
      this.selection.delete(fileId);
    } else {
      this.selection.add(fileId);
    }
  }

  // Handle directory navigation
  navigateToPath(newPath: string): void {
    this.path = newPath;
    this.currentPage = 1;
    this.loadFiles();
  }

  // Handle file deletion
  deleteFile(fileId: string, storageType: 'google-drive' | 'hetzner'): void {
    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete this file from ${storageType === 'google-drive' ? 'Google Drive' : 'Hetzner'}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'warn'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.subscriptions.add(
          this.storageService.deleteFile(fileId, storageType).subscribe({
            next: (response) => {
              this.snackBar.open(response.message, 'Close', { duration: 3000 });
              this.loadFiles();
              this.loadStats();
            },
            error: (error: any) => {
              console.error('Error deleting file:', error);
              this.snackBar.open('Failed to delete file', 'Close', { duration: 5000 });
            }
          })
        );
      }
    });
  }

  // Sync file status
  syncFile(fileId: string): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.storageService.syncFileStatus(fileId)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (response) => {
            this.snackBar.open(response.message, 'Close', { duration: 3000 });
            this.loadFiles();
          },
          error: (error: any) => {
            console.error('Error syncing file:', error);
            this.snackBar.open('Failed to sync file', 'Close', { duration: 5000 });
          }
        })
    );
  }

  // Handle pagination
  onPageChange(event: any): void {
    this.currentPage = event.pageIndex + 1;
    this.loadFiles();
  }

  // Handle tab change
  onTabChange(index: number): void {
    this.activeTabIndex = index;
    this.loadFiles();
  }

  // Handle search
  onSearch(): void {
    this.currentPage = 1;
    this.loadFiles();
  }

  // Toggle view mode
  toggleViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  // Helper to get file icon based on content type
  getFileIcon(contentType: string): string {
    if (!contentType) return 'far fa-file';
    
    if (contentType.startsWith('image/')) return 'far fa-file-image';
    if (contentType.startsWith('video/')) return 'far fa-file-video';
    if (contentType.startsWith('audio/')) return 'far fa-file-audio';
    if (contentType === 'application/pdf') return 'far fa-file-pdf';
    if (contentType.includes('spreadsheet')) return 'far fa-file-excel';
    if (contentType.includes('word')) return 'far fa-file-word';
    if (contentType.includes('presentation')) return 'far fa-file-powerpoint';
    if (contentType.includes('zip') || contentType.includes('compressed')) return 'far fa-file-archive';
    if (contentType.startsWith('text/')) return 'far fa-file-alt';
    
    return 'far fa-file';
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Show success message
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  // Show error message
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Helper method for template to get status entries
  getStatusEntries(): Array<{status: string, count: number}> {
    if (!this.stats?.by_status) return [];
    return Object.entries(this.stats.by_status).map(([status, count]) => ({
      status,
      count
    }));
  }

  // Helper method for template to get breadcrumb items
  getBreadcrumbItems(): Array<{name: string, path: string}> {
    const parts = this.path.split('/').filter(p => p);
    const items: Array<{name: string, path: string}> = [];
    
    for (let i = 0; i < parts.length; i++) {
      const path = '/' + parts.slice(0, i + 1).join('/');
      items.push({
        name: parts[i],
        path
      });
    }
    
    return items;
  }

  // Toggle select all files
  toggleSelectAll(): void {
    if (this.selection.size === this.dataSource.data.length) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(file => {
        this.selection.add(file.file_id);
      });
    }
  }

  // Delete selected files
  deleteSelected(): void {
    if (this.selection.size === 0) {
      this.snackBar.open('No files selected', 'Close', { duration: 3000 });
      return;
    }

    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete ${this.selection.size} selected file(s)?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        // Delete each selected file
        this.selection.forEach(fileId => {
          this.deleteFile(fileId, this.activeStorage === 'google_drive' ? 'google-drive' : 'hetzner');
        });
        this.selection.clear();
      }
    });
  }
}
