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

// Model Choosing
const GEMINI_MODEL = 'gemini-2.5-flash';
// const GEMINI_MODEL = 'gemini-2.5-flash-lite';
// const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
            item: { type: "STRING", description: "The name of the grocery item." },
            quantity: { type: "STRING", description: "The amount/quantity (e.g., '2', '1 kg', '1'). Default is '1'." },
            category: { type: "STRING", description: "The category (e.g., 'Produce', 'Dairy', 'Meat'). Default is 'Uncategorized'." },
            shelfLife: { type: "STRING", description: "Estimated shelf life in days if known, else null." }
          },
          required: ["item"],
        },
      },
      {
        name: "add_multiple_list_items",
        description: "Adds multiple grocery items to the list the user is currently viewing at once. Use this when the user lists two or more items.",
        parameters: {
          type: "OBJECT",
          properties: {
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
          required: ["items"]
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

        3. ADDING STANDALONE GROCERIES (CATALOG MATCHING REQUIRED):
        - When a user asks to add items to a list (either globally or to a specific list ID), you MUST FIRST call 'fetch_grocery_catalog' to retrieve the master list of known items.
        - Match the user's requested items against the catalog. This matching MUST be fuzzy and case-insensitive. Account for singular/plural variations (e.g., "rice" matches "Rice", "anchovy" matches "Anchovies").
        - If a matched item is found in the catalog, use the exact 'category' and 'shelfLife' from the catalog when adding it.
        - If an item CANNOT be found in the catalog, you MUST default its category to 'Uncategorized' and its shelfLife to '7'.
        - Once catalog lookup is complete, proceed to add the items. Use 'add_single_list_item' or 'add_multiple_list_items' if they provided a specific list ID.

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
        After successfully calling ANY tool, you MUST output a friendly, natural language response to the user confirming that the action was completed.`
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
      contentsPayload.push({ role: "model", parts: [step.originalPart] });
      contentsPayload.push({ role: "function", parts: [{ functionResponse: step.functionResponse }] });
    });
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: systemInstruction,
        contents: contentsPayload,
        tools: tools,
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API Error');

    const parts = data.candidates?.[0]?.content?.parts || [];

    console.log(`\n[DEBUG] Raw Gemini Parts Array:`);
    console.log(JSON.stringify(parts, null, 2));
    console.log(`-------------------------------------------------\n`);

    const toolPart = parts.find(p => p.functionCall);
    const textPart = parts.find(p => p.text);

    // For debugging, AI internal thinking
    if (textPart && textPart.text.trim()) {
        console.log(`[AI THOUGHT PROCESS]:\n"${textPart.text.trim()}"\n`);
    }

    if (toolPart) {
      console.log("Instructing Frontend to run tool:", toolPart.functionCall.name);

      // Send the specific part containing the tool back to the frontend
      return res.json({
        action: 'tool_call',
        originalPart: toolPart
      });
    }

    // Otherwise, return the normal text response
    console.log("Raw Gemini Parts:", JSON.stringify(parts, null, 2));
    const botResponseText = parts
      .filter(p => p.text)
      .map(p => p.text)
      .join('\n') || "I'm not sure how to handle that.";

    res.json({
      action: 'reply',
      reply: botResponseText
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: 'Something went wrong on the server' });
  }
});


app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log(`Active Gemini Model: ${GEMINI_MODEL}\n`);
});
