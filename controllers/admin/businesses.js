import HttpError, { ServerError } from "../../helpers/HttpError.js";
import Business from "../../models/business.js";
import Event from "../../models/event.js";
import News from "../../models/news.js";

export const getAllBusinesses = async (req, res, next) => {
  try {
    const allBusinesses = await Business.find();
    res.status(200).json({
      message: "all businesses",
      businesses: allBusinesses,
    });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const getSingleBusinesses = async (req, res, next) => {
  const { businessId } = req.params;
  try {
    const business = await Business.findById(businessId);

    if (!business) {
      return next(new HttpError("Not found", 404));
    }

    const events = await Event.find({
      businessId: business?._id,
      tickets: { $exists: true, $not: { $size: 0 } },
    }).sort({ _id: -1 });

    const news = await News.find({ businessId: business?._id }).sort({
      _id: -1,
    });

    res.status(200).json({
      message: "business with id",
      data: { business, events, news },
    });
  } catch (error) {
    return next(ServerError(error));
  }
};

export const changeSingleBusinessStatus = async (req, res, next) => {
  const { businessId } = req.params;
  const { isBlocked } = req.body;
  try {
    console.log(isBlocked, "isBlocked");
    const business = await Business.findById(businessId);

    if (!business) {
      return next(new HttpError("Not found", 404));
    }

    business.isBlocked = isBlocked ? true : false;
    await business.save();

    res.status(200).json({
      message: "Business status updated",
      data: { business },
    });
  } catch (error) {
    return next(ServerError(error));
  }
};
