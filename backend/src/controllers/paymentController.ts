import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "../middlewares/errorMiddleware";
import { notificationTriggerService } from "../services/notificationTriggerService";

// Retrieve public payment configuration (Publishable key)
export const getPaymentConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || ""
    });
  } catch (error) {
    next(error);
  }
};

// Create a payment intent using Stripe REST API directly (no dependency required)
export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, currency = "eur" } = req.body;

    if (!amount || amount <= 0) {
      return next(new AppError("Invalid payment amount", 400));
    }

    const stripeSecretKey = env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return next(new AppError("Stripe payment gateway is not configured on the server", 500));
    }

    // Convert amount to cents (Stripe expects integers)
    const amountInCents = Math.round(amount * 100);

    // Form data encoding
    const bodyParams = new URLSearchParams();
    bodyParams.append("amount", String(amountInCents));
    bodyParams.append("currency", currency.toLowerCase());
    
    // Support card and ideal bank payments as requested in payment setting panel
    bodyParams.append("payment_method_types[]", "card");
    bodyParams.append("payment_method_types[]", "ideal");

    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error("Stripe API Error:", data);
      return next(new AppError(data?.error?.message || "Stripe API processing failed", response.status));
    }

    res.status(200).json({
      success: true,
      clientSecret: data.client_secret,
      paymentIntentId: data.id
    });
  } catch (error) {
    next(error);
  }
};

// Stripe Webhook Handler
import Stripe from "stripe";
import { prisma } from "../config/db";

const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10"
});

export const handleStripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return res.status(400).send("Webhook Error: Missing secret");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const paymentIntentId = session.payment_intent as string;

        if (orderId) {
          console.log(`[Webhook] Marking order ${orderId} as paid`);
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: "paid",
              paymentStatus: "paid",
              stripePaymentId: paymentIntentId,
            }
          });
          // Trigger Order Confirmed notification
          await notificationTriggerService.triggerOrderNotification(orderId, "order_confirmed").catch(err => {
            console.error("[Webhook] Failed to trigger order confirmation notification:", err.message);
          });
        }
        break;
      }
      
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.warn(`[Webhook] Payment Failed: ${paymentIntent.id}`);
        
        // Find order by matching payment intent or session metadata
        const order = await prisma.order.findFirst({
          where: {
            OR: [
              { stripePaymentId: paymentIntent.id },
              { stripeSessionId: paymentIntent.metadata?.orderId }
            ]
          }
        });

        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "payment_failed",
              paymentStatus: "failed"
            }
          });
          // Trigger Payment Failed notification
          await notificationTriggerService.triggerOrderNotification(order.id, "payment_failed").catch(err => {
            console.error("[Webhook] Failed to trigger payment failure notification:", err.message);
          });
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Internal Server Error");
  }
};
