// Twilio service with dynamic credentials
export const twilioService = {
  /**
   * Send a standard SMS message
   * @param to Phone number in E.164 format (e.g. +31612345678)
   * @param body Text content of the SMS
   */
  sendSMS: async (to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    console.log(`[Twilio Service] Triggering SMS to ${to}: "${body.substring(0, 50)}..."`);
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone) {
      console.log(`[Twilio Service] [SIMULATION] SMS sent to ${to}`);
      return { success: true, messageId: `mock-sms-${Date.now()}` };
    }

    try {
      // Auto-format Indian numbers for convenience if country code is missing
      let formattedTo = to.trim();
      if (/^[6-9]\d{9}$/.test(formattedTo)) {
        formattedTo = `+91${formattedTo}`;
      } else if (!formattedTo.startsWith("+")) {
        // Fallback to adding + if it's purely digits and not starting with +
        if (/^\d+$/.test(formattedTo)) {
          formattedTo = `+${formattedTo}`;
        }
      }

      const twilio = require("twilio");
      const client = twilio(accountSid, authToken);
      const res = await client.messages.create({
        to: formattedTo,
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
    let cleanTo = to.trim().replace("whatsapp:", "");
    if (/^[6-9]\d{9}$/.test(cleanTo)) {
      cleanTo = `+91${cleanTo}`;
    } else if (!cleanTo.startsWith("+")) {
      if (/^\d+$/.test(cleanTo)) {
        cleanTo = `+${cleanTo}`;
      }
    }
    const formattedTo = `whatsapp:${cleanTo}`;
    console.log(`[Twilio Service] Triggering WhatsApp to ${formattedTo}: "${body.substring(0, 50)}..."`);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER || "whatsapp:+14155238886";

    if (!accountSid || !authToken) {
      console.log(`[Twilio Service] [SIMULATION] WhatsApp sent to ${formattedTo}`);
      return { success: true, messageId: `mock-wa-${Date.now()}` };
    }

    try {
      const twilio = require("twilio");
      const client = twilio(accountSid, authToken);
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
