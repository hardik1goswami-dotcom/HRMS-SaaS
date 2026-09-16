import { Hono } from "hono";
import { createDbClient } from "./db/client";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.json({
    success: true,
    message: "HRMS API is running",
  });
});

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

app.get("/db-test", async (c) => {
  const client = createDbClient(c.env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      "SELECT current_database() AS database, current_user AS user"
    );

    await client.end();

    return c.json({
      success: true,
      message: "PostgreSQL connection successful",
      database: result.rows[0].database,
      user: result.rows[0].user,
    });
  } catch (error) {
    console.error(error);

    try {
      await client.end();
    } catch {}

    return c.json(
      {
        success: false,
        message: "PostgreSQL connection failed",
      },
      500
    );
  }
});
app.get("/db-schema-test", async (c) => {
  const client = createDbClient(c.env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    await client.end();

    return c.json({
      success: true,
      message: "HRMS database schema verified",
      tables: result.rows.map((row) => row.table_name),
    });
  } catch (error) {
    console.error(error);

    try {
      await client.end();
    } catch {}

    return c.json(
      {
        success: false,
        message: "HRMS database schema verification failed",
      },
      500
    );
  }
});
export default app;
