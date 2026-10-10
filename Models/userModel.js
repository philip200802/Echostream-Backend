const mongoose = require('mongoose');

let userSchema = mongoose.Schema({
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
    },
    role: {
        type: String,
        enum: ['listener', 'artist', 'admin'],
        default: 'listener'
    },
    resetPasswordToken: {
        type: String,
        default: null,
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
    },
    
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationToken: {
        type: String,
        default: null,
    },

    verificationTokenExpires: {
        type: Date,
        default: null,
    },
}, { timestamps: true });



const Listener = mongoose.model('user', userSchema);

module.exports = Listener;