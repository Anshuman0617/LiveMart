// client/src/utils/recommendations.js
// Utility for generating product recommendations based on browsing and purchase history

import { getBrowsingHistory, getTopCategories, getRecentProductIds } from './browsingHistory.js';
import { analyzePurchaseHistory, getTopPurchasedCategories, getPurchasedProductIds } from './purchaseHistory.js';

/**
 * Generate personalized product recommendations
 * @param {Array} allProducts - All available products
 * @param {Array} orders - User's order history
 * @param {string} ownerType - 'retailer' or 'wholesaler'
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Array of recommended products
 */
export const generateRecommendations = (allProducts, orders = [], ownerType = 'retailer', limit = 12) => {
  if (!allProducts || allProducts.length === 0) {
    return [];
  }

  // Filter products by ownerType and exclude out-of-stock products
  const relevantProducts = allProducts.filter(p => 
    p.ownerType === ownerType && 
    p.stock !== undefined && 
    p.stock !== null && 
    p.stock > 0
  );
  
  if (relevantProducts.length === 0) {
    return [];
  }

  // Get browsing and purchase history
  const browsingHistory = getBrowsingHistory(ownerType);
  const purchaseAnalysis = analyzePurchaseHistory(orders, ownerType);
  const purchasedProductIds = getPurchasedProductIds(orders, ownerType);
  const recentProductIds = getRecentProductIds(ownerType);
  
  // Get top categories from browsing and purchases
  const topBrowsedCategories = getTopCategories(ownerType, 5);
  const topPurchasedCategories = getTopPurchasedCategories(orders, ownerType, 5);
  
  // Combine category preferences (weight purchases more)
  const categoryScores = {};
  topBrowsedCategories.forEach(({ category, count }) => {
    categoryScores[category] = (categoryScores[category] || 0) + count;
  });
  topPurchasedCategories.forEach(({ category, count }) => {
    categoryScores[category] = (categoryScores[category] || 0) + (count * 2); // Weight purchases 2x
  });

  // Score each product
  const scoredProducts = relevantProducts.map(product => {
    let score = 0;
    
    // Exclude already purchased products
    if (purchasedProductIds.includes(product.id)) {
      score -= 1000; // Heavily penalize purchased products
    }
    
    // Exclude recently viewed products
    if (recentProductIds.includes(product.id)) {
      score -= 500; // Penalize recently viewed
    }
    
    // Boost score based on category preference
    if (product.category && categoryScores[product.category]) {
      score += categoryScores[product.category] * 10;
    }
    
    // Note: Out-of-stock items are already filtered out, so all products here are in-stock
    // No need to boost for stock since all are in-stock
    
    // Boost discounted items
    if (product.discount > 0) {
      score += 20;
    }
    
    // Boost by rating (if available)
    if (product.ratingAvg > 0) {
      score += product.ratingAvg * 5;
    }
    
    // Small random boost to add variety
    score += Math.random() * 10;
    
    return { product, score };
  });

  // Sort by score and return top recommendations
  return scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.product);
};

/**
 * Personalize product list based on user preferences
 * @param {Array} products - Products to personalize
 * @param {Array} orders - User's order history
 * @param {string} ownerType - 'retailer' or 'wholesaler'
 * @returns {Array} Personalized product list
 */
export const personalizeProductList = (products, orders = [], ownerType = 'retailer') => {
  if (!products || products.length === 0) {
    return products;
  }

  const browsingHistory = getBrowsingHistory(ownerType);
  const purchaseAnalysis = analyzePurchaseHistory(orders, ownerType);
  const purchasedProductIds = getPurchasedProductIds(orders, ownerType);
  
  // Get preferred categories
  const topBrowsedCategories = getTopCategories(ownerType, 3);
  const topPurchasedCategories = getTopPurchasedCategories(orders, ownerType, 3);
  const preferredCategories = new Set([
    ...topBrowsedCategories.map(c => c.category),
    ...topPurchasedCategories.map(c => c.category)
  ]);

  // Score and sort products
  const scoredProducts = products.map(product => {
    let score = 0;
    
    // Boost products in preferred categories
    if (product.category && preferredCategories.has(product.category)) {
      score += 100;
    }
    
    // Boost in-stock items
    if (product.stock > 0) {
      score += 50;
    }
    
    // Boost discounted items
    if (product.discount > 0) {
      score += 30;
    }
    
    // Slight penalty for out-of-stock
    if (product.stock <= 0) {
      score -= 20;
    }
    
    return { product, score };
  });

  // Sort by score, but maintain some original order for variety
  return scoredProducts
    .sort((a, b) => {
      // If scores are very different, use score
      if (Math.abs(a.score - b.score) > 50) {
        return b.score - a.score;
      }
      // Otherwise maintain some original order
      return 0;
    })
    .map(item => item.product);
};

