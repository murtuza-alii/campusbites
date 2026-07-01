export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: number; // 0 or 1 in SQLite
  image?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  student_name: string;
  student_roll: string;
  items: string; // JSON string in DB, parsed in repository/service
  total_price: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
  pickup_code: string;
  created_at: string;
}

export interface ParsedOrder extends Omit<Order, 'items'> {
  items: OrderItem[];
}
