import { Component, OnInit } from '@angular/core';
import { AdminAuthService } from '../../services/admin-auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface RegistrationTrends {
  period: string;
  data: Array<{ date: string; count: number }>;
  total_registrations: number;
  growth_rate: number;
}

interface ActiveUsersStats {
  daily_active: number;
  weekly_active: number;
  monthly_active: number;
  total_active: number;
}

interface UserGeographicData {
  countries: Array<{ country: string; count: number; percentage: number }>;
  total_countries: number;
}

interface StorageUsageAnalytics {
  total_storage: number;
  average_per_user: number;
  top_users: Array<{ email: string; files_count: number; storage_used: number }>;
  storage_distribution: Array<{ range: string; count: number }>;
}

interface UserActivityPatterns {
  upload_patterns: Array<{ hour: number; uploads: number }>;
  download_patterns: Array<{ hour: number; downloads: number }>;
  most_active_users: Array<{ email: string; last_login: string }>;
}

interface UserRetentionMetrics {
  retention_rate_7d: number;
  retention_rate_30d: number;
  churn_rate: number;
  new_users_last_30d: number;
}

@Component({
  selector: 'app-user-analytics',
  templateUrl: './user-analytics.component.html',
  styleUrls: ['./user-analytics.component.css']
})
export class UserAnalyticsComponent implements OnInit {
  
  // Loading states
  public loadingActiveUsers = false;
  public loadingRegistrationTrends = false;
  public loadingGeographic = false;
  public loadingStorage = false;
  public loadingActivity = false;
  public loadingRetention = false;
  
  // Data properties
  public activeUsersStats: ActiveUsersStats | null = null;
  public registrationTrends: RegistrationTrends | null = null;
  public geographicData: UserGeographicData | null = null;
  public storageAnalytics: StorageUsageAnalytics | null = null;
  public activityPatterns: UserActivityPatterns | null = null;
  public retentionMetrics: UserRetentionMetrics | null = null;
  
  // Error states
  public errors: { [key: string]: string } = {};
  
  // Chart configuration
  public chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false
      }
    }
  };

  constructor(
    private adminAuthService: AdminAuthService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadAllAnalytics();
  }

  private loadAllAnalytics(): void {
    this.loadActiveUsersStats();
    this.loadRegistrationTrends();
    this.loadGeographicDistribution();
    this.loadStorageAnalytics();
    this.loadActivityPatterns();
    this.loadRetentionMetrics();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  public loadActiveUsersStats(): void {
    this.loadingActiveUsers = true;
    this.errors['activeUsers'] = '';
    
    this.http.get<ActiveUsersStats>(
      `${environment.apiUrl}/api/v1/admin/analytics/active-users`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        this.activeUsersStats = data;
        this.loadingActiveUsers = false;
      },
      error: (error) => {
        this.errors['activeUsers'] = 'Failed to load active users statistics';
        this.loadingActiveUsers = false;
        console.error('Error loading active users stats:', error);
      }
    });
  }

  public loadRegistrationTrends(period: string = 'monthly', days: number = 30): void {
    this.loadingRegistrationTrends = true;
    this.errors['registrationTrends'] = '';
    
    this.http.get<RegistrationTrends>(
      `${environment.apiUrl}/api/v1/admin/analytics/registration-trends?period=${period}&days=${days}`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        this.registrationTrends = data;
        this.loadingRegistrationTrends = false;
      },
      error: (error) => {
        this.errors['registrationTrends'] = 'Failed to load registration trends';
        this.loadingRegistrationTrends = false;
        console.error('Error loading registration trends:', error);
      }
    });
  }

  public loadGeographicDistribution(): void {
    this.loadingGeographic = true;
    this.errors['geographic'] = '';
    
    this.http.get<UserGeographicData>(
      `${environment.apiUrl}/api/v1/admin/analytics/geographic-distribution`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        this.geographicData = data;
        this.loadingGeographic = false;
      },
      error: (error) => {
        this.errors['geographic'] = 'Failed to load geographic distribution';
        this.loadingGeographic = false;
        console.error('Error loading geographic data:', error);
      }
    });
  }

  public loadStorageAnalytics(): void {
    this.loadingStorage = true;
    this.errors['storage'] = '';
    
    this.http.get<StorageUsageAnalytics>(
      `${environment.apiUrl}/api/v1/admin/analytics/storage-usage`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        this.storageAnalytics = data;
        this.loadingStorage = false;
      },
      error: (error) => {
        this.errors['storage'] = 'Failed to load storage analytics';
        this.loadingStorage = false;
        console.error('Error loading storage analytics:', error);
      }
    });
  }

  public loadActivityPatterns(days: number = 7): void {
    this.loadingActivity = true;
    this.errors['activity'] = '';
    
    this.http.get<UserActivityPatterns>(
      `${environment.apiUrl}/api/v1/admin/analytics/user-activity-patterns?days=${days}`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        this.activityPatterns = data;
        this.loadingActivity = false;
      },
      error: (error) => {
        this.errors['activity'] = 'Failed to load activity patterns';
        this.loadingActivity = false;
        console.error('Error loading activity patterns:', error);
      }
    });
  }

  public loadRetentionMetrics(): void {
    this.loadingRetention = true;
    this.errors['retention'] = '';
    
    this.http.get<UserRetentionMetrics>(
      `${environment.apiUrl}/api/v1/admin/analytics/user-retention`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data) => {
        this.retentionMetrics = data;
        this.loadingRetention = false;
      },
      error: (error) => {
        this.errors['retention'] = 'Failed to load retention metrics';
        this.loadingRetention = false;
        console.error('Error loading retention metrics:', error);
      }
    });
  }

  public refreshAllData(): void {
    this.loadAllAnalytics();
  }

  public onPeriodChange(event: Event, type: string): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    
    if (type === 'registration') {
      this.loadRegistrationTrends(value, 30);
    } else if (type === 'activity') {
      this.loadActivityPatterns(+value);
    }
  }

  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  public getGrowthClass(rate: number): string {
    if (rate > 0) return 'positive';
    if (rate < 0) return 'negative';
    return 'neutral';
  }

  public getRetentionClass(rate: number): string {
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    if (rate >= 40) return 'average';
    return 'poor';
  }

  public getChurnClass(rate: number): string {
    if (rate <= 20) return 'excellent';
    if (rate <= 40) return 'good';
    if (rate <= 60) return 'average';
    return 'poor';
  }
}