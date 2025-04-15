/**
 * Display media items in a container
 * @param {Array} mediaList - List of media items
 * @param {string} containerId - Container element ID
 * @param {string} mediaType - Media type (movie/tv)
 * @param {boolean} clearContainer - Whether to clear the container
 */
async function displayMedia(mediaList, containerId, mediaType, clearContainer = false) {
  if (!mediaList || !containerId) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  if (clearContainer) {
    container.innerHTML = '';
    displayedMediaIds.clear();
  }
  for (const item of mediaList) {
    if (!item || displayedMediaIds.has(item.id)) continue;
    if (!item.poster_path) continue;
    displayedMediaIds.add(item.id);
    try {
      const mediaItem = document.createElement('div');
      mediaItem.className = 'row-poster';
      mediaItem.innerHTML = `
        <img src="${IMAGE_BASE_URL}/w500${item.poster_path}" 
             alt="${item.title || item.name}"
             onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=No+Image';">
      `;
      mediaItem.addEventListener('click', () => {
        if (item.id) {
          openMediaDetails(item.id, item.media_type || mediaType);
        }
      });
      container.appendChild(mediaItem);
    } catch (error) {
      console.error('Error displaying media item:', error);
      continue;
    }
  }
}

/**
 * Load more media when scrolling
 */
async function loadMoreMedia() {
  if (isLoading) return;
  isLoading = true;
  try {
    let newMedia;
    if (isAdvancedSearchActive && advancedSearchParams) {
      const currentParams = {
        ...advancedSearchParams
      };
      newMedia = await performAdvancedSearch(currentParams);
    } else {
      newMedia = await fetchMedia(currentMediaType === 'movie' ? '/movie/popular' : '/trending/tv/week', {
        page: currentPage,
      });
    }
    if (newMedia && newMedia.length > 0) {
      const filteredMedia = newMedia.filter(item => !displayedMediaIds.has(item.id));
      if (filteredMedia.length > 0) {
        await displayMedia(filteredMedia, 'popularMovies', currentMediaType, false);
        currentPage++;
      }
    }
  } catch (error) {
    console.error('Error loading more media:', error);
  } finally {
    isLoading = false;
  }
}

/**
 * Show media details in modal
 * @param {Object} mediaDetails - Media details
 * @param {string} mediaType - Media type (movie/tv)
 */
