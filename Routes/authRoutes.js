
const express = require('express');
const router = express.Router();

const {
    getSignUp,
    getSignin,
    verifyEmail,
    resendVerificationEmail,
    resetPasswordRequest,
    resendResetPasswordEmail,
    confirmResetPassword,
    welcomeEmail
} = require('../Controllers/authController');

router.get('/preview-email', (req, res) => {
    res.render('verifyEmail', {
        user: { email: 'johndoe@gmail.com' },
        fullName: 'John Doe',
        verificationLink:
            'http://localhost:2010/api/auth/verify-email/mocktoken123'
    });
});

router.get('/welcome-email', (req, res) => {
    res.render('welcomeEmail', {
        user: {
            email: 'johndoe@gmail.com',
            fullName: 'John Doe'
        }
    });
});

router.get('/reset-password-email', (req, res) => {
    res.render('resetPasswordEmail', {
        user: {
            email: 'johndoe@gmail.com',
            fullName: 'John Doe'
        },
        resetLink:
            `${process.env.FRONTEND_URL}/forgot/password?token=mocktoken123`
    });
});

router.post('/signup', getSignUp);
router.post('/signin', getSignin);

router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

router.post('/forgot-password', resetPasswordRequest);
router.post('/resend-reset-password', resendResetPasswordEmail);
router.post('/reset-password/:token', confirmResetPassword);
router.put("/reset-password/:token", confirmResetPassword);
module.exports = router;
