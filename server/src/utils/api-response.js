// This is the standard API response structure that I am always going to use instead of creating new ones every time or using "res.send" directly.

class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode
    this.data = data
    this.message = message
    this.success = statusCode < 400
  }
} 

export { ApiResponse }