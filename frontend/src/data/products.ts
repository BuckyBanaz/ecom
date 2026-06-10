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
