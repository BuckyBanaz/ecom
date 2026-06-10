import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { db } from "@/config/firebase";
import { collection, query, orderBy, onSnapshot, limit, updateDoc, doc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen to admin_notifications collection
    const q = query(collection(db, "admin_notifications"), orderBy("createdAt", "desc"), limit(20));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let unread = 0;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          // If a new notification is added that is unread and we're just receiving it
          // we could optionally play a sound or show a toast here.
          // To prevent showing toasts for initial load, we might check timing, but for now:
          if (!data.read && data.createdAt) {
             const createdTime = new Date(data.createdAt).getTime();
             const now = Date.now();
             // Show toast if it was created in the last 10 seconds (brand new)
             if (now - createdTime < 10000) {
               toast.success(`🔔 New Order: ${data.orderNumber} - €${data.total.toFixed(2)}`);
             }
          }
        }
      });

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<AppNotification, "id">;
        notifs.push({ id: docSnap.id, ...data });
        if (!data.read) unread++;
      });
      
      setNotifications(notifs);
      setUnreadCount(unread);
    }, (error) => {
      console.error("Firebase popover fetch error:", error);
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

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    setIsOpen(false);
    navigate(`/admin/orders/${notif.orderId}`);
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markAsRead(notif.id);
    }
    toast.success("All notifications marked as read");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-muted" onClick={markAllAsRead}>
              Mark all read
            </Badge>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {notif.title}
                      {!notif.read && <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block"></span>}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-xs font-semibold mt-1">
                    Amount: €{notif.total.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-2 border-t text-center flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="w-full text-xs text-primary font-medium hover:text-primary hover:bg-primary/5" onClick={() => { setIsOpen(false); navigate("/admin/notifications"); }}>
            View all notifications
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-7" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
