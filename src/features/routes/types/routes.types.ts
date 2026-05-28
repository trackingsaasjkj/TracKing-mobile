export type RouteStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type RouteType = 'DISTRIBUTION' | 'COLLECTION'
export type RouteStopType = 'PICKUP' | 'DELIVERY'
export type RouteStopStatus = 'PENDING' | 'COMPLETED'

export interface Route {
  id: string
  company_id: string
  courier_id?: string
  route_type: RouteType
  status: RouteStatus
  origin_address?: string
  origin_lat?: number
  origin_lng?: number
  destination_address?: string
  destination_lat?: number
  destination_lng?: number
  total_stops: number
  estimated_distance: number
  estimated_time_minutes: number
  delivery_price?: number
  total_price?: number
  created_at: string
  started_at?: string
  completed_at?: string
  stops: RouteStop[]
  optimization?: RouteOptimization
}

export interface RouteStop {
  id: string
  sequence_order: number
  service_id: string
  address: string
  lat: number
  lng: number
  stop_type: RouteStopType
  status: RouteStopStatus
  arrival_time?: string
  completion_time?: string
  notes?: string
}

export interface RouteOptimization {
  id: string
  route_id: string
  total_distance_km: number
  total_duration_minutes: number
  optimization_algorithm: string
}

export interface CompleteStopPayload {
  latitude: number
  longitude: number
  photo_url?: string
  notes?: string
}
