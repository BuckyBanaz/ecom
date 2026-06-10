import Stripe from "stripe";
import { env } from "../config/env";

/** Read Stripe keys from process.env (admin settings) with env.ts fallback. */
export function getStripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY || "";
}

export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY || env.STRIPE_PUBLISHABLE_KEY || "";
}

export function getStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET || "";
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

let stripeClient: Stripe | null = null;
let stripeClientKey = "";

export function getStripeClient(): Stripe {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error("Stripe is not configured on this server.");
  }
  if (!stripeClient || stripeClientKey !== key) {
    stripeClient = new Stripe(key, { apiVersion: "2024-04-10" });
    stripeClientKey = key;
  }
  return stripeClient;
}

export function resetStripeClient(): void {
  stripeClient = null;
  stripeClientKey = "";
}
