// server/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from './models/index.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import { buildAdminRouter } from './admin.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    // dev convenience
    await sequelize.sync({ alter: true });
    console.log('Sequelize synced (alter:true)');

    await buildAdminRouter(app);
    console.log('AdminJS mounted at /admin');

    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Startup error', err);
    process.exit(1);
  }
})();
