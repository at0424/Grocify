import { get } from 'aws-amplify/api';

const API_NAME = 'GroceryAPI'; 

// Fetch the catalog
export const fetchGroceryCatalog = async () => {
  try {
    const operation = get({ 
      apiName: API_NAME,
      path: '/getGroceryCatalog' 
    });            
    
    const response = await operation.response;
    return await response.body.json(); 
  } catch (error) {
    console.error("Error fetching catalog:", error);
    throw error; 
  }
};

// Fetch Lists for a specific user
export const fetchUserLists = async (userId) => {
  try {
    const operation = get({ 
      apiName: API_NAME,
      path: `/getUserLists?userId=${userId}`
    });
    
    const response = await operation.response;
    return await response.body.json();
  } catch (error) {

    // Error handling for user with no lists
    const isNotFound = 
      error.response?.statusCode === 404 || 
      error.message?.includes('Not Found');

    if (isNotFound) {
      return []; 
    }
    console.error("Critical error fetching user lists:", error);
    return []; 
  }
}; 