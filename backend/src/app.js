const cors = require("cors");
const express = require("express");
const path = require("path");
const { authenticate } = require("./middleware/authMiddleware");
const { errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const professionalRoutes = require("./routes/professionalRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const companyRoutes = require("./routes/companyRoutes");

const app = express();
const frontendPath = path.resolve(__dirname, "../../frontend");
const sharedImagesPath = path.resolve(__dirname, "../../img");

app.disable("x-powered-by");

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
      : true,
  })
);

app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ message: "API online" });
});

app.use("/api/auth", authRoutes);
app.use("/api/public", companyRoutes);
app.use("/api/admin/services", authenticate, serviceRoutes);
app.use("/api/admin/professionals", authenticate, professionalRoutes);
app.use("/api/admin/appointments", authenticate, appointmentRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "portal.html"));
});

app.get(["/index.html", "/portal.html"], (req, res) => {
  res.redirect(302, "/");
});

app.get("/criar-espaco", (req, res) => {
  res.sendFile(path.join(frontendPath, "create-space.html"));
});

app.get("/create-space.html", (req, res) => {
  res.redirect(302, "/criar-espaco");
});

app.get("/espaco/:slug", (req, res) => {
  res.sendFile(path.join(frontendPath, "tenant-booking.html"));
});

app.get("/espaco/:slug/login", (req, res) => {
  res.sendFile(path.join(frontendPath, "tenant-login.html"));
});

app.get(["/admin", "/espaco/:slug/admin"], (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

app.get("/admin.html", (req, res) => {
  res.redirect(302, "/admin");
});

app.use("/img", express.static(sharedImagesPath));
app.use(express.static(frontendPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  return res.sendFile(path.join(frontendPath, "portal.html"));
});

app.use(errorHandler);

module.exports = app;
