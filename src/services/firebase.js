import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBx5KOwVFGOcR7aLo-IgYe-JBgFCcBUZHs",
  authDomain: "nutritioncoach-d6cd5.firebaseapp.com",
  projectId: "nutritioncoach-d6cd5",
  storageBucket: "nutritioncoach-d6cd5.firebasestorage.app",
  messagingSenderId: "80242259759",
  appId: "1:80242259759:web:4d233017167d7c386f53da",
  measurementId: "G-J1T27TQXWY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// User functions
export const registerUser = async (email, password, userType) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      userType: userType,
      createdAt: new Date()
    });
    
    // Sign out immediately after registration
    // This prevents the user from being automatically logged in
    await signOut(auth);
    
    return { success: true, email };
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const getUserType = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data().userType;
    }
    return null;
  } catch (error) {
    console.error('Error getting user type:', error);
    return null;
  }
};

export { app, db, auth, analytics }; 