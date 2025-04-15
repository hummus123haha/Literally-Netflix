/**
 * Improved categorization of media for more relevant and accurate movie/TV sections.
 * The home page now includes both movies and shows, each with genre sections.
 * The featured film is randomly selected from a wider, highly relevant set.
 */

// Utility: Fetches genre name maps for movie and tv (one-time, cached)
let MOVIE_GENRES_MAP = {};
let TV_GENRES_MAP = {};

async function getGenreMaps() {
  if (Object.keys(MOVIE_GENRES_MAP).length && Object.keys(TV_GENRES_MAP).length) return;
  try {
    const [movieGenresRes, tvGenresRes] = await Promise.all([
      axios.get(`${TMDB_BASE_URL}/genre/movie/list`, { params: { api_key: TMDB_API_KEY }}),
      axios.get(`${TMDB_BASE_URL}/genre/tv/list`, { params: { api_key: TMDB_API_KEY }}),
    ]);
    movieGenresRes.data.genres.forEach(g => MOVIE_GENRES_MAP[g.id] = g.name);
    tvGenresRes.data.genres.forEach(g => TV_GENRES_MAP[g.id] = g.name);
  } catch (e) { /* fallback on blank maps if fails */ }
}

// Improved list of sections & genres for both movies and tv shows
const MOVIE_SECTIONS = [
  {
    name: 'Trending Movies',
    endpoint: '/trending/movie/week',
    type: 'movie',
  },
  {
    name: 'Top Rated Movies',
    endpoint: '/movie/top_rated',
    type: 'movie',
  },
  {
    name: 'Popular Movies',
    endpoint: '/movie/popular',
    type: 'movie',
  },
  {
    name: 'Action',
    endpoint: '/discover/movie',
    type: 'movie',
    params: { with_genres: 28 }
  },
  {
    name: 'Comedy',
    endpoint: '/discover/movie',
    type: 'movie',
    params: { with_genres: 35 }
  },
  {
    name: 'Drama',
    endpoint: '/discover/movie',
    type: 'movie',
    params: { with_genres: 18 }
  },
  {
    name: 'Science Fiction',
    endpoint: '/discover/movie',
    type: 'movie',
    params: { with_genres: 878 }
  },
  {
    name: 'Family Movies',
    endpoint: '/discover/movie',
    type: 'movie',
    params: { with_genres: 10751 }
  },
  {
    name: 'Recently Released Movies',
    endpoint: '/discover/movie',
    type: 'movie',
    params: { 'primary_release_date.gte': (()=> {
      const d = new Date(); d.setFullYear(d.getFullYear() - 1);
      return d.toISOString().slice(0,10);
    })() }
  }
];

const TV_SECTIONS = [
  {
    name: 'Trending TV Shows',
    endpoint: '/trending/tv/week',
    type: 'tv'
  },
  {
    name: 'Top Rated TV',
    endpoint: '/tv/top_rated',
    type: 'tv'
  },
  {
    name: 'Popular TV',
    endpoint: '/tv/popular',
    type: 'tv'
  },
  {
    name: 'Action & Adventure',
    endpoint: '/discover/tv',
    type: 'tv',
    params: { with_genres: 10759 }
  },
  {
    name: 'Comedy Shows',
    endpoint: '/discover/tv',
    type: 'tv',
    params: { with_genres: 35 }
  },
  {
    name: 'Drama Series',
    endpoint: '/discover/tv',
    type: 'tv',
    params: { with_genres: 18 }
  },
  {
    name: 'Sci-Fi & Fantasy Series',
    endpoint: '/discover/tv',
    type: 'tv',
    params: { with_genres: 10765 }
  },
  {
    name: 'Family TV',
    endpoint: '/discover/tv',
    type: 'tv',
    params: { with_genres: 10751 }
  },
  {
    name: 'Recently Released TV',
    endpoint: '/discover/tv',
    type: 'tv',
    params: { 'first_air_date.gte': (()=> {
      const d = new Date(); d.setFullYear(d.getFullYear() - 1);
      return d.toISOString().slice(0,10);
    })() }
  }
];

