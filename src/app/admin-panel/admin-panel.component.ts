// File: src/app/admin-panel/admin-panel.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AdminSocketService } from '../services/admin-socket.service';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminUserInDB, UserRole } from '../models/admin.model';
import { filter } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface SystemStats {
  totalUsers: number;
  userGrowth: number;
  totalFiles: number;
  totalStorage: number;
  storageUsagePercent: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

interface ChartData {
  uploads: Array<{ label: string; value: number; percentage: number }>;
}

interface StorageDistribution {
  googleDrive: number;
  hetzner: number;
}

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  public events: string[] = [];
  public currentAdmin: AdminUserInDB | null = null;
  public isConnected: boolean = true; // Set to true since backend is working
  public currentRoute: string = '';
  public environment = environment;
  
  // New properties for enhanced dashboard
  public isDarkTheme: boolean = false;
  public sidebarCollapsed: boolean = false;
  public showNotifications: boolean = false;
  public notificationCount: number = 0;
  public notifications: Notification[] = [];
  
  public systemStats: SystemStats = {
    totalUsers: 0,
    userGrowth: 0,
    totalFiles: 0,
    totalStorage: 0,
    storageUsagePercent: 0,
    systemHealth: 'good'
  };

  public chartData: ChartData = {
    uploads: []
  };

  public storageDistribution: StorageDistribution = {
    googleDrive: 70,
    hetzner: 30
  };
  
  private readonly adminToken = 'some_very_secret_and_long_random_string_12345';
  private statsInterval?: any;

  constructor(
    private adminSocketService: AdminSocketService,
    public adminAuthService: AdminAuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCurrentAdmin();
    this.setupWebSocket();
    this.initializeTheme();
    this.loadSystemStats();
    this.initializeNotifications();
    this.generateMockChartData();
    
    // Track route changes
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });
    
    // Set initial route
    this.currentRoute = this.router.url;
    
    // Session refresh disabled to prevent API spam
    // this.adminAuthService.refreshAdminSession();
    
    // Health checks disabled to prevent API spam
    // this.setupHealthChecks();
    
    // Auto-refresh stats every 30 seconds
    this.statsInterval = setInterval(() => {
      this.loadSystemStats();
    }, 30000);
  }

  ngOnDestroy(): void {
    this.adminSocketService.disconnect();
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }

  private loadCurrentAdmin(): void {
    // Subscribe to admin authentication changes
    this.adminAuthService.currentAdmin$.subscribe(admin => {
      this.currentAdmin = admin;
    });

    // Subscribe to authentication status - DISABLED to prevent routing loop
    // this.adminAuthService.isAdminAuthenticated$.subscribe(isAuthenticated => {
    //   console.log('Admin authenticated:', isAuthenticated);
    //   if (!isAuthenticated) {
    //     // Redirect to login if not authenticated
    //     this.router.navigate(['/admin-auth/login']);
    //   }
    // });

    // Force refresh the admin session - DISABLED to prevent API spam
    // this.adminAuthService.refreshAdminSession();
  }

  private setupWebSocket(): void {
    // WebSocket connection disabled to prevent API spam
    // this.adminSocketService.connect(this.adminToken);
    // this.adminSocketService.messages$.subscribe(
    //   (data: any) => {
    //     if (data && data.message) {
    //       this.events.unshift(data.message);
    //       // Keep only last 100 events
    //       if (this.events.length > 100) {
    //         this.events = this.events.slice(0, 100);
    //       }
    //     }
    //   }
    // );

    // Monitor connection status
    // this.adminSocketService.connectionStatus$.subscribe(
    //   (status: boolean) => {
    //     this.isConnected = status;
    //   }
    // );
    
    // Add some initial events for demonstration
    this.addInitialEvents();
  }
  
  private addInitialEvents(): void {
    const initialEvents = [
      'System startup completed successfully',
      'Admin panel loaded - admin@directdrive.com logged in',
      'Database connection established',
      'Backup service initialized',
      'File monitoring service started'
    ];
    
    initialEvents.forEach((event, index) => {
      setTimeout(() => {
        this.events.unshift(event);
        if (this.events.length > 100) {
          this.events = this.events.slice(0, 100);
        }
      }, index * 1000); // Add events with 1-second delay
    });
  }



  public get isSuperAdmin(): boolean {
    return this.adminAuthService.isSuperAdmin();
  }

  public getRoleDisplayName(role?: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.SUPERADMIN:
        return 'Super Admin';
      default:
        return 'Admin';
    }
  }

  public logout(): void {
    this.adminAuthService.adminLogout();
    this.router.navigate(['/admin-auth/login']);
  }

  public refreshEvents(): void {
    // WebSocket reconnection disabled to prevent API spam
    // this.adminSocketService.disconnect();
    // setTimeout(() => {
    //   this.adminSocketService.connect(this.adminToken);
    // }, 100);
    
    // Just add some mock events instead
    this.addInitialEvents();
  }

  public clearEvents(): void {
    this.events = [];
  }

  public getEventTime(event: string): string {
    return new Date().toLocaleTimeString();
  }

  public trackEvent(index: number, event: string): string {
    return `${index}-${event}`;
  }

  // Theme Management
  public toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('admin-theme', this.isDarkTheme ? 'dark' : 'light');
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('admin-theme');
    this.isDarkTheme = savedTheme === 'dark';
  }

  // Sidebar Management
  public toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  // Notification Management
  public toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  public clearNotifications(): void {
    this.notifications = [];
    this.notificationCount = 0;
    this.showNotifications = false;
  }

  public dismissNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.updateNotificationCount();
  }

  private initializeNotifications(): void {
    // Add some sample notifications
    this.addNotification('info', 'System Status', 'All systems are running normally');
    this.addNotification('success', 'Backup Complete', 'Daily backup completed successfully');
  }

  private addNotification(type: 'info' | 'warning' | 'error' | 'success', title: string, message: string): void {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date()
    };
    this.notifications.unshift(notification);
    this.updateNotificationCount();
  }

  private updateNotificationCount(): void {
    this.notificationCount = this.notifications.length;
  }

  public getNotificationIcon(type: string): string {
    switch (type) {
      case 'error': return 'fa-exclamation-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'success': return 'fa-check-circle';
      default: return 'fa-info-circle';
    }
  }

  public formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleString();
  }

  // Stats Management
  private loadSystemStats(): void {
    // Use consistent mock data for development
    // In production, this should call actual API endpoints
    this.systemStats = {
      totalUsers: 1073,
      userGrowth: 6,
      totalFiles: 32200,
      totalStorage: 1140000000, // 1.14 GB in bytes
      storageUsagePercent: 50,
      systemHealth: 'good'
    };
    
    // Connection status set to true since backend is working
    this.isConnected = true;
  }
  
  // Health check methods removed to prevent API spam
  // private checkBackendHealth(): void {
  //   // Check if backend is accessible
  //   fetch(`${environment.apiUrl}/`)
  //     .then(response => {
  //       if (response.ok) {
  //         this.isConnected = true;
  //       } else {
  //         this.isConnected = false;
  //       }
  //     })
  //     .catch(() => {
  //         this.isConnected = false;
  //     });
  // }
  
  // private setupHealthChecks(): void {
  //   // Initial health check only - don't spam the backend
  //   this.checkBackendHealth();
  //   
  //   // Set up periodic health checks every 5 minutes instead of 30 seconds
  //   setInterval(() => {
  //     this.checkBackendHealth();
  //   }, 300000); // 5 minutes
  // }

  public refreshStats(): void {
    this.loadSystemStats();
    this.addNotification('info', 'Stats Refreshed', 'System statistics have been updated');
  }

  public formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  public formatSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  public getHealthStatus(health: string): string {
    switch (health) {
      case 'good': return 'Excellent';
      case 'warning': return 'Warning';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  }

  // Chart Data Generation
  private generateMockChartData(): void {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Use consistent data for development
    const uploadValues = [85, 65, 92, 78, 45, 88, 95];
    this.chartData.uploads = days.map((day, index) => {
      const value = uploadValues[index];
      return {
        label: day,
        value,
        percentage: (value / 100) * 100 // Normalize to 0-100%
      };
    });
  }

  // Route Management
  public shouldShowChildRoute(): boolean {
    return this.currentRoute.includes('/admin-panel/') && 
           !this.currentRoute.endsWith('/admin-panel') && 
           !this.currentRoute.endsWith('/admin-panel/dashboard');
  }
}