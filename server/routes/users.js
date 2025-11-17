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
  
  // Fetch full user with all fields including bank info
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  
  res.json(user);
});

// -------------------- Update profile --------------------
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const u = await User.findByPk(req.user.id);
    if (!u) return res.status(404).json({ error: "User not found" });

    const { 
      name, 
      address, 
      phone,
      lat, 
      lng, 
      picture,
      // Bank information (for retailers/wholesalers)
      bankAccountName,
      bankAccountNumber,
      bankIFSC,
      bankName,
      upiId,
      payuMerchantKey
    } = req.body;

    // Validate: Retailers and wholesalers must have address
    const isSeller = u.role === 'retailer' || u.role === 'wholesaler';
    if (isSeller && address !== undefined && !address?.trim()) {
      return res.status(400).json({ error: "Address is required for retailers and wholesalers" });
    }

    if (name) u.name = name;

    if (phone !== undefined) u.phone = phone;

    // If user sends address → save it and auto-geocode (this overrides lat/lng)
    if (address !== undefined) {
      u.address = address;

      // Always geocode when address is provided (address takes precedence over lat/lng)
      if (address && address.trim()) {
        const geo = await geocodeAddress(address);
        if (geo) {
          u.lat = geo.lat;
          u.lng = geo.lng;
        } else {
          console.warn("❗ Geocoding failed. Address saved without coordinates.");
        }
      }
    } else if (lat !== undefined && lng !== undefined) {
      // Only set lat/lng if address is not being updated (for "Use my location" button)
      u.lat = lat;
      u.lng = lng;
    }

    if (picture !== undefined) u.picture = picture;

    // Update bank information (for sellers)
    if (isSeller) {
      if (bankAccountName !== undefined) u.bankAccountName = bankAccountName;
      if (bankAccountNumber !== undefined) u.bankAccountNumber = bankAccountNumber;
      if (bankIFSC !== undefined) u.bankIFSC = bankIFSC;
      if (bankName !== undefined) u.bankName = bankName;
      if (upiId !== undefined) u.upiId = upiId;
      if (payuMerchantKey !== undefined) u.payuMerchantKey = payuMerchantKey;
    }

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
