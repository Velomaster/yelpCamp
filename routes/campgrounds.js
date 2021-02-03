const express 		= require("express");
const router 		= express.Router();
const Campground 	= require("../models/campground");
const Comment		= require("../models/comment");
const middleware 	= require("../middleware");
const multer 		= require("multer");
const storage 		= multer.diskStorage({
	filename: function(req, file, callback){
		callback(null, Date.now() + file.originalname);
	}
});
const imageFilter = function(req, file, cb){
	//accept image files only
	if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
		return cb(new Error("Only image files are allowed!"), false);
	}
	cb (null, true);
};

const upload = multer({ storage: storage, fileFilter: imageFilter});
const cloudinary = require("cloudinary");
cloudinary.config({
	cloud_name: "dpaz0qw3s",
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

//INDEX - show all campgrounds
router.get("/", function(req, res){
	Campground.find({})
		.then(allCampgrounds => {
			res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds"});
		})
		.catch(error => {
			req.flash("error", err.message);
			res.redirect("/campgrounds");
		});
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res){
	cloudinary.v2.uploader.upload(req.file.path, function(err, result){
		if(err) {
			req.flash("error", err.message);
        	return res.redirect("back");
		}
		// add cloudinary url for the image to the campground object under image property
		req.body.campground.image = result.secure_url;
		// add image's public_id to campground object
		req.body.campground.imageId = result.public_id;
		//add author to the campground
		req.body.campground.author = {
			id: req.user._id,
			username: req.user.username
		}
		
		Campground.create(req.body.campground)
			.then(campground => {
				res.redirect("/campgrounds/" + campground.id)
			})
			.catch(error => {
				req.flash("error", err.message);
				res.redirect("back");
			});
	});
});

//NEW - show form to create a new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new");
});

//SHOW - show more info about one campground
router.get("/:id", function(req, res){
	let campground;
	Campground.findById(req.params.id).populate("comments").exec()
		.then(foundCampground => {
			campground = foundCampground;
			if (!foundCampground) throw new Error();
			return Campground.find({});
		})
		.then(allCampgrounds => {
			res.render("campgrounds/show", {campground: campground, campgrounds: allCampgrounds});
		})
		.catch(error => {
			req.flash("error", "Campground not found");
			res.redirect("/campgrounds");
		})
});

//EDIT - edit campground route
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, function(err, foundCampground){
		res.render("campgrounds/edit", {campground: foundCampground});
	});
});

//UPDATE - update campground route
router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res){
	//find the correct campground
	Campground.findById(req.params.id, async function(err, campground){
		if(err){
			res.flash("error", err.message);
			res.redirect("back");
		} else {
			//find and update image
			if(req.file){
				try {
					await cloudinary.v2.uploader.destroy(campground.imageId);
					var result = await cloudinary.v2.uploader.upload(req.file.path);
					campground.imageId = result.public_id;
					campground.image = result.secure_url;
				} catch(err) {
					res.flash("error", err.message);
					return res.redirect("back");
				}
			}
			campground.name = req.body.campground.name;
			campground.description = req.body.campground.description;
			campground.save();
			req.flash("success", "Successfully Updated!");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

// DELETE - delete campground and associated comments
router.delete("/:id", middleware.checkCampgroundOwnership, async (req, res) => {
	try {
		const campground = await Campground.findById(req.params.id);
	
		await cloudinary.v2.uploader.destroy(campground.imageId);
		await campground.remove();
		await Comment.deleteMany( {_id: { $in: campground.comments } });

		req.flash("success", "Campground removed successfully!");
		res.redirect("/campgrounds");
	} catch(err) {
		res.flash("error", err.message);
		res.redirect("back");
	}
});

module.exports = router;