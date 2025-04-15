/**
 * Categorize media (movies or TV shows) into genre sections
 * @param {string} mediaType - 'movie' or 'tv'
 */
async function categorizeMedia(mediaType) {
  const isMovie = mediaType === 'movie';
  const endpointPrefix = isMovie ? '/movie' : '/tv';
  const discoverEndpoint = isMovie ? '/discover/movie' : '/discover/tv';
  const trendingEndpoint = isMovie ? '/trending/movie/week' : '/trending/tv/week';
  const dateParam = isMovie ? 'primary_release_date.gte' : 'first_air_date.gte';
  const recentDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

  const genreCategories = [
    { name: `Trending ${isMovie ? 'Movies' : 'Shows'}`, endpoint: trendingEndpoint },
    { name: `Popular on Netflix`, endpoint: `${endpointPrefix}/popular` },
    { name: `Top Rated ${isMovie ? 'Movies' : 'Shows'}`, endpoint: `${endpointPrefix}/top_rated` },
    // Common genres, adjust IDs if needed for TV vs Movie if they differ significantly
    { name: `Action & Adventure`, params: { with_genres: isMovie ? '28' : '10759' } }, // Action(M), Action & Adv(TV)
    { name: `Comedy`, params: { with_genres: '35' } },
    { name: `Drama`, params: { with_genres: '18' } }, // Drama is common
    { name: `Sci-Fi & Fantasy`, params: { with_genres: isMovie ? '878' : '10765' } }, // Sci-Fi(M), Sci-Fi & Fantasy(TV)
    { name: `Recently Added`, endpoint: discoverEndpoint, params: { [dateParam]: recentDate } }
  ];

  const containerId = isMovie ? 'movieGenres' : 'tvShowGenres';
  const container = document.getElementById(containerId);
  container.innerHTML = ''; // Clear previous content for this type
  container.style.display = 'block'; // Make sure container is visible

  // Hide the other type's container
  const otherContainerId = isMovie ? 'tvShowGenres' : 'movieGenres';
  document.getElementById(otherContainerId).style.display = 'none';

  for (const category of genreCategories) {
    try {
      let mediaList;
      const fetchParams = { sort_by: 'popularity.desc', ...category.params }; // Default sort
      const targetEndpoint = category.endpoint || discoverEndpoint;

      // Fetch media using the determined endpoint and parameters
      mediaList = await fetchMedia(targetEndpoint, fetchParams);

      if (mediaList && mediaList.length > 0) {
        const sectionDiv = document.createElement('section');
        sectionDiv.className = 'content-row genre-section';
        // Sanitize category name for ID
        const sectionId = `${mediaType}-${category.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        sectionDiv.innerHTML = `
          <h2 class="row-header">${category.name}</h2>
          <div class="genre-row-posters" id="${sectionId}"></div>
        `;
        container.appendChild(sectionDiv);

        // Display only the first 10-15 items per row
        await displayMedia(
          mediaList.slice(0, 15),
          sectionId,
          mediaType, // Pass correct mediaType
          true // Clear the specific row container before adding
        );
      }
    } catch (error) {
      console.error(`Error fetching ${category.name} (${mediaType}):`, error);
    }
  }
}

/**
 * Load movies
 */
async function loadMovies() {
  currentMediaType = 'movie'; // Set state
  displayedMediaIds.clear(); // Clear tracked IDs
  currentPage = 1; // Reset pagination if applicable
  await categorizeMedia('movie');
}

/**
 * Load TV shows
 */
async function loadTVShows() {
  currentMediaType = 'tv'; // Set state
  displayedMediaIds.clear(); // Clear tracked IDs
  currentPage = 1; // Reset pagination if applicable
  await categorizeMedia('tv');
}

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const profileIcon = document.getElementById('profileIcon');
    const user = await window.websim.getUser();
    if (user && user.avatar_url) {
      profileIcon.style.backgroundImage = `url(${user.avatar_url})`;
    } else {
      // Default placeholder avatar
      profileIcon.style.backgroundImage = `url(https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png)`;
    }

    // Initial load
    await updateHeroSection(); // Hero can be movie or tv
    await loadMovies(); // Default to movies on load

    // Navbar link handlers
    const homeLink = document.querySelector('.nav-links a[href="#"]'); // Assuming Home is the first link
    const moviesButton = document.getElementById('moviesButton');
    const tvShowsButton = document.getElementById('tvShowsButton');

    function setActiveLink(activeButton) {
      [homeLink, moviesButton, tvShowsButton].forEach(btn => btn.classList.remove('active'));
      activeButton.classList.add('active');
    }

    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveLink(homeLink);
      // Decide what home shows - let's default to movies for now
      loadMovies();
      updateHeroSection(); // Refresh hero potentially
    });

    moviesButton.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveLink(moviesButton);
      loadMovies();
    });

    tvShowsButton.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveLink(tvShowsButton);
      loadTVShows();
    });

    // Set initial active link (Home/Movies)
    setActiveLink(homeLink);

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', async (event) => {
      if (event.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          await handleSearch(query);
        }
      }
    });

    // Optional: Add click outside to close search results
    document.addEventListener('click', (event) => {
      const searchResults = document.getElementById('searchResults');
      const searchInput = document.getElementById('searchInput');
      if (searchResults && !searchResults.contains(event.target) && event.target !== searchInput) {
        searchResults.style.display = 'none';
      }
    });

    window.addEventListener('scroll', () => {
      if (isBottomOfPage() && !isLoading) {
        // loadMoreMedia needs context of currentMediaType to load more of the right thing
        // This function might need adjustment if infinite scroll is desired per category
        // console.log("Bottom reached, potential load more trigger");
        // loadMoreMedia(); // Re-enable if infinite scroll is needed across all content
      }
    });

    // Modal close on background click
    window.addEventListener('click', event => {
      const modal = document.getElementById('playerModal');
      if (event.target === modal) {
        closeModal();
      }
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (window.scrollY > 50) { // Adjust threshold if needed
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  } catch (error) {
    console.error('Error in DOMContentLoaded:', error);
  }
});
