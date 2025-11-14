// server/models/user.js
import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';

export default (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('customer','retailer','wholesaler','admin'), defaultValue: 'customer' },
    passwordHash: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'users',
    timestamps: true
  });

  User.prototype.verifyPassword = function(password) {
    return bcrypt.compare(password, this.passwordHash);
  };

  return User;
};
