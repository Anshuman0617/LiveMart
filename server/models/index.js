// server/models/index.js
import sequelize from '../db.js';
import defineUser from './user.js';
import defineProduct from './product.js';
import defineOrder from './order.js';
import defineOrderItem from './orderItem.js';
import defineReview from './review.js';

const User = defineUser(sequelize);
const Product = defineProduct(sequelize);
const Order = defineOrder(sequelize);
const OrderItem = defineOrderItem(sequelize);
const Review = defineReview(sequelize);

// Associations
User.hasMany(Order, { as: 'orders', foreignKey: 'userId' });
Order.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderItem, { as: 'orderItems', foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(Product, { foreignKey: 'ownerId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export { sequelize, User, Product, Order, OrderItem, Review };
