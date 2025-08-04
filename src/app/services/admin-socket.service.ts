// File: src/app/services/admin-socket.service.ts
import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminSocketService {
  private socket$: WebSocketSubject<any> | null = null;
  public messages$ = new Subject<any>();
  public connectionStatus$ = new BehaviorSubject<boolean>(false);

  constructor() { }

  public connect(token: string): void {
    if (!this.socket$ || this.socket$.closed) {
      // Construct proper admin WebSocket URL
      const baseWsUrl = environment.apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      const wsUrl = `${baseWsUrl}/ws_admin?token=${token}`;
      console.log('Connecting to admin WebSocket:', wsUrl);
      this.socket$ = webSocket(wsUrl);

      this.socket$.subscribe(
        (msg) => {
          console.log('Admin WebSocket message received:', msg);
          this.messages$.next(msg);
          this.connectionStatus$.next(true);
        },
        (err) => {
          console.error('Admin WebSocket error:', err);
          this.connectionStatus$.next(false);
          // Don't auto-retry to prevent loops, let the component handle it
        },
        () => {
          console.log('Admin WebSocket connection closed');
          this.connectionStatus$.next(false);
        }
      );
    }
  }

  public disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
      this.connectionStatus$.next(false);
    }
  }

  public isConnected(): boolean {
    return this.socket$ !== null && !this.socket$.closed;
  }
}