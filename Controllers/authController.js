const User = require('../Models/userModel');
const bcrypt = require('bcryptjs');
const ejs = require('ejs');
const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
const crypto = require('crypto')
const path = require('path')
const jwt = require('jsonwebtoken')
dotenv.config()

const getSignUp =async(req,res)=> {
    try{
    const {fullName, email, password, role} = req.body;
    if(!fullName || !email || !password){
        
        return res.status(400).json({
            message: 'All fields are required '
        })
        
    }

    const existingUser = await User.findOne({email});
        if (existingUser){
            return res.status(400).json({
                message: 'email already exists'
            })
        }

        const hashedPassword = await bcrypt.hash(password,10)
        const verificationToken = crypto .randomBytes(32).toString("hex")
          const verificationTokenExpires = Date.now() + 15 * 60 * 1000

            const user = await User.create({
                fullName,
                email,
                password: hashedPassword,
                role:role === 'artist' ? 'artist' : 'listener',
                verificationToken,
                verificationTokenExpires
            });
            await sendVerificationEmail(user)

            res.status(201).json({
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role
            })
    }
    catch(error){
        res.status(500).json({
            success: false,
            message: error.message,
        })
    }
}

const getSignin = async (req,res ) => {
    try{
        const {email, password} = req.body
        const user = await User.findOne({email})
        if(!user){
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            })
        }
        
        const passwordMatch = await bcrypt.compare(password, user.password)
        if(!passwordMatch){
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            })
        }
        if(!user.isVerified){
            return res.status(400).json({
                success: false,
                message: 'Please verify your email before signing in'
            })
        }
        const token = jwt.sign({id: user._id, role: user.role}, process.env.JWT_SECRET, {expiresIn: '24h'})
        if (!token){
            return res.status(500).json({
                success: false,
                message: 'Invalid Credentials'
            }) 
        }
        res.status(200).json({
            success: true,
            message: 'Signin successful',
            token,
         user:{
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            }
        })
        }
    catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        })
    }


}

const verifyEmail = async(req, res)=>{
    try{
        const{token} = req.params;
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        })
        if(!user){
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            })
        }
        user.isVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        })
    }
catch(error){
        res.status(500).json({
            success: false,
            message: error.message
        })
}
}

const sendVerificationEmail = async (user) => {
    try {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_SERVER,     
        port: Number(process.env.SMTP_PORT),
        secure: false, 
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_KEY
        }
    });
    const verificationLink = `http://localhost:${process.env.PORT || 2010}/api/auth/verify-email/${user.verificationToken}`;
     const templatePath = path.join(__dirname, '../Views/verifyEmail.ejs');
        const html = await ejs.renderFile(templatePath, { 
            user: user,
            fullName: user.fullName, 
            verificationLink 
        });

        const mailOptions = {
            from: `"EchoStream" <${process.env.SMTP_USER}>`, 
            to: user.email,
            subject: 'Verify your EchoStream Email Address',
            html: html
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`Verification email sent successfully: ${info.messageId}`);
    
    
    } 

    catch (error) {
    console.error('Email delivery failed:', error);
    throw new Error('Failed to send email verification link.');
} 

}

const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }   
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpires = Date.now() + 15 * 60 * 1000; 
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();
        await sendVerificationEmail(user);
        res.status(200).json({
            success: true,
            message: 'Verification email resent successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const welcomeEmail = async (user) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_KEY
            }
        });
        const templatePath = path.join(__dirname, '../Views/welcomeEmail.ejs');
        const html = await ejs.renderFile(templatePath, { 
            user: user,
            fullName: user.fullName
        });
        const mailOptions = {
            from: `"EchoStream" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Welcome to EchoStream!',
            html: html
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent successfully: ${info.messageId}`);
    }

    catch (error) {
        console.error('Email delivery failed:', error);
        throw new Error('Failed to send welcome email.');
    }
}

const resetPasswordRequest = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpires = Date.now() + 15 * 60 * 1000;
        await user.save();
        await sendResetPasswordEmail(user, resetToken);
        res.status(200).json({
            success: true,
            message: 'Password reset email sent successfully'
        });
    }catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const sendResetPasswordEmail = async (user, resetToken) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_KEY
            }
        });
        const resetLink = `http://localhost:${process.env.PORT || 2010}/api/auth/reset-password/${resetToken}`;
        const templatePath = path.join(__dirname, '../Views/resetPassword.ejs');
        const html = await ejs.renderFile(templatePath, {
            user: user,
            fullName: user.fullName,
            resetLink
        });
        const mailOptions = {
            from: `"EchoStream" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Reset your EchoStream Password',
            html: html
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent successfully: ${info.messageId}`);
    }
    catch (error) {
        console.error('Email delivery failed:', error);
        throw new Error('Failed to send password reset email.');
    }
}

const confirmResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpires = null;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
const resendResetPasswordEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
            const resetToken = crypto.randomBytes(32).toString("hex");
            const resetTokenExpires = Date.now() + 15 * 60 * 1000;
            user.resetToken = resetToken;
            user.resetTokenExpires = resetTokenExpires;
            await user.save();
            await sendResetPasswordEmail(user, resetToken);
            res.status(200).json({
                success: true,
                message: 'Password reset email resent successfully'
            });  
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


module.exports= module.exports = {
    getSignUp,
    getSignin,
    verifyEmail,
    resendVerificationEmail,
    resetPasswordRequest,
    confirmResetPassword, 
    welcomeEmail,
    resendResetPasswordEmail
};