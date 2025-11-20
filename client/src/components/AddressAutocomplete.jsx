// client/src/components/AddressAutocomplete.jsx
import React, { useEffect, useRef } from "react";
import { loadGoogleMapsPlaces } from "../utils/loadGoogleMaps";

export default function AddressAutocomplete({
  value = "",
  onChange = () => {},
  onPlaceSelected = () => {},
  placeholder = "Search location...",
}) {

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      await loadGoogleMapsPlaces();
      if (!mounted || !inputRef.current) return;

      const input = inputRef.current;

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        input,
        {
          types: ["geocode"],
          fields: ["formatted_address", "geometry", "address_components"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (place) {
          onPlaceSelected(place.formatted_address || "", place);
        }
      });
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Keep input controlled
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      placeholder={placeholder}
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #ddd",
        borderRadius: "6px",
        fontSize: "14px",
        boxSizing: "border-box",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "#60a5fa";
        e.target.style.boxShadow = "0 0 0 4px rgba(96,165,250,0.08)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "#ddd";
        e.target.style.boxShadow = "none";
      }}
    />
  );
}