async function showMediaDetails(mediaDetails, mediaType) {
  try {
    const [similarMedia, ageRating] = await Promise.all([
      fetchSimilarMedia(mediaDetails.id, mediaType),
      fetchContentRating(mediaDetails.id, mediaType)
    ]);
    const modal = document.getElementById('playerModal');
    const mediaInfoDiv = document.getElementById('mediaInfo');
    const videoContainer = document.querySelector('.video-container');
    const seasonEpisodeSelection = document.getElementById('seasonEpisodeSelection');
    const episodeListDiv = document.getElementById('episodeList');

    videoContainer.style.display = 'none'; // Hide player initially
    episodeListDiv.innerHTML = ''; // Clear previous episodes

    let modalContent = `
      <div class="modal-header" style="background-image: linear-gradient(to top, rgba(24, 24, 24, 1) 10%, rgba(24, 24, 24, 0) 50%), url('${IMAGE_BASE_URL}/original${mediaDetails.backdrop_path || ''}')">
        <div class="modal-header-content">
          <h1 class="modal-title">${mediaDetails.title || mediaDetails.name}</h1>
          <div class="modal-buttons">
            <button class="modal-button play" onclick="playMedia('${mediaDetails.id}', '${mediaType}', 1, ${mediaType === 'tv' ? 'true' : 'false'})">
              ▶ ${mediaType === 'tv' ? 'Play S1:E1' : 'Play'}
            </button>
            <button class="modal-button play2" onclick="playMedia('${mediaDetails.id}', '${mediaType}', 2, ${mediaType === 'tv' ? 'true' : 'false'})">
              ▶ ${mediaType === 'tv' ? 'Play S1:E1 (Server 2)' : 'Play Server 2'}
            </button>
          </div>
           <p class="modal-overview">${mediaDetails.overview}</p>
        </div>
      </div>
       <div class="modal-info">
         <div class="modal-main-details">
           <span class="match-score">98% Match</span>
           <span>${(mediaDetails.release_date || mediaDetails.first_air_date || '').split('-')[0]}</span>
           <span class="maturity-rating">${ageRating}</span>
           ${mediaType === 'movie' && mediaDetails.runtime ? `<span>${Math.floor(mediaDetails.runtime / 60)}h ${mediaDetails.runtime % 60}m</span>` : ''}
           ${mediaType === 'tv' ? `<span>${mediaDetails.number_of_seasons} Season${mediaDetails.number_of_seasons !== 1 ? 's' : ''}</span>` : ''}
           <span class="quality-badge">HD</span>
         </div>
         <div class="modal-additional">
           <p><strong>Cast:</strong> ${mediaDetails.credits?.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'N/A'}, more</p>
           <p><strong>Genres:</strong> ${mediaDetails.genres?.map(g => g.name).join(', ') || 'N/A'}</p>
           <p><strong>This ${mediaType === 'movie' ? 'movie' : 'show'} is:</strong> Exciting, Action-packed</p> 
         </div>
       </div>
       ${mediaType === 'tv' ? '' : `
         <div class="similar-content">
           <h3>More Like This</h3>
           <div class="similar-grid">
             ${similarMedia.filter(item => item.poster_path).map(item => `
               <div class="similar-item" onclick="openMediaDetails(${item.id}, '${mediaType}')">
                 <img src="${IMAGE_BASE_URL}/w300${item.poster_path}"
                      alt="${item.title || item.name}"
                      onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=No+Image';">
                 <p class="similar-item-title">${item.title || item.name}</p>
               </div>
             `).join('')}
           </div>
         </div>`}
    `; // Removed similar content for TV shows to make space for episodes

    mediaInfoDiv.innerHTML = modalContent;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    if (mediaType === 'tv') {
      seasonEpisodeSelection.style.display = 'block';
      const seasonSelect = document.getElementById('seasonSelect');
      seasonSelect.innerHTML = ''; // Clear previous options

      // Filter out season 0 (Specials) if necessary, or handle appropriately
      const validSeasons = mediaDetails.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);

      if (validSeasons.length > 0) {
        validSeasons.forEach(season => {
          const option = document.createElement('option');
          option.value = season.season_number;
          // Use name if available, otherwise default to "Season X"
          option.textContent = season.name || `Season ${season.season_number}`;
          seasonSelect.appendChild(option);
        });

        // Add event listener *after* populating options
        seasonSelect.onchange = () => {
           const selectedSeason = seasonSelect.value;
           displayEpisodes(mediaDetails.id, selectedSeason);
           // Update play buttons for the first episode of the selected season
           updatePlayButtonsForSeason(mediaDetails.id, selectedSeason);
        };

        // Trigger change to load episodes for the first season initially
        seasonSelect.dispatchEvent(new Event('change'));
      } else {
         episodeListDiv.innerHTML = '<p>No seasons available for this show.</p>';
         seasonEpisodeSelection.style.display = 'none'; // Hide if no valid seasons
      }

       // Add similar content section for TV shows here if desired, below episodes
       const similarTvContent = document.createElement('div');
       similarTvContent.className = 'similar-content';
       similarTvContent.innerHTML = `
        <h3>More Like This</h3>
        <div class="similar-grid">
          ${similarMedia.filter(item => item.poster_path).map(item => `
            <div class="similar-item" onclick="openMediaDetails(${item.id}, '${mediaType}')">
              <img src="${IMAGE_BASE_URL}/w300${item.poster_path}"
                   alt="${item.title || item.name}"
                   onerror="this.onerror=null; this.src='https://via.placeholder.com/300x450?text=No+Image';">
              <p class="similar-item-title">${item.title || item.name}</p>
            </div>
          `).join('')}
        </div>`;
       modal.querySelector('.modal-content').appendChild(similarTvContent); // Append to modal content

    } else {
      seasonEpisodeSelection.style.display = 'none';
      // Remove any existing similar content added for TV shows if switching back to movie
      const existingSimilarTv = modal.querySelector('.similar-content:last-child');
      if (existingSimilarTv && !mediaInfoDiv.contains(existingSimilarTv)) {
          existingSimilarTv.remove();
      }
    }
  } catch (error) {
    console.error('Error showing media details:', error);
    // Optionally display an error message to the user in the modal
    const mediaInfoDiv = document.getElementById('mediaInfo');
    mediaInfoDiv.innerHTML = `<p style="color: red; padding: 20px;">Failed to load details. Please try again.</p>`;
    document.getElementById('playerModal').style.display = 'block';
  }
}

