// Application state variables
let mediaHistory = [];
let displayedMediaIds = new Set();
let currentMediaType = 'movie';
let currentPage = 1;
let isLoading = false;
let advancedSearchParams = null;
let isAdvancedSearchActive = false;
let currentMediaId = null;

/**
 * Toggle search input visibility
 */
function toggleSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.classList.toggle('active');
  if (searchInput.classList.contains('active')) {
    searchInput.focus();
  }
}

/**
 * Check if user has scrolled to bottom of page
 */
function isBottomOfPage() {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
}

/**
 * Navigate back to previous media
 */
function goBackToPrevious() {
  if (mediaHistory.length > 0) {
    const previousMedia = mediaHistory.pop();
    openMediaDetailsWithoutHistory(previousMedia.id, previousMedia.type);
  }
}

/**
 * Update UI language
 */
function updateLanguage() {
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    const currentLanguage = 'en-US';
    if (currentLanguage === 'pt-BR' && translations['pt-BR'][key]) {
      if (element.placeholder) {
        element.placeholder = translations['pt-BR'][key];
      } else {
        element.textContent = translations['pt-BR'][key];
      }
    } else {
      if (element.placeholder) {
        element.placeholder = key;
      } else {
        element.textContent = key;
      }
    }
  });
  document.getElementById('movieGenres').innerHTML = '';
  displayedMediaIds.clear();
  if (currentMediaType === 'movie') {
    loadMovies();
  } else {
    loadTVShows();
  }
  updateHeroSection();
}

/**
 * Close the modal
 */
function closeModal() {
  document.getElementById('playerModal').style.display = 'none';
}
