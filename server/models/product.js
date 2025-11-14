// server/models/product.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    imageUrl: { type: DataTypes.STRING }
  }, {
    tableName: 'products',
    timestamps: true
  });

  return Product;
};