/**
 * Display episodes for a selected season
 * @param {string} tvId - TV Show ID
 * @param {number} seasonNumber - Season number
 */
async function displayEpisodes(tvId, seasonNumber) {
  const episodeListDiv = document.getElementById('episodeList');
  episodeListDiv.innerHTML = '<p>Loading episodes...</p>'; // Loading indicator
  try {
    const episodes = await fetchEpisodes(tvId, seasonNumber);
    if (episodes && episodes.length > 0) {
      episodeListDiv.innerHTML = episodes.map(episode => `
        <div class="episode-item" onclick="playMedia('${tvId}', 'tv', 1, false, ${seasonNumber}, ${episode.episode_number})">
          <img src="${IMAGE_BASE_URL}/w300${episode.still_path || ''}" alt="Episode ${episode.episode_number}" onerror="this.onerror=null; this.style.display='none';">
          <div class="episode-info">
            <h4>${episode.episode_number}. ${episode.name}</h4>
            <p>${episode.overview || 'No description available.'}</p>
          </div>
           <button class="play-episode-btn" onclick="event.stopPropagation(); playMedia('${tvId}', 'tv', 1, false, ${seasonNumber}, ${episode.episode_number})">▶</button>
           <button class="play-episode-btn server2" onclick="event.stopPropagation(); playMedia('${tvId}', 'tv', 2, false, ${seasonNumber}, ${episode.episode_number})">▶ S2</button>
        </div>
      `).join('');
    } else {
      episodeListDiv.innerHTML = '<p>No episodes found for this season.</p>';
    }
  } catch (error) {
    console.error(`Error fetching episodes for season ${seasonNumber}:`, error);
    episodeListDiv.innerHTML = '<p>Could not load episodes. Please try again.</p>';
  }
}

/**
 * Update Play buttons in the modal header for the selected season's first episode
 * @param {string} tvId - TV Show ID
 * @param {number} seasonNumber - Season number
 */
function updatePlayButtonsForSeason(tvId, seasonNumber) {
    const playButton1 = document.querySelector('.modal-button.play');
    const playButton2 = document.querySelector('.modal-button.play2');
    if (playButton1) {
        playButton1.textContent = `▶ Play S${seasonNumber}:E1`;
        playButton1.onclick = () => playMedia(tvId, 'tv', 1, true, seasonNumber, 1);
    }
    if (playButton2) {
        playButton2.textContent = `▶ Play S${seasonNumber}:E1 (Server 2)`;
        playButton2.onclick = () => playMedia(tvId, 'tv', 2, true, seasonNumber, 1);
    }
}

/**
 * Play media in the modal player
 * @param {string} id - Media ID
 * @param {string} mediaType - Media type (movie/tv)
 * @param {number} server - Server number
 * @param {boolean} isHeaderPlay - If the play button in the header was clicked (TV only)
 * @param {number|null} seasonNum - Season number (TV only)
 * @param {number|null} episodeNum - Episode number (TV only)
 */
