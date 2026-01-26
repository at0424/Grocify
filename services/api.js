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