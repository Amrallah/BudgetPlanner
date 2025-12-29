import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChrb3B2LWWqXz6KTdDtTVVURzf0SgcIpY",
  authDomain: "financialbudgetplanner.firebaseapp.com",
  projectId: "financialbudgetplanner",
  storageBucket: "financialbudgetplanner.firebasestorage.app",
  messagingSenderId: "312383225948",
  appId: "1:312383225948:web:3a4687266ffb18f372a699",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
