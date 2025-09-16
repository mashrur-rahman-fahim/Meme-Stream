import { getApiBaseUrl } from "../utils/api-config";

export const reactToMessage = async (messageId, emoji, token) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/MessageReacton`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        MessageId: messageId,
        Emoji: emoji
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error reacting to message:', error);
    throw error;
  }
};

export const getMessageReactions = async (messageId, token) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/MessageReacton/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching reactions:', error);
    throw error;
  }
};