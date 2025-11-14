// server/models/order.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    status: { type: DataTypes.ENUM('pending','paid','fulfilled','cancelled'), defaultValue: 'pending' },
    total: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
    address: { type: DataTypes.TEXT }
  }, {
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};
