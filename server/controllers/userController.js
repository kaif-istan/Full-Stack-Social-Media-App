import imageKit from "../configs/imageKit.js";
import { inngest } from "../inngest/index.js";
import Connection from "../models/Connection.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import fs from "fs";

// Get User data using userId
export const getUserData = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
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

    // Ensure input is string and not empty
    if (!input) {
      return res.json({ success: false, message: "Invalid search input" });
    }

    const allUsers = await User.find({
      $or: [
        { username: new RegExp(input, "i") },
        { email: new RegExp(input, "i") },
        { full_name: new RegExp(input, "i") },
        { location: new RegExp(input, "i") },
      ],
    });

    const filteredUsers = allUsers.filter((user) => user._id !== userId);

    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error("Error in discoverUsers:", error);
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

export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    // Check if user has sent more than 20 connection requests in the last 24 hours
    const last24hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const connectionRequests = await Connection.find({
      from_user_id: userId,
      created_at: { $gt: last24hours },
    });
    if (connectionRequests.length > 20) {
      return res.json({
        success: false,
        message:
          "You have sent more than 20 connection requests in the last 24 hours",
      });
    }

    // Check if users are already connected
    const connection = await Connection.findOne({
      $or: [
        { from_user_id: userId, to_user_id: id },
        { from_user_id: id, to_user_id: userId },
      ],
    });
    if (!connection) {
       const newConnection = await Connection.create({
        from_user_id: userId,
        to_user_id: id,
      });

      await inngest.send({
        name: 'app/connection-request',
        data: {connectionId: newConnection._id}
      })

      return res.json({
        success: true,
        message: "Connection request sent successfully",
      });
    } else if (connection && connection.status === "accepted") {
      return res.json({
        success: false,
        message: "You are already connected with this user",
      });
    }

    return res.json({
      success: false,
      message: "Connection request is pending",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getUserConnections = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await User.findById(userId).populate(
      "connections followers following"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const connections = user.connections;
    const followers = user.followers;
    const following = user.following;

    const pendingConnections = (
      await Connection.find({ to_user_id: userId, status: "pending" }).populate(
        "from_user_id"
      )
    ).map((connection) => connection.from_user_id);

    res.json({
      success: true,
      connections,
      followers,
      following,
      pendingConnections,
    });
  } catch (error) {
    console.log(error)
    res.json({success: false, message: error.message})
  }
};



export const acceptConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body

    const connection = await Connection.findOne({from_user_id: id, to_user_id: userId})

    if(!connection){
      return res.json({success: false, message: 'Connection not found'})
    }
    
    const user = await User.findById(userId)
    user.connections.push(id)
    await user.save()

    const toUser = await User.findById(id)
    toUser.connections.push(userId)
    await toUser.save()

    connection.status = 'accepted';
    await connection.save()

    res.json({success: true, message: 'Connection accepted successfully'})

  } catch (error) {
    console.log(error)
    res.json({success: false, message: error.message})
  }
};

// Get User Profiles
export const getUserProfiles = async (req, res) => {
  try {
    const {profileId} = req.body
    console.log(profileId)
    const profile = await User.findById(profileId)
    if(!profile){
      return res.json({success: false, message: 'Profile not found'})
    }
    const posts = await Post.find({user: profileId}).populate('user')

    res.json({success: true, profile, posts})
  } catch (error) {
    console.log(error)
    res.status(500).json({success: false, message: error.message})
  }
}
