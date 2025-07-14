// // File: src/app/componet/batch-download.component.ts

// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { Observable } from 'rxjs';
// import { BatchUploadService, IFileMetadata } from '../shared/services/batch-upload.service';

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
//     public batchUploadService: BatchUploadService // Made public to use in template
//   ) {}

//   ngOnInit(): void {
//     this.batchId = this.route.snapshot.paramMap.get('batchId');

//     if (this.batchId) {
//       // Fetch the list of file metadata from our new backend endpoint
//       this.filesMeta$ = this.batchUploadService.getBatchDetails(this.batchId);
//     }
//   }

//   downloadAll(files: IFileMetadata[]): void {
//     if (!files) return;

//     // This function triggers a download for each file individually.
//     for (const file of files) {
//       const link = document.createElement('a');
//       link.href = this.batchUploadService.getStreamUrl(file._id);
//       link.download = file.filename; // This attribute is crucial
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     }
//   }
// }

// In file: src/app/componet/batch-download.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { BatchUploadService, IFileMetadata } from '../shared/services/batch-upload.service';

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
    public batchUploadService: BatchUploadService
  ) {}

  ngOnInit(): void {
    this.batchId = this.route.snapshot.paramMap.get('batchId');

    if (this.batchId) {
      this.filesMeta$ = this.batchUploadService.getBatchDetails(this.batchId);
    }
  }

  // --- THIS FUNCTION IS NO LONGER NEEDED AND CAN BE DELETED ---
  /*
  downloadAll(files: IFileMetadata[]): void {
    if (!files) return;

    for (const file of files) {
      const link = document.createElement('a');
      link.href = this.batchUploadService.getStreamUrl(file._id);
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  */
}