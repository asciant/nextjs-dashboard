import * as schema from "./schema";
// import { drizzle } from "drizzle-orm/libsql";
// import { createClient } from "@libsql/client";

// const client = createClient({
//   url: `${process.env.TURSO_DATABASE_URL}`,
//   authToken: `${process.env.TURSO_AUTH_TOKEN}`,
// });

// export const db = drizzle(client, { schema });

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

const sqlite = new Database("dev.db");
export const db = drizzle(sqlite, { schema });
