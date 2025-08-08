import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  default_period_days: number;
  includes: string[];
}

interface SystemOverviewReport {
  report_info: {
    type: string;
    title: string;
    generated_at: string;
    generated_by: string;
    period: {
      from: string;
      to: string;
      days: number;
    };
  };
  results?: any;
  user_statistics: {
    total_users: number;
    active_users: number;
    inactive_users: number;
    new_users_in_period: number;
    growth_rate: number;
  };
  file_statistics: {
    total_files: number;
    files_uploaded_in_period: number;
    total_storage_bytes: number;
    total_storage_gb: number;
    average_file_size_mb: number;
    largest_file_size_mb: number;
    type_distribution: Array<{
      type: string;
      count: number;
      size_gb: number;
    }>;
  };
  admin_activity: {
    total_actions: number;
    top_actions: Array<{
      action: string;
      count: number;
    }>;
  };
  system_performance: {
    uptime_percentage: number;
    average_response_time_ms: number;
    total_api_requests: number;
    error_rate_percentage: number;
    peak_concurrent_users: number;
  };
  growth_metrics: {
    user_growth_percentage: number;
    file_growth_percentage: number;
    comparison_period: {
      from: string;
      to: string;
    };
  };
}

interface UserActivityReport {
  report_info: any;
  results?: any;
  summary: {
    total_users_analyzed: number;
    active_users_in_period: number;
    total_files_in_period: number;
    total_storage_in_period_gb: number;
    average_files_per_active_user: number;
    top_users_by_activity: Array<{
      email: string;
      username: string;
      files_in_period: number;
      total_files: number;
      storage_mb: number;
    }>;
  };
  user_details: Array<{
    email: string;
    username: string;
    created_at: string;
    last_login: string;
    is_active: boolean;
    total_files: number;
    total_storage: number;
    recent_files: number;
    storage_mb: number;
  }>;
}

interface StorageUsageReport {
  report_info: any;
  results?: any;
  summary: {
    total_files: number;
    total_storage_gb: number;
    files_in_period: number;
    storage_added_in_period_gb: number;
    average_file_size_mb: number;
  };
  detailed_breakdown: Array<any>;
}

@Component({
  selector: 'app-reports-export',
  templateUrl: './reports-export.component.html',
  styleUrls: ['./reports-export.component.css']
})
export class ReportsExportComponent implements OnInit {
  // Make Object available in template
  Object = Object;
  loading = false;
  activeTab: 'generate' | 'templates' | 'scheduled' | 'custom' = 'generate';

  // Report Templates
  templates: ReportTemplate[] = [];

  // Generated Reports
  currentReport: SystemOverviewReport | UserActivityReport | StorageUsageReport | null = null;
  reportType: string = '';

  // Report Generation Form
  reportForm = {
    report_type: 'system_overview',
    date_from: '',
    date_to: '',
    export_format: 'json',
    include_inactive: false,
    group_by: 'user'
  };

  // Custom Report Form
  customReportForm = {
    title: '',
    description: '',
    data_sources: [] as string[],
    fields: [] as string[],
    date_from: '',
    date_to: '',
    export_format: 'json'
  };

  // Available options
  reportTypes = [
    { value: 'system_overview', label: 'System Overview' },
    { value: 'user_activity', label: 'User Activity' },
    { value: 'storage_usage', label: 'Storage Usage' }
  ];

  exportFormats = [
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' }
  ];

  storageGroupByOptions = [
    { value: 'user', label: 'By User' },
    { value: 'file_type', label: 'By File Type' },
    { value: 'storage_location', label: 'By Storage Location' },
    { value: 'date', label: 'By Date' }
  ];

  availableDataSources = [
    { value: 'users', label: 'Users' },
    { value: 'files', label: 'Files' },
    { value: 'admin_activity_logs', label: 'Admin Activity Logs' },
    { value: 'notifications', label: 'Notifications' },
    { value: 'notification_deliveries', label: 'Notification Deliveries' },
    { value: 'backup_logs', label: 'Backup Logs' }
  ];

