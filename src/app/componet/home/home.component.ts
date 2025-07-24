import { Component, OnDestroy } from '@angular/core';
import { UploadService, UploadEvent } from '../../shared/services/upload.service';
import { Subscription, forkJoin, Observable, Observer, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BatchUploadService, IBatchFileInfo } from '../../shared/services/batch-upload.service';
import { environment } from '../../../environments/environment';

// Interfaces and Types
interface IFileState {
  file: File;
  state: 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';
  progress: number;
  error?: string;
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
    this._processFileList(event.dataTransfer?.files || null);
  }

  private _processFileList(files: FileList | null): void {
    if (!files || files.length === 0) return;
    
    this.resetState();
    this.selectedFile = files[0];
    this.currentState = 'selected';
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
          this.currentState = 'success';
          this.finalDownloadLink = event.value;
          this.snackBar.open('File uploaded successfully!', 'Close', { duration: 3000 });
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

  // Cancel single file upload
  onCancelUpload(): void {
    if (this.currentState !== 'uploading') return;

    this.isCancelling = true;
    
    // Cancel upload service subscription
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
      this.uploadSubscription = undefined;
    }
    
    // Close WebSocket connection if available
    if (this.currentWebSocket) {
      this.currentWebSocket.close();
      this.currentWebSocket = undefined;
    }
    
    // Update UI state
    this.currentState = 'cancelled';
    this.uploadProgress = 0;
    this.snackBar.open('Upload cancelled', 'Close', { duration: 3000 });
    
    setTimeout(() => {
      this.isCancelling = false;
    }, 1000);
  }

  // Batch upload methods
  onUploadBatch(): void {
    if (this.batchFiles.length === 0 || this.batchState === 'processing') return;

    this.batchState = 'processing';
    this.finalBatchLink = null;

    const fileInfos: IBatchFileInfo[] = this.batchFiles.map(f => ({
      filename: f.file.name,
      size: f.file.size,
      content_type: f.file.type || 'application/octet-stream'
    }));

    const observer: Observer<any> = {
      next: (response) => {
        const fileInfo = response.files.find((f: any) => f.name === this.batchFiles[0].file.name);
        if (fileInfo) {
          const sub = this.createIndividualUploadObservable(
            this.batchFiles[0], 
            fileInfo.file_id, 
            fileInfo.gdrive_upload_url
          ).subscribe({
            complete: () => {
              this.checkBatchCompletion(response.batch_id);
            }
          });
          this.batchSubscriptions.push(sub);
        }
      },
      error: (err) => {
        this.batchState = 'error';
        this.snackBar.open('Batch upload initiation failed', 'Close', { duration: 5000 });
      },
      complete: () => {}
    };

    this.batchUploadService.initiateBatch(fileInfos).subscribe(observer);
  }

  private createIndividualUploadObservable(fileState: IFileState, fileId: string, gdriveUploadUrl: string): Observable<UploadEvent | null> {
    return new Observable(observer => {
      const wsUrl = `${this.wsUrl}/ws_api/upload/${fileId}?gdrive_url=${encodeURIComponent(gdriveUploadUrl)}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        fileState.state = 'uploading';
        this.sliceAndSend(fileState.file, ws);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          fileState.progress = data.value;
        } else if (data.type === 'success') {
          fileState.state = 'success';
          observer.complete();
        } else if (data.type === 'error') {
          fileState.state = 'error';
          fileState.error = data.value;
          observer.error(new Error(data.value));
        }
      };
      
      ws.onerror = () => {
        fileState.state = 'error';
        fileState.error = 'WebSocket connection failed';
        observer.error(new Error('WebSocket connection failed'));
      };
      
      ws.onclose = (event) => {
        if (fileState.state === 'uploading') {
          fileState.state = 'cancelled';
        }
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
      if (hasErrors) {
        this.batchState = 'error';
        this.snackBar.open('Some files failed to upload', 'Close', { duration: 5000 });
      } else {
        this.batchState = 'success';
        this.finalBatchLink = `/api/v1/batch/download/${batchId}`;
        this.snackBar.open('All files uploaded successfully!', 'Close', { duration: 3000 });
      }
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

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resetState();
  }
}
