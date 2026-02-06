import { GoogleGenerativeAI } from '@google/generative-ai';

// Model configuration
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const SKIP_VERIFICATION = process.env.SKIP_VERIFICATION === 'true';

// Initialize Gemini
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// ============ YouTube Utilities (same as find-videos.js) ============

function parseDuration(isoDuration) {
  if (!isoDuration) return 'Unknown';
  
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 'Unknown';

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function searchYouTubeVideos(query, maxResults = 2, difficulty = 'intermediate') {
  const YT_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YT_API_KEY) {
    console.warn('[YouTube] No API key found');
    return [];
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults + 3}&videoDuration=medium&relevanceLanguage=en&safeSearch=strict&key=${YT_API_KEY}`;
    
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,status&id=${videoIds}&key=${YT_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    const videos = [];
    for (const item of searchData.items) {
      const details = detailsData.items?.find(d => d.id === item.id.videoId);
      
      if (!details || !details.status?.embeddable || details.status?.privacyStatus !== 'public') {
        continue;
      }

      const duration = parseDuration(details.contentDetails?.duration);
      
      videos.push({
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        duration: duration,
        viewCount: parseInt(details.statistics?.viewCount || 0),
        difficulty: difficulty,
      });

      if (videos.length >= maxResults) break;
    }

    return videos;
  } catch (error) {
    console.error('[YouTube] Search error:', error.message);
    return [];
  }
}

async function searchMultipleQueries(queries, videosPerQuery = 1) {
  const searchPromises = queries.map(queryObj => {
    const query = typeof queryObj === 'string' ? queryObj : queryObj.query;
    const difficulty = typeof queryObj === 'string' ? 'intermediate' : queryObj.difficulty;
    return searchYouTubeVideos(query, videosPerQuery, difficulty);
  });

  const results = await Promise.all(searchPromises);
  return results.flat();
}

async function getMultipleVideoDetails(videoIds) {
  const YT_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YT_API_KEY || videoIds.length === 0) return new Map();

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(',')}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    
    const map = new Map();
    data.items?.forEach(item => {
      map.set(item.id, {
        description: item.snippet.description,
        tags: item.snippet.tags || [],
      });
    });
    return map;
  } catch (error) {
    console.error('[YouTube] Detail fetch error:', error.message);
    return new Map();
  }
}

async function verifyVideosRelevance(model, originalText, keyConcepts, videos) {
  const startTime = Date.now();
  
  const videoIds = videos.map(v => v.videoId);
  const detailsMap = await getMultipleVideoDetails(videoIds);
  
  const videosWithDetails = videos.map(video => ({
    ...video,
    description: detailsMap.get(video.videoId)?.description || '',
    tags: detailsMap.get(video.videoId)?.tags || [],
  }));

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

// ============ Main Image Handler ============

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Extract base64 data
    let base64Data = image;
    if (image.includes(',')) {
      base64Data = image.split(',')[1];
    }

    if (!base64Data || base64Data.length === 0) {
      return res.status(400).json({ error: 'Image data is invalid' });
    }

    console.log('[Image] Processing base64 image, size:', base64Data.length);

    if (!genAI) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

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

    let result, responseText;
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
      responseText = result.response.text();
      console.log('[Gemini] Image API call successful');
    } catch (err) {
      console.error('[Gemini] API call failed:', err);
      throw err;
    }

    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const data = JSON.parse(cleanedText);
    
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
          
          // Deduplicate by videoId before returning
          const seenIds = new Set();
          data.videos = verifiedVideos.filter(video => {
            if (seenIds.has(video.videoId)) {
              return false;
            }
            seenIds.add(video.videoId);
            return true;
          }).slice(0, 4);
        }
      } else {
        data.videos = [];
      }
      
      console.log(`[YouTube] Final video count: ${data.videos.length}`);
      delete data.search_queries;
    } else {
      data.videos = [];
    }
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('Image API Error:', error);

    if (error.message?.includes('API key')) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (error instanceof SyntaxError) {
      return res.status(500).json({ error: 'Failed to parse image. Please try again.' });
    }

    return res.status(500).json({ error: 'Failed to process image. Please try again.' });
  }
}
