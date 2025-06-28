import axios from 'axios';

// Shopify API credentials
const SHOPIFY_ACCESS_TOKEN = '3476fc91bc4860c5b02aea3983766cb1';
const SHOPIFY_API_KEY = '307e11a2d080bd92db478241bc9d20dc';
const SHOPIFY_API_SECRET = '21eb801073c48a83cd3dc7093077d087';
const SHOPIFY_DOMAIN = '840a56-3.myshopify.com'; // Updated with a realistic domain

// Storefront API endpoint
const STOREFRONT_API_URL = `https://${SHOPIFY_DOMAIN}/api/2023-07/graphql.json`;

// Create Axios instance for Shopify API calls
const shopifyClient = axios.create({
  baseURL: STOREFRONT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': SHOPIFY_ACCESS_TOKEN
  }
});

// Helper to handle Shopify API errors
const handleShopifyError = (error) => {
  // Network or axios errors
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('Shopify API error response:', error.response.data);
    throw new Error(`Shopify API error: ${error.response.status} - ${error.response.data.errors || 'Unknown error'}`);
  } else if (error.request) {
    // The request was made but no response was received
    console.error('Shopify API no response:', error.request);
    throw new Error('No response from Shopify API. Please check your internet connection.');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Shopify API request error:', error.message);
    throw new Error(`Error setting up request to Shopify: ${error.message}`);
  }
};

/**
 * Create a new customer in Shopify
 * @param {string} email - Customer email
 * @param {string} password - Customer password
 * @param {object} additionalData - Additional customer data (firstName, lastName, etc.)
 * @returns {Promise<object>} - Customer data
 */
