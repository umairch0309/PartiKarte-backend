export default class HttpError extends Error {
  constructor(message, errorCode) {
    super(message);
    this.code = errorCode;
  }
}

export const createValidationError = (error) => {
  const errorMessages = Object.values(error.errors).map((err) => err.message);
  return new HttpError(errorMessages, 409);
};
