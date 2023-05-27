const ensureAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.render("403.njk");
  }
  return next();
};

export default ensureAdmin;
