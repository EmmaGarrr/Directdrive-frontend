import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { interval, Subscription } from 'rxjs';

interface SystemHealth {
  timestamp: string;
  system: {
    cpu: {
      usage_percent: number;
      count: number;
      frequency: number;
    };
    memory: {
      total: number;
      available: number;
      used: number;
      percent: number;
      swap_total: number;
      swap_used: number;
      swap_percent: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      percent: number;
    };
    network: {
      bytes_sent: number;
      bytes_recv: number;
      packets_sent: number;
      packets_recv: number;
    };
    uptime: number;
    boot_time: number;
  };
  database: {
    total_collections: number;
    total_files: number;
    total_users: number;
    total_admins: number;
    active_sessions: number;
    size_bytes: number;
  };
}

interface ApiMetrics {
  period_hours: number;
  timestamp: string;
  api_usage: {
    endpoint_stats: any[];
    total_requests: number;
    unique_endpoints: number;
  };
  error_analysis: {
    recent_errors: any[];
    total_errors: number;
  };
  request_distribution: any[];
  admin_activity: any[];
}

interface DatabasePerformance {
  timestamp: string;
  database_stats: {
    db_size: number;
    storage_size: number;
    index_size: number;
    file_size: number;
    collections: number;
    objects: number;
    avg_obj_size: number;
  };
  collection_stats: any;
  query_performance: {
    files_query_time_ms: number;
    users_query_time_ms: number;
    sample_queries: any;
  };
  current_operations: {
    count: number;
    operations: any[];
  };
}

interface SystemAlerts {
  timestamp: string;
  alerts: Array<{
    type: 'critical' | 'warning';
    category: string;
    message: string;
    value: number;
    threshold: number;
    timestamp: string;
  }>;
  alert_counts: {
    critical: number;
    warning: number;
    total: number;
  };
}

@Component({
  selector: 'app-system-monitoring',
  templateUrl: './system-monitoring.component.html',
  styleUrls: ['./system-monitoring.component.css']
})
export class SystemMonitoringComponent implements OnInit, OnDestroy {
  systemHealth: SystemHealth | null = null;
  apiMetrics: ApiMetrics | null = null;
  databasePerformance: DatabasePerformance | null = null;
  systemAlerts: SystemAlerts | null = null;
  
  loading = {
    health: false,
    api: false,
    database: false,
    alerts: false
  };
  
  error = {
    health: '',
    api: '',
    database: '',
    alerts: ''
  };
  
  autoRefresh = false; // Disabled to prevent API spam
  refreshInterval = 30; // seconds
  private refreshSubscription?: Subscription;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadAllMetrics();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadAllMetrics(): void {
    this.loadSystemHealth();
    this.loadApiMetrics();
    this.loadDatabasePerformance();
    this.loadSystemAlerts();
  }

  loadSystemHealth(): void {
    this.loading.health = true;
    this.error.health = '';
    
    const token = localStorage.getItem('admin_access_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    this.http.get<SystemHealth>(`${environment.apiUrl}/api/v1/admin/monitoring/system-health`, { headers })
      .subscribe({
        next: (data) => {
          this.systemHealth = data;
          this.loading.health = false;
        },
        error: (err) => {
          this.error.health = err.error?.detail || 'Failed to load system health';
          this.loading.health = false;
        }
      });
  }

  loadApiMetrics(hours: number = 24): void {
    this.loading.api = true;
    this.error.api = '';
    
    const token = localStorage.getItem('admin_access_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    this.http.get<ApiMetrics>(`${environment.apiUrl}/api/v1/admin/monitoring/api-metrics?hours=${hours}`, { headers })
      .subscribe({
        next: (data) => {
          this.apiMetrics = data;
          this.loading.api = false;
        },
        error: (err) => {
          this.error.api = err.error?.detail || 'Failed to load API metrics';
          this.loading.api = false;
        }
      });
  }

  loadDatabasePerformance(): void {
    this.loading.database = true;
    this.error.database = '';
    
    const token = localStorage.getItem('admin_access_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    this.http.get<DatabasePerformance>(`${environment.apiUrl}/api/v1/admin/monitoring/database-performance`, { headers })
      .subscribe({
        next: (data) => {
          this.databasePerformance = data;
          this.loading.database = false;
        },
        error: (err) => {
          this.error.database = err.error?.detail || 'Failed to load database performance';
          this.loading.database = false;
        }
      });
  }

  loadSystemAlerts(): void {
    this.loading.alerts = true;
    this.error.alerts = '';
    
    const token = localStorage.getItem('admin_access_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    this.http.get<SystemAlerts>(`${environment.apiUrl}/api/v1/admin/monitoring/system-alerts`, { headers })
      .subscribe({
        next: (data) => {
          this.systemAlerts = data;
          this.loading.alerts = false;
        },
        error: (err) => {
          this.error.alerts = err.error?.detail || 'Failed to load system alerts';
          this.loading.alerts = false;
        }
      });
  }

  startAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(this.refreshInterval * 1000).subscribe(() => {
        this.loadAllMetrics();
      });
    }
  }

  stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getStatusClass(value: number, warningThreshold: number, criticalThreshold: number): string {
    if (value >= criticalThreshold) return 'text-red-600';
    if (value >= warningThreshold) return 'text-yellow-600';
    return 'text-green-600';
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'critical': return 'fas fa-exclamation-triangle text-red-600';
      case 'warning': return 'fas fa-exclamation-circle text-yellow-600';
      default: return 'fas fa-info-circle text-blue-600';
    }
  }

  refreshAll(): void {
    this.loadAllMetrics();
  }
}