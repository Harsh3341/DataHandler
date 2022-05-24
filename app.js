require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
const https = require("https");


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DB);

const accountsdata = new mongoose.Schema({
    userid: String,
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    combo: String,
    date: String,
    price: String,
    accountemail: String

});

accountsdata.plugin(passportLocalMongoose);
accountsdata.plugin(findOrCreate);

const data = new mongoose.model("amazonprime", accountsdata);

passport.use(data.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://floating-sea-09088.herokuapp.com/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        data.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", (req, res) => {
    res.render("login");
});

app.get('/auth/google',
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/home",
    passport.authenticate("google", { failureRedirect: "/" }),
    function (req, res) {

        res.redirect("/home");
    });

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/home", function (req, res) {
    if (req.isAuthenticated()) {

        data.find({ "combo": { $regex: ":" } }, function (err, accdata) {
            res.render("home", { userdata: accdata })

        })

    } else {
        res.redirect("/");
    }
})

app.get('/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


app.post("/signup", (req, res) => {

    data.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/signup");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/home");
            })
        }
    })
})

app.post("/", function (req, res) {

    const user = new data({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/home")
            })
        }
    })
});


app.post("/create", function (req, res) {

    const userdata = new data({
        userid: req.body.userid,
        combo: req.body.combo,
        date: req.body.date,
        price: req.body.price,
        accountemail: req.body.emailnum

    })
    userdata.save(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/home")

            const url = "https://api.telegram.org/bot" + process.env.TOKEN + "/sendmessage?chat_id=-1001173917513&text=" + req.body.userid + " // " + req.body.combo + " // " + req.body.date + " // " + req.body.price + " // " + req.body.emailnum;
            https.get(url, function (response) {
                console.log(response.statusCode);

            });
        }
    });
});

app.get("/create", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("create");

    } else {
        res.redirect("/");
    }
})



let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}



app.listen(port, function () {
    console.log("Server started on port 3000.");
});