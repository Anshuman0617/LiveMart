// server/models/orderItem.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unitPrice: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10,2), allowNull: false }
  }, {
    tableName: 'order_items',
    timestamps: true
  });

  return OrderItem;
};
