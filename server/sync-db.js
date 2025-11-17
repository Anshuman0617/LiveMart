// server/sync-db.js
// Script to sync database schema with models
import dotenv from 'dotenv';
dotenv.config();

import { sequelize, User, Product, Order, OrderItem, Review, SellerEarning } from './models/index.js';

async function syncDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connected');

    console.log('\nSyncing database schema...');
    console.log('This will:');
    console.log('  - Add new columns to users table (payment account fields)');
    console.log('  - Create seller_earnings table (new)');
    console.log('  - Update any other model changes');
    
    await sequelize.sync({ alter: true });
    console.log('✓ Database schema synced successfully!');

    console.log('\nDatabase update complete!');
    console.log('\nChanges made:');
    console.log('  1. Added payment account fields to users table:');
    console.log('     - bankAccountName');
    console.log('     - bankAccountNumber');
    console.log('     - bankIFSC');
    console.log('     - bankName');
    console.log('     - upiId');
    console.log('     - payuMerchantKey');
    console.log('  2. Created seller_earnings table');
    console.log('     - Tracks earnings for each order item');
    console.log('     - Links to sellers, orders, and products');

    process.exit(0);
  } catch (err) {
    console.error('✗ Database sync failed:', err);
    process.exit(1);
  }
}

syncDatabase();

