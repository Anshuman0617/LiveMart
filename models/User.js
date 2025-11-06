import { DataTypes } from 'sequelize';
import sequelize from '../db.js';  // note the .js extension

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
});

export default User;
