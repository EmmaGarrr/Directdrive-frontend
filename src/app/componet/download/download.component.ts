// // src/app/componet/download/download.component.ts
// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { FileService } from '../../shared/services/file.service';
// import { Observable } from 'rxjs';

// @Component({
//   selector: 'app-download',
//   templateUrl: './download.component.html',
// })
// export class DownloadComponent implements OnInit {
  
//   public fileMeta$!: Observable<any>;
//   public downloadUrl: string | null = null;
//   private fileId: string | null = null;

//   // --- NEW PROPERTIES ---
//   public previewUrl: SafeResourceUrl | null = null;
//   public previewType: 'image' | 'video' | 'other' | 'zip' = 'other';

//   constructor(
//     private route: ActivatedRoute,
//     private fileService: FileService
//   ) {}

//   ngOnInit(): void {
//     this.fileId = this.route.snapshot.paramMap.get('id');

//     if (this.fileId) {
//       this.fileMeta$ = this.fileService.getFileMeta(this.fileId);
//       this.downloadUrl = this.fileService.getStreamUrl(this.fileId);
//       console.log('[DOWNLOAD_COMPONENT] fileId:', this.fileId);
//       console.log('[DOWNLOAD_COMPONENT] downloadUrl set to:', this.downloadUrl);
//     }
//   }
// }


import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileService } from '../../shared/services/file.service';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { PreviewDialogComponent, PreviewDialogData } from '../../shared/component/preview-dialog/preview-dialog.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
})
export class DownloadComponent implements OnInit {
  
  public fileMeta$!: Observable<any>;
  public downloadUrl: string | null = null;
  private fileId: string | null = null;
  
  // --- NEW PROPERTIES ---
  public previewUrl: SafeResourceUrl | null = null;
  public previewType: 'image' | 'video' | 'other' | 'zip' = 'other';

  constructor(
    private route: ActivatedRoute,
    private fileService: FileService,
    private dialog: MatDialog, // NEW
    private sanitizer: DomSanitizer // NEW
  ) {}

  ngOnInit(): void {
    this.fileId = this.route.snapshot.paramMap.get('id');

    if (this.fileId) {
      this.downloadUrl = this.fileService.getStreamUrl(this.fileId);
      this.fileMeta$ = this.fileService.getFileMeta(this.fileId);

      // --- NEW: Set up preview ---
      this.fileMeta$.subscribe(file => {
        if (file) {
          this.setupPreview(file);
        }
      });
    }
  }

  private setupPreview(file: any): void {
    const rawUrl = this.fileService.getStreamUrl(file._id);
    const contentType = file.content_type || '';
    const filename = file.filename || '';

    if (filename.toLowerCase().endsWith('.zip')) {
      this.previewType = 'zip';
      return;
    }
    
    if (contentType.startsWith('image/')) {
      this.previewType = 'image';
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    } else if (contentType.startsWith('video/')) {
      this.previewType = 'video';
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    } else {
      this.previewType = 'other';
    }
  }

  openPreview(file: any): void {
    if (!file || (file.filename && file.filename.toLowerCase().endsWith('.zip'))) {
      return;
    }

    const dialogData: PreviewDialogData = {
      fileId: file._id,
      filename: file.filename,
      contentType: file.content_type
    };

    this.dialog.open(PreviewDialogComponent, {
      data: dialogData,
      width: '95vw',
      height: '95vh',
      maxWidth: '1600px',
      panelClass: 'preview-dialog-panel' // A class for custom styling if needed
    });
  }
}