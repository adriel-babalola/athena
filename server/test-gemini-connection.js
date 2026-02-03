import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
  if (!API_KEY) {
    console.error('No GEMINI_API_KEY found in .env');
    process.exit(1);
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models`;
  try {
    const res = await fetch(`${url}?key=${API_KEY}`);
    const data = await res.json();
    if (res.ok) {
      console.log('✅ Gemini API reachable. Available models:');
      console.log(data);
    } else {
      console.error('❌ Gemini API error:', data);
    }
  } catch (e) {
    console.error('❌ Network or fetch error:', e);
  }
}

testGemini();
