// server/models/index.js
import sequelize from '../db.js';
import defineUser from './user.js';
import defineProduct from './product.js';
import defineOrder from './order.js';
import defineOrderItem from './orderItem.js';
import defineReview from './review.js';
import defineSellerEarning from './sellerEarning.js';
import defineQuestion from './question.js';

const User = defineUser(sequelize);
const Product = defineProduct(sequelize);
const Order = defineOrder(sequelize);
const OrderItem = defineOrderItem(sequelize);
const Review = defineReview(sequelize);
const SellerEarning = defineSellerEarning(sequelize);
const Question = defineQuestion(sequelize);

// Associations
User.hasMany(Order, { as: 'orders', foreignKey: 'userId' });
Order.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Delivery person association
User.hasMany(Order, { as: 'deliveryOrders', foreignKey: 'deliveryPersonId' });
Order.belongsTo(User, { as: 'deliveryPerson', foreignKey: 'deliveryPersonId' });

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });

Product.hasMany(OrderItem, { as: 'orderItems', foreignKey: 'productId' });
OrderItem.belongsTo(Product, { as: 'product', foreignKey: 'productId' });

User.hasMany(Product, { foreignKey: 'ownerId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Question associations
User.hasMany(Question, { foreignKey: 'userId', as: 'questions' });
Product.hasMany(Question, { foreignKey: 'productId', as: 'questions' });
Question.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Question.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Question.belongsTo(User, { foreignKey: 'answeredBy', as: 'answeredByUser' });

// SellerEarning associations
User.hasMany(SellerEarning, { foreignKey: 'sellerId', as: 'earnings' });
SellerEarning.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Order.hasMany(SellerEarning, { foreignKey: 'orderId', as: 'sellerEarnings' });
SellerEarning.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.hasOne(SellerEarning, { foreignKey: 'orderItemId', as: 'earning' });
SellerEarning.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'orderItem' });
Product.hasMany(SellerEarning, { foreignKey: 'productId', as: 'earnings' });
SellerEarning.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export { sequelize, User, Product, Order, OrderItem, Review, SellerEarning, Question };
