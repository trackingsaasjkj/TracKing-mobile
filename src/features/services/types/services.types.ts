export type ServiceStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED';

export interface Service {
  id: string;
  status: ServiceStatus;
  origin_address: string;
  destination_address: string;
  destination_name: string;
  package_details: string;
  payment_method: string;
  total_price: number;
  delivery_price: number;
  product_price: number;
  notes_observations?: string;
  courier_id?: string;
}
