// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- IMPORTACIONES CAMBIADAS PARA REACT NATIVE ---
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";

// (Comentamos Analytics porque en React Native suele causar errores de "window is not defined")
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCb43aVyAPrDuYLpqBEbNgwPFaqNMilFus",
  authDomain: "sigat-627cd.firebaseapp.com",
  projectId: "sigat-627cd",
  storageBucket: "sigat-627cd.firebasestorage.app",
  messagingSenderId: "729844215540",
  appId: "1:729844215540:web:060c9179bd15a8ec0bb8a1",
  measurementId: "G-D6VRF6QJH2",
};

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore (Base de datos)
export const db = getFirestore(app);

// 3. Initialize Auth CON PERSISTENCIA (Esto mantiene la sesión abierta en el celular)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// const analytics = getAnalytics(app); // Lo dejamos comentado por seguridad
