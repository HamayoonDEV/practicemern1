import Joi from "joi";
import fs from "fs";
import Blog from "../models/blog.js";
import { BACKEND_URL } from "../config/index.js";

const blogController = {
  //create Blog method
  async createBlog(req, res, next) {
    const createBlogSchema = Joi.object({
      content: Joi.string().required(),
      title: Joi.string().required(),
      photopath: Joi.string(),
      author: Joi.string().required(),
    });
    const { error } = createBlogSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { content, title, photopath, author } = req.body;
    let blog;
    if (photopath) {
      //read photo as buffer
      const buffer = Buffer.from(
        photopath.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
        "base64"
      );
      //allocate random name to the photo
      const imagepath = `${Date.now()}-${author}.png`;
      //store image localy
      fs.writeFileSync(`storage/${imagepath}`, buffer);
      try {
        const newBlog = new Blog({
          content,
          title,
          photopath: `${BACKEND_URL}/storage/${imagepath}`,
          author,
        });
        blog = await newBlog.save();
      } catch (error) {
        return next(error);
      }
    } else {
      try {
        const newBlog = new Blog({
          content,
          title,
          author,
        });
        blog = await newBlog.save();
      } catch (error) {
        return next(error);
      }
    }
    //sending response
    res.status(201).json({ blog });
  },
  //get all blogs
  async getAll(req, res, next) {
    try {
      const blogs = await Blog.find({});
      const blogsArr = [];
      for (let i = 0; i < blogs.length; i++) {
        const blog = blogs[i];
        blogsArr.push(blog);
      }
      return res.status(200).json({ blogs: blogsArr });
    } catch (error) {
      return next(error);
    }
  },
};

export default blogController;
