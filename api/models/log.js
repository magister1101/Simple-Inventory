const mongoose = require('mongoose');
const { type } = require('os');

const logsSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    action: { type: String, required: true }, //created, updated
    reference: { type: mongoose.Schema.Types.Mixed, required: true }, // Allows string, array of strings, or objects
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Log', logsSchema);