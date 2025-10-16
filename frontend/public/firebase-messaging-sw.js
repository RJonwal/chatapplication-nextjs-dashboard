// Import Firebase scripts
importScripts(
  "https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js"
);

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAc2tGxSTX0o9VK_78EOdHh_6sV7WDlcnw",
  authDomain: "fir-demo-f2731.firebaseapp.com",
  projectId: "fir-demo-f2731",
  storageBucket: "fir-demo-f2731.firebasestorage.app",
  messagingSenderId: "999401592437",
  appId: "1:999401592437:web:4c70b71d002b8c57360a3c",
  measurementId: "G-V4K1WMY5GN",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message:",
    payload
  );
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image,
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});
