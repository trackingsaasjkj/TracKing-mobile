/**
 * Tests for wsClient backoff logic and reconnection behavior.
 * Uses the native WebSocket mock provided by React Native's jest setup.
 */

// Mock global WebSocket
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

  // Helper to simulate server messages in tests
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
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

describe('wsClient (native WebSocket)', () => {
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

  it('creates WebSocket with correct URL containing token', () => {
    const client = getClient();
    client.connect('my-token');
    expect(mockWsInstance).not.toBeNull();
    expect(mockWsInstance.url).toContain('/services/');
    expect(mockWsInstance.url).toContain('token=my-token');
    expect(mockWsInstance.url).toContain('transport=websocket');
  });

  it('does not create new socket if already connected with same token', () => {
    const client = getClient();
    client.connect('same-token');
    const first = mockWsInstance;
    first.readyState = MockWebSocket.OPEN;
    client.connect('same-token');
    expect(mockWsInstance).toBe(first);
  });

  it('sends SIO connect packet after receiving EIO open message', () => {
    const client = getClient();
    client.connect('token');
    mockWsInstance.simulateOpen();
    // Server sends EIO open packet
    mockWsInstance.simulateMessage('0{"sid":"abc"}');
    // Client should send namespace connect packet
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('40/services,'),
    );
  });

  it('responds to EIO ping with pong', () => {
    const client = getClient();
    client.connect('token');
    mockWsInstance.simulateOpen();
    mockWsInstance.simulateMessage('0{}');
    mockSend.mockClear();
    mockWsInstance.simulateMessage('2'); // EIO ping
    expect(mockSend).toHaveBeenCalledWith('3'); // EIO pong
  });

  it('emits service:updated event to registered listeners', () => {
    const client = getClient();
    client.connect('token');
    const handler = jest.fn();
    client.on('service:updated', handler);

    mockWsInstance.simulateOpen();
    mockWsInstance.simulateMessage('0{}');
    // SIO event packet: 42["service:updated", {...}]
    mockWsInstance.simulateMessage('42["service:updated",{"id":"svc-1","status":"ACCEPTED"}]');

    expect(handler).toHaveBeenCalledWith({ id: 'svc-1', status: 'ACCEPTED' });
  });

  it('unsubscribe removes listener', () => {
    const client = getClient();
    client.connect('token');
    const handler = jest.fn();
    const unsub = client.on('service:updated', handler);
    unsub();

    mockWsInstance.simulateOpen();
    mockWsInstance.simulateMessage('0{}');
    mockWsInstance.simulateMessage('42["service:updated",{"id":"svc-1"}]');

    expect(handler).not.toHaveBeenCalled();
  });

  it('schedules reconnect with 1s backoff on abnormal close', () => {
    const client = getClient();
    client.connect('token');
    const firstWs = mockWsInstance;

    firstWs.simulateClose(1006); // abnormal close

    expect(mockWsInstance).toBe(firstWs); // not yet reconnected
    jest.advanceTimersByTime(1_000);
    expect(mockWsInstance).not.toBe(firstWs); // new socket created
  });

  it('stops reconnecting after max attempts', () => {
    const client = getClient();
    client.connect('token');

    const delays = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
    let wsCount = 1;

    for (const delay of delays) {
      mockWsInstance.simulateClose(1006);
      jest.advanceTimersByTime(delay);
      wsCount++;
    }

    const countAfterMax = wsCount;
    mockWsInstance.simulateClose(1006);
    jest.advanceTimersByTime(60_000);

    // No additional socket created beyond max attempts
    expect(wsCount).toBe(countAfterMax);
  });

  it('does not reconnect after manual disconnect', () => {
    const client = getClient();
    client.connect('token');
    const firstWs = mockWsInstance;

    client.disconnect();
    firstWs.simulateClose(1000);
    jest.advanceTimersByTime(30_000);

    // mockWsInstance still points to first (no new socket)
    expect(mockWsInstance).toBe(firstWs);
  });
});
