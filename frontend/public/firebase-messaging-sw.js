importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAxyaPo987ciyIUqGYPEC19F2t6HzQ-twg",
  authDomain: "schip-8b996.firebaseapp.com",
  projectId: "schip-8b996",
  storageBucket: "schip-8b996.firebasestorage.app",
  messagingSenderId: "953884470848",
  appId: "1:953884470848:web:34ee05a1259b56c51339a5",
  measurementId: "G-VPPL3HSF9G"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin';
  event.waitUntil(clients.openWindow(url));
});
