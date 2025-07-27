// src/app/componet/download/download.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileService } from '../../shared/services/file.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
})
export class DownloadComponent implements OnInit {
  
  public fileMeta$!: Observable<any>;
  public downloadUrl: string | null = null;
  private fileId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    this.fileId = this.route.snapshot.paramMap.get('id');

    if (this.fileId) {
      this.fileMeta$ = this.fileService.getFileMeta(this.fileId);
      this.downloadUrl = this.fileService.getStreamUrl(this.fileId);
      console.log('[DOWNLOAD_COMPONENT] fileId:', this.fileId);
      console.log('[DOWNLOAD_COMPONENT] downloadUrl set to:', this.downloadUrl);
    }
  }
}