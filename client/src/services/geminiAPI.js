// In production (Vercel), use relative URL. In dev, use local server.
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

export async function findVideosForText(confusingText) {
  try {
    const response = await fetch(`${API_URL}/api/find-videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: confusingText }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server error');
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('API Error:', error);

    if (error.message?.includes('API key')) {
      throw new Error('Invalid API key. Check server .env file.');
    }

    if (error.message?.includes('fetch')) {
      throw new Error('Cannot connect to server. Make sure the backend is running.');
    }

    throw new Error(error.message || 'Failed to connect. Check internet and try again.');
  }
}
