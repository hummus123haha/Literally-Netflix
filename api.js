/**
 * Fetch media from TMDB API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Media results
 */
async function fetchMedia(endpoint, params = {}) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        ...params
      }
    });
    return response.data.results;
  } catch (error) {
    console.error('Error fetching media:', error);
    return [];
  }
}

/**
 * Perform advanced search
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} Search results
 */
async function performAdvancedSearch(params) {
  try {
    const searchParams = {
      api_key: TMDB_API_KEY,
      include_adult: false,
      page: currentPage,
    };
    if (params.genre) {
      searchParams.with_genres = params.genre;
    }
    if (params.rating) {
      searchParams['vote_average.gte'] = parseFloat(params.rating);
    }
    if (params.country) {
      searchParams.with_origin_country = params.country;
    }
    if (params.yearFrom) {
      const yearField = params.mediaType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
      searchParams[yearField] = `${params.yearFrom}-01-01`;
    }
    if (params.yearTo) {
      const yearField = params.mediaType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
      searchParams[yearField] = `${params.yearTo}-12-31`;
    }
    const endpoint = params.mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
    const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
      params: searchParams
    });
    return response.data.results.map(item => ({
      ...item,
      media_type: params.mediaType
    }));
  } catch (error) {
    console.error('Error performing advanced search:', error);
    return [];
  }
}

/**
 * Fetch similar media
 * @param {string} id - Media ID
 * @param {string} mediaType - Media type (movie/tv)
 * @returns {Promise<Array>} Similar media results
 */
async function fetchSimilarMedia(id, mediaType) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/${mediaType}/${id}/similar`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });
    return response.data.results.slice(0, 6);
  } catch (error) {
    console.error('Error fetching similar media:', error);
    return [];
  }
}

/**
 * Perform text search for media
 * @param {string} query - Search query
 * @returns {Promise<Array>} Search results
 */
async function performSearch(query) {
  try {
    const [movieResults, tvResults] = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          query: query,
          include_adult: false
        }
      }), 
      axios.get(`${TMDB_BASE_URL}/search/tv`, {
        params: {
          api_key: TMDB_API_KEY,
          query: query,
          include_adult: false
        }
      })
    ]);
    
    const allResults = [
      ...movieResults.data.results.map(item => ({
        ...item,
        media_type: 'movie'
      })), 
      ...tvResults.data.results.map(item => ({
        ...item,
        media_type: 'tv'
      }))
    ].sort((a, b) => b.popularity - a.popularity);
    
    return allResults;
  } catch (error) {
    console.error('Error performing search:', error);
    return [];
  }
}

/**
 * Fetch detailed media information
 * @param {string} id - Media ID
 * @param {string} mediaType - Media type (movie/tv)
 * @returns {Promise<Object>} Media details
 */
async function fetchMediaDetails(id, mediaType) {
  try {
    const response = await axios.get(`${BASE_URL}/${mediaType}/${id}`, {
      params: {
        api_key: API_KEY,
        // Ensure seasons are requested for TV shows, credits for both
        append_to_response: mediaType === 'tv' ? 'seasons,credits' : 'credits'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching media details for ${mediaType} ID ${id}:`, error);
    // More specific error logging
    if (error.response) {
      console.error('Error data:', error.response.data);
      console.error('Error status:', error.response.status);
    }
    return null;
  }
}

/**
 * Fetch episodes for a specific TV show season
 * @param {string} tvId - TV Show ID
 * @param {number} seasonNumber - Season number
 * @returns {Promise<Array>} List of episodes
 */
async function fetchEpisodes(tvId, seasonNumber) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });
    return response.data.episodes;
  } catch (error) {
    console.error(`Error fetching episodes for TV ${tvId}, Season ${seasonNumber}:`, error);
    return [];
  }
}

/**
 * Fetch content rating for media
 * @param {string} id - Media ID
 * @param {string} mediaType - Media type (movie/tv)
 * @returns {Promise<string>} Content rating
 */
async function fetchContentRating(id, mediaType) {
  try {
    let endpoint = mediaType === 'movie' ? 'release_dates' : 'content_ratings';
    const response = await axios.get(`${TMDB_BASE_URL}/${mediaType}/${id}/${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });
    const results = response.data.results;
    if (results && results.length > 0) {
      const usRating = results.find(r => r.iso_3166_1 === 'US');
      if (usRating) {
        if (mediaType === 'movie') {
          return usRating.release_dates?.[0]?.certification || 'NR';
        } else {
          return usRating.rating || 'NR';
        }
      }
      if (mediaType === 'movie') {
        return results[0].release_dates?.[0]?.certification || 'NR';
      }
      return results[0].rating || 'NR';
    }
    return 'NR';
  } catch (error) {
    console.error('Error fetching content rating:', error);
    return 'NR';
  }
}
