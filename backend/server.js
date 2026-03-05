const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
// const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent';

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
        name: "add_to_list",
        description: "Adds an ingredient to a SPECIFIC grocery list.",
        parameters: {
          type: "OBJECT",
          properties: {
            listId: { type: "STRING", description: "The ID of the list to add the item to. YOU MUST GET THIS FROM get_user_lists OR create_new_list FIRST." },
            item: { type: "STRING" },
            quantity: { type: "STRING", description: "Default is '1'." },
            category: { type: "STRING", description: "Default is 'Uncategorized'." },
            shelfLife: { type: "STRING" }
          },
          required: ["listId", "item"],
        },
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
  const { message, history, originalPart, functionResponse, recipes } = req.body;

  const recipeCatalogText = recipes && recipes.length > 0
    ? JSON.stringify(recipes, null, 2)
    : "No recipes currently available in the database.";

  const systemInstruction = {
    parts: [{
      text: `You are an expert culinary AI assistant inside the Grocify app. 
        
        AVAILABLE RECIPES CATALOG:
        ${recipeCatalogText}
        
        CRITICAL RULES & BEHAVIORS:

        1. MEAL PLAN VARIETY (NO SEQUENTIAL PICKING):
        When generating a multi-day meal plan, DO NOT just pick the first items in the catalog in order (e.g., do not pick recipe 1, 2, and 3 for Day 1). You MUST randomly scatter and shuffle your selections across the entire catalog to provide a diverse, interesting menu. Do not repeat recipes unless asked.

        2. ADDING STANDALONE GROCERIES:
        If the user asks to add specific items (e.g., "add 3 apples" or "add milk"), you do not need a meal plan. 
        - First, use 'get_user_lists' to find their lists.
        - Ask which list to add to (or if they want a new one).
        - Then use 'add_to_list'.

        3. COOKING FROM THE FRIDGE:
        If the user asks for meal recommendations based on what is in their fridge:
        - First, use 'get_user_lists' to find their lists.
        - Ask the user which list represents their fridge/pantry.
        - Call 'get_fridge_items' using that listId.
        - Suggest a meal using those ingredients. 
        - Exception to the Catalog Rule: Prioritize catalog recipes that match their fridge. However, if no catalog recipes match well, you ARE ALLOWED to invent a custom, personalized recipe using their available fridge ingredients to prevent food waste.

        4. CATALOG ENFORCEMENT (Unless Fridge Cooking):
        For standard meal plans or recipe requests, ONLY suggest recipes from the AVAILABLE RECIPES CATALOG. If they ask for something not in the catalog (and aren't doing a fridge challenge), apologize and offer catalog items.`
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

  // Determine the payload structure based on whether this is a normal message or a tool follow-up
  let contentsPayload = [];

  if (functionResponse && originalPart) {
    // SCENARIO 2: The frontend just finished running a tool and is sending the data back
    contentsPayload = [
      ...geminiHistoryArray,
      { role: "user", parts: [{ text: message }] },                         // 1. User's original request
      { role: "model", parts: [originalPart] },                         // 2. AI's request to call the tool
      { role: "function", parts: [{ functionResponse: functionResponse }] } // 3. The result from React Native
    ];
  } else {
    // SCENARIO 1: A brand new message from the user
    contentsPayload = [
      ...geminiHistoryArray,
      { role: "user", parts: [{ text: message }] }
    ];
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
    const toolPart = parts.find(p => p.functionCall);

    if (toolPart) {
      console.log("Instructing Frontend to run tool:", toolPart.functionCall.name);

      // Send the specific part containing the tool back to the frontend
      return res.json({
        action: 'tool_call',
        originalPart: toolPart
      });
    }

    // Otherwise, return the normal text response
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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));