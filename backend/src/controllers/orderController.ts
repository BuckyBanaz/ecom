import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AppError } from "../middlewares/errorMiddleware";
import { env } from "../config/env";
import { getStripeClient, isStripeConfigured } from "../utils/stripeClient";
import { redisService } from "../services/redisService";
import jwt from "jsonwebtoken";
import { sendcloudApi } from "../services/sendcloud/api";
import { notificationTriggerService } from "../services/notificationTriggerService";
import { db } from "../config/firebase";
import { collection, addDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import { messaging } from "../config/firebaseAdmin";

// Initiate Checkout Session
export const initiateCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, customer, shippingConfig, charges, appliedCoupon } = req.body;
    
    if (!items || items.length === 0) {
      return next(new AppError("Cart is empty", 400));
    }

    if (!isStripeConfigured()) {
      return next(new AppError("Stripe is not configured on this server.", 500));
    }
    const stripe = getStripeClient();

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

    // Determine allowed payment methods
    const paymentMethods: string[] = [];
    if (process.env.PAYMENT_ENABLE_CARD !== "false") paymentMethods.push("card");
    if (process.env.PAYMENT_ENABLE_IDEAL !== "false") paymentMethods.push("ideal");
    if (process.env.PAYMENT_ENABLE_PAYPAL === "true") paymentMethods.push("paypal");
    if (process.env.PAYMENT_ENABLE_KLARNA === "true") paymentMethods.push("klarna");
    if (process.env.PAYMENT_ENABLE_BANCONTACT === "true") paymentMethods.push("bancontact");
    if (paymentMethods.length === 0) paymentMethods.push("card"); // Fallback

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethods as any,
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

    if (!isStripeConfigured()) {
      return next(new AppError("Stripe not configured", 500));
    }
    const stripe = getStripeClient();

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
      // Trigger Order Confirmed notification
      await notificationTriggerService.triggerOrderNotification(orderId, "order_confirmed").catch(err => {
        console.error("[VerifyCheckout] Failed to trigger order confirmation notification:", err.message);
      });

      try {
        await addDoc(collection(db, "admin_notifications"), {
          title: "New Order",
          message: `Order ${updatedOrder.orderNumber} has been paid.`,
          category: "orders",
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          total: updatedOrder.total,
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Firebase admin notification failed:", err);
      }

      try {
        if (messaging) {
          const admins = await prisma.user.findMany({
            where: {
              role: { in: ["admin", "superadmin"] },
            },
            select: { fcmTokens: true }
          });
          
          const tokens = admins.flatMap(a => a.fcmTokens || []);
          if (tokens.length > 0) {
            await messaging.sendEachForMulticast({
              tokens: [...new Set(tokens)], // Deduplicate tokens
              notification: {
                title: "New Order 🎉",
                body: `Order ${updatedOrder.orderNumber} has been paid successfully. Amount: €${updatedOrder.total.toFixed(2)}`
              },
              data: {
                orderId: updatedOrder.id,
                url: `/admin/orders/${updatedOrder.id}`
              }
            });
            console.log(`✅ FCM push notification sent to ${tokens.length} devices`);
          }
        }
      } catch (fcmErr) {
        console.error("❌ Failed to send FCM push notification:", fcmErr);
      }

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
        user: {
          select: {
            phone: true
          }
        }
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
      data: { 
        status,
        ...(status === "cancelled" ? { shipmentStatus: "Cancelled" } : {})
      },
      include: { items: true }
    });

    if (status === "cancelled") {
      try {
        await sendcloudApi.cancelParcelByOrderNumber(order.orderNumber);
      } catch (scErr) {
        console.error("⚠️ Failed to cancel Sendcloud parcel:", scErr);
      }
    }

    // Trigger Order Status Update or Delivered notification
    if (status === "delivered") {
      await notificationTriggerService.triggerOrderNotification(order.id, "order_delivered").catch(err => {
        console.error("[UpdateOrderStatus] Failed to trigger order delivered notification:", err.message);
      });
    } else {
      await notificationTriggerService.triggerOrderNotification(order.id, "order_status_update").catch(err => {
        console.error("[UpdateOrderStatus] Failed to trigger status update notification:", err.message);
      });
    }

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

    // Determine allowed payment methods
    const paymentMethods: string[] = [];
    if (process.env.PAYMENT_ENABLE_CARD !== "false") paymentMethods.push("card");
    if (process.env.PAYMENT_ENABLE_IDEAL !== "false") paymentMethods.push("ideal");
    if (process.env.PAYMENT_ENABLE_PAYPAL === "true") paymentMethods.push("paypal");
    if (process.env.PAYMENT_ENABLE_KLARNA === "true") paymentMethods.push("klarna");
    if (process.env.PAYMENT_ENABLE_BANCONTACT === "true") paymentMethods.push("bancontact");
    if (paymentMethods.length === 0) paymentMethods.push("card"); // Fallback

    if (!isStripeConfigured()) {
      return next(new AppError("Stripe is not configured on this server.", 500));
    }
    const stripe = getStripeClient();

    // Create a new Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethods as any,
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

