// server/admin.js
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import AdminJSSequelize from '@adminjs/sequelize';
import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import { sequelize, User, Product, Order, OrderItem } from './models/index.js';
dotenv.config();

AdminJS.registerAdapter(AdminJSSequelize);

const admin = new AdminJS({
  databases: [sequelize],
  rootPath: '/admin',
  resources: [
    { resource: User, options: { properties: { passwordHash: { isVisible: false }, id: { isVisible: { edit: false, list: true, show: true } } } } },
    { resource: Product },
    { resource: Order },
    { resource: OrderItem }
  ]
});

export async function buildAdminRouter(app) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

  // express-session is required by AdminJS buildAuthenticatedRouter in v7 flows
  app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'session_secret',
    resave: true,
    saveUninitialized: true,
  }));

  const router = AdminJSExpress.buildAuthenticatedRouter(admin, {
    authenticate: async (email, password) => {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return { email: ADMIN_EMAIL };
      }
      return null;
    },
    cookieName: 'adminjs',
    cookiePassword: process.env.JWT_SECRET || 'cookie_secret'
  }, null, {
    resave: true,
    saveUninitialized: true,
  });

  app.use(admin.options.rootPath, router);
  return router;
}
