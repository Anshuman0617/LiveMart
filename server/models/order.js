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
    paymentOrderId: { type: DataTypes.STRING, allowNull: true },
    scheduledPickupTime: { type: DataTypes.DATE, allowNull: true }, // Scheduled pickup date/time for store orders
    deliveryPersonId: { type: DataTypes.INTEGER, allowNull: true }, // ID of delivery person assigned to this order
    outForDelivery: { type: DataTypes.DATE, allowNull: true }, // Timestamp when order was marked as out for delivery
    deliveredAt: { type: DataTypes.DATE, allowNull: true }, // Timestamp when order was delivered
    trackingStatus: { 
      type: DataTypes.ENUM('pending', 'out_for_delivery', 'delivered'), 
      defaultValue: 'pending',
      allowNull: false
    }, // Tracking status for delivery
    deliveryType: {
      type: DataTypes.ENUM('wholesaler_to_retailer', 'retailer_to_consumer'),
      allowNull: true
    }, // Type of delivery: from wholesaler to retailer, or from retailer to consumer
    deliveryOTP: { type: DataTypes.STRING, allowNull: true }, // OTP for delivery verification
    deliveryOTPExpiresAt: { type: DataTypes.DATE, allowNull: true } // OTP expiration timestamp
  }, {
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};
