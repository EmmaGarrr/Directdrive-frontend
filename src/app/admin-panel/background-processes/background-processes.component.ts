import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminStatsService } from '../../services/admin-stats.service';
import { interval, Subscription } from 'rxjs';

// Interfaces for type safety
interface ProcessQueueStatus {
  admin_queue_size: number;
  user_queue_size: number;
  processing_count: number;
  admin_workers: number;
  user_workers: number;
  total_requests_processed: number;
}

interface BackgroundProcess {
  process_id: string;
  process_type: string;
  priority: string;
  description: string;
  admin_initiated: boolean;
  status: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress: number;
  error_message?: string;
  result?: any;
  metadata?: any;
}

interface PrioritySystemInfo {
  admin_workers: number;
  user_workers: number;
  total_requests_processed: number;
}

@Component({
  selector: 'app-background-processes',
  templateUrl: './background-processes.component.html',
  styleUrls: ['./background-processes.component.css']
})
export class BackgroundProcessesComponent implements OnInit, OnDestroy {
  queueStatus: ProcessQueueStatus | null = null;
  activeProcesses: BackgroundProcess[] = [];
  priorityInfo: PrioritySystemInfo | null = null;
  loading = false;
  error: string | null = null;
  isRefreshing = false;
  lastRefreshTime: Date | null = null;
  
  private refreshSubscription: Subscription | null = null;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds (much more reasonable)
  private readonly SMART_REFRESH_INTERVAL = 60000; // 1 minute when no active processes

  constructor(private adminStatsService: AdminStatsService) {}

  ngOnInit(): void {
    this.loadQueueStatus();
    this.loadActiveProcesses();
    this.loadPriorityInfo();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  // Manual refresh method
  manualRefresh(): void {
    this.isRefreshing = true;
    this.loadQueueStatus();
    this.loadActiveProcesses();
    this.loadPriorityInfo();
    this.lastRefreshTime = new Date();
    this.isRefreshing = false;
  }

  // Load queue status from backend
  loadQueueStatus(): void {
    this.loading = true;
    this.error = null;
    
    this.adminStatsService.getProcessQueueStatus().subscribe({
      next: (response) => {
        if (response && response.success && response.queue_status) {
          this.queueStatus = response.queue_status;
        } else {
          this.error = 'Failed to load queue status';
          this.queueStatus = null;
        }
        this.loading = false;
        this.lastRefreshTime = new Date();
      },
      error: (err) => {
        this.error = 'Error loading queue status: ' + (err.message || 'Unknown error');
        this.loading = false;
        this.queueStatus = null;
      }
    });
  }

  // Load active processes from backend
  loadActiveProcesses(): void {
    this.adminStatsService.getActiveProcesses().subscribe({
      next: (response) => {
        // Ensure we have a valid array response
        if (Array.isArray(response)) {
          this.activeProcesses = response;
        } else {
          this.activeProcesses = [];
          console.warn('Unexpected response format for active processes:', response);
        }
        this.lastRefreshTime = new Date();
      },
      error: (err) => {
        console.error('Error loading active processes:', err);
        this.activeProcesses = [];
      }
    });
  }

  // Load priority system information
  loadPriorityInfo(): void {
    this.adminStatsService.getPrioritySystemInfo().subscribe({
      next: (response) => {
        if (response && typeof response === 'object') {
          this.priorityInfo = response;
        } else {
          this.priorityInfo = null;
          console.warn('Unexpected response format for priority system info:', response);
        }
        this.lastRefreshTime = new Date();
      },
      error: (err) => {
        this.error = 'Error loading priority system info: ' + (err.message || 'Unknown error');
        this.priorityInfo = null;
      }
    });
  }

  // Cancel a specific process
  cancelProcess(processId: string): void {
    this.adminStatsService.cancelProcess(processId).subscribe({
      next: (response) => {
        if (response.success) {
          // Refresh the processes list
          this.loadActiveProcesses();
          this.loadQueueStatus();
        } else {
          this.error = 'Failed to cancel process';
        }
      },
      error: (err) => {
        this.error = 'Error canceling process: ' + (err.message || 'Unknown error');
      }
    });
  }

  // Trigger quota refresh process
  triggerQuotaRefresh(): void {
    this.loading = true;
    this.error = null;
    
    this.adminStatsService.triggerQuotaRefresh().subscribe({
      next: (response) => {
        if (response.success) {
          // Refresh the processes list to show the new process
          this.loadActiveProcesses();
          this.loadQueueStatus();
        } else {
          this.error = 'Failed to trigger quota refresh';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error triggering quota refresh: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  // Start automatic refresh of data with smart logic
  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      // Smart refresh: only refresh frequently if there are active processes
      const hasActiveProcesses = this.activeProcesses && this.activeProcesses.length > 0;
      const refreshInterval = hasActiveProcesses ? this.REFRESH_INTERVAL : this.SMART_REFRESH_INTERVAL;
      
      // Only refresh if we're not already loading
      if (!this.loading) {
        this.loadQueueStatus();
        this.loadActiveProcesses();
        this.loadPriorityInfo();
      }
    });
  }

  // Stop automatic refresh
  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  // Helper method to format datetime
  formatDateTime(dateTime: string | Date): string {
    if (!dateTime) return 'N/A';
    
    const date = new Date(dateTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  // Get refresh status text
  getRefreshStatusText(): string {
    if (!this.lastRefreshTime) return 'Never refreshed';
    
    const now = new Date();
    const diffMs = now.getTime() - this.lastRefreshTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `Refreshed ${diffSecs}s ago`;
    if (diffMins < 60) return `Refreshed ${diffMins}m ago`;
    
    return `Refreshed ${this.lastRefreshTime.toLocaleTimeString()}`;
  }
}

