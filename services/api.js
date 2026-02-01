import { del, get, post } from 'aws-amplify/api';

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

// Create a new list for a user
export const createNewList = async (userId, listName, color) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/createList',
      options: {
        body: {
          userId: userId,
          listName: listName,
          color: color
        }
      }
    });
    
    const response = await operation.response;
    const json = await response.body.json();
    

    return { success: true, data: json };

  } catch (error) {
    console.error("Error creating list:", error);
    return { success: false, error: error.message };
  }
};

// Rename List
export const updateUserList = async (listId, newName) => {
  try {
    const operation = put({ 
      apiName: API_NAME,
      path: '/updateList',
      options: {
        body: { listId, listName: newName }
      }
    });
    const response = await operation.response;
    return await response.body.json();
  } catch (error) {
    console.error("Error updating list:", error);
    return { success: false };
  }
};

// Delete List
export const deleteUserList = async (listId, userId) => {
  try {
    // 'del' or 'remove' depends on version
    const operation = del({ 
      apiName: API_NAME,
      path: `/deleteList?listId=${listId}&userId=${userId}`
    });
    const response = await operation.response;
    return await response.body.json();
  } catch (error) {
    console.error("Error deleting list:", error);
    return { success: false };
  }
};

// Fetch Grocery List Details
export const fetchGroceryListDetails = async (listId) => {
  try {
    const operation = get({ 
      apiName: API_NAME,
      path: `/getGroceryListDetails?listId=${listId}`
    });
    
    const response = await operation.response;
    const json = await response.body.json();
    
    // The Lambda returns the whole object. We mostly care about the 'items' array.
    // If 'items' is missing, we default to []
    return json.items || []; 

  } catch (error) {
    console.error("Error fetching list details:", error);
    return [];
  }
};

// Add item to Grocery List
export const addListItems = async (listId, name, quantity, category) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/addListItems',
      options: {
        body: {
          listId,
          name,
          quantity,
          category
        }
      }
    });
    
    const response = await operation.response;
    return await response.body.json();
  } catch (error) {
    console.error("Error adding item:", error);
    return { success: false };
  }
};

// Toggle item to check or uncheck
export const toggleGroceryItem = async (listId, itemId) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/toggleItem',
      options: {
        body: { listId, itemId }
      }
    });
    return await operation.response;
  } catch (error) {
    console.error("Error toggling item:", error);
    return null;
  }
};
