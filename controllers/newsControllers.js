import News from "../models/news.js";
import { findBusinessAndUser } from "../DAL/common.js";
import HttpError, { ServerError } from "../helpers/HttpError.js";
import { isImageFile } from "../helpers/helpers.js";
import uploadS3Image from "../utils/uploadS3Image.js";
import Business from "../models/business.js";
import Event from "../models/event.js";
import User from "../models/user.js";
import deleteImageFromS3 from "../utils/deleteS3Image.js";

export const getAllNews = async (req, res, next) => {
  const userId = req.userId;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const existingNews = await News.find();
    if (!existingNews) {
      return next(new HttpError("Couldn't find news", 404));
    }

    res
      .status(200)
      .send({ message: "News updated successfully", news: existingNews });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const createNews = async (req, res, next) => {
  const { files, userId } = req;
  const { name, eventId, date, description } = req.body;

  try {
    if (!name || !eventId || !date || !description) {
      return res.status(400).json({ error: "News details are not completed" });
    }
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    const myBusiness = await Business.findById(business._id);
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const eventRef = await Event.findById(eventId);
    if (!eventRef) {
      return next(new HttpError("Event not found", 404));
    }

    const images = [];
    if (files.length > 0) {
      for (const file of files) {
        isImageFile(file.mimetype, next);

        const uploadedImage = await uploadS3Image(file, "news_images/", next);

        if (uploadedImage.uploadedImagePath && uploadedImage.status) {
          images.push(uploadedImage.uploadedImagePath);
        }
      }
    } else {
      return next(new HttpError("No image found", 404));
    }

    const newNews = new News({
      name,
      eventId: eventRef._id,
      date,
      images,
      businessId: business._id,
      description,
    });
    myBusiness.news.push(newNews._id);
    eventRef.news.push(newNews._id);
    const savedNews = await newNews.save();

    if (!savedNews) {
      return next(new HttpError("Couldn't save news", 404));
    } else {
      await myBusiness.save();
      await eventRef.save();
    }

    res
      .status(201)
      .send({ message: "News created successfully", news: savedNews });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const updateNews = async (req, res, next) => {
  const newsId = req.params.newsId;
  const { files, userId } = req;
  req.body.images = req.body.images || [];
  const { name, eventId, date, description } = req.body;

  try {
    if (!name || !eventId || !date || !description) {
      return res.status(400).json({ error: "News details are not completed" });
    }
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const eventRef = await Event.findById(eventId);
    if (!eventRef) {
      return next(new HttpError("Event not found", 404));
    }

    const existingNews = await News.findById(newsId);
    if (!existingNews) {
      return next(new HttpError("News not found", 404));
    }

    if (existingNews.eventId !== eventRef._id) {
      const existingEventRef = await Event.findById(existingNews.eventId);
      existingEventRef.news = existingEventRef.news.filter(
        (news) => news !== existingNews._id
      );
      await existingEventRef.save();
    }

    const images = [...req.body.images]; // Clone existing images array

    // Handle new images
    if (files.length > 0) {
      for (const file of files) {
        isImageFile(file.mimetype, next);

        const uploadedImage = await uploadS3Image(file, "news_images/", next);

        if (uploadedImage.uploadedImagePath && uploadedImage.status) {
          images.push(uploadedImage.uploadedImagePath);
        }
      }
    }

    // Update the news document
    existingNews.name = name;
    if (existingNews.eventId !== eventRef._id)
      existingNews.eventId = eventRef._id;
    existingNews.date = date;
    existingNews.images = images;
    existingNews.description = description;

    const savedNews = await existingNews.save();
    if (!savedNews) {
      return next(new HttpError("Couldn't save news", 404));
    } else {
      if (existingNews.eventId !== eventRef._id) await eventRef.save();
    }

    res
      .status(200)
      .send({ message: "News updated successfully", news: savedNews });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const getNews = async (req, res, next) => {
  const userId = req.userId;
  const newsId = req.params.newsId;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const existingNews = await News.findById(newsId);
    if (!existingNews) {
      return next(new HttpError("News not found", 404));
    }

    res
      .status(200)
      .send({ message: "News updated successfully", news: existingNews });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

export const deleteNews = async (req, res, next) => {
  const userId = req.userId;
  const newsId = req.params.newsId;

  try {
    const { user, business } = await findBusinessAndUser({
      _id: userId,
    });
    if (!user || !business) {
      return next(new HttpError("Invalid Id", 404));
    }

    const existingNews = await News.findByIdAndDelete(newsId);
    if (!existingNews) {
      return next(new HttpError("News not found", 404));
    } else {
      for (const image of existingNews.images) {
        await deleteImageFromS3(image);
      }

      const myBusiness = await Business.findById(business._id);
      myBusiness.news = myBusiness.news.filter(
        (news) => news !== existingNews._id
      );
      await myBusiness.save();
      const existingEventRef = await Event.findById(existingNews.eventId);
      existingEventRef.news = existingEventRef.news.filter(
        (news) => news !== existingNews._id
      );
      await existingEventRef.save();
    }

    res
      .status(200)
      .send({ message: "News deleted successfully", news: existingNews });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};
