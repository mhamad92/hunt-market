import { PushNotifications } from "@capacitor/push-notifications";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function setupPushNotifications() {
  // Ask permission
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;

  // Register with FCM
  await PushNotifications.register();

  // When token received
  PushNotifications.addListener("registration", async (token) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Save token to Firestore
    await setDoc(
      doc(db, "users", uid),
      { fcmToken: token.value, updatedAt: Date.now() },
      { merge: true }
    );
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error:", err);
  });

  // When notification received while app is open
  PushNotifications.addListener("pushNotificationReceived", (notif) => {
    console.log("Push received:", notif);
  });

  // When user taps notification
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("Push action:", action);
    // later we can deep-link to /raffles/:id
  });
}