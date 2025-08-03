import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminActivityLog, AdminActivityLogResponse } from '../../models/admin.model';

@Component({
  selector: 'app-activity-logs',
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.css']
})
export class ActivityLogsComponent implements OnInit {
  logs: AdminActivityLog[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  limit = 25;
  total = 0;
  totalPages = 0;
  paginationPages: number[] = [];

  // Filters
  selectedAction = '';
  selectedAdmin = '';
  dateFrom = '';
  dateTo = '';
  
  // Available filter options
  availableActions: string[] = [];
  availableAdmins: string[] = [];

  constructor(
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check admin authentication
    if (!this.adminAuthService.isAdminAuthenticated()) {
      this.router.navigate(['/admin-login']);
      return;
    }

    this.loadActivityLogs();
  }

  loadActivityLogs(): void {
    this.loading = true;
    this.error = '';

    const skip = (this.currentPage - 1) * this.limit;

    this.adminAuthService.getActivityLogs(this.limit, skip).subscribe({
      next: (response: AdminActivityLogResponse) => {
        this.logs = response.logs;
        this.total = response.total;
        this.totalPages = Math.ceil(this.total / this.limit);
        this.updatePaginationPages();
        this.loading = false;
        
        // Extract unique actions and admins for filters
        this.extractFilterOptions();
      },
      error: (error) => {
        this.loading = false;
        this.error = error.message || 'Failed to load activity logs';
      }
    });
  }

  extractFilterOptions(): void {
    // Extract unique actions
    const actions = [...new Set(this.logs.map(log => log.action))];
    this.availableActions = actions.sort();

    // Extract unique admin emails
    const admins = [...new Set(this.logs.map(log => log.admin_email))];
    this.availableAdmins = admins.sort();
  }

  getFilteredLogs(): AdminActivityLog[] {
    return this.logs.filter(log => {
      const actionMatch = !this.selectedAction || log.action === this.selectedAction;
      const adminMatch = !this.selectedAdmin || log.admin_email === this.selectedAdmin;
      
      let dateMatch = true;
      if (this.dateFrom || this.dateTo) {
        const logDate = new Date(log.timestamp);
        if (this.dateFrom) {
          dateMatch = dateMatch && logDate >= new Date(this.dateFrom);
        }
        if (this.dateTo) {
          const toDate = new Date(this.dateTo);
          toDate.setHours(23, 59, 59, 999); // End of day
          dateMatch = dateMatch && logDate <= toDate;
        }
      }
      
      return actionMatch && adminMatch && dateMatch;
    });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadActivityLogs();
    }
  }

  onFilterChange(): void {
    this.currentPage = 1;
    // Note: In a real implementation, you'd want to send filter parameters to the backend
    // For now, we'll filter client-side
  }

  clearFilters(): void {
    this.selectedAction = '';
    this.selectedAdmin = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
  }

  refreshLogs(): void {
    this.currentPage = 1;
    this.loadActivityLogs();
  }

  getActionBadgeClass(action: string): string {
    switch (action.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'login_failed':
        return 'bg-red-100 text-red-800';
      case 'create_admin':
        return 'bg-blue-100 text-blue-800';
      case 'view_profile':
        return 'bg-gray-100 text-gray-800';
      case 'view_activity_logs':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  // goBack method removed - now part of admin panel layout

  updatePaginationPages(): void {
    const maxPagesToShow = 5;
    const totalPagesToShow = Math.min(this.totalPages, maxPagesToShow);
    this.paginationPages = Array.from({ length: totalPagesToShow }, (_, i) => i + 1);
  }

  exportLogs(): void {
    // Create CSV content
    const headers = ['Timestamp', 'Admin Email', 'Action', 'IP Address', 'Endpoint', 'Details'];
    const csvContent = [
      headers.join(','),
      ...this.getFilteredLogs().map(log => [
        log.timestamp,
        log.admin_email,
        log.action,
        log.ip_address || 'N/A',
        log.endpoint || 'N/A',
        (log.details || 'N/A').replace(/,/g, ';') // Replace commas to avoid CSV issues
      ].join(','))
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}