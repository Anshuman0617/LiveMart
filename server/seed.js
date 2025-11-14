// server/seed.js
import dotenv from 'dotenv';
dotenv.config();

import { sequelize, User, Product } from './models/index.js';
import bcrypt from 'bcrypt';

async function seed() {
  await sequelize.sync({ alter: true });

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'adminpassword';
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

  const count = await Product.count();
  if (count === 0) {
    await Product.bulkCreate([
      { title: 'Apples (1kg)', description: 'Fresh apples', price: 2.50, stock: 100, imageUrl: '' },
      { title: 'Rice (5kg)', description: 'Basmati rice', price: 20.00, stock: 50, imageUrl: '' },
      { title: 'Shampoo 200ml', description: 'Haircare', price: 5.00, stock: 200, imageUrl: '' }
    ]);
    console.log('Seeded products');
  }

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
