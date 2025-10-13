import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
const firebaseConfig = {
  apiKey: "AIzaSyC4sp-E5Jobss0lR3IpH_eNjQsEsezhFfU",
  authDomain: "festei-1e03a.firebaseapp.com",
  projectId: "festei-1e03a",
  storageBucket: "festei-1e03a.firebasestorage.app",
  messagingSenderId: "465916793449",
  appId: "1:465916793449:web:254580fdd8608aeb9dc8f8"
};

export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const FIREBASE_DB = getDatabase(FIREBASE_APP);

