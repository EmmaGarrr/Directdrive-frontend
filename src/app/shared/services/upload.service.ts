// // // In file: Frontend/src/app/services/upload.service.ts

// // import { HttpClient } from '@angular/common/http';
// // import { Injectable } from '@angular/core';
// // import { Observable, Observer, throwError } from 'rxjs';
// // import { catchError, switchMap } from 'rxjs/operators';
// // import { environment } from '../../../environments/environment';

// // export interface UploadEvent {
// //   type: 'progress' | 'success' | 'error';
// //   value: any;
// // }

// // interface InitiateUploadResponse {
// //   file_id: string;
// //   gdrive_upload_url: string;
// // }

// // @Injectable({
// //   providedIn: 'root'
// // })
// // export class UploadService {
// //   private apiUrl = environment.apiUrl;
// //   private wsUrl = environment.wsUrl;

// //   constructor(private http: HttpClient) { }

// //   public upload(file: File): Observable<UploadEvent> {
// //     const fileInfo = {
// //       filename: file.name,
// //       size: file.size,
// //       content_type: file.type || 'application/octet-stream'
// //     };

// //     return this.initiateUpload(fileInfo).pipe(
// //       switchMap(response => {
// //         return new Observable((observer: Observer<UploadEvent>) => {
// //           const fileId = response.file_id;
// //           const gdriveUploadUrl = response.gdrive_upload_url;
// //           const encodedGdriveUrl = encodeURIComponent(gdriveUploadUrl);
// //           const finalWsUrl = `${this.wsUrl}/upload/${fileId}/${encodedGdriveUrl}`;
          
// //           console.log(`[Uploader] Connecting to WebSocket: ${finalWsUrl}`);
// //           const ws = new WebSocket(finalWsUrl);
          
// //           ws.onopen = () => {
// //             console.log(`[Uploader WS] Connection opened for ${fileId}. Starting file stream.`);
// //             this.sliceAndSend(file, ws);
// //           };

// //           ws.onmessage = (event) => {
// //             try {
// //               const message = JSON.parse(event.data);
// //               if (message.type === 'progress' || message.type === 'success' || message.type === 'error') {
// //                  observer.next(message as UploadEvent);
// //               }
// //             } catch (e) {
// //               console.error('[Uploader WS] Failed to parse message from server:', event.data);
// //             }
// //           };

// //           ws.onerror = (error) => {
// //             console.error('[Uploader WS] Error:', error);
// //             observer.error({ type: 'error', value: 'Connection to server failed.' });
// //           };

// //           ws.onclose = (event) => {
// //             // --- THIS IS THE FIX ---
// //             // We simply check if the closure was 'unclean'. If so, we try to send an error.
// //             // RxJS's observer is smart enough to ignore this call if it's already closed.
// //             if (!event.wasClean) {
// //                 observer.error({ type: 'error', value: 'Lost connection to server during upload.' });
// //             } else {
// //                 // A clean closure means the server finished its sequence (success/error).
// //                 // It's safe to call complete() even if error() was already called.
// //                 observer.complete();
// //             }
// //           };

// //           return () => {
// //             if (ws.readyState === WebSocket.OPEN) {
// //               ws.close();
// //             }
// //           };
// //         });
// //       }),
// //       catchError(err => {
// //         console.error('HTTP Initiation failed', err);
// //         const errorMsg = err.error?.detail || 'Could not initiate upload with the server.';
// //         return throwError(() => ({ type: 'error', value: errorMsg }));
// //       })
// //     );
// //   }

// //   private initiateUpload(fileInfo: { filename: string; size: number; content_type: string; }): Observable<InitiateUploadResponse> {
// //     return this.http.post<InitiateUploadResponse>(`${this.apiUrl}/api/v1/upload/initiate`, fileInfo);
// //   }

// //   private sliceAndSend(file: File, ws: WebSocket, start: number = 0): void {
// //     const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

// //     if (start >= file.size) {
// //       ws.send('DONE');
// //       return;
// //     }

