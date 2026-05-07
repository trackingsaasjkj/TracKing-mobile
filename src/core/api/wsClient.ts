/**
 * Native WebSocket client for React Native — no external dependencies.
 *
 * Connects to the NestJS Socket.io gateway using the Engine.IO polling-upgrade
 * handshake, then switches to WebSocket transport. This avoids importing
 * socket.io-client which has Node.js dependencies incompatible with Metro.
 *
 * Protocol:
 *   1. GET /services/?EIO=4&transport=polling  → get sid
 *   2. POST /services/?EIO=4&transport=polling&sid=<sid>  → send auth
 *   3. GET /services/?EIO=4&transport=websocket&sid=<sid>  → upgrade to WS
 *   4. Exchange Socket.io packets over WS
 */

const WS_BASE_URL = 'wss://tracking-backend-g4mq.onrender.com';
const HTTP_BASE_URL = 'https://tracking-backend-g4mq.onrender.com';
const NAMESPACE = '/services';

/** Backoff delays in ms: 1s, 2s, 4s, 8s, 16s, 30s */
const RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS.length;

// Socket.io / Engine.IO packet types
const EIO_OPEN = '0';
const EIO_PING = '2';
const EIO_PONG = '3';
const EIO_MESSAGE = '4';
const SIO_CONNECT = '0';
const SIO_EVENT = '2';

type EventHandler = (...args: unknown[]) => void;
type StatusHandler = (status: WsConnectionStatus) => void;

export type WsConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

class ServiceWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentToken: string | null = null;
  private isManualDisconnect = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private connectionStatus: WsConnectionStatus = 'disconnected';

  /** Persistent listeners — replayed on every reconnect */
  private readonly listeners = new Map<string, Set<EventHandler>>();
  /** Status change listeners */
  private readonly statusListeners = new Set<StatusHandler>();

  connect(token: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentToken === token) return;
    this.currentToken = token;
    this.isManualDisconnect = false;
    this._openSocket(token);
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this._cleanup();
    this.reconnectAttempts = 0;
    this._setStatus('disconnected');
  }

  /** Register an event listener. Returns unsubscribe fn. */
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  /** Register a connection status listener. Returns unsubscribe fn. */
  onStatusChange(handler: StatusHandler): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get status(): WsConnectionStatus {
    return this.connectionStatus;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private _openSocket(token: string): void {
    this._cleanup();

    // Engine.IO WebSocket URL with auth token as query param
    // Socket.io server reads auth from the handshake query when using WS transport directly
    const url =
      `${WS_BASE_URL}${NAMESPACE}/?EIO=4&transport=websocket` +
      `&token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // Engine.IO expects a namespace connect packet after the EIO open
      // The server sends EIO "0" (open) first, then we send SIO connect
    };

    this.ws.onmessage = (event) => {
      this._handleMessage(event.data as string);
    };

    this.ws.onerror = () => {
      if (!this.isManualDisconnect) this._scheduleReconnect();
    };

    this.ws.onclose = (event) => {
      this._clearPingInterval();
      if (!this.isManualDisconnect && event.code !== 1000) {
        this._scheduleReconnect();
      }
    };
  }

  private _handleMessage(raw: string): void {
    // Engine.IO packet: first char is EIO type, rest is payload
    const eioType = raw[0];
    const payload = raw.slice(1);

    if (eioType === EIO_OPEN) {
      // Server sent open packet — now send Socket.io namespace connect with auth
      this._sendRaw(`${EIO_MESSAGE}${SIO_CONNECT}${NAMESPACE},${JSON.stringify({ token: this.currentToken })}`);
      // Start ping/pong to keep connection alive (Render 60s TCP timeout)
      this._startPingInterval();
      return;
    }

    if (eioType === EIO_PING) {
      this._sendRaw(EIO_PONG);
      return;
    }

    if (eioType !== EIO_MESSAGE) return;

    // Socket.io packet: first char is SIO type
    const sioType = payload[0];
    const sioPayload = payload.slice(1);

    if (sioType === SIO_CONNECT) {
      // Namespace connected — reset reconnect counter
      this.reconnectAttempts = 0;
      this._clearReconnectTimer();
      this._setStatus('connected');
      this._emit('connection:ack', {});
      return;
    }

    if (sioType === SIO_EVENT) {
      try {
        const [eventName, ...args] = JSON.parse(sioPayload) as [string, ...unknown[]];
        this._emit(eventName, ...args);
      } catch {
        // ignore malformed packets
      }
    }
  }

  private _sendRaw(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  private _emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try { handler(...args); } catch { /* ignore handler errors */ }
    });
  }

  private _startPingInterval(): void {
    this._clearPingInterval();
    // Send ping every 25s (below Render's 60s TCP timeout)
    this.pingInterval = setInterval(() => {
      this._sendRaw(EIO_PING);
    }, 25_000);
  }

  private _clearPingInterval(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this._setStatus('disconnected');
      return;
    }
    this._setStatus('reconnecting');
    const delay = RECONNECT_DELAYS[this.reconnectAttempts];
    this.reconnectAttempts += 1;
    this._clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManualDisconnect && this.currentToken) {
        this._openSocket(this.currentToken);
      }
    }, delay);
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private _cleanup(): void {
    this._clearPingInterval();
    this._clearReconnectTimer();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'manual disconnect');
      }
      this.ws = null;
    }
  }

  private _setStatus(status: WsConnectionStatus): void {
    if (this.connectionStatus === status) return;
    this.connectionStatus = status;
    this.statusListeners.forEach((handler) => {
      try { handler(status); } catch { /* ignore */ }
    });
  }
}

/** Singleton — one WebSocket connection per app session */
export const wsClient = new ServiceWebSocketClient();
