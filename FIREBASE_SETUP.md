# Firebase Setup Instructions

## Error: "Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)"

This error occurs because the application is using placeholder values for the Firebase configuration instead of actual API keys. To fix this issue, follow these steps:

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup instructions
3. Give your project a name (e.g., "nutrition-experts-platform")
4. Enable or disable Google Analytics as per your preference
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, navigate to "Authentication" in the left sidebar
2. Click "Get started"
3. Enable the "Email/Password" sign-in method
4. Save your changes

## Step 3: Set Up Firestore Database

1. In your Firebase project, navigate to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Start in production mode or test mode (you can adjust security rules later)
4. Select a location closest to your users
5. Click "Enable"

## Step 4: Get Your Firebase Configuration

1. Click on the gear icon (⚙️) next to "Project Overview" and select "Project settings"
2. Scroll down to the "Your apps" section
3. If you haven't added a web app yet, click the web icon (</>) to add one
4. Register your app with a nickname (e.g., "nutrition-experts-web")
5. You'll see your Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Add Your Firebase Configuration to the Application

### Option 1: Direct in the Code

Open `src/services/firebase.js` and replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

### Option 2: Using Environment Variables (Recommended)

1. Create a file named `.env` in the root directory of your project
2. Add your Firebase configuration as environment variables:

```
REACT_APP_FIREBASE_API_KEY=YOUR_ACTUAL_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_ACTUAL_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID=YOUR_ACTUAL_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_ACTUAL_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_ACTUAL_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID=YOUR_ACTUAL_APP_ID
```

3. Save the file and restart your development server

## Important Security Notes

- Never commit your actual Firebase API keys to public repositories
- Add `.env` to your `.gitignore` file to prevent accidentally committing sensitive information
- For production deployments, set up environment variables in your hosting platform 