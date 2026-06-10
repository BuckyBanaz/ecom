import { Request, Response, NextFunction } from "express";
import { db } from "../config/firebase";
import { collection, getDocs, query, orderBy, where, addDoc } from "firebase/firestore";

// Get notifications, optionally filtered by category
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string;
    
    let q;
    if (category) {
      q = query(
        collection(db, "admin_notifications"),
        where("category", "==", category),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(db, "admin_notifications"),
        orderBy("createdAt", "desc")
      );
    }
    
    const snapshot = await getDocs(q);
    const notifications: any[] = [];
    
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
};

// Create a new notification manually (API endpoint)
export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message, category, metadata } = req.body;
    
    const docRef = await addDoc(collection(db, "admin_notifications"), {
      title,
      message,
      category: category || "general",
      metadata: metadata || {},
      read: false,
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json({ success: true, message: "Notification created", id: docRef.id });
  } catch (error) {
    next(error);
  }
};
