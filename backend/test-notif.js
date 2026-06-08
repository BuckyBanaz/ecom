import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxyaPo987ciyIUqGYPEC19F2t6HzQ-twg",
  authDomain: "schip-8b996.firebaseapp.com",
  projectId: "schip-8b996",
  storageBucket: "schip-8b996.firebasestorage.app",
  messagingSenderId: "953884470848",
  appId: "1:953884470848:web:34ee05a1259b56c51339a5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  await addDoc(collection(db, "admin_notifications"), {
    title: "Test Notification (Simulated)",
    message: `Order ORD-TEST-123 has been paid successfully.`,
    orderId: "test-id-123",
    orderNumber: "ORD-TEST-123",
    total: 249.99,
    read: false,
    createdAt: new Date().toISOString()
  });
  console.log("Added test notification");
  process.exit(0);
}
run();
