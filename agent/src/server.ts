import express, { Request, Response } from "express";
import cors from "cors";

import agentRoutes from "./routes/agent";

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: "*",
  })
);

app.use(express.json());

app.use("/api/agent", agentRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
