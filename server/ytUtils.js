import fetch from 'node-fetch';

/**
 * Search YouTube for educational videos using a search query
 * @param {string} query - The search query
 * @param {number} maxResults - Maximum number of results (default 2)
 * @param {string} difficulty - Difficulty level for this query (beginner/intermediate/advanced)
 * @returns {Promise<Array>} Array of video objects with real YouTube data
 */
export async function searchYouTubeVideos(query, maxResults = 2, difficulty = 'intermediate') {
  const YT_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YT_API_KEY) {
    console.warn('[YouTube] No API key found, cannot search for videos');
    return [];
  }

  try {
    // Search for videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults + 3}&videoDuration=medium&relevanceLanguage=en&safeSearch=strict&key=${YT_API_KEY}`;
    
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      console.log(`[YouTube] No results for query: ${query}`);
      return [];
    }

    // Get video IDs
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');

    // Get detailed video info (duration, view count, etc.)
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,status&id=${videoIds}&key=${YT_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    // Combine search results with details
    const videos = [];
    for (const item of searchData.items) {
      const details = detailsData.items?.find(d => d.id === item.id.videoId);
      
      // Skip if not embeddable or not public
      if (!details || 
          !details.status?.embeddable || 
          details.status?.privacyStatus !== 'public') {
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

      // Stop once we have enough videos
      if (videos.length >= maxResults) break;
    }

    console.log(`[YouTube] Found ${videos.length} valid videos for: "${query}"`);
    return videos;

  } catch (error) {
    console.error('[YouTube] Search error:', error.message);
    return [];
  }
}

/**
 * Fetch video transcript/captions from YouTube
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<string|null>} Transcript text or null if unavailable
 */
export async function getVideoTranscript(videoId) {
  const YT_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YT_API_KEY) return null;

  try {
    // First, get available caption tracks
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${YT_API_KEY}`;
    const captionsRes = await fetch(captionsUrl);
    const captionsData = await captionsRes.json();

    if (!captionsData.items || captionsData.items.length === 0) {
      return null;
    }

    // Note: Downloading captions requires OAuth authentication
    // For now, we'll use video title + description as a proxy
    // Full transcript fetching would require a different approach (like youtube-transcript library)
    return null;
    
  } catch (error) {
    console.error('[YouTube] Transcript fetch error:', error.message);
    return null;
  }
}

/**
 * Get video metadata including description for content matching
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<object|null>} Video snippet data
 */
export async function getVideoDetails(videoId) {
  const YT_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YT_API_KEY) return null;

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      return {
        title: data.items[0].snippet.title,
        description: data.items[0].snippet.description,
        tags: data.items[0].snippet.tags || [],
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Search for multiple queries with difficulty levels and combine results - PARALLEL VERSION
 * @param {Array<object>} queries - Array of {query, difficulty} objects
 * @param {number} videosPerQuery - Videos to fetch per query
 * @returns {Promise<Array>} Combined array of unique videos ordered by difficulty
 */
export async function searchMultipleQueries(queries, videosPerQuery = 1) {
  // Run all searches in PARALLEL for speed
  const searchPromises = queries.map(queryObj => {
    const query = typeof queryObj === 'string' ? queryObj : queryObj.query;
    const difficulty = typeof queryObj === 'string' ? 'intermediate' : queryObj.difficulty;
    return searchYouTubeVideos(query, videosPerQuery, difficulty);
  });

  const results = await Promise.all(searchPromises);
  
  // Combine results, removing duplicates
  const allVideos = [];
  const seenIds = new Set();
  
  // Flatten and dedupe while preserving order
  for (const videos of results) {
    for (const video of videos) {
      if (!seenIds.has(video.videoId)) {
        seenIds.add(video.videoId);
        allVideos.push(video);
      }
    }
  }

  return allVideos;
}

/**
 * Get details for multiple videos in parallel
 * @param {Array<string>} videoIds - Array of video IDs
 * @returns {Promise<Map>} Map of videoId -> details
 */
export async function getMultipleVideoDetails(videoIds) {
  const YT_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YT_API_KEY || videoIds.length === 0) return new Map();

  try {
    // Batch request - YouTube API allows up to 50 IDs per request
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(',')}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const detailsMap = new Map();
    if (data.items) {
      for (const item of data.items) {
        detailsMap.set(item.id, {
          title: item.snippet.title,
          description: item.snippet.description?.slice(0, 500) || '',
          tags: item.snippet.tags || [],
        });
      }
    }
    return detailsMap;
  } catch (error) {
    return new Map();
  }
}

/**
 * Parse ISO 8601 duration to MM:SS format
 */
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
