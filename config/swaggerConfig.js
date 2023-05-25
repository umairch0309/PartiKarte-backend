import swaggerJsDoc from "swagger-jsdoc";

// Extended: https://swagger.io/specification/#infoObject
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PARTIKARTE API",
      description: "PARTIKARTE API is an api for managing event tickets.",
      contact: {
        name: "MAGNAMIC d.o.o.",
      },
      servers: ["http://localhost:5600"],
    },
  },
  apis: ["./routes/*.js"],
};

export const swaggerDocs = swaggerJsDoc(swaggerOptions);
