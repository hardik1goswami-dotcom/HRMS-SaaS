import { createDbClient } from "../db/client";
import type { AuthUser } from "../auth/middleware";

type DepartmentInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

export async function getDepartments(
  user: AuthUser,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT
        id,
        organization_id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM departments
      WHERE organization_id = $1
      ORDER BY name ASC
      `,
      [user.organizationId]
    );

    return {
      success: true,
      departments: result.rows,
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function getDepartmentById(
  id: string,
  user: AuthUser,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT
        id,
        organization_id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM departments
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
      `,
      [id, user.organizationId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Department not found",
      };
    }

    return {
      success: true,
      department: result.rows[0],
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function createDepartment(
  input: DepartmentInput,
  user: AuthUser,
  env: CloudflareBindings
) {
  const name = input.name?.trim();

  if (!name) {
    return {
      success: false,
      message: "Department name is required",
    };
  }

  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      INSERT INTO departments (
        organization_id,
        name,
        description,
        is_active
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        organization_id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      `,
      [
        user.organizationId,
        name,
        input.description ?? null,
        input.isActive ?? true,
      ]
    );

    return {
      success: true,
      message: "Department created successfully",
      department: result.rows[0],
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        success: false,
        message: "Department with this name already exists",
      };
    }

    throw error;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function updateDepartment(
  id: string,
  input: DepartmentInput,
  user: AuthUser,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      UPDATE departments
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = now()
      WHERE id = $4
        AND organization_id = $5
      RETURNING
        id,
        organization_id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      `,
      [
        input.name?.trim() || null,
        input.description,
        input.isActive,
        id,
        user.organizationId,
      ]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Department not found",
      };
    }

    return {
      success: true,
      message: "Department updated successfully",
      department: result.rows[0],
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        success: false,
        message: "Department with this name already exists",
      };
    }

    throw error;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function deleteDepartment(
  id: string,
  user: AuthUser,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      DELETE FROM departments
      WHERE id = $1
        AND organization_id = $2
      RETURNING id, name
      `,
      [id, user.organizationId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Department not found",
      };
    }

    return {
      success: true,
      message: "Department deleted successfully",
      department: result.rows[0],
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}