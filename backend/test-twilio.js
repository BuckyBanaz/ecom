const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const twilio = require('twilio');
require('dotenv').config();

async function checkLastOrder() {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  
  if (!lastOrder) {
    console.log("No orders found.");
    return;
  }
  
  console.log("Last Order ID:", lastOrder.id);
  console.log("Customer Email:", lastOrder.customerEmail);
  
  let addressData = {};
  try {
    addressData = JSON.parse(lastOrder.shippingAddress);
  } catch (e) {}
  
  const phone = addressData.phone || lastOrder.user?.phone || null;
  console.log("Extracted Phone Number:", phone);
  
  if (!phone) {
    console.log("No phone number to send SMS to.");
    return;
  }
  
  console.log("Attempting to send test SMS via Twilio...");
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  
  try {
    const client = twilio(accountSid, authToken);
    const res = await client.messages.create({
      to: phone,
      from: fromPhone,
      body: "Test SMS from Ecom Backend"
    });
    console.log("Twilio Success! Message SID:", res.sid);
  } catch (err) {
    console.error("Twilio Error:", err.message);
    if (err.code === 21608) {
      console.log("Twilio Trial Account Error: This number is not verified in your Twilio Console.");
    }
  }
}

checkLastOrder().then(() => process.exit(0));
