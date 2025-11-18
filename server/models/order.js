// server/models/order.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('pending','paid','confirmed','fulfilled','delivered','cancelled'), defaultValue: 'pending' },
    total: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
    address: { type: DataTypes.TEXT, allowNull: true },
    paymentId: { type: DataTypes.STRING, allowNull: true },
    paymentOrderId: { type: DataTypes.STRING, allowNull: true }
  }, {
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};
