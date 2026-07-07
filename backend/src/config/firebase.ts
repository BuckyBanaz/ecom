import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwJEpZMxBLH54YL8bYompAQcf3Rss47DE",
  authDomain: "schipenster-94716.firebaseapp.com",
  projectId: "schipenster-94716",
  storageBucket: "schipenster-94716.firebasestorage.app",
  messagingSenderId: "452847782141",
  appId: "1:452847782141:web:36e179f7616c1dc99d9694"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
