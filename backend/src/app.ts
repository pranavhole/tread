import express from "express";
import cors from "cors";
import { expressMiddleware } from "@as-integrations/express4";
import jwt from "jsonwebtoken";
import { apolloServer, type Context } from "./graphql/index.js";
import { prisma } from "./config/db.js";
import { ENV } from "./config/env.js";
import { chartSnapshotsRouter } from "./routes/chartSnapshots.js";

const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
  ...ENV.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use("/chart-snapshots", express.static("storage/chart-snapshots"));
app.use(chartSnapshotsRouter);

export async function buildApp() {
  await apolloServer.start();

  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<Context> => {
        const authHeader = req.headers.authorization;
        let user: Context["user"] = null;
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.slice(7);
          try {
            user = jwt.verify(token, String(ENV.JWT_SECRET)) as Context["user"];
          } catch {}
        }
        return { user, prisma };
      },
    }),
  );

  app.get("/", (_req, res) => {
    res.send("Crypto Trading Simulator — GraphQL at /graphql");
  });

  return app;
}

export default app;
