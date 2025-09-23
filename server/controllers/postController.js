import fs from "fs";
import imageKit from "../configs/imageKit.js";
import Post from "../models/Post.js";
import User from "../models/User.js";

// Add Post
export const addPost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { content, post_type } = req.body;
    const images = req.files || [];

    let image_urls = [];

    if (images.length > 0) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          const fileBuffer = fs.createReadStream(image.path);
          const response = await imageKit.files.upload({
            file: fileBuffer,
            fileName: image.originalname,
          });

          const transformedUrl = imageKit.helper.buildSrc({
            src: response.url,
            transformation: [{ width: 1280, quality: "auto", format: "webp" }],
          });

          return transformedUrl;
        })
      );
    }

    await Post.create({
      user: userId,
      content,
      image_urls,
      post_type,
    });

    res.json({ success: true, message: "Post created successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Posts
export const getFeedPost = async (req, res) => {
    try {
        const {userId} = req.auth()
        const user = await User.findById(userId)

        // User connections and followings
        const userIds = [userId, ...user.connections, ...user.following]
        const posts = await Post.find({user: {$in: userIds}}).populate('user').sort({createdAt: -1})
 
        res.json({success: true, posts})
    } catch (error) {
        console.log(error)
        res.status(500).json({success: false, message: error.message})
    }
}

// Like Post
export const likePost = async (req, res) => {
    try {
        const {userId} = req.auth()
        const {postId} = req.body

        const post = await Post.findById(postId)

        // Agar likes count me userId hai to unlike krdo, warna like krdo
        if(post.likes_count.includes(userId)){
            post.likes_count = post.likes_count.filter(user => user !== userId)
            await post.save()
            res.json({success: true, message: 'Post unliked'})
        } else {
            post.likes_count.push(userId)
            await post.save()
            res.json({success: true, message: 'Post liked'})
        }
    } catch (error) {
        console.log(error)
        res.json({success: false, message: error.message})
    }
}