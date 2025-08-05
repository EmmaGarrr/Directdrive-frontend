import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminAuthService } from './admin-auth.service';

export interface FileInfo {
  file_id: string;
  filename: string;
  path: string;
  size_bytes: number;
  last_modified: string;
  content_type: string;
  is_directory: boolean;
}

export interface StorageStats {
  total_files: number;
  total_size_bytes: number;
  by_storage_type: {
    [key: string]: {
      count: number;
      size_bytes: number;
    };
  };
  by_status: {
    [key: string]: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StorageManagementService {
  private apiUrl = `${environment.apiUrl}/api/v1/admin/storage`;

  constructor(
    private http: HttpClient,
    private adminAuthService: AdminAuthService
  ) {}

  /**
   * Get files from storage with pagination and filtering
   */
  getFiles(
    storageType: 'google-drive' | 'hetzner' | 'all',
    page: number = 1,
    pageSize: number = 20,
    searchTerm: string = ''
  ): Observable<{ files: FileInfo[]; total: number; page: number; limit: number; total_pages: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', pageSize.toString());

    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    // Use the correct endpoint based on storage type
    const endpoint = storageType === 'all' ? 
      `${this.apiUrl}/files/google_drive` : // Default to google_drive for now
      `${this.apiUrl}/files/${storageType === 'google-drive' ? 'google_drive' : 'hetzner'}`;

    return this.http.get<{ files: FileInfo[]; total: number; page: number; limit: number; total_pages: number }>(
      endpoint,
      { 
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): Observable<StorageStats> {
    return this.http.get<StorageStats>(`${this.apiUrl}/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get authentication headers for admin requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuthService.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token available');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Delete a file from storage
   */
  deleteFile(fileId: string, storageType: 'google-drive' | 'hetzner'): Observable<{ success: boolean; message: string }> {
    const storageTypeParam = storageType === 'google-drive' ? 'google_drive' : 'hetzner';
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/files/${storageTypeParam}/${fileId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Sync file status with storage providers
   */
  syncFileStatus(fileId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/storage/sync/${fileId}`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get file details by ID
   */
  getFileDetails(fileId: string): Observable<FileInfo> {
    return this.http.get<FileInfo>(`${this.apiUrl}/files/${fileId}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Format file size to human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on file type
   */
  getFileIcon(fileType: string): string {
    const type = fileType.toLowerCase();
    
    if (type.includes('image/')) return 'fa-file-image';
    if (type.includes('video/')) return 'fa-file-video';
    if (type.includes('audio/')) return 'fa-file-audio';
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z') || type.includes('tar') || type.includes('gz')) {
      return 'fa-file-archive';
    }
    if (type.includes('word') || type.includes('document')) return 'fa-file-word';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'fa-file-excel';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'fa-file-powerpoint';
    if (type.includes('text/')) return 'fa-file-alt';
    
    return 'fa-file';
  }
}