// Renders all movie sections in #movieGenres (for home page)
async function renderMovieSections() {
  const container = document.getElementById('movieGenres');
  container.innerHTML = '';
  container.style.display = 'block';
  for (const section of MOVIE_SECTIONS) {
    let params = { sort_by: 'popularity.desc', include_adult: false, ...section.params };
    try {
      let results = await fetchMedia(section.endpoint, params);
      // Deduplicate
      results = results.filter(item => item && item.poster_path);
      if (results.length) {
        const sectionDiv = document.createElement('section');
        sectionDiv.className = 'content-row genre-section';
        sectionDiv.innerHTML = `
          <h2 class="row-header">${section.name}</h2>
          <div class="genre-row-posters" id="${section.type}-${section.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}"></div>
        `;
        container.appendChild(sectionDiv);

        await displayMedia(results.slice(0, 16), `${section.type}-${section.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`, section.type, true);
      }
    } catch (e) { /* skip this section if fails */ }
  }
}

// Renders all tv sections in #tvShowGenres (for home page)
async function renderTVSections() {
  const container = document.getElementById('tvShowGenres');
  container.innerHTML = '';
  container.style.display = 'block';
  for (const section of TV_SECTIONS) {
    let params = { sort_by: 'popularity.desc', include_adult: false, ...section.params };
    try {
      let results = await fetchMedia(section.endpoint, params);
      // Deduplicate and filter to have posters
      results = results.filter(item => item && item.poster_path);
      if (results.length) {
        const sectionDiv = document.createElement('section');
        sectionDiv.className = 'content-row genre-section';
        sectionDiv.innerHTML = `
          <h2 class="row-header">${section.name}</h2>
          <div class="genre-row-posters" id="${section.type}-${section.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}"></div>
        `;
        container.appendChild(sectionDiv);

        await displayMedia(results.slice(0, 16), `${section.type}-${section.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`, section.type, true);
      }
    } catch (e) { /* skip this section if fails */ }
  }
}

// Home: includes both movies and TV shows
async function loadHomePage() {
  displayedMediaIds.clear();
  document.getElementById('movieGenres').style.display = 'block';
  document.getElementById('tvShowGenres').style.display = 'block';
  await Promise.all([renderMovieSections(), renderTVSections()]);
}

// For navbar section switching
async function loadMovies() {
  currentMediaType = 'movie';
  displayedMediaIds.clear();
  document.getElementById('movieGenres').style.display = 'block';
  document.getElementById('tvShowGenres').style.display = 'none';
  await renderMovieSections();
}

async function loadTVShows() {
  currentMediaType = 'tv';
  displayedMediaIds.clear();
  document.getElementById('tvShowGenres').style.display = 'block';
  document.getElementById('movieGenres').style.display = 'none';
  await renderTVSections();
}

// ========= Improved featured film randomizer =========== //
/**
 * Wide-candidate featured selection: Pull trending, top rated, and popular from both movies and shows,
 * then randomly select, weighted by popularity, to ensure a truly varied featured film.
 */
