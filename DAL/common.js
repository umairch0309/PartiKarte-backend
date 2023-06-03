import User from "../models/user.js";
import Business from "../models/business.js";

export const findBusinessAndUser = async (params) => {
  const user = await User.findOne({ ...params });
  if (!user) return null;
  const business = await Business.findById(user.businessId);
  if (!business) return null;
  return { user, business };
};
