const removeSetCookie = (req, res, next) => {
  res.removeHeader("set-cookie");
  next();
};

export default removeSetCookie;
