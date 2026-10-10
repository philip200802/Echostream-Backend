const express = require('express');
const router = express.Router();

const { 
     getSignUp,
        getSignin,
        verifyEmail,
        resendVerificationEmail,
        resetPasswordRequest,
        confirmResetPassword,
        welcomeEmail,
        resendResetPasswordEmail      
} = require('../Controllers/authController'); 

router.get('/preview-email', (req, res) => {
    res.render('verifyEmail', {
        user: { email: 'johndoe@gmail.com' },
        fullName: 'John Doe',
        verificationLink: 'http://localhost:2010/api/auth/verify-email/mocktoken123'
    });
});

router.get('/welcome-email', (req, res) => {
    res.render('welcomeEmail', {
        user: { email: 'johndoe@gmail.com', fullName: 'John Doe' }
    });
});

router.get('/reset-password-email', (req, res) => {
    res.render('forgotPasswordEmail', {
        user: { email: 'johndoe@gmail.com', fullName: 'John Doe' },
        resetLink: 'http://localhost:2010/api/auth/reset-password/mocktoken123'
    });
});

router.post('/signup', getSignUp);
router.post('/signin', getSignin);
router.get('/verify-email/:token', verifyEmail);

router.post('/forgot-password', resetPasswordRequest);
router.post('/reset-password/:token', confirmResetPassword);
router.post('/resend-verification', resendVerificationEmail);

router.get('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    res.render('resetPassword', { token });
});

router.get('/reset-password', (req, res) => {
    res.render('resetPasswordRequest');
});

router.get('/resend-verification-email', (req, res) => {
    res.render('resendVerificationEmail');
});

module.exports = router;
