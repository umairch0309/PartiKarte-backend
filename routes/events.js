import express from 'express';
import verifyToken from '../middlewares/verifyToken.js';
import businessUser from '../models/businessUser.js';
import ticketCode from '../models/ticketCode.js';
import multer from 'multer';
import Image from '../models/eventImage.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import unidecode from 'unidecode';
import cors from 'cors';

const router = express.Router();

router.use(cors());

// Create event
router.put('/events/:id', verifyToken, async (req, res) => {
    const userId = req.userId;
    const eventId = req.params.id;

    const { eventName, eventStart, eventEnd, eventAddress, eventCoordinatesX, eventCoordinatesY, eventVenue, eventDescription } = req.body;
    const eventStartDate = new Date(eventStart);

    try {
        let event;
        if (eventId === 'new') {
            // Create a new event
            const newEvent = {
                eventName,
                eventStart,
                eventEnd,
                eventAddress,
                eventCoordinatesX,
                eventCoordinatesY,
                eventVenue,
                eventDescription,
                urlSlug: generateUrlSlug(eventName, eventStartDate)
            };

            const user = await businessUser.findOne({ _id: userId });
            user.events.push(newEvent);
            await user.save();
            event = user.events[user.events.length - 1];
            const eventId = event._id;
            const newCode = {
                event: eventId
            };
            await ticketCode.create(newCode);
            res.status(200).json({ message: 'Event created', eventId: event._id });

        } else {
            // Update an existing event
            const user = await businessUser.findOne({ _id: userId });
            event = user.events.id(eventId);
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            event.set({
                eventName,
                eventStart,
                eventEnd,
                eventAddress,
                eventCoordinatesX,
                eventCoordinatesY,
                eventVenue,
                eventDescription,
                urlSlug: generateUrlSlug(eventName, eventStartDate)
            });

            await user.save();
            res.status(200).json({ message: 'Event updated', eventId: event._id });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = 'uploads/';
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

async function preprocessImage(imagePath) {
    const optimizedImage = sharp(imagePath);
    optimizedImage.jpeg({ quality: 80 });
    const newPath = path.join(
        path.dirname(imagePath),
        path.basename(imagePath, path.extname(imagePath)) + '.optimized' + path.extname(imagePath),
    );
    await optimizedImage.toFile(newPath);
    return newPath;
}

router.put('/events/:eventId/upload-image', upload.single('image'), verifyToken, async (req, res) => {
    const eventId = req.params.eventId;

    try {
        const optimizedPath = await preprocessImage(req.file.path);

        const newImage = new Image({
            name: req.file.originalname,
            filePath: optimizedPath,
            contentType: req.file.mimetype,
        });
        await newImage.save();
        let eventBanner = newImage._id;

        const user = await businessUser.findOne({ _id: userId });
        let event = user.events.id(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (event.eventBanner) {
            const oldImage = await Image.findById(event.eventBanner);
            if (oldImage.filePath && fs.existsSync(oldImage.filePath)) {
                fs.unlinkSync(oldImage.filePath);
            }
            await Image.deleteOne({ _id: event.eventBanner });
        }

        event.set({ eventBanner });
        await user.save();

        res.status(201).send({ id: newImage._id });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Delete event
router.delete('/events/:id', verifyToken, async (req, res) => {
    const userId = req.userId;
    const eventId = req.params.id;
    try {
        const user = await businessUser.findOne({ _id: userId, 'events._id': eventId });

        if (!user) {
            return res.status(404).json({ error: 'Event not found' });
        }

        user.events.pull(eventId);
        await user.save();
        res.status(200).json({ message: 'Event deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/events/search', async (req, res) => {
    try {
        const { currentTime, featured, urlSlug } = req.body;
        const businessUsers = await businessUser.find({}).populate('events.eventBanner');

        const events = [];

        businessUsers.forEach((user) => {
            user.events.forEach((event) => {
                // Apply filters
                if (currentTime && new Date(event.eventEnd) <= new Date(currentTime)) {
                    return;
                }
                if (featured === 'true' && !event.featured) {
                    return;
                }
                if (urlSlug && event.urlSlug !== urlSlug) {
                    return;
                }

                let lowestPriceTicket = null;

                event.tickets.forEach((ticket) => {
                    if (ticket.inventory > 0) {
                        if (lowestPriceTicket === null || ticket.priceWithVAT < lowestPriceTicket.priceWithVAT) {
                            lowestPriceTicket = ticket;
                        }
                    }
                });

                const eventInfo = {
                    organizerId: user._id,
                    organizerName: user.organizerName,
                    eventId: event._id,
                    eventName: event.eventName,
                    eventStart: event.eventStart,
                    eventEnd: event.eventEnd,
                    eventAddress: event.eventAddress,
                    eventVenue: event.eventVenue,
                    eventDescription: event.eventDescription,
                    eventCoordinatesX: event.eventCoordinatesX,
                    eventCoordinatesY: event.eventCoordinatesY,
                    ticketName: lowestPriceTicket ? lowestPriceTicket.ticketName : 'No available tickets',
                    ticketPriceWithVAT: lowestPriceTicket ? lowestPriceTicket.priceWithVAT : null,
                    eventBannerId: event.eventBanner ? event.eventBanner._id : null,
                    ticketIds: event.tickets.map((ticket) => ticket._id),
                    urlSlug: event.urlSlug,
                };

                events.push(eventInfo);
            });
        });

        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching events', error });
    }
});


router.get('/events/eventBanner/:id', async (req, res) => {
try {
const imageId = req.params.id;
const image = await Image.findById(imageId);
if (image) {
    res.set('Content-Type', image.contentType);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache the image for 1 year (in seconds)
    res.sendFile(path.resolve(image.filePath)); // Serve the file from the filesystem
} else {
    res.status(404).json({ message: 'Image not found' });
}
} catch (error) {
res.status(500).json({ message: 'Error fetching event banner', error });
}
});

function generateUrlSlug(eventName, eventDate) {
    const decodedName = unidecode(eventName);
    const dateString = eventDate.toISOString().split('T')[0];
    return `${decodedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${dateString}`;
}

export { router as events };