import { messaging } from "../config/firebaseAdmin";

export const firebaseService = {
  /**
   * Send push notification to a specific device token
   * @param token FCM Device token
   * @param title Title of notification
   * @param body Body of notification
   * @param data Optional payload key-value pairs
   */
  sendPushNotification: async (
    token: string, 
    title: string, 
    body: string, 
    data?: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    console.log(`[Firebase Service] Triggering Push to token: "${title}" - "${body}"`);

    if (!messaging) {
      console.log(`[Firebase Service] [MOCK] Push notification simulated successfully for token`);
      return { success: true, messageId: `mock-fcm-${Date.now()}` };
    }

    try {
      const payload: any = {
        token,
        notification: { title, body },
        data: data || {}
      };

      const messageId = await messaging.send(payload);
      console.log(`[Firebase Service] Push notification sent successfully. ID: ${messageId}`);
      return { success: true, messageId };
    } catch (err: any) {
      console.error(`[Firebase Service] Failed to send push notification:`, err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Send notification to a specific topic
   * @param topic Target topic name (e.g. "order_updates")
   * @param title Title of notification
   * @param body Body of notification
   * @param data Optional payload key-value pairs
   */
  sendToTopic: async (
    topic: string, 
    title: string, 
    body: string, 
    data?: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
    console.log(`[Firebase Service] Triggering Topic Push to "${topic}": "${title}" - "${body}"`);

    if (!messaging) {
      console.log(`[Firebase Service] [MOCK] Push notification simulated for topic "${topic}"`);
      return { success: true, messageId: `mock-topic-fcm-${Date.now()}` };
    }

    try {
      const payload: any = {
        topic,
        notification: { title, body },
        data: data || {}
      };

      const messageId = await messaging.send(payload);
      console.log(`[Firebase Service] Topic notification sent successfully. ID: ${messageId}`);
      return { success: true, messageId };
    } catch (err: any) {
      console.error(`[Firebase Service] Failed to send topic notification:`, err.message);
      return { success: false, error: err.message };
    }
  }
};
