# LiveMart Online Delivery System
OOPS Group Project Year 2 Sem 1

LiveMart is a comprehensive, multi-role e-commerce platform designed to connect customers, retailers, and wholesalers within a unified digital ecosystem. Built as a full-stack web application, it addresses modern retail demands through real-time inventory management, location-based services, and role-based access control.

Key System Features:
1) Multi-Role Architecture: Implements distinct capabilities for Customers, Retailers, Wholesalers, and Delivery Personnel.
2) Advanced Discovery: Features a fuzzy search engine that handles typos and partial matches for intelligent product matching.
3) Location-Based Filtering: Utilizes the Google Maps and Geolocation APIs to filter products within a customizable 1-75km radius.
4) Secure Transactions: Integrated with the PayU Money payment gateway for secure credit/debit, UPI, and net banking transactions.
5) Real-Time Synchronization: Automated stock updates and live "sold product" counts across all stakeholder dashboards.

Technical Specifications:
Frontend: React.js (v19.2.0), HTML5, CSS3 (Flexbox/Grid), and JavaScript ES6+.
Backend: Node.js (v22.21.0 LTS) and Express.js (v5.1.0).
Database: PostgreSQL (v17.6) with Sequelize ORM.
Authentication: JWT (JSON Web Tokens), Google OAuth integration, and OTP-based email verification via Nodemailer.
External APIs: Google Maps, Google Places, and PayU Money.
