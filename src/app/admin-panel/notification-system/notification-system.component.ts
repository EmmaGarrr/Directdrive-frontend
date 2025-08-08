import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../../services/admin-auth.service';

interface NotificationSummary {
  total_notifications: number;
  recent_notifications: number;
  active_templates: number;
  scheduled_notifications: number;
}

interface NotificationStats {
  summary: NotificationSummary;
  status_breakdown: { [key: string]: number };
  type_breakdown: { [key: string]: number };
  delivery_summary: {
    total_recipients: number;
    successful_deliveries: number;
    failed_deliveries: number;
    success_rate: number;
  };
  recent_activity: Array<{
    date: string;
    count: number;
  }>;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  notification_type: 'system' | 'email' | 'in_app' | 'scheduled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_type: 'all_users' | 'active_users' | 'inactive_users' | 'specific_users' | 'user_role';
  target_users: string[];
  status: 'draft' | 'scheduled' | 'sent' | 'failed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  schedule_time?: string;
  delivery_stats: {
    total_recipients: number;
    successful_deliveries: number;
    failed_deliveries: number;
    pending_deliveries: number;
  };
}

interface NotificationTemplate {
  _id: string;
  template_id: string;
  name: string;
  subject: string;
  content: string;
  notification_type: string;
  priority: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  usage_count: number;
}

interface UserGroupPreview {
  total_matching_users: number;
  sample_users: Array<{
    _id: string;
    email: string;
    username: string;
    created_at: string;
    last_login?: string;
    is_active: boolean;
  }>;
  filter_summary: any;
}

@Component({
  selector: 'app-notification-system',
  templateUrl: './notification-system.component.html',
  styleUrls: ['./notification-system.component.css']
})
export class NotificationSystemComponent implements OnInit {
  loading = false;
  activeTab: 'dashboard' | 'notifications' | 'templates' | 'create' = 'dashboard';

  // Dashboard Data
  notificationStats: NotificationStats | null = null;

  // Notifications List
  notifications: Notification[] = [];
  notificationTotal = 0;
  notificationPage = 1;
  notificationLimit = 20;
  notificationFilters = {
    status_filter: '',
    type_filter: '',
    priority_filter: ''
  };

  // Templates
  templates: NotificationTemplate[] = [];

  // Create Notification Form
  newNotification = {
    title: '',
    message: '',
    notification_type: 'in_app',
    priority: 'medium',
    target_type: 'all_users',
    target_users: '',
    email_subject: '',
    schedule_time: '',
    template_id: ''
  };

  // New Template Form
  newTemplate = {
    template_id: '',
    name: '',
    subject: '',
    content: '',
    notification_type: 'in_app',
    priority: 'medium',
    is_active: true
  };

  // User Group Preview
  userGroupPreview: UserGroupPreview | null = null;
  userGroupFilters = {
    registration_date_from: '',
    registration_date_to: '',
    last_active_from: '',
    last_active_to: '',
    storage_usage_min: null,
    storage_usage_max: null,
    include_active: true,
    include_inactive: false
  };

