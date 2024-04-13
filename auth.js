const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            // If user is logged in, continue to the next middleware/route handler
            next();
        } else {
            // If user is not logged in, redirect to the login page
            res.redirect('/login');
        }
    } catch (error) {
        console.log(error.message);
        // Handle any errors that might occur
        res.status(500).send("Internal Server Error");
    }
}

const isLogOut = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            // If user is logged in, redirect to the home page
            res.redirect('/home');
        } else {
            // If user is not logged in, continue to the next middleware/route handler
            next();
        }
    } catch (error) {
        console.log(error.message);
        // Handle any errors that might occur
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    isLogOut,
    isLogin
}
