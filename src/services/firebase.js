import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { doc, setDoc, getDoc, query, collection, where, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  AuthErrorCodes,
  RecaptchaVerifier,
  PhoneAuthProvider,
  updateProfile,
  linkWithCredential,
  signInWithPhoneNumber
} from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import { createShopifyCustomer, loginShopifyCustomer, checkShopifyCustomerExists } from './shopifyService';
import { getDatabase } from 'firebase/database';
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  // apiKey: "AIzaSyBx5KOwVFGOcR7aLo-IgYe-JBgFCcBUZHs",
  // authDomain: "nutritioncoach-d6cd5.firebaseapp.com",
  // projectId: "nutritioncoach-d6cd5",
  // storageBucket: "nutritioncoach-d6cd5.firebasestorage.app",
  // messagingSenderId: "80242259759",
  // appId: "1:80242259759:web:4d233017167d7c386f53da",
  // measurementId: "G-J1T27TQXWY"
  apiKey: "AIzaSyAKB_vaOdrLCe30yJsnP2V1opiT-cZEctc",
  authDomain: "getfit-with-elefit.firebaseapp.com",
  projectId: "getfit-with-elefit",
  storageBucket: "getfit-with-elefit.firebasestorage.app",
  messagingSenderId: "302421573042",
  appId: "1:302421573042:web:632ddfadb49a1d0f5338ab",
  measurementId: "G-T02PFM264G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const storage = getStorage(app);
const database = getDatabase(app);

// Export Firebase instances
export { db, auth, storage, database };

// Helper to handle Firebase Auth errors with friendly messages
const handleFirebaseAuthError = (error) => {
  let message = 'An error occurred during authentication';
  
  switch(error.code) {
    case AuthErrorCodes.EMAIL_EXISTS:
      message = 'An account with this email already exists';
      break;
    case AuthErrorCodes.INVALID_EMAIL:
      message = 'The email address is not valid';
      break;
    case AuthErrorCodes.WEAK_PASSWORD:
      message = 'Password should be at least 6 characters';
      break;
    case AuthErrorCodes.USER_DELETED:
    case AuthErrorCodes.INVALID_PASSWORD:
      message = 'Email or password is incorrect';
      break;
    case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
      message = 'Too many failed login attempts. Please try again later';
      break;
    default:
      console.error('Firebase auth error:', error);
  }
  
  const enhancedError = new Error(message);
  enhancedError.originalError = error;
  return enhancedError;
};

