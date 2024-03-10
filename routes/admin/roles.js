import express from "express";
import {
  getAllRoles,
  createRole,
  updateRole,
  getRole,
  deleteRole,
} from "../../controllers/roleControllers.js";
import verifyAdminToken from "../../middlewares/verifyAdminToken.js";

const router = express.Router();

router.get("/roles", verifyAdminToken, getAllRoles);

router.get("/roles/:roleId", verifyAdminToken, getRole);

router.post("/roles/create-role", verifyAdminToken, createRole);

router.put("/roles/update-role/:roleId", verifyAdminToken, updateRole);

router.delete("/roles/delete-role/:roleId", verifyAdminToken, deleteRole);

export { router as roles };
