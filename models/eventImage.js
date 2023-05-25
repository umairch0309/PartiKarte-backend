import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
    name: {
        type: String,
      },
      filePath: {
        type: String,
      },
      contentType: {
        type: String,
      },
}, { collection: 'image' });

const Image = mongoose.model('Image', imageSchema);

export default Image;
