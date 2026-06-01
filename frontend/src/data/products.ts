import { categories } from "./categories";

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string; // category slug
  price: number;
  oldPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  color: string;
  material: string;
  style: string;
  fitting: string;
  inStock: boolean;
  description: string;
  specs: Record<string, string>;
  attributes?: Record<string, string[]>; // EAV dynamic attributes list
};

export const products: Product[] = [];

export const featuredProducts: Product[] = [];
export const dealProducts: Product[] = [];

export const findProduct = (slug: string) => products.find((p) => p.slug === slug);
export const productsByCategory = (slug: string) => products.filter((p) => p.category === slug);



export const reviews = [
  { name: "Sophie V.", rating: 5, title: "Beautiful lamp, fast delivery", text: "Ordered late in the evening and it arrived the next morning. The lamp is even nicer in person." },
  { name: "Mark D.", rating: 5, title: "Great service", text: "Helpful customer service when I had a question about the bulb fitting. Recommended!" },
  { name: "Anna J.", rating: 4, title: "Looks lovely", text: "Looks great in the living room. One star less because assembly took a bit of time." },
];