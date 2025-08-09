// File: src/app/services/admin-socket.service.ts
import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, BehaviorSubject, timer } from 'rxjs';
import { retry, retryWhen, delay, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminSocketService {
  private socket$: WebSocketSubject<any> | null = null;
  public messages$ = new Subject<any>();
  public connectionStatus$ = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private token: string = '';

  constructor() { }

  public connect(token: string): void {
    this.token = token;
    
    if (!this.socket$ || this.socket$.closed) {
      try {
        // Construct proper admin WebSocket URL
        const baseWsUrl = environment.apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${baseWsUrl}/ws_admin?token=${token}`;
        
        this.socket$ = webSocket({
          url: wsUrl,
          openObserver: {
            next: () => {
              console.log('Admin WebSocket connected successfully');
              this.connectionStatus$.next(true);
              this.reconnectAttempts = 0;
            }
          },
          closeObserver: {
            next: () => {
              console.log('Admin WebSocket connection closed');
              this.connectionStatus$.next(false);
              this.attemptReconnect();
            }
          }
        });

        this.socket$.subscribe(
          (msg) => {
            this.messages$.next(msg);
          },
          (err) => {
            console.error('Admin WebSocket error:', err);
            this.connectionStatus$.next(false);
            this.attemptReconnect();
          }
        );
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.connectionStatus$.next(false);
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++;
      console.log(`Attempting WebSocket reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      timer(2000 * this.reconnectAttempts).subscribe(() => {
        this.socket$ = null;
        this.connect(this.token);
      });
    } else {
      console.warn('Max WebSocket reconnection attempts reached');
    }
  }

  public disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
      this.connectionStatus$.next(false);
    }
  }

  public isConnected(): boolean {
    return this.socket$ !== null && !this.socket$.closed;
  }

  public resetReconnection(): void {
    this.reconnectAttempts = 0;
  }
}