  showCreateTemplate = false;
  showUserGroupPreview = false;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private adminAuthService: AdminAuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
    this.loadNotifications();
    this.loadTemplates();
  }

  private getHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ================================
  // DASHBOARD METHODS
  // ================================

  loadDashboardStats(): void {
    this.loading = true;
    this.http.get<NotificationStats>(`${environment.apiUrl}/api/v1/admin/notifications/stats/dashboard`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.notificationStats = response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading notification stats:', error);
        this.snackBar.open('Failed to load notification statistics', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // ================================
  // NOTIFICATIONS METHODS
  // ================================

  loadNotifications(): void {
    this.loading = true;
    const params = new URLSearchParams({
      page: this.notificationPage.toString(),
      limit: this.notificationLimit.toString()
    });

    if (this.notificationFilters.status_filter) {
      params.append('status_filter', this.notificationFilters.status_filter);
    }
    if (this.notificationFilters.type_filter) {
      params.append('type_filter', this.notificationFilters.type_filter);
    }
    if (this.notificationFilters.priority_filter) {
      params.append('priority_filter', this.notificationFilters.priority_filter);
    }

    this.http.get<any>(`${environment.apiUrl}/api/v1/admin/notifications?${params}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.notifications = response.notifications;
        this.notificationTotal = response.total;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.snackBar.open('Failed to load notifications', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onNotificationFilterChange(): void {
    this.notificationPage = 1;
    this.loadNotifications();
  }

  nextNotificationPage(): void {
    if (this.notificationPage * this.notificationLimit < this.notificationTotal) {
      this.notificationPage++;
      this.loadNotifications();
    }
  }

  prevNotificationPage(): void {
    if (this.notificationPage > 1) {
      this.notificationPage--;
      this.loadNotifications();
    }
  }

  sendNotificationNow(notificationId: string): void {
    if (!confirm('Are you sure you want to send this notification now?')) {
      return;
    }

    this.loading = true;
    this.http.post<any>(`${environment.apiUrl}/api/v1/admin/notifications/${notificationId}/send`, {}, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.snackBar.open('Notification sent successfully', 'Close', { duration: 3000 });
        this.loadNotifications();
        this.loadDashboardStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error sending notification:', error);
        this.snackBar.open('Failed to send notification', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  deleteNotification(notificationId: string, title: string): void {
    if (!confirm(`Are you sure you want to delete notification "${title}"? This action cannot be undone.`)) {
      return;
    }

    this.loading = true;
    this.http.delete<any>(`${environment.apiUrl}/api/v1/admin/notifications/${notificationId}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.snackBar.open('Notification deleted successfully', 'Close', { duration: 3000 });
        this.loadNotifications();
        this.loadDashboardStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error deleting notification:', error);
        this.snackBar.open('Failed to delete notification', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // ================================
  // TEMPLATES METHODS
  // ================================

  loadTemplates(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/api/v1/admin/notification-templates`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.templates = response.templates;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.snackBar.open('Failed to load templates', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  createTemplate(): void {
    if (!this.newTemplate.template_id || !this.newTemplate.name || !this.newTemplate.content) {
      this.snackBar.open('Template ID, name, and content are required', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.http.post<any>(`${environment.apiUrl}/api/v1/admin/notification-templates`, this.newTemplate, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.snackBar.open('Template created successfully', 'Close', { duration: 3000 });
        this.loadTemplates();
        this.resetNewTemplate();
        this.showCreateTemplate = false;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating template:', error);
        this.snackBar.open('Failed to create template', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  useTemplate(template: NotificationTemplate): void {
    this.newNotification.title = template.name;
    this.newNotification.message = template.content;
    this.newNotification.email_subject = template.subject;
    this.newNotification.notification_type = template.notification_type;
    this.newNotification.priority = template.priority;
    this.newNotification.template_id = template.template_id;
    this.activeTab = 'create';
    this.snackBar.open('Template loaded into notification form', 'Close', { duration: 2000 });
  }

  resetNewTemplate(): void {
    this.newTemplate = {
      template_id: '',
      name: '',
      subject: '',
      content: '',
      notification_type: 'in_app',
      priority: 'medium',
      is_active: true
    };
  }

  // ================================
  // CREATE NOTIFICATION METHODS
  // ================================

  createNotification(): void {
    if (!this.newNotification.title || !this.newNotification.message) {
      this.snackBar.open('Title and message are required', 'Close', { duration: 3000 });
      return;
    }

    // Prepare target users array
    let targetUsers: string[] | null = null;
    if (this.newNotification.target_type === 'specific_users') {
      targetUsers = this.newNotification.target_users
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      if (targetUsers.length === 0) {
        this.snackBar.open('Target users must be specified for specific user targeting', 'Close', { duration: 3000 });
        return;
      }
    }

    const notificationData = {
      title: this.newNotification.title,
      message: this.newNotification.message,
      notification_type: this.newNotification.notification_type,
      priority: this.newNotification.priority,
      target_type: this.newNotification.target_type,
      target_users: targetUsers,
      email_subject: this.newNotification.email_subject || null,
      schedule_time: this.newNotification.schedule_time || null,
      template_id: this.newNotification.template_id || null
    };

    this.loading = true;
    this.http.post<any>(`${environment.apiUrl}/api/v1/admin/notifications`, notificationData, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.snackBar.open('Notification created successfully', 'Close', { duration: 3000 });
        this.loadNotifications();
        this.loadDashboardStats();
        this.resetNewNotification();
        this.activeTab = 'notifications';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating notification:', error);
        this.snackBar.open('Failed to create notification', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  resetNewNotification(): void {
    this.newNotification = {
      title: '',
      message: '',
      notification_type: 'in_app',
      priority: 'medium',
      target_type: 'all_users',
      target_users: '',
      email_subject: '',
      schedule_time: '',
      template_id: ''
    };
  }

  // ================================
  // USER GROUP PREVIEW METHODS
  // ================================

  previewUserGroup(): void {
    const filterData = {
      registration_date_from: this.userGroupFilters.registration_date_from || null,
      registration_date_to: this.userGroupFilters.registration_date_to || null,
      last_active_from: this.userGroupFilters.last_active_from || null,
      last_active_to: this.userGroupFilters.last_active_to || null,
      storage_usage_min: this.userGroupFilters.storage_usage_min,
      storage_usage_max: this.userGroupFilters.storage_usage_max,
      include_active: this.userGroupFilters.include_active,
      include_inactive: this.userGroupFilters.include_inactive
    };

    this.loading = true;
    this.http.post<UserGroupPreview>(`${environment.apiUrl}/api/v1/admin/user-groups/preview`, filterData, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.userGroupPreview = response;
        this.showUserGroupPreview = true;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error previewing user group:', error);
        this.snackBar.open('Failed to preview user group', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // ================================
  // TAB MANAGEMENT
  // ================================

  setActiveTab(tab: 'dashboard' | 'notifications' | 'templates' | 'create'): void {
    this.activeTab = tab;
  }

  getTabIndex(): number {
    switch (this.activeTab) {
      case 'dashboard': return 0;
      case 'notifications': return 1;
      case 'templates': return 2;
      case 'create': return 3;
      default: return 0;
    }
  }

  onTabIndexChange(index: number): void {
    switch (index) {
      case 0: this.activeTab = 'dashboard'; break;
      case 1: this.activeTab = 'notifications'; break;
      case 2: this.activeTab = 'templates'; break;
      case 3: this.activeTab = 'create'; break;
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getStatusBadgeClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'draft': 'status-draft',
      'scheduled': 'status-scheduled',
      'sent': 'status-sent',
      'failed': 'status-failed',
      'cancelled': 'status-cancelled'
    };
    return classMap[status] || 'status-draft';
  }

  getPriorityBadgeClass(priority: string): string {
    const classMap: { [key: string]: string } = {
      'low': 'priority-low',
      'medium': 'priority-medium',
      'high': 'priority-high',
      'urgent': 'priority-urgent'
    };
    return classMap[priority] || 'priority-medium';
  }

  getTypeBadgeClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'system': 'type-system',
      'email': 'type-email',
      'in_app': 'type-in-app',
      'scheduled': 'type-scheduled'
    };
    return classMap[type] || 'type-in-app';
  }

  getDeliverySuccessRate(notification: Notification): number {
    const stats = notification.delivery_stats;
    if (stats.total_recipients === 0) return 0;
    return Math.round((stats.successful_deliveries / stats.total_recipients) * 100);
  }

  // Add Math to make it available in template
  Math = Math;
}