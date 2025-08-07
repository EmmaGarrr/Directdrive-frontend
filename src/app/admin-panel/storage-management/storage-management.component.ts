import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { StorageManagementService, AdminFileInfo } from '../../services/storage-management.service';
import { Subscription, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

interface StorageFile extends AdminFileInfo {
  path: string;
  size_formatted: string;
  is_directory: boolean;
  backup_status?: string;
  storage: 'google-drive' | 'hetzner' | 'both';
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
  displayedColumns: string[] = ['select', 'filename', 'size', 'type', 'owner', 'upload_date', 'status', 'storage', 'actions'];
  selection = new SelectionModel<StorageFile>(true, []);
  
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
  viewMode: string = 'list'; // Can be 'list' or 'grid'
  activeTabIndex = 0;
  
  // View mode helper methods
  isGridView(): boolean {
    return this.viewMode === 'grid';
  }
  
  isListView(): boolean {
    return this.viewMode === 'list';
  }
  
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
    this.error = '';
    this.selection.clear();
    
    // Convert activeStorage to the format expected by the service
    const storageType = this.activeStorage === 'google_drive' ? 'google-drive' : 'hetzner';
    
    this.subscriptions.add(
      this.storageService.getFiles(
        storageType,
        this.currentPage,
        this.pageSize,
        this.searchTerm,
        undefined, // status filter
        undefined  // owner type filter
      )
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: any) => {
          if (!response || !response.files || !Array.isArray(response.files)) {
            this.error = 'Invalid response format from server';
            this.dataSource.data = [];
            return;
          }
          
          // Transform the response to match our StorageFile interface
          const files: StorageFile[] = response.files.map((file: any) => ({
            ...file,
            size_formatted: this.formatFileSize(file.size_bytes || 0),
            path: '/',  // Default path
            is_directory: false,  // These are files, not directories
            last_modified: file.upload_date || new Date().toISOString(),  // Use upload_date as last_modified
            // Handle missing fields with defaults
            file_id: file.file_id || 'unknown',
            filename: file.filename || 'Unnamed File',
            content_type: file.content_type || 'application/octet-stream',
            status: file.status || 'unknown',
            storage: file.storage || 'unknown',
            owner: file.owner || null
          }));
          
          this.dataSource.data = files;
          this.totalFiles = response.total || 0;
          this.totalPages = response.total_pages || 1;
          
          // Update paginator
          if (this.paginator) {
            this.paginator.length = this.totalFiles;
            this.paginator.pageIndex = this.currentPage - 1;
            this.paginator.pageSize = this.pageSize;
          }
          
          // If no files found, show appropriate message
          if (files.length === 0) {
            this.showInfo('No files found matching your criteria');
          }
        },
        error: (error: any) => {
          console.error('Error loading files:', error);
          this.error = error.message || 'Failed to load files';
          this.dataSource.data = [];
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
  toggleFileSelection(file: StorageFile): void {
    this.selection.toggle(file);
  }

  // Handle directory navigation
  navigateToPath(newPath: string): void {
    this.path = newPath;
    this.currentPage = 1;
    this.loadFiles();
  }

  // Handle file deletion
  deleteFile(fileId: string, storageType: 'google-drive' | 'hetzner'): void {
    // Check if deletion is allowed based on storage type and file status
    const file = this.dataSource.data.find(f => f.file_id === fileId);
    
    if (!file) {
      this.showError('File not found');
      return;
    }
    
    // For Google Drive files, only allow deletion if they are already in Hetzner
    if (storageType === 'google-drive' && file.storage !== 'hetzner') {
      this.showError('Cannot delete from Google Drive until backup to Hetzner is complete');
      return;
    }
    
    // Show confirmation dialog
    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this file? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });
    
    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.subscriptions.add(
          this.storageService.deleteFile(fileId, storageType)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
              next: (response) => {
                this.showSuccess('File deleted successfully');
                this.loadFiles(); // Refresh the file list
                this.loadStats(); // Refresh stats
              },
              error: (error: any) => {
                console.error('Error deleting file:', error);
                this.showError(error.message || 'Failed to delete file');
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
  
  // Delete selected files
  deleteSelectedFiles(): void {
    const selectedFiles = this.selection.selected as StorageFile[];
    if (selectedFiles.length === 0) {
      this.showInfo('No files selected');
      return;
    }
    
    // Check if any Google Drive files are selected that don't have Hetzner backup
    const invalidFiles = selectedFiles.filter((file: StorageFile) => 
      file.storage === 'google-drive' && !file.backup_status?.includes('completed')
    );
    
    if (invalidFiles.length > 0) {
      this.showError('Cannot delete Google Drive files until their Hetzner backup is complete');
      return;
    }
    
    // Show confirmation dialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Bulk Deletion',
        message: `Are you sure you want to delete ${selectedFiles.length} file(s)? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        const deleteObservables = selectedFiles.map((file: StorageFile) => 
          this.storageService.deleteFile(file.file_id, file.storage)
        );
        
        forkJoin(deleteObservables)
          .pipe(finalize(() => this.isLoading = false))
          .subscribe({
            next: () => {
              this.showSuccess(`Successfully deleted ${selectedFiles.length} files`);
              this.loadFiles();
              this.selection.clear();
            },
            error: (error: any) => {
              console.error('Error deleting files:', error);
              this.showError('Failed to delete one or more files');
            }
          });
      }
    });
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
  
  // Show info message
  private showInfo(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar']
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

  // Check if all files are selected
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }
  
  // Toggle all file selections
  toggleAllFiles(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(file => {
        this.selection.select(file);
      });
    }
  }

  // Delete selected files
  deleteSelected(): void {
    const selectedFiles = this.selection.selected;
    if (selectedFiles.length === 0) {
      this.showInfo('No files selected');
      return;
    }

    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete ${selectedFiles.length} selected file(s)?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        // Delete each selected file
        this.isLoading = true;
        const deleteObservables = selectedFiles.map((file: StorageFile) => 
          this.storageService.deleteFile(file.file_id, file.storage)
        );
        
        forkJoin(deleteObservables)
          .pipe(finalize(() => this.isLoading = false))
          .subscribe({
            next: () => {
              this.showSuccess(`Successfully deleted ${selectedFiles.length} files`);
              this.loadFiles();
              this.selection.clear();
            },
            error: (error: any) => {
              console.error('Error deleting files:', error);
              this.showError('Failed to delete one or more files');
            }
          });
      }
    });
  }
}
