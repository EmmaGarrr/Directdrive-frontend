import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  owner: string;
  uploadDate: Date;
  googleDriveStatus: {
    status: 'not_uploaded' | 'uploading' | 'uploaded' | 'error';
    error?: string;
    url?: string;
    lastSync?: Date;
  };
  hetznerStatus: {
    status: 'not_uploaded' | 'uploading' | 'uploaded' | 'error';
    error?: string;
    url?: string;
    lastSync?: Date;
  };
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  googleDrive: {
    totalFiles: number;
    totalSize: number;
    usedPercentage: number;
  };
  hetzner: {
    totalFiles: number;
    totalSize: number;
    usedPercentage: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StorageManagementService {
  private apiUrl = `${environment.apiUrl}/api/v1/admin/storage`;

  constructor(private http: HttpClient) {}

  /**
   * Get files from storage with pagination and filtering
   */
  getFiles(
    storageType: 'google-drive' | 'hetzner' | 'all',
    page: number = 1,
    pageSize: number = 20,
    searchTerm: string = ''
  ): Observable<{ files: FileInfo[]; total: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('search', searchTerm);

    if (storageType !== 'all') {
      params = params.set('storage', storageType);
    }

    return this.http.get<{ files: FileInfo[]; total: number }>(
      `${this.apiUrl}/files`,
      { params }
    );
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): Observable<StorageStats> {
    return this.http.get<StorageStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Delete a file from storage
   */
  deleteFile(fileId: string, storageType: 'google-drive' | 'hetzner'): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/files/${fileId}`,
      { params: { storage: storageType } }
    );
  }

  /**
   * Sync file status with storage providers
   */
  syncFileStatus(fileId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/files/${fileId}/sync`,
      {}
    );
  }

  /**
   * Get file details by ID
   */
  getFileDetails(fileId: string): Observable<FileInfo> {
    return this.http.get<FileInfo>(`${this.apiUrl}/files/${fileId}`);
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
