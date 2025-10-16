// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getMessaging,getToken } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
export const auth = getAuth(app);

// Providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export const requestPermission = async () => {
  const permission = await Notification.requestPermission();
  console.log(permission, "permission");
  if (permission === "granted") {
    try {
      const token = await getToken(messaging, {
        vapidKey:
          "BC73Qkqjbgn_hWklEhPPlSalzvg96sqZQzJrRX_Gu5xpPM7hNlWbFF-MHNCZr_DRHhvlW5mul01OEgxzdubXvno",
      });
      console.log(token, "token");
      return token;
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  }
};