  availableFields = [
    'email', 'username', 'created_at', 'last_login', 'is_active',
    'filename', 'file_size', 'file_type', 'storage_location',
    'action', 'timestamp', 'details', 'ip_address'
  ];

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private adminAuthService: AdminAuthService
  ) {}

  ngOnInit(): void {
    this.loadReportTemplates();
    this.setDefaultDates();
  }

  private getHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  setDefaultDates(): void {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    this.reportForm.date_to = today.toISOString().split('T')[0];
    this.reportForm.date_from = lastWeek.toISOString().split('T')[0];
    
    this.customReportForm.date_to = today.toISOString().split('T')[0];
    this.customReportForm.date_from = lastWeek.toISOString().split('T')[0];
  }

  // ================================
  // REPORT TEMPLATES
  // ================================

  loadReportTemplates(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/api/v1/admin/reports/templates`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.templates = response.templates;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading report templates:', error);
        this.snackBar.open('Failed to load report templates', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  useTemplate(template: ReportTemplate): void {
    this.reportForm.report_type = template.type;
    
    // Set date range based on template default
    const today = new Date();
    const fromDate = new Date(today.getTime() - template.default_period_days * 24 * 60 * 60 * 1000);
    
    this.reportForm.date_to = today.toISOString().split('T')[0];
    this.reportForm.date_from = fromDate.toISOString().split('T')[0];
    
    this.activeTab = 'generate';
    this.snackBar.open(`Template "${template.name}" loaded`, 'Close', { duration: 2000 });
  }

  // ================================
  // REPORT GENERATION
  // ================================

  generateReport(): void {
    if (!this.reportForm.date_from || !this.reportForm.date_to) {
      this.snackBar.open('Please select date range', 'Close', { duration: 3000 });
      return;
    }

    if (new Date(this.reportForm.date_from) >= new Date(this.reportForm.date_to)) {
      this.snackBar.open('Start date must be before end date', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    let endpoint = '';
    let params = new URLSearchParams({
      date_from: new Date(this.reportForm.date_from).toISOString(),
      date_to: new Date(this.reportForm.date_to).toISOString(),
      export_format: this.reportForm.export_format
    });

    switch (this.reportForm.report_type) {
      case 'system_overview':
        endpoint = '/reports/system-overview';
        break;
      case 'user_activity':
        endpoint = '/reports/user-activity';
        params.append('include_inactive', this.reportForm.include_inactive.toString());
        break;
      case 'storage_usage':
        endpoint = '/reports/storage-usage';
        params.append('group_by', this.reportForm.group_by);
        break;
      default:
        this.snackBar.open('Invalid report type selected', 'Close', { duration: 3000 });
        this.loading = false;
        return;
    }

    // Handle different response types based on export format
    const options: any = {
      headers: this.getHeaders()
    };

    if (this.reportForm.export_format === 'csv') {
      options.responseType = 'blob';
    }

    this.http.get(`${environment.apiUrl}/api/v1/admin${endpoint}?${params}`, options)
      .subscribe({
        next: (response: any) => {
          if (this.reportForm.export_format === 'csv') {
            // Handle CSV download
            this.downloadBlob(response, `${this.reportForm.report_type}_report.csv`, 'text/csv');
          } else {
            // Handle JSON response
            this.currentReport = response;
            this.reportType = this.reportForm.report_type;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error generating report:', error);
          this.snackBar.open('Failed to generate report', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  generateCustomReport(): void {
    if (!this.customReportForm.title) {
      this.snackBar.open('Please enter a report title', 'Close', { duration: 3000 });
      return;
    }

    if (this.customReportForm.data_sources.length === 0) {
      this.snackBar.open('Please select at least one data source', 'Close', { duration: 3000 });
      return;
    }

    if (!this.customReportForm.date_from || !this.customReportForm.date_to) {
      this.snackBar.open('Please select date range', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const customReportData = {
      title: this.customReportForm.title,
      description: this.customReportForm.description,
      data_sources: this.customReportForm.data_sources,
      fields: this.customReportForm.fields,
      date_from: new Date(this.customReportForm.date_from).toISOString(),
      date_to: new Date(this.customReportForm.date_to).toISOString(),
      export_format: this.customReportForm.export_format
    };

    const options: any = {
      headers: this.getHeaders()
    };

    if (this.customReportForm.export_format === 'csv') {
      options.responseType = 'blob';
    }

    this.http.post(`${environment.apiUrl}/api/v1/admin/reports/custom`, customReportData, options)
      .subscribe({
        next: (response: any) => {
          if (this.customReportForm.export_format === 'csv') {
            // Handle CSV download
            const filename = `custom_report_${this.customReportForm.title.replace(/\s+/g, '_')}.csv`;
            this.downloadBlob(response, filename, 'text/csv');
          } else {
            // Handle JSON response
            this.currentReport = response;
            this.reportType = 'custom';
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error generating custom report:', error);
          this.snackBar.open('Failed to generate custom report', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  downloadBlob(blob: Blob, filename: string, mimeType: string): void {
    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open(`Report downloaded: ${filename}`, 'Close', { duration: 3000 });
  }

  exportCurrentReport(format: string): void {
    if (!this.currentReport) {
      this.snackBar.open('No report to export', 'Close', { duration: 3000 });
      return;
    }

    if (format === 'json') {
      const jsonStr = JSON.stringify(this.currentReport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      this.downloadBlob(blob, `${this.reportType}_report.json`, 'application/json');
    } else if (format === 'csv') {
      // Re-generate report with CSV format
      this.reportForm.export_format = 'csv';
      this.generateReport();
    }
  }

  clearCurrentReport(): void {
    this.currentReport = null;
    this.reportType = '';
  }

  // ================================
  // DATA SOURCE AND FIELD MANAGEMENT
  // ================================

  toggleDataSource(event: any, sourceValue: string): void {
    if (event.checked) {
      if (!this.customReportForm.data_sources.includes(sourceValue)) {
        this.customReportForm.data_sources.push(sourceValue);
      }
    } else {
      const index = this.customReportForm.data_sources.indexOf(sourceValue);
      if (index > -1) {
        this.customReportForm.data_sources.splice(index, 1);
      }
    }
    this.onDataSourceChange();
  }

  addField(field: string): void {
    if (!this.customReportForm.fields.includes(field)) {
      this.customReportForm.fields.push(field);
    }
  }

  onDataSourceChange(): void {
    // Auto-suggest relevant fields based on selected data sources
    if (this.customReportForm.data_sources.includes('users')) {
      const userFields = ['email', 'username', 'created_at', 'last_login', 'is_active'];
      userFields.forEach(field => {
        if (!this.customReportForm.fields.includes(field)) {
          this.customReportForm.fields.push(field);
        }
      });
    }

    if (this.customReportForm.data_sources.includes('files')) {
      const fileFields = ['filename', 'file_size', 'file_type', 'storage_location', 'created_at'];
      fileFields.forEach(field => {
        if (!this.customReportForm.fields.includes(field)) {
          this.customReportForm.fields.push(field);
        }
      });
    }

    if (this.customReportForm.data_sources.includes('admin_activity_logs')) {
      const adminFields = ['action', 'timestamp', 'details', 'ip_address'];
      adminFields.forEach(field => {
        if (!this.customReportForm.fields.includes(field)) {
          this.customReportForm.fields.push(field);
        }
      });
    }
  }

  removeField(field: string): void {
    const index = this.customReportForm.fields.indexOf(field);
    if (index > -1) {
      this.customReportForm.fields.splice(index, 1);
    }
  }

  addCustomField(fieldInput: HTMLInputElement): void {
    const field = fieldInput.value.trim();
    if (field && !this.customReportForm.fields.includes(field)) {
      this.customReportForm.fields.push(field);
      fieldInput.value = '';
    }
  }

  resetCustomReport(): void {
    this.customReportForm = {
      title: '',
      description: '',
      data_sources: [],
      fields: [],
      date_from: '',
      date_to: '',
      export_format: 'json'
    };
    this.setDefaultDates();
  }

  // ================================
  // TAB MANAGEMENT
  // ================================

  setActiveTab(tab: 'generate' | 'templates' | 'scheduled' | 'custom'): void {
    this.activeTab = tab;
  }

  getTabIndex(): number {
    switch (this.activeTab) {
      case 'generate': return 0;
      case 'templates': return 1;
      case 'custom': return 2;
      case 'scheduled': return 3;
      default: return 0;
    }
  }

  onTabIndexChange(index: number): void {
    switch (index) {
      case 0: this.activeTab = 'generate'; break;
      case 1: this.activeTab = 'templates'; break;
      case 2: this.activeTab = 'custom'; break;
      case 3: this.activeTab = 'scheduled'; break;
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getReportTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'system_overview': 'System Overview',
      'user_activity': 'User Activity',
      'storage_usage': 'Storage Usage',
      'custom': 'Custom Report'
    };
    return typeMap[type] || type;
  }

  isSystemOverviewReport(report: any): report is SystemOverviewReport {
    return report && report.report_info && report.report_info.type === 'system_overview';
  }

  isUserActivityReport(report: any): report is UserActivityReport {
    return report && report.report_info && report.report_info.type === 'user_activity';
  }

  isStorageUsageReport(report: any): report is StorageUsageReport {
    return report && report.report_info && report.report_info.type === 'storage_usage';
  }

  // Add Math to make it available in template
  Math = Math;
}