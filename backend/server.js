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

// DEBUG: Check if API key is loaded
if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY is missing in .env file!");
} else {
  console.log(`API Key loaded: ${GEMINI_API_KEY.substring(0, 5)}...`);
}

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    // Call Gemini API from the server 
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API Error');
    }

    // Send only the necessary text back to the app
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ reply: botResponse });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong on the server' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});