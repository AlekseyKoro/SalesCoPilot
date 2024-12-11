const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    duration: {
        type: Number
    },
    fileSize: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Call', callSchema); 