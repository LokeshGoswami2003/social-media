const Post = require("../models/Post");
const User = require("../models/User");
const { error, success } = require("../utils/responseWrapper");

const followOrUnfollowUserController = async (req, res) => {
    try {
        const { userIdToFollow } = req.body;
        const curUserId = req._id;

        const userToFollow = await User.findById(userIdToFollow);
        const curUser = await User.findById(curUserId);

        if (curUserId === userIdToFollow) {
            return res.send(error(409, "users cannot follow themselves"));
        }
        if (!userToFollow) {
            return res.send(error(404, "user to follow not found"));
        }

        if (curUser.followings.includes(userIdToFollow)) {
            const followingIndex = curUser.followings.indexOf(userIdToFollow);
            curUser.followings.splice(followingIndex, 1);

            const followerIndex = userToFollow.followers.indexOf(curUser);
            userToFollow.followers.splice(followerIndex, 1);

            await userToFollow.save();
            await curUser.save();
            return res.send(success(200, "user unfollowed"));
        }
        userToFollow.followers.push(curUserId);
        curUser.followings.push(userIdToFollow);

        await userToFollow.save();
        await curUser.save();

        return res.send(success(200, "user followed"));
    } catch (err) {
        return res.send(error(500, err.message));
    }
};

const getPostsOfFollowing = async (req, res) => {
    try {
        const curUserId = req._id;
        const curUser = await User.findById(curUserId);
        const posts = await Post.find({
            owner: {
                $in: curUser.followings,
            },
        });
        return res.send(success(200, posts));
    } catch (err) {
        return res.send(error(500, err.message));
    }
};

const getMyPostsController = async (req, res) => {
    try {
        const curUserId = req._id;
        const allUserPosts = await Post.find({
            owner: curUserId,
        }).populate("likes");
        return res.send(success(200, { allUserPosts }));
    } catch (err) {
        return res.send(error(500, err.message));
    }
};

const getUserPostsController = async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) {
            return res.send(error(400, "userid is required"));
        }
        const allUserPosts = await Post.find({
            owner: userId,
        }).populate("likes");
        return res.send(success(200, { allUserPosts }));
    } catch (err) {
        return res.send(error(500, err.message));
    }
};

const deleteMyProfile = async (req, res) => {
    try {
        const curUserId = req._id;
        const curUser = await User.findById(curUserId);

        // delete all posts
        await Post.deleteMany({
            owner: curUserId,
        });

        // remove myself from followers following
        curUser.followers.forEach(async (followerId) => {
            const follower = await User.findById(followerId);
            const index = follower.followings.indexOf(curUserId);
            follower.followings.splice(index, 1);
            await follower.save();
        });
        // remove myself from my following followers
        curUser.followings.forEach(async (followingId) => {
            const following = await User.findById(followingId);
            const index = following.followers.indexOf(curUserId);
            following.followers.splice(index, 1);
            await following.save();
        });

        // remove myself from all likes
        const allPosts = await Post.find();
        allPosts.forEach(async (post) => {
            const index = post.likes.indexOf(curUserId);
            post.likes.splice(index, 1);
            await post.save();
        });
        // delete the user
        await User.deleteOne({
            _id: curUserId,
        });

        res.clearCookie("jwt", {
            httpOnly: true,
            secure: true,
        });
        return res.send(success(200, "user deleted"));
    } catch (err) {
        return res.send(500, err.message);
    }
};

module.exports = {
    followOrUnfollowUserController,
    getPostsOfFollowing,
    getMyPostsController,
    getUserPostsController,
    deleteMyProfile,
};