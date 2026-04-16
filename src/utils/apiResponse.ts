class ApiResponse {
  constructor(
    public success: boolean,
    public message: string,
    public data?: any,
    public statusCode?: number,
  ) {}

  //   success method
  static success({
    message = "Request Success",
    data = null,
    statusCode = 200,
  }: {
    message?: string;
    data?: any;
    statusCode?: number;
  }) {
    return new ApiResponse(true, message, data, statusCode);
  }

  //   error method
  static error({
    message = "Request Failed",
    statusCode = 500,
  }: {
    message?: string;
    statusCode?: number;
  }) {
    return new ApiResponse(false, message, null, statusCode);
  }
}

export default ApiResponse;
