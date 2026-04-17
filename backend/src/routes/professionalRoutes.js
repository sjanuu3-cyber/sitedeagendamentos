const express = require("express");
const professionalController = require("../controllers/professionalController");

const router = express.Router();

router.get("/", professionalController.listProfessionals);
router.post("/", professionalController.createProfessional);
router.put("/:id", professionalController.updateProfessional);
router.put("/:id/availability", professionalController.updateAvailability);
router.delete("/:id", professionalController.deactivateProfessional);

module.exports = router;
