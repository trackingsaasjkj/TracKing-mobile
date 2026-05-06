/**
 * Tests for wsClient status tracking (onStatusChange, _setStatus, status getter).
 * Covers the new WsConnectionStatus feature added to ServiceWebSocketClient.
 */

const mockSend = jest.fn();
const mockClose = jest.fn();
let mockWsInstance: any = null;

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;

  send = mockSend;
  close = mockClose;

  constructor(public url: string) {
    mockWsInstance = this;
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateError() {
    this.onerror?.();
  }

  simulateClose(code = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code });
  }
}

(global as any).WebSocket = MockWebSocket;

describe('wsClient — status tracking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    mockSend.mockClear();
    mockClose.mockClear();
    mockWsInstance = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function getClient() {
    return require('@/core/api/wsClient').wsClient;
  }

  // ── Initial state ──────────────────────────────────────────────────────────

  it('initial status is disconnected', () => {
    const client = getClient();
    expect(client.status).toBe('disconnected');
  });

  // ── Connected ──────────────────────────────────────────────────────────────

  it('status becomes connected after SIO namespace connect packet', () => {
    const client = getClient();
    client.connect('token');

    // EIO open → SIO connect
    mockWsInstance.simulateMessage('0{"sid":"abc"}');
    // SIO namespace connect ack (40/services,{...})
    mockWsInstance.simulateMessage('40/services,{"sid":"abc"}');

    expect(client.status).toBe('connected');
  });

  it('onStatusChange fires with connected when namespace connects', () => {
    const client = getClient();
    const handler = jest.fn();
    client.onStatusChange(handler);

    client.connect('token');
    mockWsInstance.simulateMessage('0{}');
    mockWsInstance.simulateMessage('40/services,{}');

    expect(handler).toHaveBeenCalledWith('connected');
  });

  // ── Reconnecting ───────────────────────────────────────────────────────────

  it('status becomes reconnecting on abnormal close', () => {
    const client = getClient();
    const handler = jest.fn();
    client.onStatusChange(handler);

    client.connect('token');
    mockWsInstance.simulateClose(1006);

    expect(handler).toHaveBeenCalledWith('reconnecting');
    expect(client.status).toBe('reconnecting');
  });

  it('status becomes reconnecting on error', () => {
    const client = getClient();
    const handler = jest.fn();
    client.onStatusChange(handler);

    client.connect('token');
    mockWsInstance.simulateError();

    expect(handler).toHaveBeenCalledWith('reconnecting');
  });

  // ── Disconnected ───────────────────────────────────────────────────────────

  it('status becomes disconnected after manual disconnect', () => {
    const client = getClient();

    // First connect and reach connected state
    client.connect('token');
    mockWsInstance.simulateMessage('0{}');
    mockWsInstance.simulateMessage('40/services,{}');
    expect(client.status).toBe('connected');

    const handler = jest.fn();
    client.onStatusChange(handler);

    client.disconnect();

    expect(handler).toHaveBeenCalledWith('disconnected');
    expect(client.status).toBe('disconnected');
  });

  it('status becomes disconnected after max reconnect attempts', () => {
    const client = getClient();
    const handler = jest.fn();
    client.onStatusChange(handler);

    client.connect('token');

    const delays = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
    for (const delay of delays) {
      mockWsInstance.simulateClose(1006);
      jest.advanceTimersByTime(delay);
    }

    // After exhausting all retries, one more close should set disconnected
    mockWsInstance.simulateClose(1006);

    const calls = handler.mock.calls.map(([s]) => s);
    expect(calls[calls.length - 1]).toBe('disconnected');
  });

  // ── onStatusChange unsubscribe ─────────────────────────────────────────────

  it('unsubscribed handler is not called on status change', () => {
    const client = getClient();
    const handler = jest.fn();
    const unsub = client.onStatusChange(handler);
    unsub();

    client.connect('token');
    mockWsInstance.simulateClose(1006);

    expect(handler).not.toHaveBeenCalled();
  });

  // ── No duplicate events ────────────────────────────────────────────────────

  it('does not fire handler if status does not change', () => {
    const client = getClient();
    // Connect and reach connected state
    client.connect('token');
    mockWsInstance.simulateMessage('0{}');
    mockWsInstance.simulateMessage('40/services,{}');

    const handler = jest.fn();
    client.onStatusChange(handler);

    // Simulate another SIO connect (same status) — should not re-fire
    mockWsInstance.simulateMessage('40/services,{}');

    expect(handler).not.toHaveBeenCalled();
  });

  // ── Multiple listeners ─────────────────────────────────────────────────────

  it('multiple listeners all receive status changes', () => {
    const client = getClient();
    const h1 = jest.fn();
    const h2 = jest.fn();
    client.onStatusChange(h1);
    client.onStatusChange(h2);

    client.connect('token');
    mockWsInstance.simulateMessage('0{}');
    mockWsInstance.simulateMessage('40/services,{}');

    expect(h1).toHaveBeenCalledWith('connected');
    expect(h2).toHaveBeenCalledWith('connected');
  });
});
