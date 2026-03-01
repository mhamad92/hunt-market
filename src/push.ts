import { PushNotifications } from "@capacitor/push-notifications";
import { doc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase";

const TOKEN_KEY = "hm_fcm_token";

let listenersAdded = false;

export async function setupPushNotifications() {
  try {
    // Ask permission
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") {
      console.log("Push permission not granted");
      return;
    }

    // Register to get a token
    await PushNotifications.register();

    // Add listeners once
    if (!listenersAdded) {
      listenersAdded = true;

      // Token received
      PushNotifications.addListener("registration", async (token) => {
        console.log("✅ FCM TOKEN:", token.value);
        localStorage.setItem(TOKEN_KEY, token.value);
        await tryUploadToken();
      });

      // Token error
      PushNotifications.addListener("registrationError", (err) => {
        console.error("Push registration error:", err);
      });

      // Push received while app is open (foreground)
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("📩 PUSH FOREGROUND:", notification);
        // later: show toast
      });

      // User tapped a notification
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("👉 PUSH TAP:", action);
        // later: navigate using action.notification.data
      });

      // If auth becomes ready later, upload token
      auth.onAuthStateChanged(async () => {
        await tryUploadToken();
      });
    }

    console.log("✅ Push setup done");
  } catch (e) {
    console.error("setupPushNotifications error:", e);
  }
}

async function tryUploadToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const uid = auth.currentUser?.uid;

  console.log("tryUploadToken uid:", uid, "token?", !!token);

  if (!uid || !token) return;

  // 1) Save to Firestore (your original way)
  await setDoc(
    doc(db, "users", uid),
    {
      fcmToken: token,
      fcmUpdatedAt: Date.now(),
    },
    { merge: true }
  );

  // 2) Call Cloud Function: saves token + subscribes to topic "all_users"
  try {
    const fn = httpsCallable(functions, "saveFcmToken");
    await fn({ token });
    console.log("✅ Token saved + subscribed to topic all_users");
  } catch (e) {
    console.error("saveFcmToken failed:", e);
  }
}