export const createShopifyCustomer = async (email, password, additionalData = {}) => {
  const { firstName = '', lastName = '' } = additionalData;
  
  const mutation = `
    mutation customerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      email,
      password,
      firstName,
      lastName,
      acceptsMarketing: false,
    }
  };

  try {
    const response = await shopifyClient.post('', {
      query: mutation,
      variables
    });

    const { data } = response.data;
    
    if (!data || !data.customerCreate) {
      throw new Error('Invalid response from Shopify API');
    }
    
    if (data.customerCreate.customerUserErrors && data.customerCreate.customerUserErrors.length > 0) {
      const errors = data.customerCreate.customerUserErrors;
      throw new Error(errors[0].message || 'Error creating Shopify customer');
    }
    
    if (!data.customerCreate.customer) {
      throw new Error('Customer creation failed in Shopify');
    }
    
    return data.customerCreate.customer;
  } catch (error) {
    console.error('Error creating Shopify customer:', error);
    
    // Check if it's an API error
    if (axios.isAxiosError(error)) {
      handleShopifyError(error);
    }
    
    // If user already exists error, make it more user friendly
    if (error.message && error.message.includes('has already been taken')) {
      throw new Error('An account with this email already exists.');
    }
    
    throw error;
  }
};

/**
 * Authenticate customer with Shopify
 * @param {string} email - Customer email
 * @param {string} password - Customer password
 * @returns {Promise<object>} - Customer access token and data
 */
export const loginShopifyCustomer = async (email, password) => {
  const mutation = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      email,
      password
    }
  };

  try {
    console.log(`Attempting Shopify login for: ${email}`);
    const response = await shopifyClient.post('', {
      query: mutation,
      variables
    });

    console.log('Shopify login response:', JSON.stringify(response.data, null, 2));
    const { data } = response.data;
    
    if (!data || !data.customerAccessTokenCreate) {
      console.error('Invalid response from Shopify API');
      throw new Error('Invalid response from Shopify API');
    }
    
    // Check for errors
    if (data.customerAccessTokenCreate.customerUserErrors && 
        data.customerAccessTokenCreate.customerUserErrors.length > 0) {
      const errors = data.customerAccessTokenCreate.customerUserErrors;
      console.error('Shopify login errors:', errors);
      
      // Make specific error messages more user-friendly
      if (errors[0].code === 'UNIDENTIFIED_CUSTOMER') {
        throw new Error('Email or password is incorrect');
      }
      
      throw new Error(errors[0].message || 'Login failed');
    }
    
    // Make sure we have an access token
    if (!data.customerAccessTokenCreate.customerAccessToken) {
      console.error('Missing access token in Shopify response');
      throw new Error('Authentication failed');
    }
    
    // Get the access token
    const accessToken = data.customerAccessTokenCreate.customerAccessToken.accessToken;
    console.log('Shopify access token obtained successfully');
    
    // Now get customer information using the token
    return await getCustomerByAccessToken(accessToken);
  } catch (error) {
    console.error('Error logging in Shopify customer:', error);
    
    // Check if it's an API error
    if (axios.isAxiosError(error)) {
      handleShopifyError(error);
    }
    
    throw error;
  }
};

/**
 * Get customer information using access token
 * @param {string} accessToken - Customer access token
 * @returns {Promise<object>} - Customer data
 */
export const getCustomerByAccessToken = async (accessToken) => {
  const query = `
    query {
      customer(customerAccessToken: "${accessToken}") {
        id
        email
        firstName
        lastName
        phone
      }
    }
  `;

  try {
    console.log('Fetching customer data with access token');
    const response = await shopifyClient.post('', { query });
    
    console.log('Customer data response:', JSON.stringify(response.data, null, 2));
    
    if (!response.data || !response.data.data || !response.data.data.customer) {
      console.error('Failed to fetch customer data');
      throw new Error('Failed to fetch customer data');
    }
    
    const customer = response.data.data.customer;
    console.log(`Successfully retrieved customer data for: ${customer.email}`);
    
    return customer;
  } catch (error) {
    console.error('Error getting Shopify customer:', error);
    
    // Check if it's an API error
    if (axios.isAxiosError(error)) {
      handleShopifyError(error);
    }
    
    throw error;
  }
};

/**
 * Check if a customer exists in Shopify by email
 * @param {string} email - Customer email to check
 * @returns {Promise<boolean>} - True if customer exists
 */
export const checkShopifyCustomerExists = async (email) => {
  try {
    console.log(`Checking if Shopify customer exists for email: ${email}`);
    
    // Try a different approach to check if a customer exists
    // Use customerQuery to check for existence directly
    const query = `
      query($email: String!) {
        customers(first: 1, query: $email) {
          edges {
            node {
              id
              email
            }
          }
        }
      }
    `;

    const variables = {
      email: email
    };

    try {
      // Since Storefront API doesn't support customer queries, we'll try a different approach
      // Instead of querying, let's try to recover the account and check the error code
      const recoveryMutation = `
        mutation customerRecover($email: String!) {
          customerRecover(email: $email) {
            customerUserErrors {
              code
              message
            }
          }
        }
      `;

      const recoveryResponse = await shopifyClient.post('', {
        query: recoveryMutation,
        variables: { email }
      });

      console.log('Shopify customer recovery check response:', JSON.stringify(recoveryResponse.data, null, 2));

      // If we don't get a specific error saying the customer doesn't exist, assume they do exist
      if (recoveryResponse.data && 
          recoveryResponse.data.data && 
          recoveryResponse.data.data.customerRecover) {
        
        const errors = recoveryResponse.data.data.customerRecover.customerUserErrors || [];
        const hasNonExistentError = errors.some(error => 
          error.code === 'CUSTOMER_DOES_NOT_EXIST' || 
          error.message.includes('does not exist') || 
          error.message.includes('not found')
        );
        
        // If there's no error about the customer not existing, the customer likely exists
        const customerExists = !hasNonExistentError;
        console.log(`Shopify customer exists check result from recovery: ${customerExists}`);
        console.log('Error codes:', errors.map(e => e.code).join(', '));
        
        return customerExists;
      }
    } catch (apiError) {
      console.error('Error with recovery approach:', apiError);
    }

    // If the above approach doesn't work, fall back to our previous method
    const mutation = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
          }
          customerUserErrors {
            code
            message
          }
        }
      }
    `;

    const variables2 = {
      input: {
        email,
        password: "ThisIsADummyPasswordThatWillNeverWork123!@#"
      }
    };

    const response = await shopifyClient.post('', {
      query: mutation,
      variables: variables2
    });

    console.log('Shopify customer existence check response (fallback):', JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.data || !response.data.data.customerAccessTokenCreate) {
      console.error('Invalid response format from Shopify API');
      return false;
    }

    const { customerUserErrors } = response.data.data.customerAccessTokenCreate;
    
    // Check the error codes to determine if user exists
    const errorCodes = customerUserErrors.map(e => e.code);
    console.log('Error codes (fallback):', errorCodes.join(', '));
    
    // If the error is UNIDENTIFIED_CUSTOMER, user doesn't exist
    // Otherwise, assume user exists
    const customerExists = !errorCodes.includes('UNIDENTIFIED_CUSTOMER');
    
    console.log(`Shopify customer exists check result (fallback): ${customerExists}`);
    
    return customerExists;
  } catch (error) {
    console.error('Error checking if Shopify customer exists:', error);
    
    // In case of an error, default to false (safer)
    return false;
  }
}; 