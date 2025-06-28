# Shopify Integration for Nutrition Experts Platform

## Overview

This document outlines the integration of Shopify's Storefront API with the existing Firebase authentication system in the Nutrition Experts Platform.

## Integration Features

- **Dual Authentication System**: Users are authenticated through both Shopify and Firebase
- **User Mapping**: Shopify customers are mapped to Firebase users
- **Synchronized Registration**: New users are created in both systems
- **Fallback Mechanisms**: Error handling and recovery if one system fails

## Architecture

The integration follows these principles:

1. **Shopify First**: Authentication is always attempted with Shopify first
2. **Firebase Mapping**: All Shopify customers have a corresponding Firebase user
3. **Unified Experience**: Users only need to authenticate once

## Authentication Flows

### Registration Flow

1. User enters email, password, and profile information
2. Customer is created in Shopify via Storefront API
3. User is created in Firebase with the same credentials
4. User data is stored in Firestore with Shopify customer ID

### Login Flow

1. User enters email and password
2. Authentication is attempted with Shopify
3. If successful, checks if user exists in Firebase
4. If user doesn't exist in Firebase (but exists in Shopify), creates a mapping
5. Authentication is completed with Firebase
6. User is directed to the appropriate dashboard based on user type

## Technical Implementation

### Key Files

- `src/services/shopifyService.js`: Contains all Shopify Storefront API interaction
- `src/services/firebase.js`: Updated to integrate with Shopify
- `src/pages/AuthPage.js`: User interface for authentication
- `src/components/ExpertRegistrationForm.js`: Expert registration with Shopify integration

### Shopify API Configuration

```javascript
// Shopify API credentials
const SHOPIFY_ACCESS_TOKEN = '3476fc91bc4860c5b02aea3983766cb1';
const SHOPIFY_API_KEY = '307e11a2d080bd92db478241bc9d20dc';
const SHOPIFY_API_SECRET = '21eb801073c48a83cd3dc7093077d087';
const SHOPIFY_DOMAIN = 'nutrition-experts-store.myshopify.com';
```

## Error Handling

- **Shopify Errors**: Friendly error messages for common Shopify errors
- **Firebase Errors**: User-friendly messages for Firebase authentication issues
- **Partial Failures**: Recovery mechanisms for cases where one system succeeds and the other fails

## Maintenance Notes

- Shopify Storefront API version is set to `2023-07` - update as needed
- Customer data mapping is stored in the `users` collection in Firebase
- The field `shopifyMapped: true` indicates a user has been properly mapped

## Future Enhancements

- Add Shopify customer recovery mechanism
- Implement Shopify checkout integration
- Extend customer profile sync between systems 