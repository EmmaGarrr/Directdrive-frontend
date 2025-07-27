// src/app/shared/services/file.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  // Construct the specific API path for files
  private fileApiUrl = `${environment.apiUrl}/api/v1`;

  constructor(private http: HttpClient) { }

  getFileMeta(id: string): Observable<any> {
    return this.http.get<any>(`${this.fileApiUrl}/files/${id}/meta`);
  }

  getStreamUrl(id: string): string {
    // Generate complete download URL using environment API URL (same fix as batch downloads)
    console.log('[FILE_SERVICE] Raw environment object:', environment);
    console.log('[FILE_SERVICE] environment.apiUrl:', environment.apiUrl);
    console.log('[FILE_SERVICE] environment.production:', environment.production);
    
    // Ensure we have a proper API URL - fallback if environment is not loaded
    const apiUrl = environment.apiUrl || 'https://api.mfcnextgen.com';
    const url = `${apiUrl}/api/v1/download/stream/${id}`;
    
    console.log('[FILE_SERVICE] Final apiUrl used:', apiUrl);
    console.log('[FILE_SERVICE] Generated download URL:', url);
    return url;
  }

  getUserFiles(): Observable<any> {
    return this.http.get<any[]>(`${this.fileApiUrl}/files/me/history`);
  }
}