// server/models/review.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Review = sequelize.define('Review', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false }, // 1..5
    text: { type: DataTypes.TEXT, allowNull: true },
    retailerResponse: { type: DataTypes.TEXT, allowNull: true }, // Response from retailer
    retailerResponseAt: { type: DataTypes.DATE, allowNull: true } // When retailer responded
  }, {
    tableName: 'reviews',
    timestamps: true
  });

  return Review;
};
