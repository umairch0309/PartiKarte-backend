import { findBusinessAndUser } from "../DAL/common.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import Role from "../models/role.js";

export const getAllRoles = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const allRoles = await Role.find({ businessId: business?._id });
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
  const { userId } = req;
  const { permissions, name, description } = req.body;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const newRole = new Role({
      permissions,
      name,
      description,
      businessId: business._id,
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
  const { userId } = req;
  const { roleId } = req.params;
  const { permissions, name, description } = req.body;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const newRole = {
      permissions,
      name,
      description,
      businessId: business._id,
    };

    const roleToUpdate = await Role.findByIdAndUpdate(roleId, newRole, {
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
  const userId = req.userId;
  const roleId = req.params.roleId;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const foundRole = await Role.findById(roleId);
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
  const userId = req.userId;
  const roleId = req.params.roleId;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const foundRole = await Role.findByIdAndDelete(roleId);
    if (!foundRole) {
      return next(new HttpError("Role not found", 404));
    }

    res
      .status(200)
      .send({ message: "Role deleted successfully", news: foundRole });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};
