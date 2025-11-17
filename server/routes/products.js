// server/routes/products.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import { Product, User } from '../models/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { getDrivingDistances } from '../utils/distance.js';

const router = express.Router();

// ---------- IMAGE UPLOAD SETUP ----------
const uploadDir = path.resolve('server/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});

const upload = multer({ storage });


// ---------- LIST / SEARCH / FILTER / SORT ----------
router.get('/', async (req, res) => {
  try {
    const {
      q,
      minPrice,
      maxPrice,
      sort,
      lat,
      lng,
      maxDistanceKm,
      ownerType,
      page = 1,
      pageSize = 50,
    } = req.query;

    const where = {};

    if (ownerType === 'retailer' || ownerType === 'wholesaler')
      where.ownerType = ownerType;

    if (minPrice)
      where.price = { ...(where.price || {}), [Op.gte]: parseFloat(minPrice) };

    if (maxPrice)
      where.price = { ...(where.price || {}), [Op.lte]: parseFloat(maxPrice) };

    let search = null;
    if (q) {
      search = {
        [Op.or]: [
          { title: { [Op.iLike]: `%${q}%` } },
          { description: { [Op.iLike]: `%${q}%` } }
        ]
      };
    }

    const finalWhere = search ? { [Op.and]: [where, search] } : where;

    const products = await Product.findAll({
      where: finalWhere,
      include: [
        { model: User, as: "owner",
          attributes: ["id","name","role","picture","address","lat","lng"]
        }
      ],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });

    let data = products.map(p => p.toJSON());

// ---------------------
// Fuzzy match function
// ---------------------
function fuzzyMatch(str, query) {
  str = (str || "").toLowerCase();
  query = query.toLowerCase();

  if (str.includes(query)) return true;

  // missing character
  for (let i = 0; i < query.length; i++) {
    const test = query.slice(0, i) + query.slice(i + 1);
    if (test && str.includes(test)) return true;
  }

  // swapped letters
  for (let i = 0; i < query.length - 1; i++) {
    const swapped =
      query.slice(0, i) +
      query[i + 1] +
      query[i] +
      query.slice(i + 2);

    if (str.includes(swapped)) return true;
  }

  return false;
}

// Apply fuzzy filtering AFTER database fetch
if (q) {
  data = data.filter((p) =>
    fuzzyMatch(p.title, q) ||
    fuzzyMatch(p.description || "", q)
  );
}


    // ---------- DISTANCES USING GOOGLE ----------
    // Use owner's lat/lng instead of product's lat/lng
    if (lat && lng) {
      const withCoords = data.filter(p => p.owner?.lat && p.owner?.lng);
      const distances = await getDrivingDistances(
        lat, 
        lng, 
        withCoords.map(p => ({
          id: p.id,
          lat: p.owner.lat,
          lng: p.owner.lng
        }))
      );

      const map = new Map(distances.map(d => [d.id, d.distanceMeters]));

      data = data.map(p => {
        const meters = map.get(p.id);
        p.distanceMeters = meters ?? null;
        p.distanceKm = meters ? Math.round((meters / 1000) * 100) / 100 : null;
        return p;
      });

      if (maxDistanceKm) {
        data = data.filter(p => p.distanceKm !== null && p.distanceKm <= parseFloat(maxDistanceKm));
      }
    }

    // ---------- SORT ----------
    if (sort === 'price_asc') data.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    else if (sort === 'price_desc') data.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    else if (sort === 'most_sold') data.sort((a, b) => b.soldCount - a.soldCount);
    else if (sort === 'distance') data.sort((a, b) => {
      const da = a.distanceMeters ?? Infinity;
      const db = b.distanceMeters ?? Infinity;
      return da - db;
    });

    res.json({ products: data, page, pageSize });
  } catch (err) {
    console.error("PRODUCT LIST ERROR", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ---------- GET SINGLE PRODUCT ----------
router.get('/:id', async (req, res) => {
  const p = await Product.findByPk(req.params.id, {
    include: [
      { model: User, as: 'owner',
        attributes: ['id','name','role','picture','address','lat','lng']
      }
    ]
  });
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});


// ---------- CREATE PRODUCT (Retailer & Wholesaler) ----------
router.post(
  '/',
  authMiddleware,
  requireRole(['retailer', 'wholesaler']),
  upload.array('images', 6),
  async (req, res) => {
    try {
      const { title, description, price, stock } = req.body;

      // Validate: Sellers must have address
      if (!req.user.address || !req.user.lat || !req.user.lng) {
        return res.status(400).json({ 
          error: "Please set your address in profile settings first. Address is required for retailers and wholesalers." 
        });
      }

      const images = req.files?.map(f => `/uploads/${f.filename}`) || [];
      const imageUrl = images[0] || null;

      const ownerType = req.user.role === 'retailer' ? 'retailer' : 'wholesaler';

      // Products use owner's address, not their own lat/lng
      const product = await Product.create({
        title,
        description,
        price,
        stock,
        images,
        imageUrl,
        ownerId: req.user.id,
        ownerType
        // Note: lat/lng removed - products now use owner's address
      });

      res.json(product);
    } catch (err) {
      console.error("CREATE PRODUCT ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);


// ---------- UPDATE PRODUCT ----------
router.put(
  '/:id',
  authMiddleware,
  upload.array('images', 6),
  async (req, res) => {
    try {
      const p = await Product.findByPk(req.params.id);
      if (!p) return res.status(404).json({ error: "Not found" });

      // Only owner or admin
      if (req.user.role !== 'admin' &&
          !(req.user.id === p.ownerId && req.user.role === p.ownerType)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const payload = req.body;

      // Wholesalers cannot set discount
      if (p.ownerType === 'wholesaler' && payload.discount)
        return res.status(400).json({ error: "Wholesalers cannot set discount" });

      if (req.files?.length) {
        const newImgs = req.files.map(f => `/uploads/${f.filename}`);
        payload.images = [...(p.images || []), ...newImgs];
        if (!p.imageUrl) payload.imageUrl = newImgs[0];
      }

      // Remove lat/lng from payload - products use owner's address
      delete payload.lat;
      delete payload.lng;

      await p.update(payload);
      res.json(p);
    } catch (err) {
      console.error("UPDATE PRODUCT ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);


// ---------- DELETE PRODUCT ----------
router.delete('/:id', authMiddleware, async (req, res) => {
  const p = await Product.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });

  if (req.user.role !== 'admin' &&
      !(req.user.id === p.ownerId && req.user.role === p.ownerType)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await p.destroy();
  res.json({ ok: true });
});


// ---------- BUY FROM WHOLESALER (Retailers only) ----------
router.post('/:id/buy-from-wholesaler',
  authMiddleware,
  requireRole('retailer'),
  async (req, res) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) return res.status(404).json({ error: "Not found" });
      if (product.ownerType !== 'wholesaler')
        return res.status(400).json({ error: "Not a wholesaler listing" });

      const { quantity = 1 } = req.body;

      if (product.stock < quantity)
        return res.status(400).json({ error: "Insufficient stock" });

      product.stock -= quantity;
      product.soldCount += quantity;
      await product.save();

      return res.json({
        ok: true,
        purchased: quantity,
        productId: product.id,
        remainingStock: product.stock
      });
    } catch (err) {
      console.error("BUY WHOLESALE ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
