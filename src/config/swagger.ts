import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "C2C Staff Backend API",
      version: "1.0.0",
      description:
        "API documentation for C2C (CV2CAREER) Staff Backend Server.",
      contact: {
        name: "C2C Support",
        email: "support@c2c.com",
      },
    },
    servers: [
      {
        url: "https://rat.staff.cvtocareer.com/api",
        description: "Current server",
      },
      { url: "http://localhost:51001/api", description: "Local development" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            role: { type: "string" },
            isEmailVerified: { type: "boolean" },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            statusCode: { type: "integer" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            statusCode: { type: "integer" },
          },
        },
        WebhookPayload: {
          type: "object",
          properties: {
            repository: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The name of the repository",
                },
              },
              required: ["name"],
            },
            ref: {
              type: "string",
              description: "The git reference (branch) being pushed to",
            },
            head_commit: {
              type: "object",
              properties: {
                id: { type: "string", description: "The commit SHA" },
                message: { type: "string", description: "The commit message" },
                author: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                  },
                },
              },
            },
          },
          required: ["repository", "ref"],
        },
      },
    },
  },
  apis: ["./src/docs/*.yaml", "./src/routes/v1/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
