const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const fromPhone = process.env.TWILIO_PHONE_NUMBER || "";
const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886"; // Default sandbox number

let client: any = null;

if (accountSid && authToken) {
  try {
    // Use require dynamically so missing module doesn't crash the server startup
    const twilio = require("twilio");
    client = twilio(accountSid, authToken);
    console.log("[Twilio Service] Initialized successfully.");
  } catch (error: any) {
    console.error("[Twilio Service] Initialization error (make sure 'twilio' package is installed):", error.message);
  }
} else {
  console.warn("[Twilio Service] Missing credentials. SMS/WhatsApp triggers will run in mock simulation mode.");
}

export const twilioService = {
  /**
   * Send a standard SMS message
   * @param to Phone number in E.164 format (e.g. +31612345678)
   * @param body Text content of the SMS
   */
  sendSMS: async (to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    console.log(`[Twilio Service] Triggering SMS to ${to}: "${body.substring(0, 50)}..."`);
    
    if (!client) {
      console.log(`[Twilio Service] [SIMULATION] SMS sent to ${to}`);
      return { success: true, messageId: `mock-sms-${Date.now()}` };
    }

    try {
      const res = await client.messages.create({
        to,
        from: fromPhone,
        body
      });
      console.log(`[Twilio Service] SMS sent successfully to ${to}. Message SID: ${res.sid}`);
      return { success: true, messageId: res.sid };
    } catch (err: any) {
      console.error(`[Twilio Service] Failed to send SMS to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Send a WhatsApp message
   * @param to Phone number in format "whatsapp:+31612345678" or "+31612345678"
   * @param body Text content of the WhatsApp message
   */
  sendWhatsApp: async (to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    console.log(`[Twilio Service] Triggering WhatsApp to ${formattedTo}: "${body.substring(0, 50)}..."`);

    if (!client) {
      console.log(`[Twilio Service] [SIMULATION] WhatsApp sent to ${formattedTo}`);
      return { success: true, messageId: `mock-wa-${Date.now()}` };
    }

    try {
      const res = await client.messages.create({
        to: formattedTo,
        from: fromWhatsApp.startsWith("whatsapp:") ? fromWhatsApp : `whatsapp:${fromWhatsApp}`,
        body
      });
      console.log(`[Twilio Service] WhatsApp sent successfully to ${formattedTo}. Message SID: ${res.sid}`);
      return { success: true, messageId: res.sid };
    } catch (err: any) {
      console.error(`[Twilio Service] Failed to send WhatsApp to ${formattedTo}:`, err.message);
      return { success: false, error: err.message };
    }
  }
};
