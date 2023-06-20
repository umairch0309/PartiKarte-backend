import User from "../models/user.js";
import Business from "../models/business.js";

export const findBusinessAndUser = async (params) => {
  const user = await User.findOne({ ...params });
  if (!user) return { user: null, business: null };
  const business = await Business.findById(user.businessId);
  if (!business) return { user: null, business: null };
  return { user, business };
};
