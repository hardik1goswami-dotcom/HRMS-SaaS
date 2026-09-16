import { createDbClient } from "../db/client";

export async function getLeaveTypes(
  organizationId: string,
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
        days_allowed,
        is_active,
        created_at,
        updated_at
      FROM leave_types
      WHERE organization_id = $1
      ORDER BY name ASC
      `,
      [organizationId]
    );

    return result.rows;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function getLeaveTypeById(
  organizationId: string,
  id: string,
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
        days_allowed,
        is_active,
        created_at,
        updated_at
      FROM leave_types
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
      `,
      [id, organizationId]
    );

    return result.rows[0] ?? null;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function createLeaveType(
  organizationId: string,
  data: {
    name: string;
    description?: string;
    daysAllowed?: number;
  },
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      INSERT INTO leave_types (
        organization_id,
        name,
        description,
        days_allowed
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        organization_id,
        name,
        description,
        days_allowed,
        is_active,
        created_at,
        updated_at
      `,
      [
        organizationId,
        data.name,
        data.description ?? null,
        data.daysAllowed ?? 0,
      ]
    );

    return result.rows[0];
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function updateLeaveType(
  organizationId: string,
  id: string,
  data: {
    name?: string;
    description?: string;
    daysAllowed?: number;
    isActive?: boolean;
  },
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      UPDATE leave_types
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        days_allowed = COALESCE($3, days_allowed),
        is_active = COALESCE($4, is_active),
        updated_at = now()
      WHERE id = $5
        AND organization_id = $6
      RETURNING
        id,
        organization_id,
        name,
        description,
        days_allowed,
        is_active,
        created_at,
        updated_at
      `,
      [
        data.name ?? null,
        data.description ?? null,
        data.daysAllowed ?? null,
        data.isActive ?? null,
        id,
        organizationId,
      ]
    );

    return result.rows[0] ?? null;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function deleteLeaveType(
  organizationId: string,
  id: string,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      DELETE FROM leave_types
      WHERE id = $1
        AND organization_id = $2
      RETURNING id, name
      `,
      [id, organizationId]
    );

    return result.rows[0] ?? null;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
