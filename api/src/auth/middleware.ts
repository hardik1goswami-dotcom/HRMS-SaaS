import { createMiddleware } from "hono/factory";
import { verifyToken } from "./jwt";

export type AuthUser = {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
};

export const authMiddleware = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: {
    user: AuthUser;
  };
}>(async (c, next) => {
  const authorization = c.req.header("Authorization");

  if (!authorization) {
    return c.json(
      {
        success: false,
        message: "Authorization header is required",
      },
      401
    );
  }

  if (!authorization.startsWith("Bearer ")) {
    return c.json(
      {
        success: false,
        message: "Invalid authorization format",
      },
      401
    );
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return c.json(
      {
        success: false,
        message: "Bearer token is required",
      },
      401
    );
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json(
      {
        success: false,
        message: "Invalid or expired token",
      },
      401
    );
  }

  if (
    typeof payload.userId !== "string" ||
    typeof payload.organizationId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.role !== "string"
  ) {
    return c.json(
      {
        success: false,
        message: "Invalid token payload",
      },
      401
    );
  }

  c.set("user", {
    userId: payload.userId,
    organizationId: payload.organizationId,
    email: payload.email,
    role: payload.role,
  });

  await next();
});