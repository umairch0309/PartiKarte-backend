import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import {
  getAllRoles,
  createRole,
  updateRole,
  getRole,
  deleteRole,
} from "../controllers/roleControllers.js";

const router = express.Router();

router.get("/roles", verifyToken, getAllRoles);

router.get("/roles/:roleId", verifyToken, getRole);

router.post("/roles/create-role", verifyToken, createRole);

router.put("/roles/update-role/:roleId", verifyToken, updateRole);

router.delete("/roles/delete-role/:roleId", verifyToken, deleteRole);

export { router as roles };
