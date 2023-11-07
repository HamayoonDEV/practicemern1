import JwtServices from "../services/JwtServices.js";
import User from "../models/user.js";

const auth = async (req, res, next) => {
  //fetching accessToken and resfreshToken from cookies

  const { accessToken, refreshToken } = req.cookies;
  if (!accessToken || !refreshToken) {
    const error = {
      status: 401,
      message: "unAuthrozied!",
    };
    return next(error);
  }
  //verifying accessToken
  let id;
  try {
    id = JwtServices.verifyAccessToken(accessToken)._id;
  } catch (error) {
    return next(error);
  }
  //finding user
  let user;
  try {
    user = await User.findOne({ _id: id });
    if (!user) {
      const error = {
        status: 404,
        message: "user not found!",
      };
      return next(error);
    }
  } catch (error) {
    return next(error);
  }

  req.user = user;
  next();
};

export default auth;
