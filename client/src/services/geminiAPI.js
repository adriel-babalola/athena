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
      // Try to parse as JSON, but handle HTML errors
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error (${response.status})`);
      } catch (jsonError) {
        // If it's not JSON, it's likely an HTML error page
        throw new Error(`Server error (${response.status}). Make sure the backend is running.`);
      }
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

export async function findVideosForImage(base64Image) {
  try {
    const response = await fetch(`${API_URL}/api/find-videos-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      // Try to parse as JSON, but handle HTML errors
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error (${response.status})`);
      } catch (jsonError) {
        // If it's not JSON, it's likely an HTML error page
        if (response.status === 404) {
          throw new Error('Image endpoint not found. Make sure the backend is running.');
        }
        throw new Error(`Server error (${response.status}). Make sure the backend is running.`);
      }
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Image API Error:', error);

    if (error.message?.includes('API key')) {
      throw new Error('Invalid API key. Check server .env file.');
    }

    if (error.message?.includes('fetch')) {
      throw new Error('Cannot connect to server. Make sure the backend is running.');
    }

    if (error.message?.includes('endpoint')) {
      throw new Error('Cannot connect to server. Make sure the backend is running.');
    }

    throw new Error(error.message || 'Failed to process image. Check internet and try again.');
  }
}
