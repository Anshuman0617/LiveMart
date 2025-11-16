// server/routes/users.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { User } from '../models/index.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

async function geocodeAddress(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !address) return null;

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(address)}` +
    `&key=${key}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.status !== "OK" || !data.results?.length) return null;

    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error("GEOCODE ERROR:", err);
    return null;
  }
}

// -------------------- Get own profile --------------------
router.get('/me', authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  res.json(req.user);
});

// -------------------- Update profile --------------------
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const u = await User.findByPk(req.user.id);
    if (!u) return res.status(404).json({ error: "User not found" });

    const { name, address, lat, lng, picture } = req.body;

    if (name) u.name = name;

    // If user sends explicit lat/lng → use that
    if (lat !== undefined && lng !== undefined) {
      u.lat = lat;
      u.lng = lng;
    }

    // If user sends address → save it and auto-geocode
    if (address !== undefined) {
      u.address = address;

      // Only geocode when user sends a NEW address OR lat/lng missing
      if (address && !(lat && lng)) {
        const geo = await geocodeAddress(address);
        if (geo) {
          u.lat = geo.lat;
          u.lng = geo.lng;
        } else {
          console.warn("❗ Geocoding failed. Address saved without coordinates.");
        }
      }
    }

    if (picture !== undefined) u.picture = picture;

    await u.save();
    res.json(u);
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------- Public user fetch --------------------
router.get('/:id', async (req, res) => {
  const u = await User.findByPk(req.params.id, {
    attributes: ['id','name','role','picture','address','lat','lng']
  });
  if (!u) return res.status(404).json({ error: "Not found" });
  res.json(u);
});

export default router;
