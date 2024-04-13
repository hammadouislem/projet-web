const express = require("express");
const bcrypt = require("bcrypt");
const LogInCollection = require("./mongo");
const flash = require("connect-flash");
const session = require("express-session");
const crypto = require('crypto');
const nodemailer = require("nodemailer");
const config = require("../WEB PROJET/config");
const auth = require('../WEB PROJET/auth')

const app = express();

app.use(session({ secret: config.sessionSecret }));
app.use(flash());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.get('/signup', auth.isLogOut, (req, res) => {
    res.render('signup', { message: req.flash('message') });
});

app.get('/login', auth.isLogOut, (req, res) => {
    res.render("login", { message: req.flash('message') });
});

app.get('/', auth.isLogOut, (req, res) => {
    res.render("login", { message: req.flash('message') });
});

app.get("/home", auth.isLogin, (req, res) => {
    res.render("home");
});

app.post('/signup', async (req, res) => {
    try {
        const existingUser = await LogInCollection.findOne({ username: req.body.username });
        if (existingUser) {
            req.flash('message', 'Username is already taken');
            return res.redirect('/signup');
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new LogInCollection({
            name: req.body.name,
            username: req.body.username,
            email: req.body.email,
            picture : req.body.picture,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).redirect("/login");
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal server error");
    }
});

app.post('/login', async (req, res) => {
    try {
        const user = await LogInCollection.findOne({ username: req.body.username });
        if (!user) {
            req.flash('message', 'User Not Found');
            return res.redirect('/login');
        }

        const passwordMatch = await bcrypt.compare(req.body.password, user.password);
        if (passwordMatch) {
            req.session.user_id = user._id;
            return res.redirect("/home");
        } else {
            req.flash('message', 'Incorrect Password');
            return res.redirect('/login');
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal server error");
    }
});

app.get('/profile',auth.isLogin, async (req, res) => {
    try {
        const UserData = await LogInCollection.findById({_id : req.session.user_id});
        res.render('profile', { UserData: UserData, message: req.flash('message') });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/profile', async (req, res) => {
    try {
        const user = await LogInCollection.findById(req.session.user_id);

        // Check if old password matches
        const isPasswordMatch = await bcrypt.compare(req.body.oldpassword, user.password);
        if (!isPasswordMatch) {
            req.flash('message', 'Wrong password.');
            return res.redirect('/profile');
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(req.body.newpassword, 10);

        // Update user's password
        user.password = hashedPassword;
        await user.save();

        // Flash success message
        req.flash('message', 'Your password has been reset successfully.');
        return res.redirect('/login');
    } catch (error) {
        console.error("Error:", error);
        req.flash('message', 'An error occurred while resetting your password.');
        res.redirect('/profile');
    }
});
app.get('/reset-password', (req, res) => {
    res.render('reset-password', { message: req.flash('message') });
});

function sendResetPasswordEmail(email, token) {
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: "islemhamma26@gmail.com",
            pass: "capk irun kjpc swso",
        },
    });

    const mailOptions = {
        from: "islemhamma26@gmail.com",
        to: email,
        subject: "Reset your password",
        text: 'http://localhost:4000/reset-password/' + token,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email: ", error);
        } else {
            console.log("Email sent: ", info.response);
        }
    });
}

app.post('/reset-password', async (req, res) => {
    try {
        const user = await LogInCollection.findOne({ email: req.body.email });
        if (!user) {
            req.flash('message', 'User with that email does not exist');
            return res.redirect('/reset-password');
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();
        sendResetPasswordEmail(user.email, token);

        req.flash('message', 'We have sent you an email. Please check your email inbox.');
        return res.redirect('/reset-password');
    } catch (error) {
        console.error("Error:", error);
        req.flash('message', 'An error occurred. Please try again later.');
        return res.redirect('/reset-password');
    }
});

app.get('/reset-password/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const user = await LogInCollection.findOne({ resetPasswordToken: token });
        if (!user || user.resetPasswordExpires < Date.now()) {
            req.flash('message', 'Invalid or expired reset password token.');
            return res.redirect('/reset-password');
        }
        res.render('new-password', { token: token, message: req.flash('message') });
    } catch (error) {
        console.error("Error:", error);
        req.flash('message', 'An error occurred while processing the reset password token.');
        res.redirect('/reset-password');
    }
});

app.post('/reset-password/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const newPassword = req.body.password; 

        const user = await LogInCollection.findOne({ resetPasswordToken: token });

        if (!user || user.resetPasswordExpires < Date.now()) {
            req.flash('message', 'Invalid or expired reset password token.');
            return res.redirect('/reset-password');
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        req.flash('message', 'Your password has been reset successfully.');
        return res.redirect('/login');
    } catch (error) {
        console.error("Error:", error);
        req.flash('message', 'An error occurred while resetting your password.');
        res.redirect('/reset-password');
    }
});
app.get('/LogOut', async(req,res)=>{
    try{
        req.session.destroy();
        res.redirect('/');
    } catch (error){
        console.log(error.message);
    }
});
app.listen(4000, () => {
    console.log('Server is running on port 4000');
});
