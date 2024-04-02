import AdminRole from "../../models/adminRole.js";
import HttpError from "../../helpers/HttpError.js";

export const getAllRoles = async (req, res, next) => {
  try {
    const allRoles = await AdminRole.find();
    if (!allRoles) {
      return next(new HttpError("Couldn't find roles", 404));
    }

    res.status(200).send({ message: "Roles!", roles: allRoles });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const createRole = async (req, res, next) => {
  const { permissions, name, description } = req.body;

  try {
    const newRole = new AdminRole({
      permissions,
      name,
      description,
    });

    const savedRole = await newRole.save();
    res
      .status(201)
      .send({ message: "Role added successfully.", role: savedRole });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const updateRole = async (req, res, next) => {
  const { roleId } = req.params;
  const { permissions, name, description } = req.body;

  try {
    const newRole = {
      permissions,
      name,
      description,
    };

    const roleToUpdate = await AdminRole.findByIdAndUpdate(roleId, newRole, {
      new: true,
    });
    if (!roleToUpdate) {
      return res.status(404).json({ error: "Role not found" });
    }

    res
      .status(201)
      .send({ message: "Role updated successfully.", role: roleToUpdate });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const getRole = async (req, res, next) => {
  const roleId = req.params.roleId;

  try {
    const foundRole = await AdminRole.findById(roleId);
    if (!foundRole) {
      return next(new HttpError("Role not found", 404));
    }

    res
      .status(200)
      .send({ message: "Role found successfully", Role: foundRole });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const deleteRole = async (req, res, next) => {
  const roleId = req.params.roleId;

  try {
    const foundRole = await AdminRole.findByIdAndDelete(roleId);
    if (!foundRole) {
      return next(new HttpError("Role not found", 404));
    }

    res
      .status(200)
      .send({ message: "Role deleted successfully", role: foundRole });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};
