# LiveMart Project - Corrected Specifications Sections

## 10. Project Specifications

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML5, CSS3, Flexbox, Grid, JavaScript ES6+, React.js 19.1.x, React Hooks (useState, useEffect), Axios for API calls, Vite 7.1.x |
| **Backend** | Node.js 18.x LTS, Express.js 5.1.x, REST APIs, Polling-based updates (30-second auto-refresh for delivery dashboard) |
| **Database** | PostgreSQL 17.6 with relational schema, Sequelize ORM 6.37.x, Atomic Transactions (for payment processing), Connection pooling |
| **Authentication** | OTP via Email (10-minute expiry for registration, 30-minute for delivery), Google OAuth (google-auth-library), JWT Tokens (7-day expiry) |
| **Payment** | PayU Money (UPI, Cards, Net Banking, Wallets, EMI, ~~LazyPay~~, NEFT/RTGS), Transaction ID Tracking, Test Mode (OTP 123456), Hash-based verification |
| **Email Service** | Nodemailer 7.0.x (OTP, confirmations, notifications) - Synchronous processing |
| **Search** | Fuzzy Search (typo-tolerant matching, missing characters, swapped letters) - Client-side filtering |
| **Location Services** | Google Maps API, Google Places API (address auto-complete with auto-fill), Geolocation API, Distance Matrix API for calculations |
| **Update Mechanisms** | Polling-based auto-refresh (delivery dashboard: 30 seconds), Event-driven UI updates via localStorage events, Debounced search (300ms) |
| **Image Handling** | Up to 6 images per product with thumbnail carousel, Multer for uploads, Automatic sorting of out-of-stock items to end |
| **Cart Management** | Maximum 10 items per product, Enforced quantity limits, Real-time subtotal calculation with discount support, localStorage persistence |
| **Wholesale** | Order multiples enforcement, Bulk pricing tiers, Real-time inventory tracking, Auto-stock update on delivery |
| **Error Handling** | Comprehensive error modals, User-friendly validation messages, Graceful failure handling, Input validation on key endpoints |
| **Version Control** | Git, GitHub |
| **Admin Panel** | AdminJS 7.8.x with Sequelize adapter |
| **Deployment** | Cloud hosting (frontend, backend), Managed PostgreSQL (database), Load balancing (recommended), HTTPS/TLS at deployment level |

---

## Development Process Description

The development process encompasses full-stack competency including frontend design with React (19.1.x) components and responsive layouts using Flexbox and CSS Grid, backend API development with Node.js (18.x LTS) and Express.js (5.1.x), database design with PostgreSQL (17.6) using Sequelize ORM (6.37.x), polling-based update mechanisms for delivery dashboard (30-second refresh), third-party service integration (PayU Money with test mode and hash verification, Google Maps/Places APIs for location services, Nodemailer 7.0.x for synchronous email processing), and deployment considerations. The project serves as both a functional e-commerce solution and a comprehensive portfolio demonstrating professional web development capabilities with advanced features like fuzzy search with typo tolerance, multi-stakeholder transaction tracking with atomic database transactions, recommendation algorithms based on browsing and purchase history, and production-grade error handling with user-friendly validation.

---

## Performance Optimization

**Performance Optimization:**
- **Database connection pooling** (Sequelize manages pool: max 10 connections, idle timeout 10s)
- **Database indexing** on frequently queried fields (via Sequelize model definitions)
- **API response pagination** (page-based pagination with configurable pageSize, default 50)
- **Image optimization** for faster loading (supports up to 6 images per product, Multer handles uploads)
- **Synchronous email processing** (emails sent during request handling, no background queue)
- **Debounced search** (300ms debounce for filter changes to reduce API calls)
- **Fuzzy search optimization** for efficient typo-tolerant matching (client-side filtering after database fetch)
- **Out-of-stock sorting** (automatic client-side sorting to push out-of-stock items to end)
- **localStorage caching** (browsing history, cart persistence, user preferences)
- **Product list personalization** (scoring algorithm prioritizes preferred categories and in-stock items)

---

## Summary of Changes Made

### Project Specifications Table:
1. ✅ Removed Bootstrap 5.3.x (not used - custom CSS only)
2. ✅ Removed WebSocket (only polling implemented)
3. ✅ Removed EJS 3.1.x (not used - JSON APIs only)
4. ✅ Updated React version: 19.1.x (was 18.x)
5. ✅ Updated Express version: 5.1.x (was 4.18.x)
6. ✅ Updated PostgreSQL version: 17.6 (was 14.x)
7. ✅ Added Sequelize version: 6.37.x
8. ✅ Removed strikethrough from Nodemailer (actually used - 7.0.x)
9. ✅ Removed strikethrough from AdminJS (actually used - 7.8.x)
10. ✅ Kept LazyPay strikethrough (not implemented)
11. ✅ Changed "Real-Time Updates" to "Polling-based updates"
12. ✅ Added Vite 7.1.x to Frontend
13. ✅ Added "Hash-based verification" to Payment
14. ✅ Added "Distance Matrix API" to Location Services
15. ✅ Added "Debounced search (300ms)" to Update Mechanisms
16. ✅ Added "Multer for uploads" to Image Handling
17. ✅ Added "localStorage persistence" to Cart Management
18. ✅ Added "Auto-stock update on delivery" to Wholesale
19. ✅ Added "Input validation on key endpoints" to Error Handling
20. ✅ Added "Sequelize adapter" to Admin Panel
21. ✅ Added "HTTPS/TLS at deployment level" to Deployment

### Development Process Description:
1. ✅ Updated React version: 19.1.x
2. ✅ Updated Express version: 5.1.x
3. ✅ Updated PostgreSQL version: 17.6
4. ✅ Added Sequelize version: 6.37.x
5. ✅ Changed "real-time update mechanisms" to "polling-based update mechanisms"
6. ✅ Added "30-second refresh" clarification
7. ✅ Added "hash verification" for PayU
8. ✅ Added "synchronous email processing" clarification
9. ✅ Added "recommendation algorithms based on browsing and purchase history"
10. ✅ Added "atomic database transactions"
11. ✅ Removed references to WebSocket/real-time synchronization

### Performance Optimization:
1. ✅ Changed "Asynchronous email processing" to "Synchronous email processing"
2. ✅ Removed "Real-time update batching" (not implemented)
3. ✅ Added "Database connection pooling" with specific config
4. ✅ Added "API response pagination" with details
5. ✅ Added "Out-of-stock sorting"
6. ✅ Added "localStorage caching"
7. ✅ Added "Product list personalization"
8. ✅ Clarified "Fuzzy search optimization" as client-side filtering
9. ✅ Added "Debounced search" with 300ms timing
10. ✅ Added "Multer handles uploads" to image optimization

