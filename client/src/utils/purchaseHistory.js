// client/src/utils/purchaseHistory.js
// Utility for analyzing purchase history from orders

/**
 * Analyze purchase history from orders
 * @param {Array} orders - Array of order objects
 * @param {string} ownerType - 'retailer' or 'wholesaler' to filter by
 * @returns {Object} Analysis object with categories, products, etc.
 */
export const analyzePurchaseHistory = (orders, ownerType = null) => {
  const analysis = {
    categories: {},
    productIds: [],
    totalSpent: 0,
    orderCount: 0,
    avgOrderValue: 0
  };

  if (!orders || orders.length === 0) {
    return analysis;
  }

  orders.forEach(order => {
    if (!order.items || order.items.length === 0) return;
    
    // Filter by ownerType if specified
    const relevantItems = ownerType
      ? order.items.filter(item => 
          item.product && 
          item.product.ownerType === ownerType
        )
      : order.items;

    relevantItems.forEach(item => {
      if (item.product) {
        // Track categories
        const category = item.product.category || 'Others';
        analysis.categories[category] = (analysis.categories[category] || 0) + 1;
        
        // Track product IDs
        if (!analysis.productIds.includes(item.product.id)) {
          analysis.productIds.push(item.product.id);
        }
      }
    });

    // Calculate spending
    const orderTotal = parseFloat(order.total) || 0;
    analysis.totalSpent += orderTotal;
    analysis.orderCount += 1;
  });

  analysis.avgOrderValue = analysis.orderCount > 0 
    ? analysis.totalSpent / analysis.orderCount 
    : 0;

  return analysis;
};

/**
 * Get top purchased categories
 * @param {Array} orders - Array of order objects
 * @param {string} ownerType - Optional filter by owner type
 * @param {number} limit - Maximum number of categories to return
 * @returns {Array} Array of category objects with count
 */
export const getTopPurchasedCategories = (orders, ownerType = null, limit = 5) => {
  const analysis = analyzePurchaseHistory(orders, ownerType);
  
  return Object.entries(analysis.categories)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Get purchased product IDs
 * @param {Array} orders - Array of order objects
 * @param {string} ownerType - Optional filter by owner type
 * @returns {Array} Array of product IDs
 */
export const getPurchasedProductIds = (orders, ownerType = null) => {
  const analysis = analyzePurchaseHistory(orders, ownerType);
  return analysis.productIds;
};

