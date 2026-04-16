export type ServiceStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'UNPAID';

export interface Service {
  id: string;
  status: ServiceStatus;
  origin_address: string;
  destination_address: string;
  destination_name: string;
  package_details: string;
  payment_method: PaymentMethod;
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
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
