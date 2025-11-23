// server/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from './models/index.js';

// --- ROUTES ---
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import usersRoutes from './routes/users.js';
import reviewsRoutes from './routes/reviews.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes from './routes/payments.js';
import earningsRoutes from './routes/earnings.js';
import otpRoutes from './routes/otp.js';
import questionsRoutes from './routes/questions.js';

// --- ADMIN ---
import { buildAdminRouter } from './admin.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// serve uploaded images
app.use('/uploads', express.static('server/uploads'));

// mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/questions', questionsRoutes);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    await sequelize.sync({ alter: true });
    console.log('Sequelize synced');

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
