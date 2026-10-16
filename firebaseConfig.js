import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
  initializeAuth, 
  getAuth, 
  getReactNativePersistence 
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCb43aVyAPrDuYLpqBEbNgwPFaqNMilFus",
  authDomain: "sigat-627cd.firebaseapp.com",
  projectId: "sigat-627cd",
  storageBucket: "sigat-627cd.firebasestorage.app",
  messagingSenderId: "729844215540",
  appId: "1:729844215540:web:060c9179bd15a8ec0bb8a1",
  measurementId: "G-D6VRF6QJH2",
};

// 1. Inicializar la app si no existe
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Inicializar Auth de manera nativa con persistencia
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

// 3. Inicializar Firestore
const db = getFirestore(app);

export { auth, db };