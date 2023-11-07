import Joi from "joi";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import JwtServices from "../services/JwtServices.js";
import RefreshToken from "../models/token.js";
const passwordPattren =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[ -/:-@\[-`{-~]).{6,64}$/;
const authController = {
  //Register user method
  async registerUser(req, res, next) {
    const registerUserSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      name: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattren).required(),
    });
    const { error } = registerUserSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { username, name, email, password } = req.body;

    //password hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    //handling username and email conflict

    try {
      const usernameInUse = await User.exists({ username });
      const emailInUse = await User.exists({ email });
      if (usernameInUse) {
        const error = {
          status: 409,
          message: "Username is Already in use!",
        };
        return next(error);
      }

      if (emailInUse) {
        const error = {
          status: 409,
          message: "Email is Already in use!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //saving to the database
    let user;
    try {
      const newUser = new User({
        username,
        name,
        email,
        password: hashedPassword,
      });
      user = await newUser.save();
    } catch (error) {
      return error;
    }
    //genrating tokens
    const accesstoken = JwtServices.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JwtServices.signRefreshToken({ _id: user._id }, "60m");
    //storing tokens to the database
    await JwtServices.storeRefreshToken(user._id, refreshToken);
    //sending tokens to the cookies
    res.cookie("accessToken", accesstoken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    //sending response
    res.status(201).json({ user, auth: true });
  },

  //user login method
  async loginUser(req, res, next) {
    const loginUserSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      password: Joi.string().pattern(passwordPattren).required(),
    });
    const { error } = loginUserSchema.validate(req.body);
    if (error) {
      return next(error);
    }

    const { username, password } = req.body;
    //matching userame and password with database
    let user;
    try {
      user = await User.findOne({ username });
      if (!user) {
        const error = {
          status: 401,
          message: "invalid username!",
        };
        return next(error);
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        const error = {
          status: 401,
          message: "invalid password!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //genrating tokens
    const accesstoken = JwtServices.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JwtServices.signRefreshToken({ _id: user._id }, "60m");
    //updating to the database
    await RefreshToken.updateOne(
      { _id: user._id },
      { token: refreshToken },
      { upsert: true }
    );
    //sending tokens to the cookies
    res.cookie("accessToken", accesstoken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    //sending response
    res.status(200).json({ user, auth: true });
  },
  //logout method
  async logout(req, res, next) {
    const { refreshToken } = req.cookies;
    try {
      //delete refreshToken from database
      await RefreshToken.deleteOne({ token: refreshToken });
    } catch (error) {
      return next(error);
    }
    //clearCookie
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    //sending response
    res.status(200).json({ user: null, auth: false });
  },
  //refresh method
  async refresh(req, res, next) {
    //fethcing refreshToken from cookies
    const originalRefreshToken = req.cookies.refreshToken;
    let id;
    try {
      id = JwtServices.verifyRefreshToken(originalRefreshToken)._id;
    } catch (error) {
      const e = {
        status: 401,
        message: "unAuthorized!",
      };
      return next(e);
    }
    //matching the token
    try {
      const match = await RefreshToken.findOne({
        _id: id,
        token: originalRefreshToken,
      });
      if (!match) {
        const error = {
          status: 401,
          message: "unAuthorized!",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //genrting new tokens
    //genrating tokens
    const accesstoken = JwtServices.signAccessToken({ _id: id }, "30m");
    const refreshToken = JwtServices.signRefreshToken({ _id: id }, "60m");
    //updating to the database
    await RefreshToken.updateOne({ _id: id }, { token: refreshToken });
    //sending tokens to the cookies
    res.cookie("accessToken", accesstoken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    //find user
    const user = await User.findOne({ _id: id });
    //sending response
    res.status(200).json({ user, auth: true });
  },
};

export default authController;
