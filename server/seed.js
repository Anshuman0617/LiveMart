// server/seed.js
import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize';
import pkg from 'pg';
const { Client } = pkg;
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

// Create database if it doesn't exist
async function ensureDatabaseExists() {
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS;
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;

  if (!dbName) {
    throw new Error('DB_NAME is not set in .env file');
  }

  // Connect to PostgreSQL server (using default 'postgres' database)
  const adminClient = new Client({
    host: dbHost,
    port: parseInt(dbPort),
    user: dbUser,
    password: dbPass,
    database: 'postgres' // Connect to default database
  });

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const result = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`Database '${dbName}' does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database '${dbName}' created successfully`);
    } else {
      console.log(`✓ Database '${dbName}' already exists`);
    }
  } catch (err) {
    console.error('Error checking/creating database:', err);
    throw err;
  } finally {
    await adminClient.end();
  }
}

async function seed() {
  try {
    // Ensure database exists before connecting
    await ensureDatabaseExists();
    
    // Now connect to the target database
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connected');
    
    // Sync schema
    console.log('Syncing database schema...');
    await sequelize.sync({ alter: true });
    console.log('✓ Database schema synced');
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }

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
    const adamAddress = 'Opp Secunderabad Railway Station, Secunderabad, Telangana 500078, India'; // Default address
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
        const defaultAddress = 'Opp Secunderabad Railway Station, Secunderabad, Telangana 500078, India';
        const geo = await geocodeAddress(defaultAddress);
        adam.address = defaultAddress;
        adam.lat = geo?.lat || 17.4399;
        adam.lng = geo?.lng || 78.4983;
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
  const adamProductsToCreate = [
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
  const existingAdamProducts = await Product.findAll({ 
    where: { ownerId: adam.id } 
  });
  
  const existingAdamTitles = new Set(existingAdamProducts.map(p => p.title));
  const newAdamProducts = adamProductsToCreate.filter(p => !existingAdamTitles.has(p.title));

  if (newAdamProducts.length > 0) {
    await Product.bulkCreate(newAdamProducts);
    console.log(`Created ${newAdamProducts.length} new product(s) for retailer Adam`);
  } else {
    console.log('All seed products already exist for Adam');
  }

  // Create or update Badam (wholesaler) with address
  let badam = await User.findOne({ where: { email: 'badam@example.com' }});
  
  if (!badam) {
    // Badam doesn't exist - create with defaults
    const badamPassword = 'password';
    const badamAddress = '456 Wholesale Avenue, Los Angeles, CA 90001, USA'; // Default address
    const h = await bcrypt.hash(badamPassword, 10);
    
    // Geocode address
    const geo = await geocodeAddress(badamAddress);
    if (!geo) {
      console.warn('⚠️ Failed to geocode Badam\'s address. Using default coordinates.');
    }
    
    badam = await User.create({
      email: 'badam@example.com',
      name: 'Badam',
      passwordHash: h,
      role: 'wholesaler',
      address: badamAddress,
      lat: geo?.lat || 34.0522, // Default to LA if geocoding fails
      lng: geo?.lng || -118.2437
    });
    console.log('Created wholesaler Badam with default address:', badamAddress);
  } else {
    // Badam exists - use his existing password and address
    console.log('Found existing Badam user');
    
    // Only update address/location if missing
    if (!badam.address || !badam.lat || !badam.lng) {
      // If address exists but no lat/lng, geocode it
      if (badam.address && (!badam.lat || !badam.lng)) {
        const geo = await geocodeAddress(badam.address);
        if (geo) {
          badam.lat = geo.lat;
          badam.lng = geo.lng;
          await badam.save();
          console.log('Geocoded Badam\'s existing address:', badam.address);
        } else {
          console.warn('⚠️ Failed to geocode Badam\'s existing address.');
        }
      } else {
        // No address at all - set default
        const defaultAddress = '456 Wholesale Avenue, Los Angeles, CA 90001, USA';
        const geo = await geocodeAddress(defaultAddress);
        badam.address = defaultAddress;
        badam.lat = geo?.lat || 34.0522;
        badam.lng = geo?.lng || -118.2437;
        await badam.save();
        console.log('Set default address for Badam:', defaultAddress);
      }
    } else {
      console.log('Badam already has address and location set:', badam.address);
    }
  }

  // Create products for Badam (wholesaler with location)
  const badamProductsToCreate = [
    { 
      title: 'Bulk Rice (50kg)', 
      description: 'Premium quality basmati rice, perfect for restaurants and retailers. Wholesale pricing available for bulk orders.', 
      price: 150.00, 
      stock: 500, 
      ownerId: badam.id, 
      ownerType: 'wholesaler' 
    },
    { 
      title: 'Wholesale Sugar (25kg)', 
      description: 'Fine granulated sugar, ideal for commercial use. Best prices for bulk purchases.', 
      price: 80.00, 
      stock: 300, 
      ownerId: badam.id, 
      ownerType: 'wholesaler' 
    },
    { 
      title: 'Bulk Cooking Oil (20L)', 
      description: 'Pure vegetable cooking oil, suitable for restaurants and food businesses. Wholesale rates apply.', 
      price: 120.00, 
      stock: 200, 
      ownerId: badam.id, 
      ownerType: 'wholesaler' 
    }
  ];

  // Check which products already exist (by title) to avoid duplicates
  const existingBadamProducts = await Product.findAll({ 
    where: { ownerId: badam.id } 
  });
  
  const existingBadamTitles = new Set(existingBadamProducts.map(p => p.title));
  const newBadamProducts = badamProductsToCreate.filter(p => !existingBadamTitles.has(p.title));

  if (newBadamProducts.length > 0) {
    await Product.bulkCreate(newBadamProducts);
    console.log(`Created ${newBadamProducts.length} new product(s) for wholesaler Badam`);
  } else {
    console.log('All seed products already exist for Badam');
  }

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
