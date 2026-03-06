import { fetchAuthSession } from 'aws-amplify/auth';
import { Platform } from 'react-native';

const LOCAL_SERVER_URL = Platform.select({
  android: 'http://192.168.100.34:3000/chat', 
  ios: 'http://192.168.100.34:3000/chat',
  default: 'http://192.168.100.34:3000/chat',
});

export const sendMessageToGemini = async (userMessage, recipesContext = [], updatedMessages = []) => {
  console.log(`[Connecting] Sending message to: ${LOCAL_SERVER_URL}`);

  const session = await fetchAuthSession();
  const userToken = session.tokens?.idToken?.toString();

  try {
    const response = await fetch(LOCAL_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        message: userMessage, 
        recipes: recipesContext,
        history: updatedMessages
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Server Error: ${response.status} - ${errorData.error || 'Unknown'}`);
    }

    const data = await response.json();
    return data.reply; 

  } catch (error) {
    console.error('Connection Error:', error);
    return "I'm having trouble connecting to the server.";
  }
};