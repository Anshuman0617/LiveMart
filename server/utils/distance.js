// server/utils/distance.js
import dotenv from 'dotenv';
dotenv.config();

/**
 * Computes driving distances using Google Distance Matrix API.
 * Accepts: userLat, userLng, array of { id, lat, lng }
 * Returns: array of { id, distanceMeters }
 */
export async function getDrivingDistances(userLat, userLng, products) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.warn("⚠️ GOOGLE_MAPS_API_KEY missing — distance set to null");
    return products.map(p => ({ id: p.id, distanceMeters: null }));
  }

  const batchSize = 20; // Distance Matrix limit
  const results = [];
  const destinations = products.map(p => `${p.lat},${p.lng}`);

  for (let i = 0; i < destinations.length; i += batchSize) {
    const chunk = destinations.slice(i, i + batchSize).join('|');

    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${userLat},${userLng}` +
      `&destinations=${encodeURIComponent(chunk)}` +
      `&units=metric&key=${key}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Distance Matrix fetch failed:", await resp.text());
      for (let j = 0; j < chunk.length; j++) results.push(null);
      continue;
    }

    const data = await resp.json();
    if (!data.rows?.[0]?.elements) {
      for (let j = 0; j < chunk.length; j++) results.push(null);
      continue;
    }

    for (const el of data.rows[0].elements) {
      if (el.status === "OK") results.push(el.distance.value);
      else results.push(null);
    }
  }

  // map distances back to IDs
  return products.map((p, idx) => ({
    id: p.id,
    distanceMeters: results[idx]
  }));
}
