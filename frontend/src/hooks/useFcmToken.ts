import { useState, useEffect } from "react";
import { getToken } from "firebase/messaging";
import { messaging } from "@/config/firebase";
import axios from "axios";

const VAPID_KEY = "BKUVRggTv1D96jFaRKoNKhYcApUtw9fJt1TwqXTU_oOLV-pjFpHxO-DmRvpLNA4IpCLr94CpzhFyg40sfpO6koU";

export function useFcmToken() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    const requestPermissionAndGetToken = async () => {
      try {
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token) {
            setFcmToken(token);
            // Send to backend
            const authToken = localStorage.getItem("adminToken") || localStorage.getItem("token");
            if (authToken) {
              await axios.post(
                "http://localhost:5000/api/v1/auth/fcm-token",
                { token },
                { headers: { Authorization: `Bearer ${authToken}` } }
              ).catch(err => console.error("Failed to save FCM token to backend", err));
            }
          }
        }
      } catch (error) {
        console.error("An error occurred while retrieving token. ", error);
      }
    };

    requestPermissionAndGetToken();

    // Listen for foreground notifications
    if (messaging) {
      import("firebase/messaging").then(({ onMessage }) => {
        onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);
          if (payload.notification) {
            import("sonner").then(({ toast }) => {
              toast(payload.notification?.title || "Notification", {
                description: payload.notification?.body,
                action: payload.data?.url ? {
                  label: "View",
                  onClick: () => window.location.href = payload.data!.url
                } : undefined,
              });
            });
          }
        });
      });
    }

  }, []);

  return { fcmToken };
}
