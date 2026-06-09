import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { db } from "@/config/firebase";
import { collection, query, orderBy, onSnapshot, limit, updateDoc, doc, startAfter } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  orderId: string;
  orderNumber: string;
  total: number;
  read: boolean;
  createdAt: string;
}

export default function AdminNotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen to admin_notifications collection
    const q = query(collection(db, "admin_notifications"), orderBy("createdAt", "desc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<AppNotification, "id">;
        notifs.push({ id: docSnap.id, ...data });
      });
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error("Firebase fetch error:", error);
      toast.error(t("admin_notifications.toast_error"));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "admin_notifications", id), { read: true });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markAsRead(notif.id);
    }
    toast.success(t("admin_notifications.toast_marked_all"));
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    navigate(`/admin/orders/${notif.orderId}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">{t("admin_notifications.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            {t("admin_notifications.title")}
          </h2>
          <p className="text-muted-foreground">{t("admin_notifications.subtitle")}</p>
        </div>
        <Button onClick={markAllAsRead} variant="outline">
          {t("admin_notifications.button_mark_all")}
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{t("admin_notifications.empty_title")}</h3>
            <p className="text-muted-foreground">{t("admin_notifications.empty_text")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                onClick={() => handleNotificationClick(notif)}
                className={`p-6 hover:bg-muted/30 cursor-pointer transition-colors flex gap-4 items-start ${!notif.read ? 'bg-primary/5' : ''}`}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${!notif.read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className={`text-base ${!notif.read ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge variant={!notif.read ? 'default' : 'secondary'}>
                      Order {notif.orderNumber}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      €{notif.total.toFixed(2)}
                    </span>
                  </div>
                </div>
                {!notif.read && (
                  <div className="shrink-0 mt-2">
                    <span className="h-3 w-3 rounded-full bg-primary block"></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
