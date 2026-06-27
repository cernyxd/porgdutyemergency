import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {

  apiKey: "AIzaSyBrGGfe0tqxxcQCH2eDGyHc3lAnxzdcv8A",

  authDomain: "porgdutyemergency.firebaseapp.com",

  projectId: "porgdutyemergency",

  storageBucket: "porgdutyemergency.firebasestorage.app",

  messagingSenderId: "150334707233",

  appId: "1:150334707233:web:e3d76c7fde0360fd65b560",

  measurementId: "G-KN61HJ6N81"

};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and Google Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged };
