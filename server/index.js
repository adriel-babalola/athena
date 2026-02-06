import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchMultipleQueries, getMultipleVideoDetails } from './ytUtils.js';

dotenv.config();

// Model configuration - change here to switch models
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
// Set to 'true' to skip video verification (faster but less accurate)
const SKIP_VERIFICATION = process.env.SKIP_VERIFICATION === 'true';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is not set in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Athena server is running' });
});

// Main endpoint: Find videos for confusing text
app.post('/api/find-videos', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024, // Smaller = faster
      },
    });
    console.log(`[Gemini] Model: ${GEMINI_MODEL}`);

    const prompt = `You are Athena, an expert AI study companion designed to help students deeply understand difficult academic concepts.

## YOUR MISSION
A student is struggling to understand this text from their studies:
"""
${text}
"""

## ANALYSIS INSTRUCTIONS
1. **Identify the EXACT Topic**: What specific concept is being discussed? (e.g., "Fourier Transform", not just "frequency")
2. **Generate YouTube Search Queries**: Create 3 search queries that DIRECTLY explain this specific topic.

## SEARCH QUERY GUIDELINES
- **CRITICAL**: All queries must be about the SAME main topic, just at different depths
- Include trusted channel names ("3Blue1Brown", "Khan Academy", "Crash Course", "Professor Leonard", "Organic Chemistry Tutor")
- Be SPECIFIC - use the exact terminology from the text
- Example for "Fourier Transform":
  - Beginner: "3Blue1Brown Fourier Transform visual introduction"
  - Intermediate: "Khan Academy Fourier Transform step by step"
  - Advanced: "Fourier Transform applications signal processing"

## RESPONSE FORMAT
Return ONLY valid JSON:
{
  "overview": "A brief 2-3 sentence explanation of the concept in simple terms.",
  "key_concepts": ["main_topic", "related_concept1", "related_concept2"],
  "search_queries": [
    {"query": "specific topic beginner explanation channel_name", "difficulty": "beginner"},
    {"query": "specific topic detailed explanation channel_name", "difficulty": "intermediate"},
    {"query": "specific topic advanced applications", "difficulty": "advanced"}
  ],
  "study_tip": "A helpful tip for understanding this topic"
}`;

    let result, response, responseText;
    try {
      result = await model.generateContent(prompt);
      response = await result.response;
      responseText = response.text();
      console.log('[Gemini] API call successful');
    } catch (err) {
      console.error('[Gemini] API call failed:', err);
      throw err;
    }

    // Clean the response
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const data = JSON.parse(cleanedText);
    
    // Search YouTube for real videos using Gemini's search queries
    if (Array.isArray(data.search_queries) && data.search_queries.length > 0) {
      console.log('[Gemini] Generated search queries:', data.search_queries);
      
      // Search YouTube with the generated queries (in parallel)
      const videos = await searchMultipleQueries(data.search_queries, 2);
      
      if (videos.length > 0) {
        // SPEED OPTION: Skip verification if SKIP_VERIFICATION=true
        if (SKIP_VERIFICATION) {
          console.log('[Speed] Skipping verification for faster response');
          const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
          data.videos = videos
            .sort((a, b) => (difficultyOrder[a.difficulty] || 1) - (difficultyOrder[b.difficulty] || 1))
            .slice(0, 4);
        } else {
          // Verify videos match the topic
          const verifiedVideos = await verifyVideosRelevance(model, text, data.key_concepts, videos);
          data.videos = verifiedVideos.slice(0, 4);
        }
      } else {
        data.videos = [];
      }
      
      console.log(`[YouTube] Final video count: ${data.videos.length}`);
      delete data.search_queries;
    } else {
      data.videos = [];
    }
    
    res.json(data);

  } catch (error) {
    console.error('API Error:', error);

    if (error.message?.includes('API key')) {
      return res.status(401).json({ error: 'Invalid API key. Check server .env file.' });
    }

    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'Failed to parse AI response. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// New endpoint: Find videos for an uploaded image
app.post('/api/find-videos-image', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Extract base64 data (remove data:image/...;base64, prefix if present)
    let base64Data = image;
    if (image.includes(',')) {
      base64Data = image.split(',')[1];
    }

    // Validate base64 is not empty
    if (!base64Data || base64Data.length === 0) {
      return res.status(400).json({ error: 'Image data is invalid' });
    }

    console.log('[Image] Processing base64 image, size:', base64Data.length);

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const prompt = `You are Athena, an expert AI study companion designed to help students deeply understand difficult academic concepts.

## YOUR MISSION
A student has uploaded an image (screenshot, textbook page, notes, etc.) that they're struggling to understand. 
Analyze this image and help them learn.

## ANALYSIS INSTRUCTIONS
1. **Identify the EXACT Topic**: What specific concept or topic is shown in the image? (e.g., "Photosynthesis", not just "biology")
2. **Extract Key Information**: What are the main points or concepts visible?
3. **Generate YouTube Search Queries**: Create 3 search queries that DIRECTLY explain this specific topic.

## SEARCH QUERY GUIDELINES
- **CRITICAL**: All queries must be about the SAME main topic, just at different depths
- Include trusted channel names ("3Blue1Brown", "Khan Academy", "Crash Course", "Professor Leonard", "Organic Chemistry Tutor")
- Be SPECIFIC - use the exact terminology from the image
- Example for "Photosynthesis":
  - Beginner: "Khan Academy photosynthesis simple explanation"
  - Intermediate: "Professor Leonard photosynthesis detailed process"
  - Advanced: "Photosynthesis light-dependent reactions electron transport chain"

## RESPONSE FORMAT
Return ONLY valid JSON:
{
  "overview": "A brief 2-3 sentence explanation of the concept visible in the image.",
  "key_concepts": ["main_topic", "related_concept1", "related_concept2"],
  "search_queries": [
    {"query": "specific topic beginner explanation channel_name", "difficulty": "beginner"},
    {"query": "specific topic detailed explanation channel_name", "difficulty": "intermediate"},
    {"query": "specific topic advanced applications", "difficulty": "advanced"}
  ],
  "study_tip": "A helpful tip for understanding this topic based on the image"
}`;

    let result, response, responseText;
    try {
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Data,
          },
        },
        prompt,
      ]);
      response = await result.response;
      responseText = response.text();
      console.log('[Gemini] Image API call successful');
    } catch (err) {
      console.error('[Gemini] Image API call failed:', err);
      throw err;
    }

    // Clean the response
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const data = JSON.parse(cleanedText);
    
    // Search YouTube for real videos using Gemini's search queries
    if (Array.isArray(data.search_queries) && data.search_queries.length > 0) {
      console.log('[Gemini] Generated search queries:', data.search_queries);
      
      const videos = await searchMultipleQueries(data.search_queries, 2);
      
      if (videos.length > 0) {
        if (SKIP_VERIFICATION) {
          console.log('[Speed] Skipping verification for faster response');
          const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
          data.videos = videos
            .sort((a, b) => (difficultyOrder[a.difficulty] || 1) - (difficultyOrder[b.difficulty] || 1))
            .slice(0, 4);
        } else {
          const verifiedVideos = await verifyVideosRelevance(model, data.overview || 'the topic', data.key_concepts, videos);
          data.videos = verifiedVideos.slice(0, 4);
        }
      } else {
        data.videos = [];
      }
      
      console.log(`[YouTube] Final video count: ${data.videos.length}`);
      delete data.search_queries;
    } else {
      data.videos = [];
    }
    
    res.json(data);

  } catch (error) {
    console.error('Image API Error:', error);

    if (error.message?.includes('API key')) {
      return res.status(401).json({ error: 'Invalid API key. Check server .env file.' });
    }

    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'Failed to parse image. Please try again.' });
    }

    res.status(500).json({ error: 'Failed to process image. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Athena server running on http://localhost:${PORT}`);
  console.log(`📚 API endpoint: POST /api/find-videos`);
  console.log(`🤖 Using model: ${GEMINI_MODEL}`);
});

