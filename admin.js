import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import AdminJSSequelize from '@adminjs/sequelize';
import sequelize from './db.js';
import User from './models/User.js';

AdminJS.registerAdapter(AdminJSSequelize);

const adminJs = new AdminJS({
  databases: [sequelize],
  rootPath: '/admin',
  branding: {
    companyName: 'LiveMart Admin',
  },
});

const router = AdminJSExpress.buildRouter(adminJs);

export { adminJs, router };
