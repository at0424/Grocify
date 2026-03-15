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
  const { message, history, intermediateSteps, recipes } = req.body;

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
        When generating a multi-day meal plan, DO NOT just pick the first items in the catalog in order (e.g., do not pick recipe 1, 2, and 3 for Day 1). You MUST randomly scatter and shuffle your selections across the entire catalog to provide a diverse, interesting menu.

        2. ADDING STANDALONE GROCERIES:
        If the user asks to add specific items, use 'get_user_lists' to find their lists, ask which list to add to, then use 'add_to_list'.

        3. COOKING FROM THE FRIDGE (SINGLE MEAL ONLY):
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
        - If no catalog recipes match, you can suggest recipes out of the catalog.
        
        4. STRICT RECIPE SUGGESTION LIMITS (MAX 3 - CRITICAL):
        - For standard meal plans or general recipe requests, ONLY suggest recipes from the AVAILABLE RECIPES CATALOG.
        - When the user asks for a recipe suggestion or names a meal category (e.g., "Lunch", "What's for dinner?"), you are STRICTLY FORBIDDEN from listing all available options.
        - You MUST randomly select exactly 1 to 3 recipes to suggest, and completely ignore the rest.
        - UNDER NO CIRCUMSTANCES should your response contain more than 3 recipes. Do not use numbered lists that go past 3. 
        - Provide a short, appetizing description for the 3 options you chose to make them sound appealing.

        5. THE "AUTO-SAVE" FORM OVERRIDE (CRITICAL):
        If the user sends a structured prompt containing "Name", "Meals included", and "Allergies" (which happens when they use the native app form), they have already given explicit permission to generate and save the plan. 
        - You MUST immediately call the 'create_meal_plan' tool to save it. 
        - Do NOT ask the user for confirmation first. Just build it, run the tool, and tell them it's done!
        - You MUST strictly respect their requested "Meals included" (e.g., if they omit Breakfast, do not generate Breakfasts).

        6. EXACT NAMING:
        When calling 'create_meal_plan', you MUST use the exact Name the user provided in their structured prompt for the 'planName' parameter.

        7. CHAT FORMATTING:
        Never show the raw Recipe IDs (e.g., bf_001, ln_002) to the user in your conversational text. Only use the names of the dishes. The IDs should ONLY be used behind the scenes when calling tools.
        
        8. CONFIRMATION MESSAGE (CRITICAL):
        After successfully calling ANY tool (especially 'create_meal_plan'), you MUST output a friendly, natural language response to the user confirming that the action was completed. Never stay silent or return an empty response after a tool call.`
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


app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log(`Active Gemini Model: ${GEMINI_MODEL}\n`);
});
