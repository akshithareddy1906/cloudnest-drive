
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: 255,
    },

    storageName: {
      type: String,
      required: true,
      unique: true,
    },

    mimeType: {
      type: String,
      required: true,
      maxlength: 150,
    },

    size: {
      type: Number,
      required: true,
      min: 1,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Efficient file listing by owner and folder
fileSchema.index({
  owner: 1,
  folder: 1,
  isDeleted: 1,
  createdAt: -1,
});

module.exports = mongoose.model('File', fileSchema);