async function playMedia(id, mediaType, server, isHeaderPlay = false, seasonNum = null, episodeNum = null) {
  const modal = document.getElementById('playerModal');
  const videoContainer = modal.querySelector('.video-container');
  const mediaInfoContainer = modal.querySelector('#mediaInfo'); // Container holding title, desc etc.
  const seasonEpisodeContainer = modal.querySelector('#seasonEpisodeSelection'); // Container for season/episode selection
  const similarContentContainer = modal.querySelector('.similar-content:last-child'); // Assuming similar is last

  videoContainer.style.display = 'block'; // Show video player
  videoContainer.innerHTML = `<p>Loading player...</p>`; // Loading indicator

  // Hide other modal content when player is active
  if (mediaInfoContainer) mediaInfoContainer.style.display = 'none';
  if (seasonEpisodeContainer) seasonEpisodeContainer.style.display = 'none';
  if (similarContentContainer) similarContentContainer.style.display = 'none';

  try {
    let videoUrl = '';
    if (mediaType === 'movie') {
      videoUrl = server === 1 ? `https://vidsrc.to/embed/movie/${id}` : `https://vidsrc.me/embed/movie/${id}`;
      // Alternative for movie: https://moviesapi.club/movie/${id} -> Seems less reliable now
    } else if (mediaType === 'tv') {
      // If played from header, use provided season/episode (defaulting to S1E1 if needed)
      // If played from episode list, use the specific season/episode clicked
      const sNum = isHeaderPlay ? (seasonNum || 1) : seasonNum;
      const eNum = isHeaderPlay ? (episodeNum || 1) : episodeNum;

      if (sNum === null || eNum === null) {
         console.error("Season or episode number missing for TV show playback.");
         videoContainer.innerHTML = `<p style="color: red;">Error: Could not determine season/episode to play.</p>`;
         return;
      }

      // VidSrc.to seems more reliable currently
      videoUrl = server === 1 ? `https://vidsrc.to/embed/tv/${id}/${sNum}/${eNum}` : `https://vidsrc.me/embed/tv/${id}/${sNum}/${eNum}`;
      // Alternative: https://moviesapi.club/tv/${id}-${sNum}-${eNum} -> Seems less reliable now
    }

    if (!videoUrl) {
       throw new Error("Could not generate video URL.");
    }

    console.log(`Attempting to load: ${videoUrl}`);
    videoContainer.innerHTML = `<iframe id="player" src="${videoUrl}" frameborder="0" allowfullscreen></iframe>`;
    const newPlayer = document.getElementById('player');

    // Add error handling for the iframe itself
    newPlayer.onerror = () => {
      console.error(`Error loading iframe source: ${videoUrl}`);
      videoContainer.innerHTML = `
        <div style="color: white; text-align: center; padding: 20px;">
          <h3>Unable to load player</h3>
          <p>The video source might be unavailable. Try the other server or check back later.</p>
          <button onclick="closeModal()">Close</button>
        </div>
      `;
        // Restore other modal content on player error
        if (mediaInfoContainer) mediaInfoContainer.style.display = 'block';
        if (seasonEpisodeContainer && mediaType === 'tv') seasonEpisodeContainer.style.display = 'block';
        if (similarContentContainer) similarContentContainer.style.display = 'block';
    };
     newPlayer.onload = () => {
        console.log(`Player loaded successfully: ${videoUrl}`);
        // Player loaded, ensure other content remains hidden while playing
        if (mediaInfoContainer) mediaInfoContainer.style.display = 'none';
        if (seasonEpisodeContainer) seasonEpisodeContainer.style.display = 'none';
        if (similarContentContainer) similarContentContainer.style.display = 'none';
    };

  } catch (error) {
    console.error('Error in playMedia function:', error);
    videoContainer.innerHTML = `
      <div style="color: white; text-align: center; padding: 20px;">
        <h3>Error Playing Media</h3>
        <p>${error.message || 'An unexpected error occurred.'}</p>
         <button onclick="closeModal()">Close</button>
      </div>
    `;
     // Restore other modal content on general error
    if (mediaInfoContainer) mediaInfoContainer.style.display = 'block';
    if (seasonEpisodeContainer && mediaType === 'tv') seasonEpisodeContainer.style.display = 'block';
    if (similarContentContainer) similarContentContainer.style.display = 'block';
  }
}

