import express from 'express';
import dotenv from 'dotenv';
import Documents from '../models/documents.js';
import unidecode from 'unidecode';

dotenv.config();

const router = express.Router();

function generateUrlSlug(title) {
    const decodedTitle = unidecode(title);
    return decodedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Get a document by urlSlug
router.get('/documents/:urlSlug', async (req, res) => {
    try {
        const { urlSlug } = req.params;

        const document = await Documents.findOne({ urlSlug });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.status(200).json(document);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching document', error });
    }
});


// Create or update a post
router.put('/documents/:id?', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, folder } = req.body;

        if (!title || !content || !folder) {
            return res.status(400).json({ message: 'Title, content, and folder are required' });
        }

        const urlSlug = generateUrlSlug(title);

        if (id) {
            const updatedPost = await Documents.findByIdAndUpdate(id, { title, content, folder, urlSlug }, { new: true });
            res.status(200).json(updatedPost);
        } else {
            const newPost = new Documents({ title, content, folder, urlSlug });
            const savedPost = await newPost.save();
            res.status(201).json(savedPost);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error processing post', error });
    }
});

router.get('/navigation', async (req, res) => {
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

        const navigation = Object.entries(groupedDocuments).map(([folder, documents]) => ({
            folder,
            documents,
        }));

        res.status(200).json(navigation);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching navigation data', error });
    }
});




export { router as documents };
