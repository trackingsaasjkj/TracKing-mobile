import { io, Socket } from 'socket.io-client';

const WS_BASE_URL = 'wss://tracking-backend-tald.onrender.com';
const NAMESPACE = '/services';

/** Backoff delays in ms: 1s, 2s, 4s, 8s, 16s, 30s (capped) */
const RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS.length;

type EventHandler = (...args: unknown[]) => void;

class ServiceWebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null;
  private isManualDisconnect = false;

  /** Listeners registered before connection — replayed on reconnect */
  private readonly pendingListeners = new Map<string, Set<EventHandler>>();

  /** Connects to /services namespace with JWT auth */
  connect(token: string): void {
    if (this.socket?.connected && this.currentToken === token) return;

    this.currentToken = token;
    this.isManualDisconnect = false;
    this._createSocket(token);
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this._clearReconnectTimer();
    this.socket?.disconnect();
    this.socket = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Registers an event listener. Returns an unsubscribe function.
   * Safe to call before connect() — listeners are replayed on reconnect.
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.pendingListeners.has(event)) {
      this.pendingListeners.set(event, new Set());
    }
    this.pendingListeners.get(event)!.add(handler);

    // Attach immediately if socket already exists
    this.socket?.on(event, handler as any);

    return () => {
      this.pendingListeners.get(event)?.delete(handler);
      this.socket?.off(event, handler as any);
    };
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _createSocket(token: string): void {
    // Cleanup previous socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io(`${WS_BASE_URL}${NAMESPACE}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false, // We handle reconnection manually for backoff control
      timeout: 10_000,
    });

    this._attachCoreHandlers();
    this._replayListeners();
  }

  private _attachCoreHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this._clearReconnectTimer();
    });

    this.socket.on('disconnect', (reason) => {
      if (this.isManualDisconnect) return;
      // Attempt reconnect unless server explicitly closed the connection
      if (reason !== 'io server disconnect') {
        this._scheduleReconnect();
      }
    });

    this.socket.on('connect_error', () => {
      if (this.isManualDisconnect) return;
      this._scheduleReconnect();
    });
  }

  private _replayListeners(): void {
    if (!this.socket) return;
    this.pendingListeners.forEach((handlers, event) => {
      handlers.forEach((handler) => this.socket!.on(event, handler as any));
    });
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // Exhausted retries — polling fallback takes over automatically
      return;
    }

    const delay = RECONNECT_DELAYS[this.reconnectAttempts];
    this.reconnectAttempts += 1;

    this._clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManualDisconnect && this.currentToken) {
        this._createSocket(this.currentToken);
      }
    }, delay);
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/** Singleton instance — one WebSocket connection per app session */
export const wsClient = new ServiceWebSocketClient();