/**
 * Verify that videos are relevant to the topic using Gemini - OPTIMIZED
 * @param {object} model - Gemini model instance
 * @param {string} originalText - The text user is confused about
 * @param {Array<string>} keyConcepts - Key concepts identified
 * @param {Array<object>} videos - Videos to verify
 * @returns {Promise<Array>} Filtered and verified videos
 */
async function verifyVideosRelevance(model, originalText, keyConcepts, videos) {
  const startTime = Date.now();
  
  // OPTIMIZATION: Batch fetch all video details in ONE API call
  const videoIds = videos.map(v => v.videoId);
  const detailsMap = await getMultipleVideoDetails(videoIds);
  
  // Add details to videos
  const videosWithDetails = videos.map(video => ({
    ...video,
    description: detailsMap.get(video.videoId)?.description || '',
    tags: detailsMap.get(video.videoId)?.tags || [],
  }));

  // OPTIMIZATION: Shorter prompt for faster response
  const videoList = videosWithDetails.map((v, i) => 
    `${i}: "${v.title}" - ${v.description.slice(0, 150)}`
  ).join('\n');

  const mainTopic = keyConcepts[0] || 'the topic';
  const verifyPrompt = `Does each video DIRECTLY teach "${mainTopic}"? Rate 1-10 (10=perfect match, 1=unrelated).

Videos:
${videoList}

Be STRICT: Only videos that specifically explain "${mainTopic}" should score 7+.
Generic or tangentially related videos should score low.

Return JSON only: {"scores":[8,3,9,2,7,4]}`;

  try {
    const result = await model.generateContent(verifyPrompt);
    const responseText = result.response.text()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const verification = JSON.parse(responseText);
    const scores = verification.scores || [];
    
    console.log(`[Verify] Scores: ${scores.join(', ')}`);
    
    // Filter videos by score (>= 7 for quality) and sort by difficulty
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    let verifiedVideos = videosWithDetails
      .map((video, i) => ({ ...video, score: scores[i] || 0 }))
      .filter(v => v.score >= 7)
      .sort((a, b) => (difficultyOrder[a.difficulty] || 1) - (difficultyOrder[b.difficulty] || 1))
      .map(v => {
        delete v.description;
        delete v.tags;
        delete v.score;
        return v;
      });

    // Fallback: if too few videos pass, take top 2 by score
    if (verifiedVideos.length < 2) {
      console.log(`[Verify] Only ${verifiedVideos.length} passed, taking top 2 by score`);
      verifiedVideos = videosWithDetails
        .map((video, i) => ({ ...video, score: scores[i] || 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .sort((a, b) => (difficultyOrder[a.difficulty] || 1) - (difficultyOrder[b.difficulty] || 1))
        .map(v => {
          delete v.description;
          delete v.tags;
          delete v.score;
          return v;
        });
    }

    console.log(`[Verify] ${videos.length} → ${verifiedVideos.length} videos (${Date.now() - startTime}ms)`);
    return verifiedVideos;

  } catch (error) {
    console.error('[Verify] Failed, returning unfiltered:', error.message);
    const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    return videos.sort((a, b) => 
      (difficultyOrder[a.difficulty] || 1) - (difficultyOrder[b.difficulty] || 1)
    );
  }
}
