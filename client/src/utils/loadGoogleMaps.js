// client/src/utils/loadGoogleMaps.js
// Utility to load Google Maps Places API dynamically

let isLoaded = false;
let isLoading = false;
let loadPromise = null;

export function loadGoogleMapsPlaces() {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Return resolved promise if already loaded
  if (isLoaded && window.google && window.google.maps && window.google.maps.places && window.google.maps.places.PlaceAutocompleteElement) {
    return Promise.resolve();
  }

  // Start loading
  isLoading = true;
  loadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places && window.google.maps.places.PlaceAutocompleteElement) {
        isLoaded = true;
        isLoading = false;
        resolve();
        return;
      }

    // Get API key from environment
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      const error = new Error('VITE_GOOGLE_MAPS_API_KEY is not set in environment variables');
      console.error(error.message);
      isLoading = false;
      loadPromise = null;
      reject(error);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places && window.google.maps.places.PlaceAutocompleteElement) {
          clearInterval(checkLoaded);
          isLoaded = true;
          isLoading = false;
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!isLoaded) {
          isLoading = false;
          loadPromise = null;
          reject(new Error('Google Maps Places API failed to load'));
        }
      }, 10000);
      return;
    }

    // Create and load script with new Places API (v2)
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait a bit for the API to initialize
      const checkReady = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places && window.google.maps.places.PlaceAutocompleteElement) {
          clearInterval(checkReady);
          isLoaded = true;
          isLoading = false;
          resolve();
        }
      }, 50);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        if (!isLoaded) {
          isLoading = false;
          loadPromise = null;
          reject(new Error('Google Maps Places API loaded but not initialized'));
        }
      }, 5000);
    };

    script.onerror = () => {
      isLoading = false;
      loadPromise = null;
      reject(new Error('Failed to load Google Maps Places API script'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

