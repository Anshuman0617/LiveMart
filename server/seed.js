// server/seed.js
import dotenv from 'dotenv';
dotenv.config();

import { sequelize, User, Product } from './models/index.js';
import bcrypt from 'bcryptjs';

// Geocode address to get lat/lng
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

async function seed() {
  await sequelize.sync({ alter: true });

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmin = await User.findOne({ where: { email: adminEmail }});
  if (!existingAdmin) {
    const h = await bcrypt.hash(adminPass, 10);
    await User.create({ email: adminEmail, name: 'Admin', passwordHash: h, role: 'admin' });
    console.log('Created admin user:', adminEmail);
  }

  const u = await User.findOne({ where: { email: 'alice@example.com' }});
  if (!u) {
    const h = await bcrypt.hash('password', 10);
    await User.create({ email: 'alice@example.com', name: 'Alice', passwordHash: h, role: 'customer' });
  }

  // Create or update Adam (retailer) with address
  let adam = await User.findOne({ where: { email: 'adam@example.com' }});
  
  if (!adam) {
    // Adam doesn't exist - create with defaults
    const adamPassword = 'password';
    const adamAddress = '123 Main Street, New York, NY 10001, USA'; // Default address
    const h = await bcrypt.hash(adamPassword, 10);
    
    // Geocode address
    const geo = await geocodeAddress(adamAddress);
    if (!geo) {
      console.warn('⚠️ Failed to geocode Adam\'s address. Using default coordinates.');
    }
    
    adam = await User.create({
      email: 'adam@example.com',
      name: 'Adam',
      passwordHash: h,
      role: 'retailer',
      address: adamAddress,
      lat: geo?.lat || 40.7128, // Default to NYC if geocoding fails
      lng: geo?.lng || -74.0060
    });
    console.log('Created retailer Adam with default address:', adamAddress);
  } else {
    // Adam exists - use his existing password and address
    console.log('Found existing Adam user');
    
    // Only update address/location if missing
    if (!adam.address || !adam.lat || !adam.lng) {
      // If address exists but no lat/lng, geocode it
      if (adam.address && (!adam.lat || !adam.lng)) {
        const geo = await geocodeAddress(adam.address);
        if (geo) {
          adam.lat = geo.lat;
          adam.lng = geo.lng;
          await adam.save();
          console.log('Geocoded Adam\'s existing address:', adam.address);
        } else {
          console.warn('⚠️ Failed to geocode Adam\'s existing address.');
        }
      } else {
        // No address at all - set default
        const defaultAddress = '123 Main Street, New York, NY 10001, USA';
        const geo = await geocodeAddress(defaultAddress);
        adam.address = defaultAddress;
        adam.lat = geo?.lat || 40.7128;
        adam.lng = geo?.lng || -74.0060;
        await adam.save();
        console.log('Set default address for Adam:', defaultAddress);
      }
    } else {
      console.log('Adam already has address and location set:', adam.address);
    }
  }

  // Remove products that belong to owners without location
  // Get all products with their owners
  const allProducts = await Product.findAll({
    include: [{
      model: User,
      as: 'owner',
      required: true
    }]
  });

  // Find products whose owners don't have address/location
  const productsToRemove = allProducts.filter(p => {
    const owner = p.owner;
    const hasAddress = owner.address && owner.address.trim();
    return !hasAddress || !owner.lat || !owner.lng;
  });

  if (productsToRemove.length > 0) {
    const productIds = productsToRemove.map(p => p.id);
    await Product.destroy({ where: { id: productIds } });
    console.log(`Removed ${productsToRemove.length} product(s) without owner location`);
  }

  // Create products for Adam (retailer with location)
  // Always create the seed products for Adam
  const productsToCreate = [
    { 
      title: 'Fresh Apples (1kg)', 
      description: 'Crisp and juicy red apples, locally sourced', 
      price: 2.50, 
      stock: 100, 
      ownerId: adam.id, 
      ownerType: 'retailer' 
    },
    { 
      title: 'Organic Tomatoes (500g)', 
      description: 'Fresh organic tomatoes, perfect for salads', 
      price: 3.00, 
      stock: 75, 
      ownerId: adam.id, 
      ownerType: 'retailer' 
    },
    { 
      title: 'Premium Shampoo 200ml', 
      description: 'Nourishing haircare product for all hair types', 
      price: 5.00, 
      stock: 200, 
      ownerId: adam.id, 
      ownerType: 'retailer' 
    },
    { 
      title: 'Whole Wheat Bread', 
      description: 'Freshly baked whole wheat bread, daily delivery', 
      price: 2.00, 
      stock: 50, 
      ownerId: adam.id, 
      ownerType: 'retailer' 
    },
    { 
      title: 'Organic Milk (1L)', 
      description: 'Fresh organic milk from local farms', 
      price: 4.50, 
      stock: 80, 
      ownerId: adam.id, 
      ownerType: 'retailer' 
    }
  ];

  // Check which products already exist (by title) to avoid duplicates
  const existingProducts = await Product.findAll({ 
    where: { ownerId: adam.id } 
  });
  
  const existingTitles = new Set(existingProducts.map(p => p.title));
  const newProducts = productsToCreate.filter(p => !existingTitles.has(p.title));

  if (newProducts.length > 0) {
    await Product.bulkCreate(newProducts);
    console.log(`Created ${newProducts.length} new product(s) for retailer Adam`);
  } else {
    console.log('All seed products already exist for Adam');
  }

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