/**
 * Update the hero section with a trending media item
 */
async function updateHeroSection() {
  try {
    const trending = await fetchMedia('/trending/all/week', {});
    if (trending && trending.length > 0) {
      const validTrending = trending.filter(item => item.backdrop_path);
      if (validTrending.length === 0) {
        console.error('No valid backdrop images available');
        return;
      }
      
      const featured = validTrending[Math.floor(Math.random() * validTrending.length)];

      // Fetch full details to get the complete overview
      const fullDetails = await fetchMediaDetails(featured.id, featured.media_type);
      
      const heroSection = document.getElementById('heroSection');
      const heroTitle = document.getElementById('heroTitle');
      const heroDescription = document.getElementById('heroDescription');

      heroSection.style.backgroundImage = `
        linear-gradient(to bottom, 
          rgba(20, 20, 20, 0) 0%, 
          rgba(20, 20, 20, 0.8) 60%, 
          rgba(20, 20, 20, 0.9) 100%),
        url(${IMAGE_BASE_URL}/original${featured.backdrop_path})
      `;
      
      heroTitle.textContent = featured.title || featured.name;

      // Process the overview with AI to make it more concise and engaging
      const description = fullDetails?.overview || featured.overview || '';
      if (description) {
        const completion = await websim.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are a movie marketing expert. Rewrite the following movie description to be more concise and engaging (max 2 sentences):"
            },
            {
              role: "user",
              content: description
            }
          ]
        });
        heroDescription.textContent = completion.content;
      }
      
      heroSection.dataset.mediaId = featured.id;
      heroSection.dataset.mediaType = featured.media_type;
    }
  } catch (error) {
    console.error('Error updating hero section:', error);
  }
}

/**
 * Open media details and add to history
 * @param {string} id - Media ID
 * @param {string} mediaType - Media type (movie/tv)
 */
async function openMediaDetails(id, mediaType) {
  if (!id || !mediaType) {
    console.error('Invalid media details');
    return;
  }
  try {
    mediaHistory.push({
      id: currentMediaId,
      type: currentMediaType
    });
    if (mediaHistory.length > MAX_HISTORY) {
      mediaHistory.shift();
    }
    currentMediaId = id;
    currentMediaType = mediaType;
    const mediaDetails = await fetchMediaDetails(id, mediaType);
    if (mediaDetails) {
      await showMediaDetails(mediaDetails, mediaType);
    }
  } catch (error) {
    console.error('Error opening media details:', error);
  }
}

/**
 * Open media details without adding to history
 * @param {string} id - Media ID
 * @param {string} mediaType - Media type (movie/tv)
 */
async function openMediaDetailsWithoutHistory(id, mediaType) {
  if (!id || !mediaType) return;
  try {
    currentMediaId = id;
    currentMediaType = mediaType;
    const mediaDetails = await fetchMediaDetails(id, mediaType);
    if (mediaDetails) {
      await showMediaDetails(mediaDetails, mediaType);
    }
  } catch (error) {
    console.error('Error opening media details:', error);
  }
}

/**
 * Play featured media from hero section
 */
