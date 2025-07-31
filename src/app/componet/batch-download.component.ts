// // // // File: src/app/componet/batch-download.component.ts

// // // import { Component, OnInit } from '@angular/core';
// // // import { ActivatedRoute } from '@angular/router';
// // // import { Observable } from 'rxjs';
// // // import { BatchUploadService, IFileMetadata } from '../shared/services/batch-upload.service';

// // // @Component({
// // //   selector: 'app-batch-download',
// // //   templateUrl: './batch-download.component.html',
// // //   styleUrls: ['./batch-download.component.css']
// // // })
// // // export class BatchDownloadComponent implements OnInit {

// // //   public filesMeta$!: Observable<IFileMetadata[]>;
// // //   public batchId: string | null = null;

// // //   constructor(
// // //     private route: ActivatedRoute,
// // //     public batchUploadService: BatchUploadService // Made public to use in template
// // //   ) {}

// // //   ngOnInit(): void {
// // //     this.batchId = this.route.snapshot.paramMap.get('batchId');

// // //     if (this.batchId) {
// // //       // Fetch the list of file metadata from our new backend endpoint
// // //       this.filesMeta$ = this.batchUploadService.getBatchDetails(this.batchId);
// // //     }
// // //   }

// // //   downloadAll(files: IFileMetadata[]): void {
// // //     if (!files) return;

// // //     // This function triggers a download for each file individually.
// // //     for (const file of files) {
// // //       const link = document.createElement('a');
// // //       link.href = this.batchUploadService.getStreamUrl(file._id);
// // //       link.download = file.filename; // This attribute is crucial
// // //       document.body.appendChild(link);
// // //       link.click();
// // //       document.body.removeChild(link);
// // //     }
// // //   }
// // // }

// // // In file: src/app/componet/batch-download.component.ts

// // import { Component, OnInit } from '@angular/core';
// // import { ActivatedRoute } from '@angular/router';
// // import { Observable } from 'rxjs';
// // import { BatchUploadService, IFileMetadata } from '../shared/services/batch-upload.service';

// // @Component({
// //   selector: 'app-batch-download',
// //   templateUrl: './batch-download.component.html',
// //   styleUrls: ['./batch-download.component.css']
// // })
// // export class BatchDownloadComponent implements OnInit {

// //   public filesMeta$!: Observable<IFileMetadata[]>;
// //   public batchId: string | null = null;

// //   constructor(
// //     private route: ActivatedRoute,
// //     public batchUploadService: BatchUploadService
// //   ) {}

// //   ngOnInit(): void {
// //     this.batchId = this.route.snapshot.paramMap.get('batchId');

// //     if (this.batchId) {
// //       this.filesMeta$ = this.batchUploadService.getBatchDetails(this.batchId);
// //     }
// //   }

// //   // --- THIS FUNCTION IS NO LONGER NEEDED AND CAN BE DELETED ---
// //   /*
// //   downloadAll(files: IFileMetadata[]): void {
// //     if (!files) return;

// //     for (const file of files) {
// //       const link = document.createElement('a');
// //       link.href = this.batchUploadService.getStreamUrl(file._id);
// //       link.download = file.filename;
// //       document.body.appendChild(link);
// //       link.click();
// //       document.body.removeChild(link);
// //     }
// //   }
// //   */
// // }




// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { Observable } from 'rxjs';
// import { BatchUploadService, IFileMetadata } from '../shared/services/batch-upload.service';
// import { MatDialog } from '@angular/material/dialog';
// import { PreviewDialogComponent, PreviewDialogData } from '../shared/component/preview-dialog/preview-dialog.component';

// @Component({
//   selector: 'app-batch-download',
//   templateUrl: './batch-download.component.html',
//   styleUrls: ['./batch-download.component.css']
// })
// export class BatchDownloadComponent implements OnInit {

//   public filesMeta$!: Observable<IFileMetadata[]>;
//   public batchId: string | null = null;

//   constructor(
//     private route: ActivatedRoute,
//     public batchUploadService: BatchUploadService,
//     private dialog: MatDialog // NEW
//   ) {}

//   ngOnInit(): void {
//     this.batchId = this.route.snapshot.paramMap.get('batchId');

//     if (this.batchId) {
//       this.filesMeta$ = this.batchUploadService.getBatchDetails(this.batchId);
//     }
//   }

//   // --- NEW: Method to open the preview dialog ---
//   openPreview(file: IFileMetadata): void {
//     const dialogData: PreviewDialogData = {
//       fileId: file._id,
//       filename: file.filename,
//       contentType: file.content_type
//     };

//     this.dialog.open(PreviewDialogComponent, {
//       data: dialogData,
//       width: '95vw',
//       height: '95vh',
//       maxWidth: '1600px',
//       panelClass: 'preview-dialog-panel'
//     });
//   }

//   // Helper to get a generic file type for the icon
//   getFileType(filename: string): string {
//     const extension = filename.split('.').pop()?.toLowerCase() || '';
//     if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
//       return 'image';
//     }
//     if (['mp4', 'webm', 'ogg'].includes(extension)) {
//       return 'video';
//     }
//     if (extension === 'pdf') {
//       return 'pdf';
//     }
//     if (extension === 'zip') {
//       return 'zip';
//     }
//     return 'text'; // Default to text icon
//   }
// }



import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { BatchUploadService, IFileMetadata } from '../shared/services/batch-upload.service';
import { MatDialog } from '@angular/material/dialog';
import { PreviewDialogComponent, PreviewDialogData } from '../shared/component/preview-dialog/preview-dialog.component';

@Component({
  selector: 'app-batch-download',
  templateUrl: './batch-download.component.html',
  styleUrls: ['./batch-download.component.css']
})
export class BatchDownloadComponent implements OnInit {

  public filesMeta$!: Observable<IFileMetadata[]>;
  public batchId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    public batchUploadService: BatchUploadService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.batchId = this.route.snapshot.paramMap.get('batchId');

    if (this.batchId) {
      this.filesMeta$ = this.batchUploadService.getBatchDetails(this.batchId);
    }
  }

  openPreview(file: IFileMetadata): void {
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
      panelClass: 'preview-dialog-panel'
    });
  }

  // Helper to get a generic file type for the icon
  getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    if (['mp4', 'webm', 'ogg'].includes(extension)) {
      return 'video';
    }
    if (extension === 'pdf') {
      return 'pdf';
    }
    if (extension === 'zip') {
      return 'zip';
    }
    return 'text'; // Default to text icon
  }

  // --- NEW METHOD TO CALCULATE TOTAL SIZE ---
  // This method will be called from the template.
  calculateTotalSize(files: IFileMetadata[]): number {
    if (!files || files.length === 0) {
      return 0;
    }
    return files.reduce((acc, file) => acc + file.size_bytes, 0);
  }
}