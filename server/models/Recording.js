const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    callId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Call',
        required: true
    },
    jobId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'error'],
        default: 'pending'
    },
    transcription: {
        type: String,
        default: ''
    },
    error: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
});

module.exports = mongoose.model('Recording', recordingSchema); 