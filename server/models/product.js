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
    reviewsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    multiples: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: false }, // Minimum order quantity multiple (for wholesalers)
    sourceProductId: { type: DataTypes.INTEGER, allowNull: true }, // ID of the wholesaler product this retailer product was created from
    category: { 
      type: DataTypes.ENUM(
        'Electronics',
        'Fashion and Apparel',
        'Home Goods',
        'Beauty and Personal Care',
        'Food and Beverages',
        'Toys and Hobbies',
        'Health and Wellness',
        'Pet Supplies',
        'DIY and Hardware',
        'Media',
        'Others'
      ), 
      defaultValue: 'Others',
      allowNull: false
    },
    availabilityDate: { type: DataTypes.DATEONLY, allowNull: true } // Date when out-of-stock item will be back in stock
  }, {
    tableName: 'products',
    timestamps: true
  });

  return Product;
};
