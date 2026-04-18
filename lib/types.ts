// =============================================================================
// Bhaven ERP — Shared Type Definitions
// =============================================================================

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
export interface User {
  user_id: number;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'worker';
  company_name?: string;
  contact_info?: string;
  is_active: boolean;
  is_approved: boolean;
  is_super: boolean;
  created_at: string;
  last_login?: string;
  deleted_at?: string;
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------
export interface Equipment {
  equipment_id: number;
  name: string;
  equipment_code: string;
  type: 'small' | 'medium' | 'large' | string;
  min_capacity: number;
  max_capacity: number;
  divisions: number;
  status: 'NORMAL' | 'MAINTENANCE' | 'BROKEN';
  registered_date: string;
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
export interface Product {
  product_id: number;
  product_name: string;
  product_type: 'extract' | 'can';
  yield_rate: number;
  container_size?: string;
  user_id: number;
}

// ---------------------------------------------------------------------------
// Reservation
// ---------------------------------------------------------------------------
export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Reservation {
  reservation_id: number;
  user_id: number;
  product_id: number;
  equipment_id: number;
  kg_amount: number;
  expected_output_liter?: number;
  status: ReservationStatus;
  scheduled_date: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  slot_index?: number;
  // Joined fields
  users?: { name: string; company_name?: string; contact_info?: string };
  equipment?: { name: string; type?: string };
  products?: {
    product_name: string;
    product_type?: string;
    container_size?: string;
    yield_rate?: number;
  };
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------
export interface Notification {
  notification_id: number;
  user_id: number;
  reservation_id?: number;
  title: string;
  message: string;
  noti_type: string;
  is_read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Inquiry
// ---------------------------------------------------------------------------
export type InquiryStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface Inquiry {
  inquiry_id: number;
  user_id: number;
  product_name?: string;
  product_type?: string;
  kg_amount?: number;
  desired_date?: string;
  message: string;
  status: InquiryStatus;
  admin_response?: string;
  created_at: string;
  users?: { name: string; company_name?: string; contact_info?: string };
}

// ---------------------------------------------------------------------------
// Holiday
// ---------------------------------------------------------------------------
export interface Holiday {
  holiday_id: number;
  holiday_date: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Shipment
// ---------------------------------------------------------------------------
export interface Shipment {
  shipment_id: number;
  reservation_id: number;
  carrier: string;
  tracking_number: string;
  shipped_by: number;
  shipped_at: string;
}

// ---------------------------------------------------------------------------
// API Response wrapper
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  status: 'success';
  data: T;
}