async function updateHeroSection() {
  try {
    // Broader candidate pool: trending + popular + top rated, both types
    const allSections = [
      { endpoint: '/trending/movie/week', media_type: 'movie' },
      { endpoint: '/trending/tv/week', media_type: 'tv' },
      { endpoint: '/movie/top_rated', media_type: 'movie' },
      { endpoint: '/tv/top_rated', media_type: 'tv' },
      { endpoint: '/movie/popular', media_type: 'movie' },
      { endpoint: '/tv/popular', media_type: 'tv' }
    ];
    let candidates = [];

    // Pull top 30 from each section for a rich candidate pool
    for (const sec of allSections) {
      const items = await fetchMedia(sec.endpoint, { page: 1 });
      if (items && Array.isArray(items)) {
        // Label each candidate with its correct media_type
        candidates.push(...items.filter(it => !!it.backdrop_path).map(it => ({ ...it, media_type: sec.media_type })));
      }
    }
    // Deduplicate: by id + type
    const candidateKey = (item) => `${item.media_type}:${item.id}`;
    const dedupedCandidates = Object.values(Object.fromEntries(
        candidates.map(item => [candidateKey(item), item])
    ));

    if (!dedupedCandidates.length) {
      console.error('Unable to find any valid featured candidates.');
      return;
    }

    // Weighted random: Higher popularity = higher weight
    let weighted = [];
    for (const item of dedupedCandidates) {
      // Number of "tickets" proportional to normalized popularity (at least 1 ticket)
      const pop = Math.max(item.popularity || 1, 1);
      const repeats = Math.ceil(pop / 20); // bigger denominator = less skew
      for (let i = 0; i < repeats; ++i) weighted.push(item);
    }
    const featured = weighted[Math.floor(Math.random() * weighted.length)];

    // Get full details
    const fullDetails = await fetchMediaDetails(featured.id, featured.media_type);

    const heroSection = document.getElementById('heroSection');
    const heroTitle = document.getElementById('heroTitle');
    const heroDescription = document.getElementById('heroDescription');

    heroSection.style.backgroundImage = `
      linear-gradient(to bottom, rgba(20, 20, 20, 0) 0%, rgba(20, 20, 20, 0.8) 60%, rgba(20, 20, 20, 0.9) 100%),
      url(${IMAGE_BASE_URL}/original${featured.backdrop_path})
    `;
    
    heroTitle.textContent = fullDetails.title || fullDetails.name || '';

    // AI-driven description shortening if too long
    const description = (fullDetails.overview || featured.overview || '');
    if (description && description.length > 220) {
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a movie marketing expert. The following is a movie or TV show description. Rewrite it in a more concise and engaging way, max 2 sentences, keep it snappy."
          },
          { role: "user", content: description }
        ]
      });
      heroDescription.textContent = completion.content;
    } else {
      heroDescription.textContent = description;
    }
    heroSection.dataset.mediaId = featured.id;
    heroSection.dataset.mediaType = featured.media_type;
  } catch (error) {
    console.error('Error updating hero section:', error);
  }
}

/** 
 * --- DOMContentLoaded now loads both movies & shows for a richer home.
 * 
 * Nav: Home, Movies, TV Shows. Home == both.
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await getGenreMaps();
    const profileIcon = document.getElementById('profileIcon');
    const user = await window.websim.getUser();
    if (user && user.avatar_url) {
      profileIcon.style.backgroundImage = `url(${user.avatar_url})`;
    } else {
      // Default placeholder avatar
      profileIcon.style.backgroundImage = `url(https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png)`;
    }

    // Initial load: Home = both movies and shows
    await updateHeroSection();
    await loadHomePage(); 

    // Navbar link handlers
    const homeLink = document.querySelector('.nav-links a[href="#"]'); // Home is first link
    const moviesButton = document.getElementById('moviesButton');
    const tvShowsButton = document.getElementById('tvShowsButton');

    function setActiveLink(activeButton) {
      [homeLink, moviesButton, tvShowsButton].forEach(btn => btn.classList.remove('active'));
      activeButton.classList.add('active');
    }

    homeLink.addEventListener('click', async (e) => {
      e.preventDefault();
      setActiveLink(homeLink);
      // Home shows both
      await updateHeroSection();
      await loadHomePage();
    });

    moviesButton.addEventListener('click', async (e) => {
      e.preventDefault();
      setActiveLink(moviesButton);
      document.getElementById('tvShowGenres').style.display = 'none';
      document.getElementById('movieGenres').style.display = 'block';
      await renderMovieSections();
    });

    tvShowsButton.addEventListener('click', async (e) => {
      e.preventDefault();
      setActiveLink(tvShowsButton);
      document.getElementById('movieGenres').style.display = 'none';
      document.getElementById('tvShowGenres').style.display = 'block';
      await renderTVSections();
    });

    // Set initial active link (Home)
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

    document.addEventListener('click', (event) => {
      const searchResults = document.getElementById('searchResults');
      const searchInput = document.getElementById('searchInput');
      if (searchResults && !searchResults.contains(event.target) && event.target !== searchInput) {
        searchResults.style.display = 'none';
      }
    });

    // Optionally: infinite scroll / page bottom for home page (not per row, this is global)
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
    // Modal background close handler...
    window.addEventListener('click', event => {
      const modal = document.getElementById('playerModal');
      if (event.target === modal) {
        closeModal();
      }
    });
  } catch (error) {
    console.error('Error in DOMContentLoaded:', error);
  }
});
