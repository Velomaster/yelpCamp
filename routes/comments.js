const express = require("express");
const router = express.Router({mergeParams: true});
const Campground = require("../models/campground");
const Comment = require("../models/comment");
const middleware = require("../middleware");

//COMMENTS NEW
router.get("/new", middleware.isLoggedIn, function(req, res){
	Campground.findByIdAsync(req.params.id)
		.then(campground => {
			res.render("comments/new", {campground: campground})
		})
		.catch(err => {
			console.log(err);
		});
});

//COMMENTS CREATE
router.post("/", middleware.isLoggedIn, function(req, res){
	let campground;
	return Campground.findById(req.params.id).exec()
		.then(foundCampground => {
			campground = foundCampground;
			const comment = new Comment(req.body.comment);
			return comment.save();
		})
		.then(comment => {
			comment.author.id = req.user._id;
			comment.author.username = req.user.username;
			comment.save();
			campground.comments.push(comment);
			campground.save();
			req.flash("success", "Successfully added comment");
			res.redirect("/campgrounds/" + campground._id);
		})
		.catch(err => {
			console.log(err);
			res.redirect("/campgrounds");
		});
});

//COMMENTS EDIT
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
	let campground;
	Campground.findById(req.params.id)
		.then(foundCampground => {
			if(!foundCampground) {
				return Promise.reject({message: "Campground not found"});
			}
			campground = foundCampground;
			return Comment.findById(req.params.comment_id)
		})
		.then(foundComment => {
			res.render("comments/edit", {campground_id: req.params.id, comment: foundComment});
		})
		.catch(err => {
			req.flash("error", err.message);
			return res.redirect("back");
	})
});

//COMMENTS UPDATE
router.put("/:comment_id", middleware.checkCommentOwnership, function (req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment)
		.then(updatedComment => {
			res.redirect("/campgrounds/" + req.params.id);
		})
		.catch(err => {
			res.redirect("back");
	});
});

//COMMENTS DESTROY ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, function(req, res){
	Comment.findByIdAndRemove(req.params.comment_id)
		.then(() => {
			req.flash("success", "Comment deleted");
			res.redirect("/campgrounds/" + req.params.id);
		})
		.catch((err) => {
			req.redirect("back");
	})
});

module.exports = router;