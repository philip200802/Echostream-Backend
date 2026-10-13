const User = require('../Models/userModel');
const bcrypt = require('bcryptjs');
const ejs = require('ejs');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config();

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_SERVER,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.BREVO_API_KEY || process.env.BREVO_API_KEY 
        }
    });
};

const getSignUp = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpires = Date.now() + 15 * 60 * 1000;

        const user = await User.create({
            fullName,
            email,
            password: hashedPassword,
            role: role === 'admin' ? 'admin' : role === 'artist' ? 'artist' : 'listener',
            verificationToken,
            verificationTokenExpires
        });

        await sendVerificationEmail(user);

        res.status(201).json({
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getSignin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        if (!user.isVerified) {
            return res.status(400).json({ success: false, message: 'Please verify your email before signing in' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        if (!token) {
            return res.status(500).json({ success: false, message: 'Invalid Credentials' });
        }

        res.status(200).json({
            success: true,
            message: 'Signin successful',
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
        }

        user.isVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await user.save();

        await welcomeEmail(user);

        res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const sendVerificationEmail = async (user) => {
    try {
        const verificationLink = `https://${process.env.BACKEND_URI}/api/auth/verify-email/${user.verificationToken}`;
        const templatePath = path.join(__dirname, '../Views/verifyEmail.ejs');
        const html = await ejs.renderFile(templatePath, { user, fullName: user.fullName, verificationLink });

        const brevoApiKey = process.env.BREVO_API_KEY?.trim();
        if (brevoApiKey) {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": brevoApiKey,
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    sender: { name: process.env.EMAIL_FROM_NAME, email: process.env.EMAIL_FROM },
                    to: [{ email: user.email, name: user.fullName }],
                    subject: "Verify your EchoStream Email Address",
                    htmlContent: html
                })
            });

            const responseData = await response.json();
            if (!response.ok) {
                const providerMessage = responseData.message || response.statusText;
                throw new Error(
                    `Brevo API Error (${response.status}): ${providerMessage}. ` +
                    'Check that BREVO_API_KEY is the current Brevo v3 API key configured in Render.'
                );
            }
            console.log('Verification email sent via Brevo API:', responseData);
        } else {
            const transporter = createTransporter();
            const mailOptions = {
                from: `"EchoStream" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: 'Verify your EchoStream Email Address',
                html: html
            };
            const info = await transporter.sendMail(mailOptions);
            console.log(`Verification email sent via SMTP: ${info.messageId}`);
        }
    } catch (error) {
        console.error('Email delivery failed:', error);
        throw new Error('Failed to send email verification link.');
    }
};

const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.verificationToken = crypto.randomBytes(32).toString("hex");
        user.verificationTokenExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        await sendVerificationEmail(user);
        res.status(200).json({ success: true, message: 'Verification email resent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const welcomeEmail = async (user) => {
    try {
        const transporter = createTransporter();
        const templatePath = path.join(__dirname, '../Views/welcomeEmail.ejs');
        const html = await ejs.renderFile(templatePath, { user, fullName: user.fullName });

        const mailOptions = {
            from: `"EchoStream" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Welcome to EchoStream!',
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent successfully: ${info.messageId}`);
    } catch (error) {
        console.error('Email delivery failed:', error);
    }
};

const resetPasswordRequest = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        await sendResetPasswordEmail(user, resetToken);
        res.status(200).json({ success: true, message: 'Password reset email sent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const sendResetPasswordEmail = async (user, resetToken) => {
    try {
        const transporter = createTransporter();
        const resetLink = `http://localhost:${process.env.PORT || 2010}/api/auth/reset-password/${resetToken}`;
        const templatePath = path.join(__dirname, '../Views/resetPasswordEmail.ejs');
        const html = await ejs.renderFile(templatePath, { user, fullName: user.fullName, resetLink });

        const mailOptions = {
            from: `"EchoStream" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Reset your EchoStream Password',
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent successfully: ${info.messageId}`);
    } catch (error) {
        console.error('Email delivery failed:', error);
        throw new Error('Failed to send password reset email.');
    }
};

const confirmResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const resendResetPasswordEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();
        resetLink = `${process.env.FRONTEND_URL}/forgot/password?token=${resetToken}`;
        await sendResetPasswordEmail(user, resetToken);
        res.status(200).json({ success: true, message: 'Password reset email resent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getSignUp,
    getSignin,
    verifyEmail,
    resendVerificationEmail,
    resetPasswordRequest,
    confirmResetPassword,
    welcomeEmail, 
    resendResetPasswordEmail
};