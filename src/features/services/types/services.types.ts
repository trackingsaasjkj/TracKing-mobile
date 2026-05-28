// Mobile: types actualizados para usar paymentMethod como objeto en lugar de enum fijo
export type ServiceStatus = 'PENDING' | 'ASSIGNED' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PAID' | 'UNPAID' | 'REFUNDED';

/** Método de pago como objeto (viene de la tabla payment_method) */
export interface PaymentMethodEntity {
  id: string;
  name: string;
  code: string;
  requires_credit: boolean;
}

export interface RouteStopRef {
  id: string;
  route: {
    id: string;
    total_stops: number;
  };
}

export interface Service {
  id: string;
  status: ServiceStatus;
  origin_address: string;
  destination_address: string;
  destination_name: string;
  /** Phone number of the recipient (person receiving the package) */
  destination_contact_number?: string;
  /** Phone number of the customer who placed the order */
  origin_contact_phone?: string;
  package_details: string;
  /** FK al método de pago (UUID) */
  payment_method_id?: string | null;
  /** Objeto del método de pago (incluido en el SELECT del backend) */
  paymentMethod?: PaymentMethodEntity | null;
  payment_status: PaymentStatus;
  is_settled_courier: boolean;
  is_settled_customer: boolean;
  total_price: number;
  delivery_price: number;
  product_price: number;
  notes_observations?: string;
  courier_id?: string;
  delivery_date?: string | null;
  created_at?: string;
  // Geocoding fields
  origin_lat?: number | null;
  origin_lng?: number | null;
  origin_verified?: boolean;
  destination_lat?: number | null;
  destination_lng?: number | null;
  destination_verified?: boolean;
  // Customer info
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  // Route association (present when service belongs to a multi-stop route)
  routeStop?: RouteStopRef | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