// Sendcloud Integration Controllers
export const getSendcloudMethods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const toCountry = typeof req.query.to_country === "string" ? req.query.to_country : undefined;
    const weightRaw = typeof req.query.weight === "string" ? parseFloat(req.query.weight) : undefined;
    const weight = weightRaw && !isNaN(weightRaw) && weightRaw > 0 ? weightRaw : undefined;
    const methods = await sendcloudApi.getShippingMethods(toCountry, weight);
    res.status(200).json({ success: true, data: methods });
  } catch (error) {
    next(error);
  }
};

export const createSendcloudShipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { weight, shippingMethodId } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return next(new AppError("Order not found", 404));

    let addressData: any = {};
    try {
      addressData = JSON.parse(order.shippingAddress);
    } catch (e) {
      // shippingAddress might be a plain string
      addressData = {};
    }

    console.log("📦 Sendcloud Parcel - Address Data:", JSON.stringify(addressData, null, 2));

    // Build full name
    const fullName = `${addressData.firstName || ""} ${addressData.lastName || ""}`.trim() || order.customerName;

    // Normalize country to 2-letter ISO code
    const countryMap: Record<string, string> = {
      "netherlands": "NL", "nederland": "NL", "nl": "NL",
      "germany": "DE", "deutschland": "DE", "de": "DE",
      "belgium": "BE", "belgië": "BE", "be": "BE",
      "france": "FR", "fr": "FR",
      "india": "IN", "in": "IN",
      "united kingdom": "GB", "uk": "GB", "gb": "GB",
      "united states": "US", "usa": "US", "us": "US",
    };
    const rawCountry = (addressData.country || "NL").toLowerCase().trim();
    const country = countryMap[rawCountry] || (addressData.country || "NL").toUpperCase().substring(0, 2);

    const parcelData: any = {
      name: fullName,
      company_name: "",
      address: addressData.street || "",
      house_number: addressData.houseNumber || "",
      city: addressData.city || "",
      postal_code: addressData.pincode || addressData.postalCode || "",
      country: country,
      telephone: addressData.phone || "",
      email: addressData.email || order.customerEmail,
      request_label: true,
      shipment: { id: shippingMethodId },
      weight: parseFloat(String(weight || "1")).toFixed(3),
      order_number: order.orderNumber,
      quantity: order.items ? undefined : 1,
    };

    console.log("📦 Sendcloud Parcel Payload:", JSON.stringify(parcelData, null, 2));

    const result = await sendcloudApi.createParcel(parcelData);

    console.log("✅ Sendcloud Response:", JSON.stringify(result, null, 2));

    // Attempt to get label URL
    const trackingNumber = result.parcel?.tracking_number || "";
    const trackingUrl = result.parcel?.tracking_url || "";
    let labelUrl = "";
    if (result.parcel?.documents && result.parcel.documents.length > 0) {
      labelUrl = result.parcel.documents[0].link;
    }

    const carrier = result.parcel?.carrier || "Sendcloud";

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        trackingNumber,
        trackingUrl,
        labelUrl,
        carrier,
        shipmentStatus: result.parcel?.status?.message || "Label Generated",
        status: "label_generated",
      },
      include: {
        items: true,
      }
    });

    // Trigger Order Shipped notification when label is generated
    await notificationTriggerService.triggerOrderNotification(updatedOrder.id, "order_shipped").catch(err => {
      console.error("[CreateShipment] Failed to trigger order shipped notification:", err.message);
    });

    res.status(200).json({ success: true, data: updatedOrder });

  } catch (error) {
    next(error);
  }
};

export const downloadSendcloudLabel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return next(new AppError("Order not found", 404));
    
    // Fallback if labelUrl is empty or not generated
    if (!order.labelUrl || order.labelUrl.includes("dummy.pdf")) {
      return next(new AppError("Label URL not found or is still a mockup dummy label. Please create a shipment first.", 404));
    }

    const { getSendcloudAuthHeaders } = require("../services/sendcloud/api");
    const authHeaders = getSendcloudAuthHeaders();

    console.log(`📥 Proxying Sendcloud Label from: ${order.labelUrl}`);

    const response = await fetch(order.labelUrl, {
      method: "GET",
      headers: {
        Authorization: authHeaders.Authorization,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return next(new AppError(`Failed to fetch PDF label from Sendcloud: ${errorText}`, response.status));
    }

    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="label-${order.orderNumber}.pdf"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};
