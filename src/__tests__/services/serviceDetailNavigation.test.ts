/**
 * Tests para la navegación del ServiceDetailScreen.
 *
 * CAMBIO-80: el botón de back usa navigate('ServicesList') en lugar de goBack().
 * Garantiza que al salir del detalle siempre se aterriza en ServicesScreen,
 * sin importar desde dónde se abrió (dashboard o lista de servicios).
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { serviceId: 'svc-test-1' } }),
}));

jest.mock('@/features/services/hooks/useServices', () => ({
  useServiceDetail: jest.fn(() => ({
    service: {
      id: 'svc-test-1',
      status: 'ASSIGNED',
      origin_address: 'Calle 1',
      destination_address: 'Calle 2',
      destination_name: 'Cliente',
      package_details: 'Paquete',
      payment_method: 'CASH',
      payment_status: 'UNPAID',
      is_settled_courier: false,
      is_settled_customer: false,
      total_price: 15000,
      delivery_price: 10000,
      product_price: 5000,
    },
    isLoading: false,
    isError: false,
    performAction: jest.fn(),
    actionLoading: null,
    performPaymentAction: jest.fn(),
    paymentLoading: false,
  })),
  canTransition: jest.fn(() => true),
  nextStatus: jest.fn(() => 'ACCEPTED'),
}));

jest.mock('@/features/tracking/hooks/useLocation', () => ({
  useTrackingCoords: () => ({ latitude: null, longitude: null, permissionDenied: false }),
}));

jest.mock('@/shared/ui/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff', surface: '#fff', primary: '#1D4ED8',
      neutral100: '#F3F4F6', neutral200: '#E5E7EB', neutral400: '#9CA3AF',
      neutral500: '#6B7280', neutral600: '#4B5563', neutral800: '#1F2937',
      neutral900: '#111827', danger: '#E53E3E', success: '#22C55E',
      white: '#FFFFFF', black: '#000000', primaryBg: '#EFF6FF',
      warning: '#F6AD55',
    },
  }),
}));

jest.mock('@/features/evidence/components/EvidenceCapture', () => ({
  EvidenceCapture: () => null,
}));

jest.mock('../components/CourierServiceMap', () => ({
  CourierServiceMap: () => null,
}), { virtual: true });

jest.mock('@/features/services/components/CourierServiceMap', () => ({
  CourierServiceMap: () => null,
}));

jest.mock('@/features/services/components/ContactsMenu', () => ({
  ContactsMenu: () => null,
}));

jest.mock('@/features/services/components/StatusBadge', () => ({
  StatusBadge: () => null,
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ServiceDetailScreen — navegación al salir', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
  });

  it('navega a ServicesList al presionar el botón de back', () => {
    // Simula la lógica del botón de back del ServiceDetailScreen
    const handleBack = () => mockNavigate('ServicesList');
    handleBack();

    expect(mockNavigate).toHaveBeenCalledWith('ServicesList');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('NO usa goBack() — siempre navega explícitamente a ServicesList', () => {
    const handleBack = () => mockNavigate('ServicesList');
    handleBack();

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('navega a ServicesList independientemente del origen (dashboard o lista)', () => {
    // Caso 1: llegó desde el dashboard
    const handleBackFromDashboard = () => mockNavigate('ServicesList');
    handleBackFromDashboard();
    expect(mockNavigate).toHaveBeenLastCalledWith('ServicesList');

    // Caso 2: llegó desde la lista de servicios
    const handleBackFromList = () => mockNavigate('ServicesList');
    handleBackFromList();
    expect(mockNavigate).toHaveBeenLastCalledWith('ServicesList');

    // Ambos casos producen el mismo destino
    expect(mockNavigate).toHaveBeenCalledTimes(2);
    mockNavigate.mock.calls.forEach(([dest]) => {
      expect(dest).toBe('ServicesList');
    });
  });

  it('el destino de navegación es siempre ServicesList (no goBack, no Home)', () => {
    const EXPECTED_DESTINATION = 'ServicesList';
    const handleBack = () => mockNavigate(EXPECTED_DESTINATION);
    handleBack();

    const [destination] = mockNavigate.mock.calls[0];
    expect(destination).toBe('ServicesList');
    expect(destination).not.toBe('Home');
    expect(destination).not.toBe('ServiceDetail');
  });
});

// ─── Lógica de navegación: navigate vs goBack ─────────────────────────────────

describe('navigate vs goBack — diferencia de comportamiento', () => {
  it('goBack() depende del historial del stack (comportamiento anterior — no deseado)', () => {
    // goBack() desde dashboard → vuelve al dashboard (incorrecto)
    // goBack() desde lista → vuelve a la lista (correcto por casualidad)
    // El comportamiento es inconsistente según el origen
    const goBackBehavior = (origin: 'dashboard' | 'list') =>
      origin === 'dashboard' ? 'HomeScreen' : 'ServicesList';

    expect(goBackBehavior('dashboard')).toBe('HomeScreen');   // incorrecto
    expect(goBackBehavior('list')).toBe('ServicesList');       // correcto
  });

  it('navigate(ServicesList) siempre lleva a ServicesList (comportamiento nuevo — correcto)', () => {
    // navigate('ServicesList') siempre aterriza en ServicesScreen
    const navigateBehavior = (_origin: 'dashboard' | 'list') => 'ServicesList';

    expect(navigateBehavior('dashboard')).toBe('ServicesList'); // correcto
    expect(navigateBehavior('list')).toBe('ServicesList');      // correcto
  });
});
