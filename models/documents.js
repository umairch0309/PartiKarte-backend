import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  folder: {
    type: String,
    required: true,
  },
  urlSlug: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
}, { collection: 'documents' });

const Documents = mongoose.model('Documents', postSchema);

export default Documents;
