import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

/**
 * Single Socket.IO connection. Features subscribe to named events via
 * `on<T>(event)` returning an Observable — components never touch the socket
 * directly (SocketService → feature service → component → UI).
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private auth = inject(AuthService);
  private socket?: Socket;

  connect() {
    if (this.socket?.connected) return;
    this.socket = io(environment.socketUrl, {
      auth: { token: this.auth.token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  on<T = any>(event: string): Observable<T> {
    return new Observable<T>((sub) => {
      if (!this.socket) this.connect();
      const handler = (payload: T) => sub.next(payload);
      this.socket?.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }
}
