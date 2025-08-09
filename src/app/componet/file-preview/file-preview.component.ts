import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileService, PreviewMetadata, MediaInfo } from '../../shared/services/file.service';

@Component({
  selector: 'app-file-preview',
  templateUrl: './file-preview.component.html',
  styleUrls: ['./file-preview.component.css']
})
export class FilePreviewComponent implements OnInit, OnDestroy {
  @Input() fileId!: string;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  
  previewMetadata?: PreviewMetadata;
  loading = true;
  error = false;
  errorMessage = '';
  
  // Preview type specific properties
  previewType: 'video' | 'audio' | 'image' | 'document' | 'text' | 'thumbnail' | 'viewer' | 'unknown' = 'unknown';
  
  // Video/Audio specific
  mediaUrl = '';
  mediaInfo?: MediaInfo;
  
  // Text specific
  textContent = '';
  textLoading = false;
  
  // Image specific
  imageUrl = '';
  imageLoading = false;
  
  // Document specific
  pdfUrl = '';
  pdfLoading = false;

  constructor(
    private fileService: FileService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadPreviewMetadata();
  }

  ngOnDestroy(): void {
    // Clean up any resources if needed
  }

  async loadPreviewMetadata(): Promise<void> {
    try {
      this.loading = true;
      this.error = false;
      
      this.previewMetadata = await this.fileService.getPreviewMetadata(this.fileId).toPromise();
      
      if (!this.previewMetadata) {
        throw new Error('Failed to load preview metadata');
      }
      
      this.previewType = this.previewMetadata.preview_type as any;
      this.mediaInfo = this.previewMetadata.media_info;
      
      // Initialize preview based on type
      await this.initializePreview();
      
    } catch (error) {
      console.error('Error loading preview metadata:', error);
      this.error = true;
      this.errorMessage = 'Failed to load preview. Please try again.';
      this.snackBar.open(this.errorMessage, 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }

  private async initializePreview(): Promise<void> {
    if (!this.previewMetadata) return;

    // Determine preview type based on both preview_type and content_type
    const contentType = this.previewMetadata.content_type || '';
    const previewType = this.previewType;

    // Handle image types (support both "image" and "thumbnail" from backend)
    if (previewType === 'image' || previewType === 'thumbnail' || contentType.startsWith('image/')) {
      this.previewType = 'image'; // Normalize to 'image'
      this.imageUrl = this.fileService.getPreviewStreamUrl(this.fileId);
      return;
    }

    // Handle video/audio types
    if (previewType === 'video' || previewType === 'audio' || 
        contentType.startsWith('video/') || contentType.startsWith('audio/')) {
      this.mediaUrl = this.fileService.getPreviewStreamUrl(this.fileId);
      return;
    }

    // Handle document types (PDF)
    if (previewType === 'document' || previewType === 'viewer' || contentType === 'application/pdf') {
      this.previewType = 'document'; // Normalize to 'document'
      this.pdfUrl = this.fileService.getPreviewStreamUrl(this.fileId);
      return;
    }

    // Handle text types
    if (previewType === 'text' || contentType.startsWith('text/')) {
      this.previewType = 'text'; // Normalize to 'text'
      await this.loadTextContent();
      return;
    }

    // If no supported type found
    this.error = true;
    this.errorMessage = `Preview not supported for ${contentType || previewType} files.`;
  }

  private async loadTextContent(): Promise<void> {
    try {
      this.textLoading = true;
      
      // For text files, we'll fetch the content directly
      const response = await fetch(this.fileService.getPreviewStreamUrl(this.fileId));
      if (!response.ok) {
        throw new Error('Failed to load text content');
      }
      
      this.textContent = await response.text();
      
    } catch (error) {
      console.error('Error loading text content:', error);
      this.error = true;
      this.errorMessage = 'Failed to load text content.';
    } finally {
      this.textLoading = false;
    }
  }

  getFormattedFileSize(): string {
    if (!this.previewMetadata || !this.previewMetadata.size_bytes) return '';
    return this.fileService.formatFileSize(this.previewMetadata.size_bytes);
  }

  getFormattedDuration(): string {
    if (!this.mediaInfo?.duration) return '';
    return this.fileService.formatDuration(this.mediaInfo.duration);
  }

  getFormattedDimensions(): string {
    if (!this.mediaInfo?.width || !this.mediaInfo?.height) return '';
    return `${this.mediaInfo.width} × ${this.mediaInfo.height}`;
  }

  onVideoError(event: any): void {
    console.error('Video error:', event);
    this.error = true;
    this.errorMessage = 'Failed to load video. Please try downloading the file instead.';
    this.snackBar.open(this.errorMessage, 'Close', { duration: 5000 });
  }

  onAudioError(event: any): void {
    console.error('Audio error:', event);
    this.error = true;
    this.errorMessage = 'Failed to load audio. Please try downloading the file instead.';
    this.snackBar.open(this.errorMessage, 'Close', { duration: 5000 });
  }

  onImageError(): void {
    this.error = true;
    this.errorMessage = 'Failed to load image. Please try downloading the file instead.';
    this.snackBar.open(this.errorMessage, 'Close', { duration: 5000 });
  }

  onPdfError(): void {
    this.error = true;
    this.errorMessage = 'Failed to load PDF. Please try downloading the file instead.';
    this.snackBar.open(this.errorMessage, 'Close', { duration: 5000 });
  }

  downloadFile(): void {
    const downloadUrl = this.fileService.getStreamUrl(this.fileId);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = this.previewMetadata?.filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  retry(): void {
    this.loadPreviewMetadata();
  }

  // Video control methods
  onVideoLoaded(): void {
    console.log('[VIDEO] Video metadata loaded, seeking should now work properly');
  }

  skipForward(): void {
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      const video = this.videoPlayer.nativeElement;
      video.currentTime = Math.min(video.currentTime + 10, video.duration || 0);
      console.log(`[VIDEO] Skipped forward 10s to ${video.currentTime}s`);
    }
  }

  skipBackward(): void {
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      const video = this.videoPlayer.nativeElement;
      video.currentTime = Math.max(video.currentTime - 10, 0);
      console.log(`[VIDEO] Skipped backward 10s to ${video.currentTime}s`);
    }
  }
} 