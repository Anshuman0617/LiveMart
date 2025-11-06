// server.js
import express from "express";
import cors from "cors";
import sequelize from "./db.js";
import User from "./models/User.js";
import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import AdminJSSequelize from "@adminjs/sequelize";

// Register Sequelize adapter
AdminJS.registerAdapter(AdminJSSequelize);

const app = express();

// ✅ Enable JSON + CORS so React (localhost:5173) can talk to backend
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // allow React dev server
    credentials: true,
  })
);

// ✅ AdminJS setup
const adminJs = new AdminJS({
  databases: [sequelize],
  rootPath: "/admin",
});

const adminRouter = AdminJSExpress.buildRouter(adminJs);
app.use(adminJs.options.rootPath, adminRouter);

// ✅ Example test route for React
app.get("/api/test", (req, res) => {
  res.json({ message: "Hello from Node.js + AdminJS backend!" });
});

// ✅ Simple root route
app.get("/", (req, res) => res.send("Hello worldi"));

// ✅ Sync database and start server
(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("Database synced ✅");

    app.listen(3001, () =>
      console.log("🚀 Backend running on http://localhost:3001")
    );
  } catch (err) {
    console.error("Error syncing database:", err);
  }
})();
