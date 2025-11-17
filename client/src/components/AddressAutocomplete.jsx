// client/src/components/AddressAutocomplete.jsx
import React, { useEffect, useRef } from "react";

export default function AddressAutocomplete({
  onPlaceSelected,
  placeholder = "Search location...",
  value = "",
  onChange = () => {},
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) return;

    let autocomplete = null;
    let listener = null;
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max wait time

    // Wait for Google Maps to load
    const initAutocomplete = () => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Retry after a short delay if Google Maps isn't loaded yet
          setTimeout(initAutocomplete, 100);
        } else {
          console.warn("Google Maps Places API not loaded after maximum retries");
        }
        return;
      }

      try {
        autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ["geocode"],
            fields: ["formatted_address", "geometry", "address_components"],
          }
        );

        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place && onPlaceSelected) {
            onPlaceSelected(place.formatted_address, place);
          }
        });
      } catch (err) {
        console.error("Error initializing Google Places Autocomplete:", err);
      }
    };

    initAutocomplete();

    return () => {
      if (listener && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [onPlaceSelected]);

  return (
    <input
      ref={inputRef}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ 
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        boxSizing: 'border-box'
      }}
    />
  );
}