// //     const end = Math.min(start + CHUNK_SIZE, file.size);
// //     const chunk = file.slice(start, end);

// //     const reader = new FileReader();
// //     reader.onload = (e) => {
// //       if (ws.readyState === WebSocket.OPEN) {
// //         ws.send(e.target?.result as ArrayBuffer);
// //         this.sliceAndSend(file, ws, end);
// //       }
// //     };
// //     reader.readAsArrayBuffer(chunk);
// //   }
// // }


// // In file: Frontend/src/app/services/upload.service.ts

// import { HttpClient } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { Observable, Observer, throwError } from 'rxjs';
// import { catchError, switchMap } from 'rxjs/operators';
// import { environment } from '../../../environments/environment';

// export interface UploadEvent {
//   type: 'progress' | 'success' | 'error';
//   value: any;
// }

// interface InitiateUploadResponse {
//   file_id: string;
//   gdrive_upload_url: string;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class UploadService {
//   private apiUrl = environment.apiUrl;
//   private wsUrl = environment.wsUrl;

//   constructor(private http: HttpClient) { }

//   public upload(file: File): Observable<UploadEvent> {
//     const fileInfo = {
//       filename: file.name,
//       size: file.size,
//       content_type: file.type || 'application/octet-stream'
//     };

//     return this.initiateUpload(fileInfo).pipe(
//       switchMap(response => {
//         return new Observable((observer: Observer<UploadEvent>) => {
//           const fileId = response.file_id;
//           const gdriveUploadUrl = response.gdrive_upload_url;

//           // --- THIS IS THE FIX: DOUBLE URL ENCODING ---
//           // We encode it once to handle special chars like '&' and '?'.
//           // We encode it a SECOND time so that the server's single-pass
//           // decoder still leaves a valid, single encoded string for the router.
//           const finalEncodedGdriveUrl = encodeURIComponent(encodeURIComponent(gdriveUploadUrl));

//           const finalWsUrl = `${this.wsUrl}/upload/${fileId}/${finalEncodedGdriveUrl}`;
          
//           console.log(`[Uploader] Connecting to WebSocket: ${finalWsUrl}`);
//           const ws = new WebSocket(finalWsUrl);
          
//           ws.onopen = () => {
//             console.log(`[Uploader WS] Connection opened for ${fileId}. Starting file stream.`);
//             this.sliceAndSend(file, ws);
//           };

//           ws.onmessage = (event) => {
//             try {
//               const message = JSON.parse(event.data);
//               if (message.type === 'progress' || message.type === 'success' || message.type === 'error') {
//                  observer.next(message as UploadEvent);
//               }
//             } catch (e) {
//               console.error('[Uploader WS] Failed to parse message from server:', event.data);
//             }
//           };

//           ws.onerror = (error) => {
//             console.error('[Uploader WS] Error:', error);
//             observer.error({ type: 'error', value: 'Connection to server failed.' });
//           };

//           ws.onclose = (event) => {
//             if (!event.wasClean) {
//                 observer.error({ type: 'error', value: 'Lost connection to server during upload.' });
//             } else {
//                 observer.complete();
//             }
//           };

//           return () => {
//             if (ws.readyState === WebSocket.OPEN) {
//               ws.close();
//             }
//           };
//         });
//       }),
//       catchError(err => {
//         console.error('HTTP Initiation failed', err);
//         const errorMsg = err.error?.detail || 'Could not initiate upload with the server.';
//         return throwError(() => ({ type: 'error', value: errorMsg }));
//       })
//     );
//   }

//   private initiateUpload(fileInfo: { filename: string; size: number; content_type: string; }): Observable<InitiateUploadResponse> {
//     return this.http.post<InitiateUploadResponse>(`${this.apiUrl}/api/v1/upload/initiate`, fileInfo);
//   }

//   private sliceAndSend(file: File, ws: WebSocket, start: number = 0): void {
//     const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

//     if (start >= file.size) {
//       ws.send('DONE');
//       return;
//     }

