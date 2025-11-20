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
// Optional auth: allows both authenticated and unauthenticated users
router.get('/', authMiddleware, async (req, res) => {
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

    // Filter by ownerType if explicitly requested
    if (ownerType === 'retailer' || ownerType === 'wholesaler') {
      where.ownerType = ownerType;
    } else {
      // If ownerType is not specified, filter based on user role
      // Only retailers can see wholesaler products
      // Regular users (customers) should only see retailer products
      const userRole = req.user?.role;
      if (userRole !== 'retailer') {
        // Non-retailers (customers, wholesalers, etc.) can only see retailer products
        where.ownerType = 'retailer';
      }
      // If user is a retailer and ownerType is not specified, show all products (retailer + wholesaler)
      // This allows retailers to see both types when browsing
    }

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
// Optional auth: allows both authenticated and unauthenticated users
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const p = await Product.findByPk(productId, {
      include: [
        { model: User, as: 'owner',
          attributes: ['id','name','role','picture','address','lat','lng']
        }
      ]
    });
    if (!p) return res.status(404).json({ error: "Not found" });
    
    // Only retailers can access wholesaler products
    // Regular users (customers) should not be able to see wholesaler products
    // BUT: Wholesalers can view their own products
    const userRole = req.user?.role;
    const userId = req.user?.id;
    if (p.ownerType == 'wholesaler' && userRole !== 'retailer') {
      // Allow wholesalers to view their own products
      if (userRole == 'wholesaler' && p.ownerId == userId) {
        // Allow access - wholesaler viewing their own product
      } else {
        return res.status(403).json({ error: "Access denied. Wholesale products are only available to retailers." });
      }
    }
    
    res.json(p);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    console.error("Error details:", err.message);
    if (err.name === 'SequelizeDatabaseError') {
      return res.status(400).json({ error: "Database error: " + err.message });
    }
    res.status(500).json({ error: "Server error" });
  }
});


// ---------- CREATE PRODUCT (Retailer & Wholesaler) ----------
router.post(
  '/',
  authMiddleware,
  requireRole(['retailer', 'wholesaler']),
  upload.array('images', 6),
  async (req, res) => {
    try {
      const { title, description, price, stock, multiples } = req.body;

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
        multiples: multiples ? parseInt(multiples) : 1, // Default to 1 if not provided
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

      // Parse multiples if provided (for wholesalers)
      if (payload.multiples !== undefined) {
        payload.multiples = parseInt(payload.multiples) || 1;
        if (payload.multiples < 1) {
          payload.multiples = 1;
        }
      }

      if (req.files?.length) {
        const newImgs = req.files.map(f => `/uploads/${f.filename}`);
        const currentImages = p.images || [];
        const totalImages = currentImages.length + newImgs.length;
        
        // Limit to 6 images total
        if (totalImages > 6) {
          const allowedNew = 6 - currentImages.length;
          if (allowedNew > 0) {
            payload.images = [...currentImages, ...newImgs.slice(0, allowedNew)];
          } else {
            payload.images = currentImages; // No new images if already at limit
          }
        } else {
          payload.images = [...currentImages, ...newImgs];
        }
        
        if (!p.imageUrl && payload.images.length > 0) {
          payload.imageUrl = payload.images[0];
        }
      }

      // Remove lat/lng from payload - products use owner's address
      delete payload.lat;
      delete payload.lng;

      await p.update(payload);
      // Reload to get updated data including associations
      await p.reload({
        include: [
          { model: User, as: 'owner',
            attributes: ['id','name','role','picture','address','lat','lng']
          }
        ]
      });
      res.json(p);
    } catch (err) {
      console.error("UPDATE PRODUCT ERROR:", err);
      console.error("Error details:", err.message, err.stack);
      // Return more specific error message
      if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeDatabaseError') {
        return res.status(400).json({ error: err.message || "Validation error" });
      }
      res.status(500).json({ error: "Server error" });
    }
  }
);


// ---------- DELETE PRODUCT IMAGE ----------
router.delete('/:id/images/:imageIndex', authMiddleware, async (req, res) => {
  try {
    const p = await Product.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });

    // Only owner or admin
    if (req.user.role !== 'admin' &&
        !(req.user.id === p.ownerId && req.user.role === p.ownerType)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const imageIndex = parseInt(req.params.imageIndex);
    const images = p.images || [];
    
    if (imageIndex < 0 || imageIndex >= images.length) {
      return res.status(400).json({ error: "Invalid image index" });
    }

    // Remove the image at the specified index
    const updatedImages = images.filter((_, idx) => idx !== imageIndex);
    
    // Update imageUrl if it was the deleted image
    let newImageUrl = p.imageUrl;
    if (p.imageUrl === images[imageIndex]) {
      newImageUrl = updatedImages[0] || null;
    }

    await p.update({
      images: updatedImages,
      imageUrl: newImageUrl
    });

    res.json({ ok: true, images: updatedImages, imageUrl: newImageUrl });
  } catch (err) {
    console.error("DELETE IMAGE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

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
