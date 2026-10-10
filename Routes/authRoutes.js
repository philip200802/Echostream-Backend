const express = require('express');
const router = express.Router();
const { getSignUp, getSignin, verifyEmail } = require('../Controllers/authController'); // Adjust path to your controller
router.get('/preview-email', (req, res) => {
    res.render('verifyEmail', {
        fullName: 'John Doe',
        verificationLink: 'http://localhost:2010/api/auth/verify-email/mocktoken123'
    });
});
router.post('/signup', getSignUp);
router.post('/signin', getSignin);
router.get('/verify-email/:token', verifyEmail);

module.exports = router;