import { products } from "./products";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
  variant?: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
};

export const orders: Order[] = [];

export const findOrder = (id: string) => orders.find((o) => o.id === id || o.orderNumber === id);
export const ordersByUser = (userId: string) => orders.filter((o) => o.userId === userId);