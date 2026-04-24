/**
 * Tests for wsClient backoff logic and reconnection behavior.
 * socket.io-client is mocked to avoid real network connections.
 */

const mockRemoveAllListeners = jest.fn();
const mockDisconnect = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();

const mockSocket = {
  connected: false,
  on: mockOn,
  off: mockOff,
  emit: jest.fn(),
  disconnect: mockDisconnect,
  removeAllListeners: mockRemoveAllListeners,
};

const mockIo = jest.fn(() => mockSocket);

jest.mock('socket.io-client', () => ({
  io: mockIo,
}));

describe('wsClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    mockIo.mockClear();
    mockOn.mockClear();
    mockOff.mockClear();
    mockDisconnect.mockClear();
    mockRemoveAllListeners.mockClear();
    mockSocket.connected = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function getWsClient() {
    // Fresh import after resetModules so each test gets a clean singleton
    return require('@/core/api/wsClient').wsClient as import('@/core/api/wsClient').ServiceWebSocketClient;
  }

  it('calls io() with correct namespace and auth token on connect', () => {
    const client = getWsClient();
    client.connect('my-token');
    expect(mockIo).toHaveBeenCalledWith(
      expect.stringContaining('/services'),
      expect.objectContaining({ auth: { token: 'my-token' } }),
    );
  });

  it('does not create a new socket if already connected with same token', () => {
    mockSocket.connected = true;
    const client = getWsClient();
    client.connect('same-token');
    client.connect('same-token');
    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it('registers event listeners on the socket', () => {
    const client = getWsClient();
    client.connect('token');
    const handler = jest.fn();
    client.on('service:updated', handler);
    expect(mockOn).toHaveBeenCalledWith('service:updated', handler);
  });

  it('unsubscribe function removes listener', () => {
    const client = getWsClient();
    client.connect('token');
    const handler = jest.fn();
    const unsub = client.on('service:updated', handler);
    unsub();
    expect(mockOff).toHaveBeenCalledWith('service:updated', handler);
  });

  it('schedules reconnect with first backoff delay (1s) on disconnect', () => {
    const client = getWsClient();
    client.connect('token');

    // Find the disconnect handler registered on the socket
    const disconnectCall = mockOn.mock.calls.find(([event]: [string]) => event === 'disconnect');
    const disconnectHandler = disconnectCall?.[1];
    expect(disconnectHandler).toBeDefined();

    disconnectHandler('transport close');

    // Not yet reconnected
    expect(mockIo).toHaveBeenCalledTimes(1);

    // After 1s backoff, should reconnect
    jest.advanceTimersByTime(1_000);
    expect(mockIo).toHaveBeenCalledTimes(2);
  });

  it('stops reconnecting after max attempts (6)', () => {
    const client = getWsClient();
    client.connect('token');

    const delays = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

    for (const delay of delays) {
      // Each new socket registers new handlers — get the latest disconnect handler
      const disconnectCall = mockOn.mock.calls
        .slice()
        .reverse()
        .find(([event]: [string]) => event === 'disconnect');
      disconnectCall?.[1]('transport close');
      jest.advanceTimersByTime(delay);
    }

    const callsAfterMax = mockIo.mock.calls.length;

    // One more disconnect — should NOT trigger another reconnect
    const disconnectCall = mockOn.mock.calls
      .slice()
      .reverse()
      .find(([event]: [string]) => event === 'disconnect');
    disconnectCall?.[1]('transport close');
    jest.advanceTimersByTime(60_000);

    expect(mockIo.mock.calls.length).toBe(callsAfterMax);
  });

  it('does not reconnect after manual disconnect', () => {
    const client = getWsClient();
    client.connect('token');
    client.disconnect();

    const disconnectCall = mockOn.mock.calls.find(([event]: [string]) => event === 'disconnect');
    disconnectCall?.[1]('io client disconnect');

    jest.advanceTimersByTime(30_000);
    // io called once for initial connect, not again after manual disconnect
    expect(mockIo).toHaveBeenCalledTimes(1);
  });
});
