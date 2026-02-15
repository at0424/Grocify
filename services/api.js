import { del, get, post, put } from 'aws-amplify/api';

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
    return { 
      success: false,
      message: error.message || String(error)
    };
  }
};

// To remove collaborator from a list (only owner)
export const removeCollaborator = async (listId, userIdToRemove, requesterId) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/removeCollaborator',
      options: { body: { listId, userIdToRemove, requesterId } }
    });
    const response = await operation.response;
    return await response.body.json();
  } catch (error) {
    console.error("Error removing user:", error);
    return { success: false, message: error.message };
  }
};

// Fetch Collaborators from listId
export const fetchCollaborators = async (listId, requesterId) => {
  try {
    const operation = post({ 
      apiName: API_NAME, 
      path: `/getCollaborators`,
      options: {
        body: { 
          listId: listId,
          requesterId: requesterId
        }
      }
    });
    const response = await operation.response;
    return await response.body.json();
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return { success: false, collaborators: [], requesterRole: 'collaborator' };
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

// Add Collaborator to List
export const shareList = async (listId, email) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/addCollaborator',
      options: {
        body: { listId, email }
      }
    });
    const response = await operation.response;
    return await response.body.json();
  } catch (error) {
    console.error("Error sharing list:", error);
    return { success: false, error: error.message };
  }
};

// Add item to Grocery List
export const addListItems = async (listId, name, quantity, category, shelfLife) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/addListItems',
      options: {
        body: {
          listId,
          name,
          quantity,
          category,
          shelfLife,
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
export const toggleGroceryItem = async (listId, itemId, checkedBy) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/toggleItem',
      options: {
        body: { 
          listId, 
          itemId,
          checkedBy,
        }
      }
    });
    return await operation.response;
  } catch (error) {
    console.error("Error toggling item:", error);
    return null;
  }
};

// Fetch fridge item for item freshness dashboard
export const fetchFridgeItems = async (listId) => {
  try {
    const operation = get({ 
      apiName: API_NAME, 
      path: '/getFridgeItems', 
      options: {
        queryParams: { 
          listId: listId
        }
      }
    });

    const response = await operation.response;
    
    let data;
    if (response.body && typeof response.body.json === 'function') {
        data = await response.body.json();
    } else {
        data = await response.json ? await response.json() : response; 
    }

    console.log(`Fetch success for ${listId}`); 
    return data;

  } catch (error) {
    console.error(`Error fetching fridge ${listId}:`, error);
    if (error.response) {
        console.error("Error Response Body:", await error.response.body.text());
    }
    return { success: false, items: [] }; 
  }
};

// To update item properties in freshness dashboard
export const updateFridgeItem = async (listId, itemId, action, newDate = null) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/updateFridgeItem', 
      options: {
        body: { 
          listId, 
          itemId,
          action,   // 'CONSUME' or 'UPDATE_DATE'
          newDate
        }
      }
    });
    return await operation.response;
  } catch (error) {
    console.error("Error updating fridge item:", error);
    return null;
  }
};

// Fetch meal plan for individual user
export const fetchUserMealPlan = async (userId) => {
  try {
    const operation = get({ 
      apiName: API_NAME, 
      path: '/getUserPlan',        
      options: {
        queryParams: {
          userId: userId
        }
      }
    });

    const response = await operation.response;
    
    if (response.statusCode === 204) return null;

    const json = await response.body.json();
    return json; 

  } catch (error) {
    console.error("❌ Error fetching user plan:", error);
    return null;
  }
};

// Fetch all or specific mealType of recipes
export const fetchRecipes = async (mealType = null) => {
  try {
    const operation = get({ 
      apiName: API_NAME,
      path: '/getRecipes', 
      options: {
        queryParams: mealType ? { type: mealType } : undefined
      }
    });

    const response = await operation.response;
    const json = await response.body.json();

    return json.data || [];
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return null;
  }
};

// Create Meal Plan
export const createUserPlan = async (planDetails) => {
  try {
    const operation = post({ 
      apiName: API_NAME,
      path: '/createMealPlan',     
      options: {
        body: planDetails
      }
    });

    const response = await operation.response;
  
    const json = await response.body.json();
    return json;

  } catch (error) {
    console.error("❌ Error creating plan:", error);
    throw error; 
  }
};