import {requestPermission} from "../firebase/firebaseConfig"
import axiosInstance from "@/lib/axios";
import { getCookie } from "./commons";

export const sendTokenToBackend = async () => {
  const token = await requestPermission();
  if (token) {
    try {
      const res = await axiosInstance.post(
        "auth/fcmtoken",
        { fcmToken: token },
        {
          headers: {
            Authorization: `Bearer ${getCookie("token")}`,
          },
        }
      );
      console.log("FCM token saved:", res.data);
    } catch (err) {
      console.error("Error sending token to backend:", err.response?.data || err);
    }
  } else {
    console.log("No token generated");
  }
};
