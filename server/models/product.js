// server/models/product.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    discount: { type: DataTypes.DECIMAL(5,2), defaultValue: 0.0 },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    soldCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    imageUrl: { type: DataTypes.STRING },            // main thumbnail path (e.g. /uploads/...)
    images: { type: DataTypes.JSONB, defaultValue: [] }, // array of image paths
    ownerId: { type: DataTypes.INTEGER, allowNull: false }, // id of retailer/wholesaler
    ownerType: { type: DataTypes.ENUM('retailer','wholesaler'), allowNull: false },
    lat: { type: DataTypes.DECIMAL(10,7), allowNull: true },
    lng: { type: DataTypes.DECIMAL(10,7), allowNull: true },
    ratingAvg: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    reviewsCount: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'products',
    timestamps: true
  });

  return Product;
};
