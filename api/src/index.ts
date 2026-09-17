import { Hono } from "hono";
import { createDbClient } from "./db/client";
import { login } from "./auth/login";
import bcrypt from "bcryptjs";
import { authMiddleware } from "./auth/middleware";


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

app.post("/dev/reset-admin-password", async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
    }>();

    if (!body.email || !body.password) {
      return c.json(
        {
          success: false,
          message: "Email and password are required",
        },
        400
      );
    }

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(body.password, 10);

    const client = createDbClient(c.env.HYPERDRIVE.connectionString);

    try {
      await client.connect();

      const result = await client.query(
        `
        UPDATE users
        SET password_hash = $1
        WHERE LOWER(email) = LOWER($2)
        RETURNING id, email, is_active
        `,
        [passwordHash, body.email]
      );

      if (result.rows.length === 0) {
        return c.json(
          {
            success: false,
            message: "User not found",
          },
          404
        );
      }

      return c.json({
        success: true,
        message: "Admin password reset successfully",
        user: result.rows[0],
      });
    } finally {
      try {
        await client.end();
      } catch {}
    }
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Password reset failed",
      },
      500
    );
  }
});

app.post("/auth/login", async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
    }>();

    if (!body.email || !body.password) {
      return c.json(
        {
          success: false,
          message: "Email and password are required",
        },
        400
      );
    }

    const result = await login(
      body.email,
      body.password,
      c.env
    );

    return c.json(result, result.success ? 200 : 401);
  } catch (error) {
    console.error(error);

    return c.json(
      {
        success: false,
        message: "Login failed",
      },
      500
    );
  }
});

app.get("/auth/me", authMiddleware, (c) => {
  const user = c.get("user");

  return c.json({
    success: true,
    message: "Authenticated user retrieved successfully",
    user,
  });
});

app.get("/auth/me", authMiddleware, async (c) => {
  const user = c.get("user");

  return c.json({
    success: true,
    message: "Authenticated user",
    user,
  });
});
export default app;
