const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ====================================
// MODEL ROUTING (FALLBACK WATERFALL)
// ====================================
const FALLBACK_MODELS = [
  'gemini-2.5-flash',       
  'gemini-2.5-flash-lite',
  'gemini-3-flash-preview', 
];

// ====================================
// AI FALLBACK EXECUTION LOOP
// ====================================
async function callGeminiWithFallback(requestBody, apiKey) {
  let lastError = null;

  for (const model of FALLBACK_MODELS) {
    console.log(`\n[AI Routing] Attempting request with model: ${model}...`);
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      // Check for standard HTTP/API errors (e.g., 500, 429)
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // THE GLITCH CATCHER: Check for silent empty array failures
      const candidates = data.candidates;
      if (!candidates || candidates.length === 0) {
         throw new Error("Model returned no candidates.");
      }
      
      const parts = candidates[0].content?.parts;
      if (!parts || parts.length === 0) {
         throw new Error("Model silent failure: Returned empty parts array [].");
      }

      // Success! Return the data and exit the loop.
      console.log(`[AI Routing] Success with ${model}!`);
      return data; 

    } catch (error) {
      console.warn(`[AI Routing] ${model} failed:`, error.message);
      lastError = error;
    }
  }

  // If the loop finishes, all models have failed.
  console.error("[AI Routing] FATAL: All fallback models exhausted.");
  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

// ====================================
// DEFINE THE TOOLS FOR GEMINI
// ====================================
const tools = [
  {
    function_declarations: [
      {
        name: "get_user_lists",
        description: "Fetches all the grocery lists owned by the user. Use this FIRST when a user wants to add an item to a list.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "create_new_list",
        description: "Creates a new empty grocery list for the user.",
        parameters: {
          type: "OBJECT",
          properties: {
            listName: { type: "STRING", description: "The name of the new list." },
            color: { type: "STRING", description: "A hex color code for the list. Default to '#007AFF' if not specified." }
          },
          required: ["listName"],
        },
      },
      {
        name: "fetch_grocery_catalog",
        description: "Fetches the master catalog of all known grocery items, their standard categories, and default shelf lives. Use this to look up item details before adding them to a list.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "add_single_list_item",
        description: "Adds a single grocery item directly to the list the user is currently viewing. Use this when the prompt explicitly tells you the list ID they are viewing.",
        parameters: {
          type: "OBJECT",
          properties: {
            listId: { type: "STRING", description: "The ID of the target list. If you just created a list, use the ID returned from create_new_list." },
            item: { type: "STRING", description: "The name of the grocery item." },
            quantity: { type: "STRING", description: "The amount/quantity (e.g., '2', '1 kg', '1'). Default is '1'." },
            category: { type: "STRING", description: "The category (e.g., 'Produce', 'Dairy', 'Meat'). Default is 'Uncategorized'." },
            shelfLife: { type: "STRING", description: "Estimated shelf life in days if known, else null." }
          },
          required: ["listId", "item"],
        },
      },
      {
        name: "add_multiple_list_items",
        description: "Adds multiple grocery items to the list the user is currently viewing at once. Use this when the user lists two or more items.",
        parameters: {
          type: "OBJECT",
          properties: {
            listId: { type: "STRING", description: "The ID of the target list. If you just created a list, use the ID returned from create_new_list." },
            items: {
              type: "ARRAY",
              description: "An array of grocery items to add.",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING", description: "The name of the grocery item." },
                  quantity: { type: "STRING", description: "The amount/quantity (e.g., '2', '1 kg'). Default is '1'." },
                  category: { type: "STRING", description: "The category (e.g., 'Produce', 'Dairy', 'Pantry'). Default is 'Uncategorized'." },
                  shelfLife: { type: "STRING", description: "Estimated shelf life in days if known, else null." }
                },
                required: ["name"]
              }
            }
          },
          required: ["listId", "items"]
        }
      },
      {
        name: "get_recipes",
        description: "Fetches the available recipe catalog from the database.",
        parameters: {
          type: "OBJECT",
          properties: {
            mealType: { type: "STRING", description: "Optional filter (e.g., 'breakfast', 'dinner')." }
          }
        },
      },
      {
        name: "create_meal_plan",
        description: "Saves a finalized meal plan to the database. Call this ONLY after the user explicitly agrees to the meal plan.",
        parameters: {
          type: "OBJECT",
          properties: {
            planName: { type: "STRING", description: "A catchy title for the meal plan." },
            days: {
              type: "ARRAY",
              description: "An array representing the days in the meal plan.",
              items: {
                type: "OBJECT",
                properties: {
                  dayLabel: { type: "STRING", description: "e.g., 'Day 1', 'Day 2'" },
                  meals: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        type: { type: "STRING", description: "e.g., 'Breakfast', 'Lunch', 'Dinner'" },
                        recipeId: { type: "STRING", description: "The ID of the chosen recipe from the catalog." }
                      },
                      required: ["type", "recipeId"]
                    }
                  }
                },
                required: ["dayLabel", "meals"]
              }
            }
          },
          required: ["planName", "days"],
        },
      },
      {
        name: "get_fridge_items",
        description: "Fetches the current ingredients the user has in their fridge or pantry. Use this when the user asks what they can make with what they already have.",
        parameters: {
          type: "OBJECT",
          properties: {
            listId: { type: "STRING", description: "The ID of the list/fridge to check. YOU MUST GET THIS FROM get_user_lists FIRST." }
          },
          required: ["listId"],
        },
      }
    ],
  },
];

