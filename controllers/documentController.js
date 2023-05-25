import express from "express";
import Documents from "../models/documents.js";
import { generateUrlSlug } from "../helpers/helpers.js";

/**
 * @method  getDocumentBySlug
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns gets document by slug
 */
export const getDocumentBySlug = async (req, res) => {
  try {
    const { urlSlug } = req.params;

    const document = await Documents.findOne({ urlSlug });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.status(200).json(document);
  } catch (error) {
    res.status(500).json({ message: "Error fetching document", error });
  }
};

/**
 * @method  AddOrUpdateDoc
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns Adds and Updates Document
 */
export const AddOrUpdateDoc = async (req, res) => {
  try {
    console.log("ok");
    const { id } = req.params;
    const { title, content, folder } = req.body;

    if (!title || !content || !folder) {
      return res
        .status(400)
        .json({ message: "Title, content, and folder are required" });
    }

    const urlSlug = generateUrlSlug(title);

    if (id) {
      const updatedPost = await Documents.findByIdAndUpdate(
        id,
        { title, content, folder, urlSlug },
        { new: true }
      );
      res.status(200).json(updatedPost);
    } else {
      const newPost = new Documents({ title, content, folder, urlSlug });
      const savedPost = await newPost.save();
      res.status(201).json(savedPost);
    }
  } catch (error) {
    res.status(500).json({ message: "Error processing post", error });
  }
};

/**
 * @method  getNavigationFolders
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns gets folder of documents
 */
export const getNavigationFolders = async (req, res) => {

  try {
    const documents = await Documents.find({});

    const groupedDocuments = {};

    documents.forEach((document) => {
      if (!groupedDocuments[document.folder]) {
        groupedDocuments[document.folder] = [];
      }

      groupedDocuments[document.folder].push({
        id: document._id,
        title: document.title,
        urlSlug: document.urlSlug,
      });
    });

    const navigation = Object.entries(groupedDocuments).map(
      ([folder, documents]) => ({
        folder,
        documents,
      })
    );
    
    res.status(200).json(navigation);
  } catch (error) {
    res.status(500).json({ message: "Error fetching navigation data", error });
  }
};
