import { Router } from "express";
import {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  createAttributeValue,
  deleteAttributeValue,
} from "../controllers/attributeController";

const router = Router();

router.get("/", getAttributes);
router.post("/", createAttribute);
router.put("/:id", updateAttribute);
router.delete("/:id", deleteAttribute);

// Attribute values subroutes
router.post("/:attributeId/values", createAttributeValue);
router.delete("/values/:id", deleteAttributeValue);

export default router;
