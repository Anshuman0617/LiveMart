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
    if (!window.google || !window.google.maps) return;

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["geocode"],
        fields: ["formatted_address", "geometry"],
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (onPlaceSelected) {
        onPlaceSelected(place.formatted_address, place);
      }
    });
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: 300 }}
    />
  );
}
