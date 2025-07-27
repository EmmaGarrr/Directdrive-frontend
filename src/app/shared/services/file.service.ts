// src/app/shared/services/file.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  // Construct the specific API path for files - EXACT same as BatchUploadService
  private fileApiUrl = `${environment.apiUrl}/api/v1`;

  constructor(private http: HttpClient) { }

  getFileMeta(id: string): Observable<any> {
    return this.http.get<any>(`${this.fileApiUrl}/files/${id}/meta`);
  }

  getStreamUrl(id: string): string {
    // EXACT same approach as BatchUploadService.getStreamUrl() that works
    const url = `${this.fileApiUrl}/download/stream/${id}`;
    console.log('[FILE_SERVICE] Using fileApiUrl:', this.fileApiUrl);
    console.log('[FILE_SERVICE] Generated download URL:', url);
    return url;
  }

  getUserFiles(): Observable<any> {
    return this.http.get<any[]>(`${this.fileApiUrl}/files/me/history`);
  }
}