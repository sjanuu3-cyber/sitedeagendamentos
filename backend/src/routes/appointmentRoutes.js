const express = require("express");
const appointmentController = require("../controllers/appointmentController");

const router = express.Router();

router.get("/", appointmentController.listAppointments);
router.put("/:id", appointmentController.updateAppointment);
router.patch("/:id/cancel", appointmentController.cancelAppointment);

module.exports = router;
