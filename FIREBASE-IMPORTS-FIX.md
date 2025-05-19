# Firebase Import Errors Fix

The errors you're seeing are related to Firebase module imports. This is a common issue with recent versions of Firebase. Here's how to fix it:

## Step 1: Update Firebase Version

```json
"firebase": "^10.1.0"
```

## Step 2: Fix the Imports in your service files

### For firebase.js:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your configuration...

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { app, db, auth, analytics };
```

### For bookingService.js:

```javascript
import { db } from './firebase';
import { doc, collection, addDoc, getDoc, updateDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import emailService from './emailService';

// Rest of your code...
```

### For expertsService.js:

```javascript
import { db } from './firebase';
import { doc, collection, addDoc, getDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';

// Rest of your code...
```

## Step 3: Clean Installation

After updating all imports, run these commands:

```
npm cache clean --force
npm install
```

## Common Firebase Import Patterns

### Firestore
```javascript
import { getFirestore, doc, collection, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
```

### Authentication
```javascript
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
```

### Storage
```javascript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
```

## Important Notes

1. Firebase v9+ uses a modular approach that requires explicit imports for each function.
2. Always separate imports from different Firebase modules (auth, firestore, etc.) into different import statements.
3. When you see "module has no exports" errors, it means the import structure is incorrect.

By following these patterns, your Firebase imports should work correctly with Firebase v10.1.0. 