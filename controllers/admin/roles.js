import HttpError, { ServerError } from "../../helpers/HttpError.js";
import AdminRole from "../../models/adminRole.js";

export const getAllAdminRoles = async (req, res, next) => {
  try {
    const roles = await AdminRole.find().sort({ _id: -1 });
    res.status(200).json({ message: "Roles!", roles });
  } catch (error) {
    console.error(error);
    return next(ServerError(error));
  }
};

export const createAdminRole = async (req, res, next) => {
  const { permissions, name, description } = req.body;

  try {
    if (!name?.trim()) {
      return next(new HttpError("Role name is required", 400));
    }
    if (!permissions?.length) {
      return next(new HttpError("Please provide permissions", 400));
    }

    const savedRole = await new AdminRole({
      permissions,
      name: name.trim(),
      description: description?.trim() || "",
    }).save();

    res.status(201).json({
      message: "Role added successfully.",
      role: savedRole,
    });
  } catch (error) {
    console.error(error);
    return next(ServerError(error));
  }
};

export const updateAdminRole = async (req, res, next) => {
  const { roleId } = req.params;
  const { permissions, name, description } = req.body;

  try {
    if (!name?.trim()) {
      return next(new HttpError("Role name is required", 400));
    }

    const roleToUpdate = await AdminRole.findByIdAndUpdate(
      roleId,
      {
        permissions,
        name: name.trim(),
        description: description?.trim() || "",
      },
      { new: true }
    );

    if (!roleToUpdate) {
      return next(new HttpError("Role not found", 404));
    }

    res.status(200).json({
      message: "Role updated successfully.",
      role: roleToUpdate,
    });
  } catch (error) {
    console.error(error);
    return next(ServerError(error));
  }
};

export const deleteAdminRole = async (req, res, next) => {
  const { roleId } = req.params;

  try {
    const foundRole = await AdminRole.findByIdAndDelete(roleId);
    if (!foundRole) {
      return next(new HttpError("Role not found", 404));
    }

    res.status(200).json({
      message: "Role deleted successfully",
      role: foundRole,
    });
  } catch (error) {
    console.error(error);
    return next(ServerError(error));
  }
};
