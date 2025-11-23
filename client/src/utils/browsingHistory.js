// client/src/utils/browsingHistory.js
// Utility for tracking and managing user browsing history

const MAX_HISTORY_ITEMS = 100; // Keep last 100 viewed products
const HISTORY_KEY_PREFIX = 'browsingHistory_';

/**
 * Get browsing history key for current user
 */
const getHistoryKey = () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || 'anonymous';
  return `${HISTORY_KEY_PREFIX}${userId}`;
};

/**
 * Track a product view
 * @param {number} productId - Product ID
 * @param {string} productCategory - Product category
 * @param {string} ownerType - 'retailer' or 'wholesaler'
 */
export const trackProductView = (productId, productCategory, ownerType = 'retailer') => {
  try {
    const key = getHistoryKey();
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Remove existing entry if present (to move to top)
    const filteredHistory = history.filter(item => item.productId !== productId);
    
    // Add new entry at the beginning
    const newEntry = {
      productId,
      category: productCategory,
      ownerType,
      timestamp: Date.now()
    };
    
    const updatedHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  } catch (err) {
    console.error('Error tracking product view:', err);
  }
};

/**
 * Get browsing history
 * @param {string} ownerType - Optional filter by owner type
 * @param {number} limit - Maximum number of items to return
 * @returns {Array} Array of browsing history items
 */
export const getBrowsingHistory = (ownerType = null, limit = 50) => {
  try {
    const key = getHistoryKey();
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    
    let filtered = history;
    if (ownerType) {
      filtered = history.filter(item => item.ownerType === ownerType);
    }
    
    return filtered.slice(0, limit);
  } catch (err) {
    console.error('Error getting browsing history:', err);
    return [];
  }
};

/**
 * Get most viewed categories
 * @param {string} ownerType - Optional filter by owner type
 * @param {number} limit - Maximum number of categories to return
 * @returns {Array} Array of category objects with count
 */
export const getTopCategories = (ownerType = null, limit = 5) => {
  try {
    const history = getBrowsingHistory(ownerType);
    const categoryCounts = {};
    
    history.forEach(item => {
      if (item.category && item.category !== 'Others') {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (err) {
    console.error('Error getting top categories:', err);
    return [];
  }
};

/**
 * Get recently viewed product IDs
 * @param {string} ownerType - Optional filter by owner type
 * @param {number} limit - Maximum number of IDs to return
 * @returns {Array} Array of product IDs
 */
export const getRecentProductIds = (ownerType = null, limit = 20) => {
  const history = getBrowsingHistory(ownerType, limit);
  return history.map(item => item.productId);
};

/**
 * Clear browsing history
 */
export const clearBrowsingHistory = () => {
  try {
    const key = getHistoryKey();
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Error clearing browsing history:', err);
  }
};

