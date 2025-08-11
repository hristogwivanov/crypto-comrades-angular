// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBvGO9b16xslB7GTW2NVATcv45qAflBy2c",
  authDomain: "crypto-comrades.firebaseapp.com",
  projectId: "crypto-comrades",
  storageBucket: "crypto-comrades.firebasestorage.app",
  messagingSenderId: "550694090498",
  appId: "1:550694090498:web:6d698d928648c55ffbb41b",
  measurementId: "G-62TSQD181K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics
export const analytics = getAnalytics(app);

export default app;