// Check if user exists in Firebase by email
const checkUserExistsByEmail = async (email) => {
  try {
    console.log(`Checking if Firebase user exists for email: ${email}`);
    
    if (!email) {
      console.error('No email provided to checkUserExistsByEmail');
      return false;
    }
    
    // Normalize email to prevent case-sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();
    
    // First, check in the Auth system
    let existsInAuth = false;
    try {
      // Firebase Auth doesn't provide a direct way to check if a user exists by email
      // We'll rely on Firestore check instead
      console.log('Cannot directly check Auth system, relying on Firestore check');
    } catch (authError) {
      console.error('Error checking Firebase Auth:', authError);
    }
    
    // Then check in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", normalizedEmail));
    
    console.log('Executing Firestore query to check user existence');
    const querySnapshot = await getDocs(q);
    const exists = !querySnapshot.empty;
    
    if (exists) {
      console.log(`Found user in Firestore with email: ${normalizedEmail}`);
      // Log the first matching document for debugging
      querySnapshot.forEach(doc => {
        console.log(`User document ID: ${doc.id}, data:`, doc.data());
      });
    } else {
      console.log(`No user found in Firestore with email: ${normalizedEmail}`);
    }
    
    return exists;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
};

// Map Shopify customer to Firebase
const mapShopifyUserToFirebase = async (email, userType = 'user', shopifyCustomerId = null, password = null) => {
  try {
    console.log(`Mapping Shopify user to Firebase: ${email}, userType: ${userType}, shopifyCustomerId: ${shopifyCustomerId}`);
    
    // Normalize email to prevent case-sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();
    
    // Use the provided password if available, otherwise generate a random one
    // Using the same password will make it easier for users to log in
    let userPassword;
    if (password) {
      console.log('Using provided password for Firebase auth user');
      userPassword = password;
    } else {
      // Create a random secure password for the Firebase user if none provided
      userPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      console.log(`Generated random password for Firebase auth: ${userPassword}`);
    }
    
    // Check if user already exists in Firebase Auth (should be rare, but possible)
    let userCredential;
    try {
      console.log('Creating new Firebase auth user');
      userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, userPassword);
      console.log(`Firebase auth user created with UID: ${userCredential.user.uid}`);
    } catch (authError) {
      console.error('Error creating Firebase auth user:', authError);
      
      // If the user already exists in Firebase Auth, we need to handle this case
      if (authError.code === AuthErrorCodes.EMAIL_EXISTS) {
        console.log('User already exists in Firebase Auth, attempting to use the existing user');
        
        // Check if we can find the user in Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", normalizedEmail));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log('Found existing user in Firestore, updating the Shopify mapping');
          
          // Update the existing user with Shopify mapping
          const userDoc = querySnapshot.docs[0];
          await setDoc(doc(db, 'users', userDoc.id), {
            ...userDoc.data(),
            shopifyCustomerId: shopifyCustomerId,
            shopifyMapped: true,
            updatedAt: new Date()
          }, { merge: true });
          
          console.log(`Updated existing user document: ${userDoc.id}`);
          return { success: true, email: normalizedEmail, uid: userDoc.id, preExisting: true };
        } else {
          // This is a strange case - user exists in Auth but not in Firestore
          throw new Error('User exists in Firebase Auth but not in Firestore. Unable to map Shopify user.');
        }
      } else {
        // For other errors, just propagate them
        throw authError;
      }
    }
    
    // Create user profile in Firestore
    console.log(`Creating user document in Firestore for UID: ${userCredential.user.uid}`);
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: normalizedEmail,
      userType: userType,
      createdAt: new Date(),
      shopifyMapped: true,
      shopifyCustomerId: shopifyCustomerId
    });
    
    console.log('User document created in Firestore');
    
    // Sign out immediately to clean state
    await signOut(auth);
    console.log('Signed out from temporary authentication session');
    
    return { success: true, email: normalizedEmail, uid: userCredential.user.uid };
  } catch (error) {
    console.error('Error mapping Shopify user to Firebase:', error);
    throw handleFirebaseAuthError(error);
  }
};

