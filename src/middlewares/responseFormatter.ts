import { NextFunction, Response, Request } from "express";
import ApiResponse from "../utils/apiResponse";

const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  res.apiSuccess = function (data, message, statusCode = 200) {
    this.status(statusCode).json(
      ApiResponse.success({ data, message, statusCode }),
    );
  };

  res.apiError = function (error: any) {
    this.status(error.statusCode).json(
      ApiResponse.error({
        message: error.message,
        statusCode: error.statusCode,
      }),
    );
  };

  next();
};

export default responseFormatter;
