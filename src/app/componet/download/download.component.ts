// src/app/componet/download/download.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileService, PreviewMetadata } from '../../shared/services/file.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
})
export class DownloadComponent implements OnInit {
  
  public fileMeta$!: Observable<any>;
  public previewMetadata$!: Observable<PreviewMetadata>;
  public downloadUrl: string | null = null;
  public showPreview = false;
  public previewAvailable = false;
  public previewType: string = 'unknown';
  public previewMessage: string = '';
  public fileId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    this.fileId = this.route.snapshot.paramMap.get('id');

    if (this.fileId) {
      this.fileMeta$ = this.fileService.getFileMeta(this.fileId);
      this.downloadUrl = this.fileService.getStreamUrl(this.fileId);
      
      // Load preview metadata
      this.previewMetadata$ = this.fileService.getPreviewMetadata(this.fileId);
      
      // Check if preview is available
      this.previewMetadata$.subscribe(metadata => {
        this.previewAvailable = metadata.preview_available;
        this.previewType = metadata.preview_type;
        this.previewMessage = metadata.message || '';
        console.log('[DOWNLOAD_COMPONENT] Preview available:', this.previewAvailable);
        console.log('[DOWNLOAD_COMPONENT] Preview type:', this.previewType);
        if (!this.previewAvailable && metadata.message) {
          console.log('[DOWNLOAD_COMPONENT] Preview message:', metadata.message);
        }
      });
      
      console.log('[DOWNLOAD_COMPONENT] fileId:', this.fileId);
      console.log('[DOWNLOAD_COMPONENT] downloadUrl set to:', this.downloadUrl);
    }
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  isPreviewable(contentType: string): boolean {
    return this.fileService.isPreviewableContentType(contentType);
  }

  getFormattedFileSize(bytes: number): string {
    return this.fileService.formatFileSize(bytes);
  }
}