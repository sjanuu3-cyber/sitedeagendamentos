const express = require("express");
const serviceController = require("../controllers/serviceController");

const router = express.Router();

router.get("/", serviceController.listServices);
router.post("/", serviceController.createService);
router.put("/:id", serviceController.updateService);
router.delete("/:id", serviceController.deactivateService);

module.exports = router;
