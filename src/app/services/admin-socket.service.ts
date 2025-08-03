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
      // Use wss:// for your secure domain
      // const wsUrl = `wss://api.mfcnextgen.com/ws_admin?token=${token}`;
      const wsUrl = `${environment.wsUrl}/../ws_admin?token=${token}`; 
      this.socket$ = webSocket(wsUrl);

      this.socket$.subscribe(
        (msg) => {
          this.messages$.next(msg);
          this.connectionStatus$.next(true);
        },
        (err) => {
          console.error('Admin WebSocket error:', err);
          this.connectionStatus$.next(false);
        },
        () => {
          console.warn('Admin WebSocket connection closed');
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
}