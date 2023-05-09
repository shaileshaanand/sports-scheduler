import { z } from "zod";
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof z.ZodError) {
    err.errors.map((error) => req.flash("error", error.message));
    return res.redirect("back");
  }

  // Handle other errors
  // You can customize this part based on your specific error handling needs
  console.error(err); // Log the error for debugging purposes
  res.status(500).send("Internal Server Error");
};

export default errorHandler;
