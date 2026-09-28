import { Hono } from "hono";

const app = new Hono().basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));

export default app satisfies ExportedHandler;
