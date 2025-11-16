// server/models/user.js
import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';

export default (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('customer','retailer','wholesaler','admin'), defaultValue: 'customer' },
    passwordHash: { type: DataTypes.STRING, allowNull: true },
    provider: { type: DataTypes.STRING, allowNull: true },
    providerId: { type: DataTypes.STRING, allowNull: true },
    picture: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    lat: { type: DataTypes.DECIMAL(10,7), allowNull: true },
    lng: { type: DataTypes.DECIMAL(10,7), allowNull: true }
  }, {
    tableName: 'users',
    timestamps: true
  });

  User.prototype.verifyPassword = function(password) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(password, this.passwordHash);
  };

  // utility to set password
  User.beforeCreate(async (user) => {
    if (user.passwordHash && user.passwordHash.length < 60) { // if raw password accidentally provided
      user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
    }
  });

  return User;
};
