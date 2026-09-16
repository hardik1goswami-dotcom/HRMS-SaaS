import { createMiddleware } from "hono/factory";
import type { AuthUser } from "./middleware";

export function roleMiddleware(...allowedRoles: string[]) {
  return createMiddleware<{
    Bindings: CloudflareBindings;
    Variables: {
      user: AuthUser;
    };
  }>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        {
          success: false,
          message: "Authentication required",
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          message: "Access denied",
        },
        403
      );
    }

    await next();
  });
}