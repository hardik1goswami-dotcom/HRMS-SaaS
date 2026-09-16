import { createDbClient } from "../db/client";
import type { AuthUser } from "../auth/middleware";

type EmployeeInput = {
  userId?: string | null;
  employeeCode?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  dateOfJoining?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  employmentStatus?: string;
};

async function validateOrganizationReferences(
  client: any,
  input: EmployeeInput,
  organizationId: string
) {
  if (input.userId) {
    const userResult = await client.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
      `,
      [input.userId, organizationId]
    );

    if (userResult.rows.length === 0) {
      return "User does not belong to this organization";
    }
  }

  if (input.departmentId) {
    const departmentResult = await client.query(
      `
      SELECT id
      FROM departments
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
      `,
      [input.departmentId, organizationId]
    );

    if (departmentResult.rows.length === 0) {
      return "Department does not belong to this organization";
    }
  }

  if (input.designationId) {
    const designationResult = await client.query(
      `
      SELECT id
      FROM designations
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
      `,
      [input.designationId, organizationId]
    );

    if (designationResult.rows.length === 0) {
      return "Designation does not belong to this organization";
    }
  }

  return null;
}

export async function getEmployees(
  user: AuthUser,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT
        e.id,
        e.organization_id,
        e.user_id,
        e.employee_code,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.email,
        e.phone,
        e.department_id,
        d.name AS department_name,
        e.designation_id,
        dg.name AS designation_name,
        e.date_of_joining,
        e.date_of_birth,
        e.gender,
        e.address,
        e.employment_status,
        e.created_at,
        e.updated_at
      FROM employees e
      LEFT JOIN departments d
        ON d.id = e.department_id
      LEFT JOIN designations dg
        ON dg.id = e.designation_id
      WHERE e.organization_id = $1
      ORDER BY e.first_name ASC, e.last_name ASC
      `,
      [user.organizationId]
    );

    return {
      success: true,
      employees: result.rows,
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function getEmployeeById(
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
        e.id,
        e.organization_id,
        e.user_id,
        e.employee_code,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.email,
        e.phone,
        e.department_id,
        d.name AS department_name,
        e.designation_id,
        dg.name AS designation_name,
        e.date_of_joining,
        e.date_of_birth,
        e.gender,
        e.address,
        e.employment_status,
        e.created_at,
        e.updated_at
      FROM employees e
      LEFT JOIN departments d
        ON d.id = e.department_id
      LEFT JOIN designations dg
        ON dg.id = e.designation_id
      WHERE e.id = $1
        AND e.organization_id = $2
      LIMIT 1
      `,
      [id, user.organizationId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Employee not found",
      };
    }

    return {
      success: true,
      employee: result.rows[0],
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function createEmployee(
  input: EmployeeInput,
  user: AuthUser,
  env: CloudflareBindings
) {
  if (!input.employeeCode?.trim()) {
    return {
      success: false,
      message: "Employee code is required",
    };
  }

  if (!input.firstName?.trim()) {
    return {
      success: false,
      message: "First name is required",
    };
  }

  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const referenceError = await validateOrganizationReferences(
      client,
      input,
      user.organizationId
    );

    if (referenceError) {
      return {
        success: false,
        message: referenceError,
      };
    }

    const result = await client.query(
      `
      INSERT INTO employees (
        organization_id,
        user_id,
        employee_code,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        department_id,
        designation_id,
        date_of_joining,
        date_of_birth,
        gender,
        address,
        employment_status
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      RETURNING
        id,
        organization_id,
        user_id,
        employee_code,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        department_id,
        designation_id,
        date_of_joining,
        date_of_birth,
        gender,
        address,
        employment_status,
        created_at,
        updated_at
      `,
      [
        user.organizationId,
        input.userId ?? null,
        input.employeeCode.trim(),
        input.firstName.trim(),
        input.middleName?.trim() || null,
        input.lastName?.trim() || null,
        input.email?.trim() || null,
        input.phone?.trim() || null,
        input.departmentId ?? null,
        input.designationId ?? null,
        input.dateOfJoining ?? null,
        input.dateOfBirth ?? null,
        input.gender?.trim() || null,
        input.address ?? null,
        input.employmentStatus?.trim() || "active",
      ]
    );

    return {
      success: true,
      message: "Employee created successfully",
      employee: result.rows[0],
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        success: false,
        message: "Employee code already exists in this organization",
      };
    }

    throw error;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput,
  user: AuthUser,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const referenceError = await validateOrganizationReferences(
      client,
      input,
      user.organizationId
    );

    if (referenceError) {
      return {
        success: false,
        message: referenceError,
      };
    }

    const result = await client.query(
      `
      UPDATE employees
      SET
        user_id = COALESCE($1, user_id),
        employee_code = COALESCE($2, employee_code),
        first_name = COALESCE($3, first_name),
        middle_name = COALESCE($4, middle_name),
        last_name = COALESCE($5, last_name),
        email = COALESCE($6, email),
        phone = COALESCE($7, phone),
        department_id = COALESCE($8, department_id),
        designation_id = COALESCE($9, designation_id),
        date_of_joining = COALESCE($10, date_of_joining),
        date_of_birth = COALESCE($11, date_of_birth),
        gender = COALESCE($12, gender),
        address = COALESCE($13, address),
        employment_status = COALESCE($14, employment_status),
        updated_at = now()
      WHERE id = $15
        AND organization_id = $16
      RETURNING
        id,
        organization_id,
        user_id,
        employee_code,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        department_id,
        designation_id,
        date_of_joining,
        date_of_birth,
        gender,
        address,
        employment_status,
        created_at,
        updated_at
      `,
      [
        input.userId,
        input.employeeCode?.trim() || null,
        input.firstName?.trim() || null,
        input.middleName?.trim() || null,
        input.lastName?.trim() || null,
        input.email?.trim() || null,
        input.phone?.trim() || null,
        input.departmentId,
        input.designationId,
        input.dateOfJoining,
        input.dateOfBirth,
        input.gender?.trim() || null,
        input.address,
        input.employmentStatus?.trim() || null,
        id,
        user.organizationId,
      ]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Employee not found",
      };
    }

    return {
      success: true,
      message: "Employee updated successfully",
      employee: result.rows[0],
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        success: false,
        message: "Employee code already exists in this organization",
      };
    }

    throw error;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function deleteEmployee(
  id: string,
  user: AuthUser,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      DELETE FROM employees
      WHERE id = $1
        AND organization_id = $2
      RETURNING id, employee_code, first_name, last_name
      `,
      [id, user.organizationId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Employee not found",
      };
    }

    return {
      success: true,
      message: "Employee deleted successfully",
      employee: result.rows[0],
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}