//     const end = Math.min(start + CHUNK_SIZE, file.size);
//     const chunk = file.slice(start, end);

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       if (ws.readyState === WebSocket.OPEN) {
//         ws.send(e.target?.result as ArrayBuffer);
//         this.sliceAndSend(file, ws, end);
//       }
//     };
//     reader.readAsArrayBuffer(chunk);
//   }
// }


// In file: Frontend/src/app/services/upload.service.ts

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Observer, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface UploadEvent {
  type: 'progress' | 'success' | 'error';
  value: any;
}

interface InitiateUploadResponse {
  file_id: string;
  gdrive_upload_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = environment.apiUrl;
  private wsUrl = environment.wsUrl;
  private currentWebSocket?: WebSocket;

  constructor(private http: HttpClient) { }

  public upload(file: File): Observable<UploadEvent> {
    const fileInfo = {
      filename: file.name,
      size: file.size,
      content_type: file.type || 'application/octet-stream'
    };

    return this.initiateUpload(fileInfo).pipe(
      switchMap(response => {
        return new Observable((observer: Observer<UploadEvent>) => {
          const fileId = response.file_id;
          const gdriveUploadUrl = response.gdrive_upload_url;

          // --- THIS IS THE DEFINITIVE FIX (FRONTEND) ---
          // We construct a URL with a query parameter.
          // We use encodeURIComponent ONCE to make the URL safe as a value.
          const finalWsUrl = `${this.wsUrl}/upload/${fileId}?gdrive_url=${encodeURIComponent(gdriveUploadUrl)}`;
          
          console.log(`[Uploader] Connecting to WebSocket: ${finalWsUrl}`);
          const ws = new WebSocket(finalWsUrl);
          this.currentWebSocket = ws; // Store reference for cancellation
          
          ws.onopen = () => {
            console.log(`[Uploader WS] Connection opened for ${fileId}. Starting file stream.`);
            this.sliceAndSend(file, ws);
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message.type === 'progress' || message.type === 'success' || message.type === 'error') {
                 observer.next(message as UploadEvent);
              }
            } catch (e) {
              console.error('[Uploader WS] Failed to parse message from server:', event.data);
            }
          };

          ws.onerror = (error) => {
            console.error('[Uploader WS] Error:', error);
            this.currentWebSocket = undefined;
            observer.error({ type: 'error', value: 'Connection to server failed.' });
          };

          ws.onclose = (event) => {
            this.currentWebSocket = undefined;
            if (!event.wasClean) {
                observer.error({ type: 'error', value: 'Lost connection to server during upload.' });
            } else {
                observer.complete();
            }
          };

          return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
              ws.close();
            }
            this.currentWebSocket = undefined;
          };
        });
      }),
      catchError(error => {
        console.error('[Uploader] Upload failed:', error);
        this.currentWebSocket = undefined;
        return throwError(() => ({ type: 'error', value: 'Upload failed. Please try again.' }));
      })
    );
  }

  /**
   * Cancel current upload by closing WebSocket connection
   */
  cancelUpload(): boolean {
    if (this.currentWebSocket && 
        (this.currentWebSocket.readyState === WebSocket.OPEN || 
         this.currentWebSocket.readyState === WebSocket.CONNECTING)) {
      console.log('[Uploader] Cancelling upload - closing WebSocket');
      this.currentWebSocket.close();
      this.currentWebSocket = undefined;
      return true;
    }
    return false;
  }

  private initiateUpload(fileInfo: { filename: string; size: number; content_type: string; }): Observable<InitiateUploadResponse> {
    return this.http.post<InitiateUploadResponse>(`${this.apiUrl}/api/v1/upload/initiate`, fileInfo);
  }

  private sliceAndSend(file: File, ws: WebSocket, start: number = 0): void {
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

    if (start >= file.size) {
      ws.send('DONE');
      return;
    }

    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(e.target?.result as ArrayBuffer);
        this.sliceAndSend(file, ws, end);
      }
    };
    reader.readAsArrayBuffer(chunk);
  }
}