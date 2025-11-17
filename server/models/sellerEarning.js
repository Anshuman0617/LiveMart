// server/models/sellerEarning.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SellerEarning = sequelize.define('SellerEarning', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false }, // retailer/wholesaler user ID
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    orderItemId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10,2), allowNull: false }, // total before commission
    platformCommission: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 }, // platform's cut (percentage or fixed)
    commissionPercent: { type: DataTypes.DECIMAL(5,2), defaultValue: 5.00 }, // default 5% commission
    sellerAmount: { type: DataTypes.DECIMAL(10,2), allowNull: false }, // amount seller should receive
    status: { 
      type: DataTypes.ENUM('pending', 'settled', 'cancelled'), 
      defaultValue: 'pending' 
    }, // whether payment has been transferred to seller
    settledAt: { type: DataTypes.DATE, allowNull: true },
    settlementNotes: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'seller_earnings',
    timestamps: true
  });

  return SellerEarning;
};

