// server/models/index.js
import sequelize from '../db.js';
import defineUser from './user.js';
import defineProduct from './product.js';
import defineOrder from './order.js';
import defineOrderItem from './orderItem.js';

const User = defineUser(sequelize);
const Product = defineProduct(sequelize);
const Order = defineOrder(sequelize);
const OrderItem = defineOrderItem(sequelize);

// associations
User.hasMany(Order, { as: 'orders', foreignKey: 'userId' });
Order.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

Product.hasMany(OrderItem, { as: 'orderItems', foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

export { sequelize, User, Product, Order, OrderItem };
