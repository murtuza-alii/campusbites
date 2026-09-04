export interface MenuItem {
  id: string;
  name: string;
  price: number;
  price_hike?: number;
  category: string;
  is_available: number; // 0 or 1 in DB
  image?: string;
  canteen_id: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  price_hike?: number;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  student_name: string;
  student_roll: string;
  items: string; // JSON string in DB, parsed in repository/service
  total_price: number;
  additional_charges?: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  pickup_code: string;
  created_at: string;
  canteen_id: string;
  building?: string;
  break_timing?: string;
  slot_number?: number;
  cancellation_reason?: string;
}

export interface ParsedOrder extends Omit<Order, 'items'> {
  items: OrderItem[];
  qr_payload?: {
    order_id: string;
    order_number: string;
    canteen_id: string;
    pickup_code: string;
    signature: string;
  };
}
