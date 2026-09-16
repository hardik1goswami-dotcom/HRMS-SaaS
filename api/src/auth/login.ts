import { createDbClient } from "../db/client";
import { createToken } from "./jwt";
import bcrypt from "bcryptjs";

export async function login(
  email: string,
  password: string,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT
        u.id,
        u.organization_id,
        u.email,
        u.password_hash,
        u.is_active,
        r.name AS role
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return {
        success: false,
        message: "User account is inactive",
      };
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    const token = await createToken(
      {
        userId: user.id,
        organizationId: user.organization_id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET
    );

    return {
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        organizationId: user.organization_id,
        email: user.email,
        role: user.role,
      },
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}