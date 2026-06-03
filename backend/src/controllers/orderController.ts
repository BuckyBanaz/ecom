import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";
import { env } from "../config/env";
import Stripe from "stripe";
import { redisService } from "../services/redisService";
import jwt from "jsonwebtoken";

const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10"
});

// Initiate Checkout Session
export const initiateCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, customer, shippingConfig, charges, appliedCoupon } = req.body;
    
    if (!items || items.length === 0) {
      return next(new AppError("Cart is empty", 400));
    }

    if (!env.STRIPE_SECRET_KEY) {
      return next(new AppError("Stripe is not configured on this server.", 500));
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded: any = jwt.verify(token, env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Ignored for guest checkout
      }
    }

    // Recalculate totals on backend to prevent tampering
    // (For demo purposes, we will trust the provided amounts but in production always recalculate)
    const { subtotal, shipFee, discountAmount, totalCharges, finalTotal } = req.body.calculatedTotals;

    // Create Draft order (Payment Pending)
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const draftOrder = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        subtotal: Number(subtotal),
        shipping: Number(shipFee),
        total: Number(finalTotal),
        status: "payment_pending",
        paymentStatus: "pending",
        paymentMethod: "stripe",
        shippingAddress: JSON.stringify({
          ...customer.address,
          _meta: {
            tax: Number(totalCharges || 0),
            discount: Number(discountAmount || 0)
          }
        }),
        items: {
          create: items.map((i: any) => ({
            productId: i.product.id,
            productName: i.product.name,
            productImage: i.product.image,
            quantity: i.qty,
            price: Number(i.product.price)
          }))
        }
      }
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal"],
      mode: "payment",
      customer_email: customer.email,
      client_reference_id: draftOrder.id,
      metadata: {
        orderId: draftOrder.id
      },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Order ${orderNumber}` },
            unit_amount: Math.round(Number(finalTotal) * 100)
          },
          quantity: 1,
        }
      ],
      success_url: `${env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
    });

    // Update draft order with session ID
    await prisma.order.update({
      where: { id: draftOrder.id },
      data: { stripeSessionId: session.id }
    });

    // Cache the checkout session details in Redis for fallback processing
    await redisService.setCache(`checkout_session:${session.id}`, {
      orderId: draftOrder.id,
      customer,
      items,
      coupon: appliedCoupon
    }, 86400);

    res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    next(error);
  }
};

// Verify Unverified Checkout Session
export const verifyCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    if (!env.STRIPE_SECRET_KEY) {
      return next(new AppError("Stripe not configured", 500));
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session || !session.metadata?.orderId) {
      return next(new AppError("Invalid session", 400));
    }

    const orderId = session.metadata.orderId;
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (order.paymentStatus === "paid") {
      return res.status(200).json({ success: true, message: "Order is already paid", order });
    }

    // Check Stripe payment status
    if (session.payment_status === "paid") {
      // Payment was successful, but webhook missed it
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "paid",
          paymentStatus: "paid",
          stripePaymentId: session.payment_intent as string || null,
        }
      });
      return res.status(200).json({ success: true, message: "Order verified and updated to paid", order: updatedOrder });
    } else {
      return res.status(200).json({ success: false, message: "Payment not completed in Stripe", order });
    }
  } catch (error) {
    next(error);
  }
};

// Get All Orders (Admin)
export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    
    let whereClause: any = {};
    if (status) {
      if (status === 'processing' || status === 'paid') {
        whereClause.status = { in: ['paid', 'processing'] };
      } else {
        whereClause.status = String(status);
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// Get Order by ID
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      }
    });

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Update Order Status
export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return next(new AppError("Status is required", 400));
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true }
    });

    res.status(200).json({ success: true, data: order, message: `Order status updated to ${status}` });
  } catch (error) {
    next(error);
  }
};

// Customer: Get My Orders
export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return next(new AppError("Not authenticated", 401));

    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// Customer: Get Specific Order Details & Generate Invoice Token
export const getMyOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return next(new AppError("Not authenticated", 401));

    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: { items: true }
    });

    if (!order) return next(new AppError("Order not found", 404));

    // Generate a short-lived token for invoice access (1 hour)
    import("jsonwebtoken").then((jwt) => {
      const invoiceToken = jwt.default.sign({ orderId: order.id }, env.JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ success: true, data: order, invoiceToken });
    });
  } catch (error) {
    next(error);
  }
};

// Customer: Retry Payment (Creates new checkout session for existing order)
export const retryPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return next(new AppError("Not authenticated", 401));

    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: { items: true }
    });

    if (!order) return next(new AppError("Order not found", 404));
    if (order.status !== "pending" && order.status !== "payment_pending" && order.status !== "payment_failed") {
      return next(new AppError("Order cannot be paid for in its current status.", 400));
    }

    // Create a new Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal"],
      mode: "payment",
      customer_email: order.customerEmail,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: `Order ${order.orderNumber}` },
            unit_amount: Math.round(order.total * 100)
          },
          quantity: 1,
        }
      ],
      success_url: `${env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
    });

    // Update order with new session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id }
    });

    res.status(200).json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
};

// Public/Secured by Token: Get Invoice Data
export const getInvoiceByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    
    import("jsonwebtoken").then(async (jwt) => {
      let decoded: any;
      try {
        decoded = jwt.default.verify(token, env.JWT_SECRET);
      } catch (err) {
        return next(new AppError("Invalid or expired invoice token", 401));
      }

      const orderId = decoded.orderId;
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) return next(new AppError("Order not found", 404));

      res.status(200).json({ success: true, data: order });
    });
  } catch (error) {
    next(error);
  }
};
