const express = require('express');
const router = express.Router();
const { 
    getSignUp, 
    getSignin, 
    verifyEmail, 
    resendVerificationEmail, 
    resetPasswordRequest, 
    confirmResetPassword 
} = require('../Controllers/authController'); // Adjust path to your controller

router.get('/preview-email', (req, res) => {
    res.render('verifyEmail', {
        email: 'johndoe@gmail.com',
        fullName: 'John Doe',
        verificationLink: 'http://localhost:2010/api/auth/verify-email/mocktoken123'
    });
});
router.post('/signup', getSignUp);
router.post('/signin', getSignin);
router.get('/verify-email/:token', verifyEmail);
router.get('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    res.render('resetPassword', { token });
});
router.post('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;
    res.send(`Password reset for token: ${token} with new password: ${newPassword}`);
});
router.get('/reset-password', (req, res) => {
    res.render('resetPasswordRequest');
});
router.post('/reset-password', (req, res) => {
    const { email } = req.body;
    res.send(`Password reset request for email: ${email}`);
});
router.get('/resend-verification-email', (req, res) => {
    res.render('resendVerificationEmail');
});
router.post('/resend-verification-email', (req, res) => {
    const { email } = req.body;
    res.send(`Resend verification email request for email: ${email}`);
});
router.get('/resend-reset-password-email', (req, res) => {
    res.render('resendResetPasswordEmail');
}
);
router.post('/resend-reset-password-email', (req, res) => {
    const { email } = req.body;
    res.send(`Resend reset password email request for email: ${email}`);
}
);
router.get('/welcome-email', (req, res) => {
    res.render('welcomeEmail', {
        email: 'johndoe@gmail.com',
        fullName: 'John Doe'

    });
    
}



module.exports = router;