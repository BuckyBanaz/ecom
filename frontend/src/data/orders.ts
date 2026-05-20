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

const makeOrder = (i: number): Order => {
  const p1 = products[i % products.length];
  const p2 = products[(i + 3) % products.length];
  const qty1 = 1 + (i % 3);
  const qty2 = i % 2 === 0 ? 1 : 0;
  const items: OrderItem[] = [
    { productId: p1.id, productName: p1.name, productImage: p1.image, quantity: qty1, price: p1.price, variant: p1.color },
    ...(qty2 ? [{ productId: p2.id, productName: p2.name, productImage: p2.image, quantity: 1, price: p2.price, variant: p2.color }] : []),
  ];
  const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const shipping = subtotal > 75 ? 0 : 5.95;
  const statuses: OrderStatus[] = ["delivered", "shipped", "processing", "pending", "cancelled"];
  const names = ["Sophie V.", "Mark D.", "Anna J.", "Jan K.", "Lisa M.", "Tom B."];
  const d = new Date(2025, 3, 1 + i);
  return {
    id: `ord-${i}`,
    orderNumber: `LG-${10000 + i}`,
    userId: `user-${i % 3}`,
    customerName: names[i % names.length],
    customerEmail: `${names[i % names.length].split(" ")[0].toLowerCase()}@example.com`,
    items,
    subtotal: +subtotal.toFixed(2),
    shipping,
    total: +(subtotal + shipping).toFixed(2),
    status: statuses[i % statuses.length],
    paymentMethod: ["iDEAL", "Credit Card", "PayPal"][i % 3],
    shippingAddress: `${100 + i} Main St, Amsterdam, NL`,
    createdAt: d.toISOString(),
    updatedAt: new Date(d.getTime() + 86400000).toISOString(),
  };
};

export const orders: Order[] = Array.from({ length: 15 }, (_, i) => makeOrder(i));

export const findOrder = (id: string) => orders.find((o) => o.id === id || o.orderNumber === id);
export const ordersByUser = (userId: string) => orders.filter((o) => o.userId === userId);