// Enhanced user registration with Shopify integration
export const registerUser = async (email, password, userType, additionalData = {}) => {
  try {
    console.log(`Registering new ${userType} user with email: ${email}`);
    
    // Normalize email to prevent case-sensitivity issues
    const normalizedEmail = email.toLowerCase().trim();
    
    // First check if the user already exists in Shopify
    try {
      console.log('Checking if user already exists in Shopify before creating...');
      const shopifyExists = await checkShopifyCustomerExists(normalizedEmail);
      
      if (shopifyExists) {
        console.log('User already exists in Shopify, trying to log in instead');
        // Try to authenticate with Shopify
        try {
          const shopifyCustomer = await loginShopifyCustomer(normalizedEmail, password);
          console.log('Successfully authenticated existing Shopify user', shopifyCustomer);
          
          // Map this user to Firebase
          await mapShopifyUserToFirebase(normalizedEmail, userType, shopifyCustomer.id, password);
          
          return { 
            success: true, 
            email: normalizedEmail, 
            shopifyCustomerId: shopifyCustomer.id,
            message: 'Account already existed in Shopify. We\'ve connected it to our system.'
          };
        } catch (shopifyLoginError) {
          console.error('Failed to authenticate with existing Shopify account:', shopifyLoginError);
          throw new Error('An account with this email already exists, but the password is incorrect.');
        }
      }
    } catch (checkError) {
      console.error('Error checking if user exists in Shopify:', checkError);
      // Continue with registration if the check fails
    }
    
    let shopifyCustomerId = null;
    
    // Try to create customer in Shopify, but make it optional for experts
    try {
      console.log('Creating new Shopify customer...');
      const shopifyCustomer = await createShopifyCustomer(normalizedEmail, password, additionalData);
      console.log(`Shopify customer created with ID: ${shopifyCustomer.id}`);
      shopifyCustomerId = shopifyCustomer.id;
    } catch (shopifyError) {
      console.error('Error creating Shopify customer:', shopifyError);
      
      // For regular users, Shopify integration is required
      if (userType !== 'expert') {
        throw shopifyError;
      } else {
        // For experts, we can continue without Shopify integration
        console.log('Continuing expert registration without Shopify integration');
      }
    }
    
    // Then create user in Firebase with exactly the same password
    try {
      console.log(`Creating Firebase user with userType: ${userType}`);
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: normalizedEmail,
        userType: userType,
        firstName: additionalData?.firstName || '',
        lastName: additionalData?.lastName || '',
        createdAt: new Date(),
        shopifyCustomerId: shopifyCustomerId,
        shopifyMapped: !!shopifyCustomerId,
        isEvaCustomer: additionalData?.isEvaCustomer || false
      });
      
      console.log(`Firebase user created with UID: ${user.uid} and userType: ${userType}`);
      
      if (userType !== 'expert') {
        // Only sign out if not an expert registration from admin panel
        // For expert registrations, we want to keep the admin logged in
        await signOut(auth);
      }
      
      return { 
        success: true, 
        email: normalizedEmail, 
        shopifyCustomerId, 
        uid: user.uid,
        shopifyIntegrated: !!shopifyCustomerId
      };
    } catch (firebaseError) {
      console.error('Firebase registration failed:', firebaseError);
      
      // If Shopify was created but Firebase failed, return partial success
      if (shopifyCustomerId) {
        return { 
          success: true, 
          email: normalizedEmail, 
          shopifyCustomerId,
          firebaseError: true,
          message: 'Account created in Shopify but Firebase registration failed. Please try logging in.'
        };
      }
      
      throw firebaseError;
    }
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Helper function to handle Shopify-authenticated users who can't log in to Firebase
const handleShopifyAuthenticatedUser = async (email, shopifyCustomerId) => {
  try {
    console.log(`Handling Shopify-authenticated user: ${email}`);
    
    // Send a password reset email to allow the user to set their own password
    await firebaseSendPasswordResetEmail(auth, email);
    
    // Find user in Firestore and update Shopify mapping
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Update existing user
      const userDoc = querySnapshot.docs[0];
      await setDoc(doc(db, 'users', userDoc.id), {
        ...userDoc.data(),
        shopifyCustomerId: shopifyCustomerId,
        shopifyMapped: true,
        updatedAt: new Date()
      }, { merge: true });
      console.log(`Updated Shopify information for user document: ${userDoc.id}`);
    } else {
      // No Firestore document - create a placeholder
      const placeholderId = `shopify-${Date.now()}`;
      await setDoc(doc(db, 'users', placeholderId), {
        email: email.toLowerCase().trim(),
        userType: 'user',
        createdAt: new Date(),
        shopifyMapped: true,
        shopifyCustomerId: shopifyCustomerId,
        needsFirebaseAuth: true
      });
      console.log(`Created placeholder document: ${placeholderId}`);
    }
    
    return {
      success: true,
      requiresPasswordReset: true,
      message: 'We\'ve sent a password reset email to your address. Please check your inbox, reset your password, and then try logging in again.'
    };
  } catch (error) {
    console.error('Error handling Shopify authenticated user:', error);
    throw error;
  }
};

