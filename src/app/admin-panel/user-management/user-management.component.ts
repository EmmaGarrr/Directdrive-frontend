import { Component, OnInit, ViewChild } from '@angular/core';
import { AdminAuthService } from '../../services/admin-auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface User {
  _id: string;
  email: string;
  role?: string;
  is_admin?: boolean;
  files_count: number;
  storage_used: number;
  status: 'active' | 'suspended' | 'banned';
  created_at?: string;
  last_login?: string;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  Math = Math; // Make Math available to template
  users: User[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalUsers = 0;
  totalPages = 0;
  
  // Filters
  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  sortBy = 'created_at';
  sortOrder = 'desc';
  
  // Selection
  selectedUsers: Set<string> = new Set();
  selectAll = false;
  
  // Modal states
  showUserDetail = false;
  showBulkActions = false;
  selectedUser: User | null = null;
  
  // Bulk action
  bulkAction = '';
  bulkReason = '';
  
  // User editing
  editingUser: User | null = null;
  showEditModal = false;
  
  // User files modal
  showUserFiles = false;
  userFiles: any[] = [];
  loadingUserFiles = false;
  userFilesPagination = {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0
  };
  userFilesTotalSize = 0;
  
  // Storage insights modal
  showStorageInsights = false;
  selectedFileForInsights: any = null;
  storageInsights: any = null;
  loadingStorageInsights = false;
  storageInsightsError = '';
  
  constructor(
    private adminAuthService: AdminAuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.error = '';
    
    try {
      const params = new URLSearchParams({
        page: this.currentPage.toString(),
        limit: this.pageSize.toString(),
        sort_by: this.sortBy,
        sort_order: this.sortOrder
      });
      
      if (this.searchTerm) params.append('search', this.searchTerm);
      if (this.selectedRole) params.append('role', this.selectedRole);
      if (this.selectedStatus) params.append('status', this.selectedStatus);
      
      const response = await this.http.get<UserListResponse>(
        `${environment.apiUrl}/api/v1/admin/users?${params}`,
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      if (response) {
        this.users = response.users;
        this.totalUsers = response.total;
        this.totalPages = response.total_pages;
        this.currentPage = response.page;
      }
    } catch (error: any) {
      this.error = error.error?.detail || 'Failed to load users';
      console.error('Error loading users:', error);
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  onSort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.loadUsers();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  // Selection methods
  toggleUserSelection(userEmail: string): void {
    if (this.selectedUsers.has(userEmail)) {
      this.selectedUsers.delete(userEmail);
    } else {
      this.selectedUsers.add(userEmail);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedUsers.clear();
    } else {
      this.users.forEach(user => this.selectedUsers.add(user.email));
    }
    this.selectAll = !this.selectAll;
  }

  private updateSelectAllState(): void {
    this.selectAll = this.users.length > 0 && this.users.every(user => this.selectedUsers.has(user.email));
  }

  // User actions
  async viewUserDetail(user: User): Promise<void> {
    try {
      const response = await this.http.get<any>(
        `${environment.apiUrl}/api/v1/admin/users/${user.email}`,
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      if (response) {
        this.selectedUser = { ...user, ...response.user };
        this.showUserDetail = true;
      }
    } catch (error: any) {
      this.error = error.error?.detail || 'Failed to load user details';
    }
  }

  editUser(user: User): void {
    this.editingUser = { ...user };
    this.showEditModal = true;
  }

  async updateUserStatus(user: User, action: 'ban' | 'suspend' | 'activate', reason?: string): Promise<void> {
    try {
      await this.http.post(
        `${environment.apiUrl}/api/v1/admin/users/${user.email}/status`,
        { action, reason },
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      // Refresh the user list
      await this.loadUsers();
      
      // Show success message
      this.showSuccessMessage(`User ${action}ed successfully`);
    } catch (error: any) {
      this.error = error.error?.detail || `Failed to ${action} user`;
    }
  }

  async resetUserPassword(user: User): Promise<void> {
    const newPassword = prompt('Enter new password for user:');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    try {
      await this.http.post(
        `${environment.apiUrl}/api/v1/admin/users/${user.email}/reset-password`,
        { new_password: newPassword },
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      this.showSuccessMessage('Password reset successfully');
    } catch (error: any) {
      this.error = error.error?.detail || 'Failed to reset password';
    }
  }

  // Bulk actions
  openBulkActions(): void {
    if (this.selectedUsers.size === 0) {
      alert('Please select users first');
      return;
    }
    this.showBulkActions = true;
  }

  async performBulkAction(): Promise<void> {
    if (!this.bulkAction || this.selectedUsers.size === 0) {
      return;
    }
    
    try {
      await this.http.post(
        `${environment.apiUrl}/api/v1/admin/users/bulk-action`,
        {
          user_emails: Array.from(this.selectedUsers),
          action: this.bulkAction,
          reason: this.bulkReason
        },
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      // Clear selections and refresh
      this.selectedUsers.clear();
      this.selectAll = false;
      this.showBulkActions = false;
      this.bulkAction = '';
      this.bulkReason = '';
      
      await this.loadUsers();
      this.showSuccessMessage(`Bulk ${this.bulkAction} completed successfully`);
    } catch (error: any) {
      this.error = error.error?.detail || 'Bulk action failed';
    }
  }

  // User editing
  async saveUserChanges(): Promise<void> {
    if (!this.editingUser) return;
    
    try {
      const updateData: any = {};
      
      if (this.editingUser.role !== this.users.find(u => u.email === this.editingUser!.email)?.role) {
        updateData.role = this.editingUser.role;
      }
      
      await this.http.put(
        `${environment.apiUrl}/api/v1/admin/users/${this.editingUser.email}`,
        updateData,
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      this.showEditModal = false;
      this.editingUser = null;
      await this.loadUsers();
      this.showSuccessMessage('User updated successfully');
    } catch (error: any) {
      this.error = error.error?.detail || 'Failed to update user';
    }
  }

  // Export users
  async exportUsers(format: 'csv' | 'json' = 'csv'): Promise<void> {
    try {
      const response = await this.http.get<any>(
        `${environment.apiUrl}/api/v1/admin/users/export?format=${format}`,
        { headers: this.getAuthHeaders() }
      ).toPromise();
      
      if (response) {
        const dataStr = format === 'json' 
          ? JSON.stringify(response, null, 2)
          : this.convertToCSV(response.users);
        
        const dataBlob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = window.URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `users_export_${new Date().toISOString().split('T')[0]}.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      this.error = error.error?.detail || 'Failed to export users';
    }
  }

  private convertToCSV(users: User[]): string {
    const headers = ['Email', 'Role', 'Status', 'Files Count', 'Storage Used', 'Created At', 'Last Login'];
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.email,
        user.role || 'regular',
        user.status,
        user.files_count,
        this.formatBytes(user.storage_used),
        user.created_at || '',
        user.last_login || ''
      ].join(','))
    ].join('\n');
    
    return csvContent;
  }

  // Utility methods
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'suspended': return 'status-suspended';
      case 'banned': return 'status-banned';
      default: return '';
    }
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'superadmin': return 'role-superadmin';
      case 'admin': return 'role-admin';
      default: return 'role-regular';
    }
  }

  private showSuccessMessage(message: string): void {
    // You can implement a toast notification here
    alert(message);
  }

  // Modal close methods
  closeUserDetail(): void {
    this.showUserDetail = false;
    this.selectedUser = null;
  }

  closeBulkActions(): void {
    this.showBulkActions = false;
    this.bulkAction = '';
    this.bulkReason = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
  }

  // User Files Modal Methods
  async viewUserFiles(user: User): Promise<void> {
    this.selectedUser = user;
    this.showUserFiles = true;
    this.userFiles = [];
    this.userFilesPagination = {
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0
    };
    await this.loadUserFiles(1);
  }

  closeUserFiles(): void {
    this.showUserFiles = false;
    this.selectedUser = null;
    this.userFiles = [];
    this.loadingUserFiles = false;
  }

  async loadUserFiles(page: number): Promise<void> {
    if (!this.selectedUser) return;

    this.loadingUserFiles = true;
    const headers = this.getAuthHeaders();

    try {
      const response = await this.http.get<any>(
        `${environment.apiUrl}/api/v1/admin/users/${this.selectedUser.email}/files?page=${page}&limit=20`,
        { headers }
      ).toPromise();

      if (response) {
        this.userFiles = response.files;
        this.userFilesPagination = {
          total: response.total,
          page: response.page,
          limit: response.limit,
          total_pages: response.total_pages
        };

        // Calculate total size
        this.userFilesTotalSize = this.userFiles.reduce((total, file) => {
          return total + (file.size_bytes || 0);
        }, 0);
      }
    } catch (error) {
      console.error('Error loading user files:', error);
      this.userFiles = [];
    } finally {
      this.loadingUserFiles = false;
    }
  }

  getFileIcon(fileType: string): string {
    const iconMap: { [key: string]: string } = {
      'image': 'fas fa-file-image',
      'video': 'fas fa-file-video',
      'audio': 'fas fa-file-audio',
      'document': 'fas fa-file-pdf',
      'archive': 'fas fa-file-archive',
      'other': 'fas fa-file-alt'
    };
    return iconMap[fileType] || 'fas fa-file-alt';
  }

  getFilesPaginationPages(): number[] {
    const pages: number[] = [];
    const totalPages = this.userFilesPagination.total_pages;
    const currentPage = this.userFilesPagination.page;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else {
        startPage = Math.max(1, endPage - 4);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // File Action Methods
  viewFile(file: any): void {
    // Open the file in a new tab using the download URL
    const downloadUrl = `${environment.apiUrl}/api/v1/download/stream/${file._id}`;
    window.open(downloadUrl, '_blank');
  }

  async checkFileStorage(file: any): Promise<void> {
    this.selectedFileForInsights = file;
    this.showStorageInsights = true;
    this.storageInsights = null;
    this.storageInsightsError = '';
    this.loadingStorageInsights = true;

    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<any>(
        `${environment.apiUrl}/api/v1/admin/files/${file._id}/storage-insights`,
        { headers }
      ).toPromise();

      if (response) {
        this.storageInsights = response;
      }
    } catch (error: any) {
      console.error('Error checking storage insights:', error);
      this.storageInsightsError = error?.error?.detail || 'Failed to load storage insights';
    } finally {
      this.loadingStorageInsights = false;
    }
  }

  closeStorageInsights(): void {
    this.showStorageInsights = false;
    this.selectedFileForInsights = null;
    this.storageInsights = null;
    this.storageInsightsError = '';
    this.loadingStorageInsights = false;
  }

  getStorageStatusClass(storageInfo: any): string {
    if (storageInfo.exists && storageInfo.accessible) {
      return 'status-success';
    } else if (storageInfo.exists && !storageInfo.accessible) {
      return 'status-warning';
    } else {
      return 'status-error';
    }
  }

  getStorageStatusIcon(storageInfo: any): string {
    if (storageInfo.exists && storageInfo.accessible) {
      return 'fas fa-check-circle';
    } else if (storageInfo.exists && !storageInfo.accessible) {
      return 'fas fa-exclamation-triangle';
    } else {
      return 'fas fa-times-circle';
    }
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}