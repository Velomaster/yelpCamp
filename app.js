require('dotenv').config()

const express 			= require("express"),
	  app 				= express(),
	  bodyParser 		= require("body-parser"),
	  mongoose 			= require("mongoose"),
	  flash				= require("connect-flash"),
	  passport 			= require("passport"),
	  LocalStrategy 	= require("passport-local"),
	  methodOverride	= require("method-override"),
	  Campground 		= require("./models/campground"),
	  Comment 			= require("./models/comment"),
	  User 				= require("./models/user"),
	  seedDB 			= require("./seeds"),
	  Promise 			= require('bluebird');

//requiring routes
const commentRoutes		= require("./routes/comments"),
	  campgroundRoutes	= require("./routes/campgrounds"),
	  indexRoutes		= require("./routes/index")

Promise.promisifyAll( mongoose );
mongoose.Promise = require('bluebird');
mongoose.connect(process.env.MONGO_DB, {
	useNewUrlParser: true,
  	useUnifiedTopology: true,
	useFindAndModify: false
})
	.then(() => console.log('Connected to DB!'))
	.catch(error => console.log(error.message));

app.locals.moment = require("moment");

//Passport Configuration
app.use(require("express-session")({
	secret: "This sentense has no meaning.",
	resave: false,
	saveUninitialized: false
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	
	next();
});

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(3000, function(){
	console.log("The YelpCamp Server Has Started");
});