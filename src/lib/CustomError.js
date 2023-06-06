export default class CustomError extends Error {
  constructor(message, redirect) {
    super(message);
    this.redirect = redirect;
  }
}
