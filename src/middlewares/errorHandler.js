import { z } from "zod";
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  req.log.info(err);
  if (err instanceof z.ZodError) {
    err.errors.map((error) =>
      req.flash("error", `${error.path.join(",")} : ${error.message}`)
    );
    return res.redirect("back");
  }
  if (err.code === "EBADCSRFTOKEN") {
    req.flash("error", "Invalid CSRF Token");
    return res.status(403).render("403.njk");
  }
  if (err.code === "P2002") {
    req.flash("error", "Email already registered");
    return res.redirect("back");
  }
  res
    .status(500)
    .send(`Internal Server Error\nError ID:${req.log.fields.req_id}`);
};

export default errorHandler;
