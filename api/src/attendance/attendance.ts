import { createDbClient } from "../db/client";

export async function getAttendance(
  organizationId: string,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT
        a.id,
        a.organization_id,
        a.employee_id,
        e.employee_code,
        e.first_name,
        e.middle_name,
        e.last_name,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.status,
        a.remarks,
        a.created_at,
        a.updated_at
      FROM attendance a
      INNER JOIN employees e ON e.id = a.employee_id
      WHERE a.organization_id = $1
      ORDER BY a.attendance_date DESC, e.first_name ASC
      `,
      [organizationId]
    );

    return {
      success: true,
      attendance: result.rows,
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function getAttendanceById(
  id: string,
  organizationId: string,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT
        a.id,
        a.organization_id,
        a.employee_id,
        e.employee_code,
        e.first_name,
        e.middle_name,
        e.last_name,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.status,
        a.remarks,
        a.created_at,
        a.updated_at
      FROM attendance a
      INNER JOIN employees e ON e.id = a.employee_id
      WHERE a.id = $1
        AND a.organization_id = $2
      LIMIT 1
      `,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Attendance record not found",
      };
    }

    return {
      success: true,
      attendance: result.rows[0],
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function createAttendance(
  organizationId: string,
  employeeId: string,
  attendanceDate: string,
  checkIn: string | null,
  checkOut: string | null,
  status: string,
  remarks: string | null,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const employee = await client.query(
      `
      SELECT id
      FROM employees
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
      `,
      [employeeId, organizationId]
    );

    if (employee.rows.length === 0) {
      return {
        success: false,
        message: "Employee not found",
      };
    }

    const result = await client.query(
      `
      INSERT INTO attendance (
        organization_id,
        employee_id,
        attendance_date,
        check_in,
        check_out,
        status,
        remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        organization_id,
        employee_id,
        attendance_date,
        check_in,
        check_out,
        status,
        remarks,
        created_at,
        updated_at
      `,
      [
        organizationId,
        employeeId,
        attendanceDate,
        checkIn,
        checkOut,
        status,
        remarks,
      ]
    );

    return {
      success: true,
      message: "Attendance created successfully",
      attendance: result.rows[0],
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        success: false,
        message: "Attendance already exists for this employee and date",
      };
    }

    throw error;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function updateAttendance(
  id: string,
  organizationId: string,
  checkIn: string | null,
  checkOut: string | null,
  status: string,
  remarks: string | null,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      UPDATE attendance
      SET
        check_in = $1,
        check_out = $2,
        status = $3,
        remarks = $4,
        updated_at = now()
      WHERE id = $5
        AND organization_id = $6
      RETURNING
        id,
        organization_id,
        employee_id,
        attendance_date,
        check_in,
        check_out,
        status,
        remarks,
        created_at,
        updated_at
      `,
      [
        checkIn,
        checkOut,
        status,
        remarks,
        id,
        organizationId,
      ]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Attendance record not found",
      };
    }

    return {
      success: true,
      message: "Attendance updated successfully",
      attendance: result.rows[0],
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

export async function deleteAttendance(
  id: string,
  organizationId: string,
  env: CloudflareBindings
) {
  const client = createDbClient(env.HYPERDRIVE.connectionString);

  try {
    await client.connect();

    const result = await client.query(
      `
      DELETE FROM attendance
      WHERE id = $1
        AND organization_id = $2
      RETURNING
        id,
        employee_id,
        attendance_date,
        status
      `,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Attendance record not found",
      };
    }

    return {
      success: true,
      message: "Attendance deleted successfully",
      attendance: result.rows[0],
    };
  } finally {
    try {
      await client.end();
    } catch {}
  }
}