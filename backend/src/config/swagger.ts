import path from "path";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";
const routesGlob = path.join(__dirname, "..", "routes", isProduction ? "*.js" : "*.ts");

const getApiServerUrl = (): string => {
  if (!isProduction) {
    return `http://localhost:${env.PORT}`;
  }
  try {
    const client = new URL(env.CLIENT_URL);
    const host = client.hostname.replace(/^www\./, "");
    return `${client.protocol}//api.${host}`;
  } catch {
    return env.CLIENT_URL;
  }
};

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-Commerce E-Shop API",
      version: "1.0.0",
      description:
        "Comprehensive API documentation for shopping catalog, checkout cart orders, profile registers, dynamic CMS blocks, and management dashboards.",
      contact: {
        name: "Backend Developer",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: getApiServerUrl(),
        description: isProduction ? "Production Server" : "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Provide JWT token formatted as: 'Bearer <your_token_value>'",
        },
      },
    },
    // Apply JWT globally to swagger controls (can be overridden per path)
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // In production only dist/ exists; dev uses src/
  apis: [routesGlob],
};

const swaggerSpec = swaggerJSDoc(options);

/**
 * Connects Swagger documentation routes to the Express Application instance
 */
export const setupSwagger = (app: Express): void => {
  // Serve Swagger Interactive Dashboard UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve raw Swagger specification JSON endpoint
  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log(`📑 Swagger Documentation active at http://localhost:${env.PORT}/api-docs`);
};
export default setupSwagger;
