const express = require("express");
const companyController = require("../controllers/companyController");

const router = express.Router();

router.get("/companies", companyController.listCompanies);
router.get("/companies/:slug/catalog", companyController.getCompanyCatalog);
router.get("/companies/:slug/availability", companyController.getAvailability);
router.post("/companies/:slug/appointments", companyController.createAppointment);

module.exports = router;