// Enhanced login with Shopify integration
export const loginUser = async (email, password) => {
  try {
    console.log(`Login attempt for email: ${email}`);
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user is an expert by looking in Firestore first
    console.log('Checking if user is an expert...');
    const usersRef = collection(db, 'users');
    const expertQuery = query(usersRef, 
      where("email", "==", normalizedEmail),
      where("userType", "==", "expert")
    );
    const expertSnapshot = await getDocs(expertQuery);
    const isExpert = !expertSnapshot.empty;
    console.log(`Is user an expert? ${isExpert}`);
    
    if (isExpert) {
      console.log('Expert user detected, handling expert login...');
      try {
        // For experts, try direct Firebase login first
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        console.log('Expert login successful');
        return userCredential.user;
      } catch (firebaseError) {
        console.error('Expert login failed:', firebaseError);
        throw handleFirebaseAuthError(firebaseError);
      }
    }
    
    // For non-experts, first try direct Firebase login
    try {
      console.log('Attempting direct Firebase login...');
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      console.log('Firebase login successful');
      return userCredential.user;
    } catch (firebaseError) {
      console.error('Firebase login failed:', firebaseError.code);
      
      // If Firebase login fails, try Shopify
      try {
        console.log('Trying Shopify authentication...');
        const shopifyCustomer = await loginShopifyCustomer(normalizedEmail, password);
        console.log('Shopify authentication successful', shopifyCustomer);
        
        // If we got here, Shopify auth worked but Firebase auth failed
        console.log('User exists in Shopify but Firebase auth failed');
        
        // At this point, we know:
        // 1. The user exists in Shopify with these credentials
        // 2. Either the user doesn't exist in Firebase, or the password is different
        
        // Check if the user exists in Firestore
        const userExistsInFirestore = await checkUserExistsByEmail(normalizedEmail);
        console.log(`User exists in Firestore: ${userExistsInFirestore}`);
        
        if (userExistsInFirestore) {
          console.log('User exists in Firestore, sending password reset email');
          // Send password reset email to allow user to set Firebase password
          await firebaseSendPasswordResetEmail(auth, normalizedEmail);
          throw new Error('Your Shopify password doesn\'t match our system. We\'ve sent a password reset email to your address. Please check your inbox and reset your password, then try logging in again.');
        } else {
          // User doesn't exist in our Firestore, try to create the mapping
          console.log('Creating new Firebase mapping for Shopify user');
          try {
            // Try to create a Firebase account with the same password
            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            console.log('Firebase account created successfully');
            
            // Create user profile in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              email: normalizedEmail,
              userType: 'user',
              createdAt: new Date(),
              shopifyCustomerId: shopifyCustomer.id,
              shopifyMapped: true
            });
            
            console.log('Firestore document created');
            
            // Sign out and ask user to log in again
            await signOut(auth);
            throw new Error('Your Shopify account has been connected. Please log in again with the same credentials.');
          } catch (createError) {
            console.error('Error creating Firebase account:', createError);
            
            // If we can't create a Firebase account, just send a password reset
            if (createError.code === 'auth/email-already-in-use') {
              console.log('Email already in use in Firebase Auth, sending password reset');
              await firebaseSendPasswordResetEmail(auth, normalizedEmail);
              throw new Error('Your Shopify password doesn\'t match our system. We\'ve sent a password reset email to your address. Please check your inbox and reset your password, then try logging in again.');
            }
            
            throw createError;
          }
        }
      } catch (shopifyError) {
        console.error('Shopify authentication failed:', shopifyError);
        
        // If both Firebase and Shopify auth failed, user provided wrong credentials
        if (firebaseError.code === 'auth/invalid-login-credentials' || 
            firebaseError.code === 'auth/wrong-password' || 
            firebaseError.code === 'auth/user-not-found') {
          throw new Error('Email or password is incorrect.');
        }
        
        // For any other Firebase errors, pass them through
        throw handleFirebaseAuthError(firebaseError);
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Helper function to delete and recreate a Firebase account
const deleteAndRecreateFirebaseAccount = async (email, password, shopifyCustomerId) => {
  try {
    console.log(`Attempting to fix Firebase account for: ${email}`);
    
    // Find the user in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("email", "==", email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    let userData = null;
    let userId = null;
    
    if (!querySnapshot.empty) {
      // Get the user data and ID
      const userDoc = querySnapshot.docs[0];
      userData = userDoc.data();
      userId = userDoc.id;
      console.log(`Found user document: ${userId}`);
    }
    
    // We have two options:
    // 1. Use admin SDK to reset the password (not possible from client)
    // 2. Create a new Firebase Auth account and link it to the existing Firestore document
    
    // Since we can't use admin SDK from client, we'll try to create a new account
    // and update references
    
    try {
      console.log('Creating new Firebase auth user with correct password');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log(`New Firebase auth user created with UID: ${userCredential.user.uid}`);
      
      // If we had existing user data, transfer it to the new user
      if (userData) {
        console.log('Transferring existing user data to new account');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          ...userData,
          email: email.toLowerCase().trim(),
          shopifyCustomerId: shopifyCustomerId,
          shopifyMapped: true,
          updatedAt: new Date(),
          previousUid: userId // Keep track of the old UID for reference
        });
        
        // Delete the old document
        if (userId !== userCredential.user.uid) {
          await deleteDoc(doc(db, 'users', userId));
          console.log(`Deleted old user document: ${userId}`);
        }
      } else {
        // Create new user document
        console.log('Creating new user document');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email.toLowerCase().trim(),
          userType: 'user',
          createdAt: new Date(),
          shopifyMapped: true,
          shopifyCustomerId: shopifyCustomerId
        });
      }
      
      // Sign out to clean state
      await signOut(auth);
      console.log('Signed out from temporary authentication session');
      
      return { success: true, uid: userCredential.user.uid };
    } catch (error) {
      console.error('Error recreating Firebase account:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteAndRecreateFirebaseAccount:', error);
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

export const sendPasswordResetEmail = async (email) => {
  try {
    // Check if user exists in Shopify first
    const existsInShopify = await checkShopifyCustomerExists(email);
    
    if (!existsInShopify) {
      throw new Error('No account found with that email address');
    }
    
    // Send reset email through Firebase
    await firebaseSendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    if (error.code) {
      throw handleFirebaseAuthError(error);
    }
    throw error;
  }
};

// Add a utility function to handle cases where a user exists in Firestore but has auth issues
const resetUserPasswordAndProvideInstructions = async (email) => {
  try {
    console.log(`Sending password reset email to ${email}`);
    await firebaseSendPasswordResetEmail(auth, email);
    console.log('Password reset email sent successfully');
    return {
      success: true,
      message: 'A password reset email has been sent to your address. Please check your inbox and follow the instructions to reset your password, then try logging in again.'
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      message: 'We could not send a password reset email. Please try the "Forgot Password" option on the login page.',
      error
    };
  }
};

// Phone number verification functions
export const setupRecaptcha = (containerId) => {
  try {
    // Clear any existing reCAPTCHA
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    // Create new reCAPTCHA verifier
    const verifier = new RecaptchaVerifier(
      containerId,
      {
        size: 'normal',
        callback: (response) => {
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
        }
      },
      auth
    );

    return verifier;
  } catch (error) {
    console.error('Error setting up reCAPTCHA:', error);
    throw error;
  }
};

export const sendPhoneVerificationCode = async (phoneNumber, containerId) => {
  try {
    // Format phone number to E.164 format
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+' + phoneNumber;
    }

    console.log('Sending verification code to:', phoneNumber);

    // Setup reCAPTCHA
    const verifier = setupRecaptcha(containerId);
    
    // Render the reCAPTCHA widget
    await verifier.render();

    // Send verification code
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    window.confirmationResult = confirmationResult;
    return confirmationResult.verificationId;
  } catch (error) {
    console.error('Error sending verification code:', error);
    // Clean up on error
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    throw error;
  }
};

export const verifyPhoneNumber = async (verificationId, verificationCode) => {
  try {
    if (!window.confirmationResult) {
      throw new Error('No verification in progress. Please request a new code.');
    }

    // Confirm the verification code
    const result = await window.confirmationResult.confirm(verificationCode);
    
    // Clear the confirmation result
    window.confirmationResult = null;
    
    return { 
      success: true, 
      user: result.user,
      phoneNumber: result.user.phoneNumber 
    };
  } catch (error) {
    console.error('Error verifying phone number:', error);
    // Clear the confirmation result on error
    window.confirmationResult = null;
    throw error;
  }
};