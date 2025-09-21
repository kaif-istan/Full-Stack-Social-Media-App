import imageKit from "../configs/imageKit.js";
import User from "../models/User.js";
import fs from "fs";

// Get User data using userId
export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);
    if (!user) {
      res.json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, user });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const updateUserData = async (req, res) => {
  try {
    const { userId } = req.auth();

    let { username, bio, location, full_name } = req.body;

    const tempUser = await User.findById(userId);
    if (!tempUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // If username not given, keep old one
    if (!username) {
      username = tempUser.username;
    }

    // Check if new username is available
    if (tempUser.username !== username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        username = tempUser.username; // revert to old username
      }
    }

    let updatedData = { username, bio, location, full_name };

    const profile = req.files?.profile?.[0];
    const cover = req.files?.cover?.[0];

    if (profile) {
      if (!fs.existsSync(profile.path)) {
        return res.status(400).json({
          success: false,
          message: "Profile file not found on server",
        });
      }
      const response = await imageKit.files.upload({
        file: fs.createReadStream(profile.path),
        fileName: profile.originalname,
      });

      const transformedUrl = imageKit.helper.buildSrc({
        src: response.url,
        transformation: [{ width: 512, quality: "auto", format: "webp" }],
      });

    

      updatedData.profile_picture = transformedUrl;
      fs.unlinkSync(profile.path); // Delete file from server after upload
    }

    if (cover) {
      if (!fs.existsSync(cover.path)) {
        return res
          .status(400)
          .json({ success: false, message: "Cover file not found on server" });
      }
      const response = await imageKit.files.upload({
        file: fs.createReadStream(cover.path),
        fileName: cover.originalname,
      });

      const transformedUrl = imageKit.helper.buildSrc({
        src: response.url,
        transformation: [{ width: 1280, quality: "auto", format: "webp" }],
      });

      updatedData.cover_photo = transformedUrl;
      fs.unlinkSync(cover.path); // Delete file from server after upload
    } 

    const user = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    res.json({ success: true, user, message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Find User using username, email, location, name

export const discoverUsers = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { input } = req.body;

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, i) },
        { email: new RegExp(input, i) },
        { full_name: new RegExp(input, i) },
        { location: new RegExp(input, i) },
      ],
    });

    const filteredUsers = allUsers.filter((user) => user._id !== userId);

    res.json({ success: true, users: error.message });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Follow User
export const followUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);

    if (user.following.includes(id)) {
      return res.json({
        success: false,
        message: "You are already following this user",
      });
    }

    user.following.push(id);
    await user.save();

    const toUser = await User.findById(id);
    toUser.followers.push(userId);
    await toUser.save();

    res.json({ success: true, message: "Now you are following this user" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Unfollow User
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const user = await User.findById(userId);

    user.following = user.following.filter((user) => user !== id);
    await user.save();

    const toUser = await User.findById(id);

    toUser.followers = toUser.followers.filter((user) => user !== userId);
    await toUser.save();

    res.json({ success: true, message: "No longer following this user." });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
