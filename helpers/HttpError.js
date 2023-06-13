export default class HttpError extends Error {
  constructor(message, errorCode) {
    super(message);
    this.code = errorCode;
  }
}

export const createValidationError = (error) => {
  const errorMessages = Object.values(error.errors).map((err) => err.message);
  return errorMessages;
  // return new HttpError(errorMessages, 409);
};

export const ServerError = (error) => {
  console.log(error);
  return new HttpError("Server error", 500);
};
