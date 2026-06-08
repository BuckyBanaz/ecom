import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxyaPo987ciyIUqGYPEC19F2t6HzQ-twg",
  authDomain: "schip-8b996.firebaseapp.com",
  projectId: "schip-8b996",
  storageBucket: "schip-8b996.firebasestorage.app",
  messagingSenderId: "953884470848",
  appId: "1:953884470848:web:34ee05a1259b56c51339a5",
  measurementId: "G-VPPL3HSF9G"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;