function playFeaturedMedia() {
  const heroSection = document.getElementById('heroSection');
  const mediaId = heroSection.dataset.mediaId;
  const mediaType = heroSection.dataset.mediaType;
  
  if (mediaId && mediaType) {
    openMediaDetails(mediaId, mediaType);
    setTimeout(() => {
      playMedia(mediaId, mediaType, 1);
    }, 500);
  }
}

/**
 * Show details for featured media
 */
function showFeaturedDetails() {
  const heroSection = document.getElementById('heroSection');
  const mediaId = heroSection.dataset.mediaId;
  const mediaType = heroSection.dataset.mediaType;
  
  if (mediaId && mediaType) {
    openMediaDetails(mediaId, mediaType);
  }
}

/**
 * Close the modal and restore content visibility
 */
function closeModal() {
  const modal = document.getElementById('playerModal');
  const player = modal.querySelector('#player');
  const videoContainer = modal.querySelector('.video-container');
  const mediaInfoContainer = modal.querySelector('#mediaInfo');
  const seasonEpisodeContainer = modal.querySelector('#seasonEpisodeSelection');
  const similarContentContainer = modal.querySelector('.similar-content:last-child');

  modal.style.display = 'none';
  document.body.style.overflow = ''; // Restore background scroll

  // Stop video playback by removing the iframe src
  if (player) {
    player.src = '';
  }
   if (videoContainer) {
      videoContainer.style.display = 'none'; // Hide video container
      videoContainer.innerHTML = ''; // Clear its content
   }


  // Restore visibility of other modal content sections
  if (mediaInfoContainer) mediaInfoContainer.style.display = 'block';
   // Only show season/episode section if it was relevant (i.e., for TV shows)
   // We might need a better way to track if it *should* be visible
   // For now, let's assume if it has content, it should reappear
   if (seasonEpisodeContainer && seasonEpisodeContainer.innerHTML.trim() !== '') {
       // We rely on the showMediaDetails function to set display correctly initially
       // If it was set to 'block' before playing, we restore it.
       // This needs refinement if the modal structure changes significantly.
       // A simple check: if it has a select element with options, assume it's for TV.
       const seasonSelect = seasonEpisodeContainer.querySelector('#seasonSelect');
       if(seasonSelect && seasonSelect.options.length > 0) {
           seasonEpisodeContainer.style.display = 'block';
       } else {
           seasonEpisodeContainer.style.display = 'none';
       }
   }
   if (similarContentContainer) similarContentContainer.style.display = 'block';


  // Clear state related to the open media
  currentMediaId = null;
  // currentMediaType should be reset based on the active tab (Movies/TV Shows)
}

async function handleSearch(query) {
  try {
    const searchResults = await performSearch(query);
    const container = document.getElementById('searchResults');
    
    // Create container if it doesn't exist
    if (!container) {
      const searchResultsDiv = document.createElement('div');
      searchResultsDiv.id = 'searchResults';
      searchResultsDiv.className = 'search-results';
      document.body.appendChild(searchResultsDiv);
    }

    // Clear previous results
    container.innerHTML = '';

    if (searchResults.length > 0) {
      searchResults.slice(0, 10).forEach(item => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.innerHTML = `
          <img src="${IMAGE_BASE_URL}/w200${item.poster_path}" alt="${item.title || item.name}" onerror="this.style.display='none';">
          <div class="search-result-info">
            <h3>${item.title || item.name}</h3>
            <p>${item.media_type === 'movie' ? 'Movie' : 'TV Show'} • ${(item.release_date || item.first_air_date || '').split('-')[0]}</p>
          </div>
        `;
        resultItem.addEventListener('click', () => {
          openMediaDetails(item.id, item.media_type);
          // Close search results
          container.style.display = 'none';
        });
        container.appendChild(resultItem);
      });
      
      container.style.display = 'block';
    } else {
      container.innerHTML = '<p>No results found.</p>';
      container.style.display = 'block';
    }
  } catch (error) {
    console.error('Search error:', error);
  }
}
