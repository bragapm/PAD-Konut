import sql from "../db.mjs";

export default async (tableName, data) => {
  await sql`INSERT INTO ${sql(tableName)} ${sql(data)}`;
};
