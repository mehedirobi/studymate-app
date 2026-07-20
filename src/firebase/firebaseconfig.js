import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5L_pkjTBcon0DffVTSGc0JfyP6FpDBSA",
  authDomain: "studymate-f515d.firebaseapp.com",
  projectId: "studymate-f515d",
  storageBucket: "studymate-f515d.firebasestorage.app",
  messagingSenderId: "38564421013",
  appId: "1:38564421013:web:04697d5d68a340356f6a9c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;