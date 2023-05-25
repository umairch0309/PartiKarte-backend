import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import businessUser from '../models/businessUser.js';
import Image from '../models/eventImage.js';
import path from 'path';
import fs from 'fs';
import { userSchema } from '../helpers/validation.js';
import { generateUrlSlug } from '../helpers/helpers.js';

/**
 * @method  register
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns registers user
 */
export const register = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;

        // Validate user input
        const { error } = userSchema.validate({ email, username, password });
        if (error) throw error;

        // Check if user already exists
        const existingUser = await businessUser.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(409).json({ message: 'Username or email already taken' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save the new user
        // Save the new user with salt
        const user = new businessUser({ email, username, password: hashedPassword, salt, organizerName: username, urlSlug: generateUrlSlug() });
        // console.log("ok", user)
        await user.save();

        res.status(201).json({ message: 'User created successfully', _id: user._id });
    } catch (error) {
        next(error);
    }
};

/**
 * @method authenticate
 * @param {*} req 
 * @param {*} res 
 * @returns authenticates user and returns user and auth token
 */
export const authenticate = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Please provide a username and password' });
    }
    try {
        const user = await businessUser.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * @method  updateBusinessInformation
 * @param {*} req 
 * @param {*} res 
 * @returns Updates business info
 */
export const updateBusinessInformation = async (req, res) => {
    const userId = req.userId;
    const { organizerName, taxNumber, companyName, companyAddress, companyRegistryNumber } = req.body;

    try {
        const user = await businessUser.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let update = {};
        if (organizerName) {
            update['organizerName'] = organizerName;
            const dateString = new Date().toISOString().split('T')[0];
            const newUrlSlug = generateUrlSlug(organizerName, dateString);

            const existingUserWithSlug = await businessUser.findOne({ urlSlug: newUrlSlug });
            if (existingUserWithSlug && existingUserWithSlug._id.toString() !== userId) {
                return res.status(409).json({ error: 'URL slug already exists' });
            }

            update['urlSlug'] = newUrlSlug;
        }
        if (taxNumber) update['company.taxNumber'] = taxNumber;
        if (companyName) update['company.companyName'] = companyName;
        if (companyAddress) update['company.companyAddress'] = companyAddress;
        if (companyRegistryNumber) update['company.companyRegistryNumber'] = companyRegistryNumber;

        await businessUser.findByIdAndUpdate(userId, { $set: update });

        res.status(200).json({ message: 'Company information updated' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

/**
 * @method  updateBusinessContact
 * @param {*} req 
 * @param {*} res 
 * @returns Updates business contact
 */
export const updateBusinessContact = async (req, res) => {
    const userId = req.userId;
    const { email, phoneNumber, website } = req.body;

    try {
        const user = await businessUser.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let update = {};
        if (email) update['contactInformation.email'] = email;
        if (phoneNumber) update['contactInformation.phoneNumber'] = phoneNumber;
        if (website) update['contactInformation.website'] = website;

        await businessUser.findByIdAndUpdate(userId, { $set: update });

        res.status(200).json({ message: 'Contact information updated' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}


/**
 * @method  for business/organizer-image" to be placed here
 * @param {*} req 
 * @param {*} res 
 * @returns Updates organizer image
 * working on it
 */

/**
 * @method  addOrUpdateOwner
 * @param {*} req 
 * @param {*} res 
 * @returns Adds/Updates business owner information
 */
export const addOrUpdateOwner = async (req, res) => {
    const userId = req.userId;
    const ownerId = req.params.id;

    const { ownerName, ownerSurname, ownerDOB, ownerAddress, ownerIDFront, ownerIDBack } = req.body;

    try {
        const user = await businessUser.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let owner;
        if (ownerId === 'new') {
            // Create a new business owner if it doesn't exist
            const newOwner = {
                ownerName,
                ownerSurname,
                ownerDOB,
                ownerAddress,
                ownerIDFront,
                ownerIDBack,
            };

            user.owners.push(newOwner);
            owner = user.owners[user.owners.length - 1];
        } else {
            // Update an existing business owner
            owner = user.owners.id(ownerId);
            if (!owner) {
                return res.status(404).json({ error: 'Business owner not found' });
            }

            owner.set({
                ownerName,
                ownerSurname,
                ownerDOB,
                ownerAddress,
                ownerIDFront,
                ownerIDBack,
            });
        }

        await user.save();
        res.status(200).json({ message: 'Business owner updated', ownerId: owner._id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

/**
 * @method  getBusinessGallery
 * @param {*} req 
 * @param {*} res 
 * @returns business gallery
 */
export const getBusinessGallery = async (req, res) => {
    const galleryId = req.params.galleryId;
  
    try {
      const user = await businessUser.findOne({ "galleries._id": galleryId });
      if (!user) {
        return res.status(404).send("Gallery not found");
      }
  
      const gallery = user.galleries.id(galleryId);
      if (!gallery) {
        return res.status(404).send("Gallery not found");
      }
  
      const images = await Image.find({ _id: { $in: gallery.images } });
  
      res.status(200).json({ images });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error fetching gallery images");
    }
}

/**
 * @method  getGalleryImageById
 * @param {*} req 
 * @param {*} res 
 * @returns image by id
 */
export const getGalleryImageById = async (req, res) => {
    try {
      const imageId = req.params.imageId;
      const image = await Image.findById(imageId);
      if (image) {
        res.set("Content-Type", image.contentType);
        res.set("Cache-Control", "public, max-age=31536000"); // Cache the image for 1 year (in seconds)
        res.sendFile(path.resolve(image.filePath)); // Serve the file from the filesystem
      } else {
        res.status(404).json({ message: "Image not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching image", error });
    }
}

/**
 * @method  AddOrUpdateManager
 * @param {*} req 
 * @param {*} res 
 * @returns Add/Updates business manager information
 */
export const AddOrUpdateManager = async (req, res) => {
    const userId = req.userId;
    const managerId = req.params.id;
  
    const {
      managerName,
      managerSurname,
      managerDOB,
      managerAddress,
      managerIDFront,
      managerIDBack,
      managerTitle,
    } = req.body;
  
    try {
      let manager;
      if (managerId === "new") {
        const newManager = {
          managerName,
          managerSurname,
          managerDOB,
          managerAddress,
          managerIDFront,
          managerIDBack,
          managerTitle,
        };
  
        const user = await businessUser.findOne({ _id: userId });
        user.managers.push(newManager);
        await user.save();
        manager = user.managers[user.managers.length - 1];
      } else {
        const user = await User.findOne({ _id: userId });
        manager = user.managers.id(managerId);
        if (!manager) {
          return res.status(404).json({ error: "Business manager not found" });
        }
        manager.set({
          managerName,
          managerSurname,
          managerDOB,
          managerAddress,
          managerIDFront,
          managerIDBack,
          managerTitle,
        });
        await user.save();
      }
      res
        .status(200)
        .json({ message: "Business manager updated", managerId: manager._id });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
}

/**
 * @method  deleteOwner
 * @param {*} req 
 * @param {*} res 
 * @returns deletes owner
 */
export const deleteOwner = async (req, res) => {
    const userId = req.userId;
    const ownerId = req.params.id;

    try {
      const user = await businessUser.findOne({ _id: userId });
      const owner = user.owners.id(ownerId);

      if (!owner) {
        return res.status(404).json({ error: "Business owner not found" });
      }

      user.owners.pull(owner);
      await user.save();
      res.status(200).json({ message: "Business owner deleted" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
}

/**
 * @method  deleteManager
 * @param {*} req 
 * @param {*} res 
 * @returns deletes manager
 */
export const deleteManager = async (req, res) => {
    const userId = req.userId;
    const managerId = req.params.id;

    try {
      const user = await businessUser.findOne({ _id: userId });
      const manager = user.managers.id(managerId);

      if (!manager) {
        return res.status(404).json({ error: "Business manager not found" });
      }

      user.managers.pull(manager);
      await user.save();
      res.status(200).json({ message: "Business manager deleted" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
}

/**
 * @method  updateUserName
 * @param {*} req 
 * @param {*} res 
 * @returns Changes username
 */
export const updateUserName = async (req, res) => {
    const userId = req.userId;
    const { newUsername } = req.body;
  
    try {
      const user = await businessUser.findByIdAndUpdate(
        userId,
        { username: newUsername },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res
        .status(200)
        .json({ message: "Username updated", username: user.username });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
}

/**
 * @method  updatePassword
 * @param {*} req 
 * @param {*} res 
 * @returns Changes username
 */
export const updatePassword = async (req, res) => {
    const userId = req.userId;
    const { newPassword } = req.body;
  
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      const user = await businessUser.findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res.status(200).json({ message: "Password updated" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
}

/**
 * @method  updateEmail
 * @param {*} req 
 * @param {*} res 
 * @returns Changes username
 */
export const updateEmail = async (req, res) => {
    const userId = req.userId;
    const { newEmail } = req.body;
  
    try {
      const user = await businessUser.findByIdAndUpdate(
        userId,
        { email: newEmail },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res.status(200).json({ message: "Email updated", email: user.email });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
}