const mongoose = require('mongoose');

let listenerSchema = mongoose.Schema({
    fullName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    }
}, { timestamps: true });

const Listener = mongoose.model('user', listenerSchema, 'User');

module.exports = Listener;