// ====================================
// CHAT ENDPOINT
// ====================================
app.post('/chat', async (req, res) => {
  const { message, history, intermediateSteps, recipes } = req.body;

  console.log(`-> User Message: "${message}"`);
  console.log(`-> History Length: ${history ? history.length : 0} messages`);
  console.log(`-> Intermediate Steps: ${intermediateSteps ? intermediateSteps.length : 0} steps`);
  console.log(`-> Recipes Received: ${recipes ? recipes.length : 0} recipes`);

  const recipeCatalogText = recipes && recipes.length > 0
    ? JSON.stringify(recipes, null, 2)
    : "No recipes currently available in the database.";

  const systemInstruction = {
    parts: [{
      text: `You are an expert culinary AI assistant inside the Grocify app. 
        
        AVAILABLE RECIPES CATALOG:
        ${recipeCatalogText}
        
        CRITICAL RULES & BEHAVIORS:

        1. STRICT ALLERGY & DIETARY COMPLIANCE (CRITICAL):
        If the user specifies any "Allergies", dietary restrictions, or religious diets (e.g., "Halal", "Vegan", "Vegetarian", "Keto") either in conversation or via a structured form, you MUST strictly enforce them. 
        - You must meticulously cross-reference both the literal ingredients AND the cultural context of the recipe names in the catalog. 
        - For example, if "Halal" is specified, you are STRICTLY FORBIDDEN from including any recipes containing pork (e.g., Bak Kut Teh, Bacon, Ham), alcohol, or non-halal meats, even if the specific ingredient isn't explicitly listed but is traditional to the dish.

        2. MEAL PLAN VARIETY (NO SEQUENTIAL PICKING):
        When generating a multi-day meal plan, DO NOT just pick the first items in the catalog in order. You MUST randomly scatter and shuffle your selections across the entire catalog.

        3. ADDING STANDALONE GROCERIES & CREATING LISTS (CATALOG MATCHING REQUIRED):
        - STEP 1 (PREP): If the user asks to create a new list, call 'create_new_list'. ALWAYS call 'fetch_grocery_catalog' to get item data. (These can be done in parallel).
        - MATCHING (CRITICAL): Before adding the items, match the user's requested items against the fetched catalog. This matching MUST be fuzzy and case-insensitive. Account for singular/plural variations (e.g., "rice" matches "Rice", "anchovies" matches "Anchovy", "eggs" matches "Egg").
        - CATEGORIZATION: If a matched item is found in the catalog, strictly use the exact 'category', 'name', and 'shelfLife' from the catalog. If an item CANNOT be found, default its category to 'Uncategorized' and its shelfLife to '7'.
        - STEP 2 (EXECUTION - CRITICAL): Once the catalog matching is complete and you have the target listId, you MUST physically call the 'add_multiple_list_items' or 'add_single_list_item' tool in the very next turn to save the items to the database. 
        - ANTI-HALLUCINATION (CRITICAL): NEVER reply with text saying "I have added the items" unless you have ACTUALLY fired the 'add_multiple_list_items' or 'add_single_list_item' tool. You cannot add items using plain text.
        
        4. COOKING FROM THE FRIDGE (SINGLE MEAL ONLY):
        If the user asks for meal recommendations based on what is in their fridge:
        - If they provide a specific list ID, you MUST call 'get_fridge_items' using that ID immediately. Do not skip this step.
        - If they want to check "ALL" lists, call 'get_user_lists', pick their main list yourself, and call 'get_fridge_items'. 
        - CRITICAL: DO NOT ask the user which list to choose.
        - Analyze the ingredients and suggest ONLY ONE specific recipe they can make right now. 
        - IF THEY HAVE VERY FEW ITEMS: Do not say the list is empty. You MUST be creative and invent a custom recipe using whatever random ingredients they have available to prevent food waste.
        - MANDATORY OUTPUT FORMAT: You MUST structure your response with exactly these three sections:
            1. Recipe Name
            2. Ingredients to Use
            3. Step-by-Step Cooking Instructions (You must provide clear, numbered steps on how to cook the dish).
        
        5. STRICT RECIPE SUGGESTION LIMITS (MAX 3 - CRITICAL):
        - For general recipe requests or single meal suggestions, ONLY suggest recipes from the AVAILABLE RECIPES CATALOG.
        - When the user asks for a recipe suggestion or names a meal category, you are STRICTLY FORBIDDEN from listing all available options.
        - You MUST randomly select exactly 1 to 3 recipes to suggest, completely ignore the rest.
        - EXCEPTION (MULTI-DAY PLANS): If the user explicitly asks you to build a multi-day meal plan, the 3-recipe limit is lifted.

        6. THE "AUTO-SAVE" FORM OVERRIDE (CRITICAL):
        If the user sends a structured prompt containing "Name", "Meals included", and "Allergies":
        - You MUST immediately call the 'create_meal_plan' tool to save it. 
        - Do NOT ask the user for confirmation first. Just build it, run the tool, and tell them it's done!

        7. EXACT NAMING:
        When calling 'create_meal_plan', you MUST use the exact Name the user provided in their structured prompt for the 'planName' parameter.

        8. CHAT FORMATTING:
        Never show the raw Recipe IDs (e.g., bf_001, ln_002) to the user in your conversational text. Only use the names of the dishes.
        
        9. CONFIRMATION MESSAGE & PLAN DISPLAY (CRITICAL):
        After successfully calling ANY tool, you MUST output a friendly, natural language response to the user confirming that the action was completed.
        
        10. TERMINATION PROTOCOL (CRITICAL):
        - Once you have successfully executed a terminal action, YOU ARE DONE. Do not double-check your work, and do not call any further tools.
        - "Terminal actions" include:
            A) Successfully calling 'add_single_list_item' or 'add_multiple_list_items'.
            B) Successfully calling 'create_meal_plan'.
            C) Analyzing 'get_fridge_items' and outputting a recipe.
        - After a terminal action, your very next response MUST be a friendly text summary confirming the success of the action (e.g., listing the items added or summarizing the meal plan).
        - If you see tool results in your history that show an action was already completed successfully, DO NOT repeat the action.
        `
    }]
  };

  // Format history for Gemini
  let geminiHistoryArray = [];
  if (history && history.length > 0) {
    geminiHistoryArray = history.map(msg => ({
      role: msg.sender === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));
  }

  // --- PAYLOAD LOGIC ---
  let contentsPayload = [
    ...geminiHistoryArray,
    { role: "user", parts: [{ text: message }] }
  ];

  if (intermediateSteps && intermediateSteps.length > 0) {
    intermediateSteps.forEach(step => {
      contentsPayload.push({ role: "model", parts: step.modelParts });
      contentsPayload.push({ role: "function", parts: step.functionParts });
    });
  }

  try {
    // Prepare the full request body
    const requestBody = {
      systemInstruction: systemInstruction,
      contents: contentsPayload,
      tools: tools,
    };

    // Call the fallback waterfall instead of a direct fetch!
    const data = await callGeminiWithFallback(requestBody, GEMINI_API_KEY);

    // Process the successful result
    const parts = data.candidates[0].content.parts;

    console.log(`\n[DEBUG] Raw Gemini Parts Array:`);
    console.log(JSON.stringify(parts, null, 2));
    console.log(`-------------------------------------------------\n`);

    // --- Check for ANY tool calls (Parallel Support) ---
    const hasFunctionCall = parts.some(p => p.functionCall);
    const textPart = parts.find(p => p.text); 

    if (textPart && textPart.text.trim()) {
        console.log(`[AI THOUGHT PROCESS]:\n"${textPart.text.trim()}"\n`);
    }

    if (hasFunctionCall) {
      console.log(`[ACTION] Instructing Frontend to run ${parts.filter(p => p.functionCall).length} tool(s).`);

      return res.json({
        action: 'tool_call',
        allParts: parts 
      });
    }

    // Otherwise, return the normal text response
    const botResponseText = textPart ? textPart.text : "I'm not sure how to handle that.";

    res.json({
      action: 'reply',
      reply: botResponseText
    });

  } catch (error) {
    console.error("\nServer Error:", error);
    res.status(500).json({ error: 'Something went wrong on the server', details: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log(`Active AI Routing: ${FALLBACK_MODELS.join(' -> ')}\n`);
});
