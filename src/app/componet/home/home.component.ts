import { Component, OnDestroy } from '@angular/core';
import { UploadService, UploadEvent } from '../../shared/services/upload.service';
import { Subscription, forkJoin, Observable, Observer, Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BatchUploadService, IBatchFileInfo } from '../../shared/services/batch-upload.service';
import { environment } from '../../../environments/environment';

// Interfaces and Types
interface IFileState {
  file: File;
  state: 'pending' | 'uploading' | 'cancelling' | 'success' | 'error' | 'cancelled';
  progress: number;
  error?: string;
  websocket?: WebSocket;
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error' | 'cancelled';
type BatchUploadState = 'idle' | 'selected' | 'processing' | 'success' | 'error' | 'cancelled';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy {
  // Single file upload state
  public currentState: UploadState = 'idle';
  public selectedFile: File | null = null;
  public uploadProgress = 0;
  public finalDownloadLink: string | null = null;
  public errorMessage: string | null = null;
  public isCancelling = false;
  private uploadSubscription?: Subscription;
  private currentWebSocket?: WebSocket;

  // Batch upload state
  public batchFiles: IFileState[] = [];
  public batchState: BatchUploadState = 'idle';
  public finalBatchLink: string | null = null;
  private batchSubscriptions: Subscription[] = [];
  private wsUrl = environment.wsUrl;

  // Authentication state
  public isAuthenticated = false;
  public currentUser: any = null;
  private destroy$ = new Subject<void>();

  // UI state for modern interface
  public isDragOver = false;
  
  // Math reference for template
  public Math = Math;

  constructor(
    private uploadService: UploadService,
    private snackBar: MatSnackBar,
    private batchUploadService: BatchUploadService
  ) {
    // Note: AuthService integration removed due to missing implementation
    // this.authService.isAuthenticated$.pipe(takeUntil(this.destroy$)).subscribe(...)
  }

  // File selection handlers
  onFileSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._processFileList(target.files);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    this._processFileList(event.dataTransfer?.files || null);
  }

  private _processFileList(files: FileList | null): void {
    if (!files || files.length === 0) return;
    
    this.resetState();
    
    if (files.length === 1) {
      // Single file upload mode
      this.selectedFile = files[0];
      this.currentState = 'selected';
      this.batchFiles = []; // Clear batch files
      this.batchState = 'idle';
    } else {
      // Multiple files - batch upload mode
      this.selectedFile = null; // Clear single file
      this.currentState = 'idle';
      this.batchFiles = Array.from(files).map(file => ({
        file,
        state: 'pending' as const,
        progress: 0
      }));
      this.batchState = 'selected';
    }
  }

  // Single file upload methods
  onUploadSingle(): void {
    if (!this.selectedFile || this.currentState === 'uploading') return;

    this.currentState = 'uploading';
    this.uploadProgress = 0;
    this.errorMessage = null;
    this.isCancelling = false;

    // Create WebSocket connection for upload
    this.uploadService.upload(this.selectedFile).subscribe({
      next: (event: UploadEvent) => {
        if (event.type === 'progress') {
          this.uploadProgress = event.value;
        } else if (event.type === 'success') {
          // Check if this is a cancellation success message
          if (this.isCancelling || (typeof event.value === 'string' && event.value.includes('cancelled'))) {
            // Handle cancellation success
            this.currentState = 'cancelled';
            this.snackBar.open('Upload cancelled successfully', 'Close', { duration: 3000 });
            this.resetToIdle();
          } else {
            // Handle regular upload success
            this.currentState = 'success';
            // Extract file ID from the API path
            const fileId = event.value.split('/').pop();
            // Generate frontend route URL like batch downloads (not direct API URL)
            this.finalDownloadLink = `${window.location.origin}/download/${fileId}`;
            this.snackBar.open('File uploaded successfully!', 'Close', { duration: 3000 });
          }
        }
      },
      error: (err) => {
        if (!this.isCancelling) {
          this.currentState = 'error';
          this.errorMessage = err.message || 'Upload failed';
          this.snackBar.open('Upload failed: ' + this.errorMessage, 'Close', { duration: 5000 });
        }
      },
      complete: () => {
        // Upload completed
      }
    });
  }

