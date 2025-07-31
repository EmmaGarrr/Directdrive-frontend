import { Component, Inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';
import { FileService } from '../../../shared/services/file.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PreviewDialogData {
  fileId: string;
  filename: string;
  contentType: string;
}

type PreviewType = 'image' | 'video' | 'pdf' | 'text' | 'unsupported';

@Component({
  selector: 'app-preview-dialog',
  templateUrl: './preview-dialog.component.html',
  styleUrls: ['./preview-dialog.component.css']
})
export class PreviewDialogComponent implements OnInit {

  previewUrl!: SafeResourceUrl;
  previewType: PreviewType = 'unsupported';
  textContent: Observable<string | null> | null = null;
  isLoading = true;

  constructor(
    public dialogRef: MatDialogRef<PreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PreviewDialogData,
    private sanitizer: DomSanitizer,
    private fileService: FileService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const rawUrl = this.fileService.getStreamUrl(this.data.fileId);
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
    this.determinePreviewType();

    if (this.previewType === 'text') {
      this.fetchTextContent(rawUrl);
    } else {
      this.isLoading = false;
    }
  }

  private determinePreviewType(): void {
    const type = this.data.contentType;
    const filename = this.data.filename.toLowerCase();

    if (type.startsWith('image/')) {
      this.previewType = 'image';
    } else if (type.startsWith('video/')) {
      this.previewType = 'video';
    } else if (type === 'application/pdf') {
      this.previewType = 'pdf';
    } else if (type.startsWith('text/') || this.isCodeFile(filename)) {
      this.previewType = 'text';
    } else {
      this.previewType = 'unsupported';
    }
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.py', '.ts', '.js', '.html', '.css', '.scss', '.json', '.md', '.java', '.c', '.cpp', '.cs', '.php'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  private fetchTextContent(url: string): void {
    this.textContent = this.http.get(url, { responseType: 'text' }).pipe(
      catchError(error => {
        console.error('Failed to fetch text content for preview', error);
        return of('Error: Could not load file content.');
      })
    );
    this.isLoading = false;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}