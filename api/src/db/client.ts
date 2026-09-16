import { Client } from "pg";

export function createDbClient(connectionString: string) {
  return new Client({
    connectionString,
  });
}
