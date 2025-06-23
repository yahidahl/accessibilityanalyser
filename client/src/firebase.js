// firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDZxAtFVJ7ZQ0qdBI1vLBvoofyP9EelLdk",
  authDomain: "accessibility-analyzer-1c8c1.firebaseapp.com",
  projectId: "accessibility-analyzer-1c8c1",
  appId: "1:954364658904:web:5dbae608799984c037c3ad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Exporting Firebase auth tools
export {
  auth,
  provider,
  signInWithPopup,
  signOut
};