  // Reset component to idle state with smooth transition
  private resetToIdle(): void {
    // Smooth transition delay
    const delay = this.currentState === 'cancelled' ? 200 : 500;
    
    setTimeout(() => {
      this.currentState = 'idle';
      this.selectedFile = null;
      this.uploadProgress = 0;
      this.finalDownloadLink = null;
      this.errorMessage = null;
      this.isCancelling = false;
      
      // Clean up subscription
      if (this.uploadSubscription) {
        this.uploadSubscription.unsubscribe();
        this.uploadSubscription = undefined;
      }
      
      // Clear file input if it exists
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }, delay);
  }

  // Cancel single file upload with premium UX
  onCancelUpload(): void {
    if (this.currentState !== 'uploading') return;

    // Immediate visual feedback
    this.isCancelling = true;
    
    // Show user-friendly message immediately
    this.snackBar.open('Cancelling upload...', 'Close', { duration: 2000 });
    
    // Simulate realistic cancellation time for better UX
    setTimeout(() => {
      // Use upload service to cancel WebSocket connection
      const cancelled = this.uploadService.cancelUpload();
      if (cancelled) {
        console.log('[HomeComponent] Upload cancelled via service');
        // Set state to cancelled for smooth transition
        this.currentState = 'cancelled';
        
        // Show success message after slight delay
        setTimeout(() => {
          this.snackBar.open('Upload cancelled successfully', 'Close', { duration: 3000 });
          // Reset to idle after showing cancelled state briefly
          setTimeout(() => {
            this.resetToIdle();
          }, 1000);
        }, 500);
      } else {
        console.log('[HomeComponent] No active upload to cancel');
        this.snackBar.open('Upload cancelled', 'Close', { duration: 2000 });
        this.resetToIdle();
      }
    }, 300); // Small delay for better perceived performance
  }

  // Batch upload methods - Restored original batch upload functionality
  onUploadBatch(): void {
    if (this.batchFiles.length === 0 || this.batchState === 'processing') return;

    this.batchState = 'processing';
    this.finalBatchLink = null;

    const fileInfos: IBatchFileInfo[] = this.batchFiles.map(f => ({
      filename: f.file.name,
      size: f.file.size,
      content_type: f.file.type || 'application/octet-stream'
    }));

    console.log(`[HOME_BATCH] Initiating batch upload for ${fileInfos.length} files`);

    const observer: Observer<any> = {
      next: (response) => {
        console.log(`[HOME_BATCH] Batch initiated successfully for ${response.files.length} files, batch_id: ${response.batch_id}`);
        
        // Process ALL files from batch response
        response.files.forEach((fileInfo: any) => {
          const matchingFile = this.batchFiles.find(bf => bf.file.name === fileInfo.original_filename);
          if (matchingFile) {
            console.log(`[HOME_BATCH] Starting upload for: ${matchingFile.file.name} (${fileInfo.file_id})`);
            
            const sub = this.createIndividualUploadObservable(
              matchingFile, 
              fileInfo.file_id, 
              fileInfo.gdrive_upload_url
            ).subscribe({
              complete: () => {
                console.log(`[HOME_BATCH] Upload completed for: ${matchingFile.file.name}`);
                this.checkBatchCompletion(response.batch_id);
              },
              error: (error) => {
                console.error(`[HOME_BATCH] Upload failed for: ${matchingFile.file.name}`, error);
                matchingFile.state = 'error';
                matchingFile.error = error.message || 'Upload failed';
                this.checkBatchCompletion(response.batch_id);
              }
            });
            this.batchSubscriptions.push(sub);
          } else {
            console.error(`[HOME_BATCH] No matching file found for: ${fileInfo.original_filename}`);
          }
        });
      },
      error: (err) => {
        console.error(`[HOME_BATCH] Batch upload initiation failed:`, err);
        this.batchState = 'error';
        this.snackBar.open(`Batch upload initiation failed: ${err.error?.detail || err.message || 'Unknown error'}`, 'Close', { duration: 5000 });
      },
      complete: () => {}
    };

    this.batchUploadService.initiateBatch(fileInfos).subscribe(observer);
  }

  private createIndividualUploadObservable(fileState: IFileState, fileId: string, gdriveUploadUrl: string): Observable<UploadEvent | null> {
    return new Observable(observer => {
      const wsUrl = `${this.wsUrl}/upload/${fileId}?gdrive_url=${encodeURIComponent(gdriveUploadUrl)}`;
      
      // Enhanced logging for connection attempts (matching single upload)
      console.log(`[HOME_BATCH] Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      let connectionStartTime = Date.now();
      
      // Assign WebSocket reference for cancel functionality
      fileState.websocket = ws;
      
      // Add connection timeout to prevent infinite waiting
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error(`[HOME_BATCH] Connection timeout for file: ${fileState.file.name} (${fileId})`);
          ws.close();
          fileState.state = 'error';
          fileState.error = 'Connection timeout - server may be unavailable';
          observer.error(new Error('Connection timeout'));
        }
      }, 30000); // 30 second timeout
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        const connectionTime = Date.now() - connectionStartTime;
        console.log(`[HOME_BATCH WS] Connection opened for ${fileId}. Starting file stream. | Connection time: ${connectionTime}ms`);
        fileState.state = 'uploading';
        this.sliceAndSend(fileState.file, ws);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          fileState.progress = data.value;
        } else if (data.type === 'success') {
          fileState.state = 'success';
          fileState.websocket = undefined; // Clean up reference
          observer.complete();
        } else if (data.type === 'error') {
          fileState.state = 'error';
          fileState.error = data.value;
          fileState.websocket = undefined; // Clean up reference
          observer.error(new Error(data.value));
        }
      };
      
      ws.onerror = (errorEvent) => {
        clearTimeout(connectionTimeout); // Clear timeout on error
        console.error(`[HOME_BATCH] WebSocket error for file: ${fileState.file.name} (${fileId})`, errorEvent);
        fileState.state = 'error';
        fileState.error = 'WebSocket connection failed';
        fileState.websocket = undefined; // Clean up reference
        observer.error(new Error('WebSocket connection failed'));
      };
      
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout); // Clear timeout on close
        console.log(`[HOME_BATCH] WebSocket closed for file: ${fileState.file.name} (${fileId}) | Clean: ${event.wasClean} | Code: ${event.code}`);
        if (fileState.state === 'uploading') {
          fileState.state = 'cancelled';
        }
        fileState.websocket = undefined; // Clean up reference
        observer.complete();
      };
    });
  }

  private sliceAndSend(file: File, ws: WebSocket, start: number = 0): void {
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (ws.readyState === WebSocket.OPEN && e.target?.result) {
        ws.send(e.target.result);
        if (end < file.size) {
          this.sliceAndSend(file, ws, end);
        }
      }
    };
    reader.readAsArrayBuffer(chunk);
  }

  private checkBatchCompletion(batchId: string): void {
    const allFinished = this.batchFiles.every(f => f.state !== 'uploading');
    if (allFinished) {
      const hasErrors = this.batchFiles.some(f => f.state === 'error');
      const successCount = this.batchFiles.filter(f => f.state === 'success').length;
      const totalCount = this.batchFiles.length;
      
      if (hasErrors) {
        this.batchState = 'error';
        this.snackBar.open(`Upload completed with errors: ${successCount}/${totalCount} files succeeded`, 'Close', { duration: 5000 });
      } else {
        this.batchState = 'success';
        // Generate proper batch download page link (not direct download)
        this.finalBatchLink = `${window.location.origin}/batch-download/${batchId}`;
        this.snackBar.open(`All ${totalCount} files uploaded successfully!`, 'Close', { duration: 3000 });
      }
      
      console.log(`[HOME_BATCH] Upload batch completed: ${successCount}/${totalCount} files succeeded, batch_id: ${batchId}`);
    }
  }

  // Utility methods
  resetState(): void {
    this.currentState = 'idle';
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.finalDownloadLink = null;
    this.errorMessage = null;
    this.isCancelling = false;
    this.batchFiles = [];
    this.batchState = 'idle';
    this.finalBatchLink = null;
    
    // Clean up subscriptions
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = undefined;
    }
    
    this.batchSubscriptions.forEach(sub => sub.unsubscribe());
    this.batchSubscriptions = [];
    
    if (this.currentWebSocket) {
      this.currentWebSocket.close();
      this.currentWebSocket = undefined;
    }
  }

  startNewUpload(): void {
    this.resetState();
  }

  copyLink(link: string): void {
    navigator.clipboard.writeText(link).then(() => {
      this.snackBar.open('Link copied to clipboard!', 'Close', { duration: 2000 });
    });
  }

  openDownloadLink(link: string | null): void {
    if (link) {
      window.open(link, '_blank');
    }
  }

  // Premium batch upload cancel methods with smooth UX
  onCancelSingleBatchFile(fileState: IFileState): void {
    if (fileState.state === 'uploading' && fileState.websocket) {
      // Immediate visual feedback
      fileState.state = 'cancelling';
      
      // Show user-friendly message immediately
      this.snackBar.open(`Cancelling ${fileState.file.name}...`, 'Close', { duration: 2000 });
      
      setTimeout(() => {
        // Close WebSocket connection
        if (fileState.websocket) {
          fileState.websocket.close();
        }
        fileState.state = 'cancelled';
        fileState.error = 'Upload cancelled by user';
        
        // Remove the subscription for this file
        const index = this.batchSubscriptions.findIndex(sub => {
          return !sub.closed;
        });
        if (index !== -1) {
          this.batchSubscriptions[index].unsubscribe();
          this.batchSubscriptions.splice(index, 1);
        }
        
        // Success notification after delay
        setTimeout(() => {
          this.snackBar.open(`${fileState.file.name} upload cancelled successfully`, 'Close', { duration: 3000 });
        }, 500);
      }, 300);
    }
  }

  onCancelAllBatch(): void {
    if (this.batchState !== 'processing') return;

    // Immediate visual feedback
    this.isCancelling = true;
    
    // Show user-friendly message immediately
    this.snackBar.open('Cancelling all uploads...', 'Close', { duration: 2000 });
    
    // Simulate realistic cancellation time for better UX
    setTimeout(() => {
      // Cancel all uploading files
      this.batchFiles.forEach(fileState => {
        if (fileState.state === 'uploading' && fileState.websocket) {
          fileState.websocket.close();
          fileState.state = 'cancelled';
          fileState.error = 'Upload cancelled by user';
        } else if (fileState.state === 'pending') {
          fileState.state = 'cancelled';
          fileState.error = 'Upload cancelled by user';
        }
      });
      
      // Unsubscribe from all batch subscriptions
      this.batchSubscriptions.forEach(sub => sub.unsubscribe());
      this.batchSubscriptions = [];
      
      // Set state to cancelled for smooth transition
      this.batchState = 'cancelled';
      
      // Show success message after slight delay
      setTimeout(() => {
        this.snackBar.open('All uploads cancelled successfully', 'Close', { duration: 3000 });
        
        // Reset after showing cancelled state briefly
        setTimeout(() => {
          this.resetBatchToIdle();
        }, 2000);
      }, 500);
    }, 300);
  }

  // Reset batch upload to idle state with smooth transition
  resetBatchToIdle(): void {
    setTimeout(() => {
      this.batchState = 'idle';
      this.batchFiles = [];
      this.finalBatchLink = null;
      this.isCancelling = false;
      
      // Clean up any remaining subscriptions
      this.batchSubscriptions.forEach(sub => sub.unsubscribe());
      this.batchSubscriptions = [];
    }, 300);
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  // Authentication placeholders (to be implemented when AuthService is available)
  navigateToLogin(): void {
    // this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    // this.router.navigate(['/register']);
  }

  navigateToProfile(): void {
    // this.router.navigate(['/profile']);
  }

  onLogout(): void {
    // this.authService.logout();
    // this.router.navigate(['/']);
  }

  // Upload restriction checks
  canUploadBatch(): boolean {
    return this.isAuthenticated;
  }

  canDownloadZip(): boolean {
    return this.isAuthenticated;
  }

  getUploadLimitMessage(): string {
    if (this.isAuthenticated) {
      return 'Authenticated users can upload files up to 10GB';
    }
    return 'Anonymous users can upload files up to 2GB';
  }

  // Utility methods for template
  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  uploadFile(): void {
    if (this.selectedFile && this.currentState === 'selected') {
      this.onUploadSingle();
    }
  }

  cancelUpload(): void {
    this.onCancelUpload();
  }

  resetUpload(): void {
    this.resetState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resetState();
  }
}
