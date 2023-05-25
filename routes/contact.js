import express from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import multer from 'multer';
import { validationResult, body } from 'express-validator';
import cors from 'cors';

dotenv.config();

const router = express.Router();
router.use(cors());

const contactUsValidationRules = () => [
    body('firstName').notEmpty().withMessage('First Name is required'),
    body('lastName').notEmpty().withMessage('Last Name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
];

const upload = multer({ storage: multer.memoryStorage() });

router.post('/contact-us', upload.single('file'), contactUsValidationRules(), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        const { firstName, lastName, email, subject, message, phoneNumber } = req.body;
        const { file } = req;

        const transporter = nodemailer.createTransport({
            host: 'mcp-5.controlpanel.si',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: email,
            to: 'info@partikarte.si',
            subject: subject,
            text: `First Name: ${firstName}\nLast Name: ${lastName}\nEmail: ${email}\nPhone Number: ${phoneNumber || 'Not provided'}\n\nMessage:\n${message}`,
            attachments: file ? [{ filename: file.originalname, content: file.buffer }] : [],
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Server error');
            }
            res.status(200).json({ message: 'Email sent' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error sending contact us email', error });
    }
});

export { router as contact };
