import sql from "../db.mjs";

export default async (tableName, tableColumns) => {
  const columnsTypes = [];
  for (let i = 0; i < tableColumns.length - 1; i++) {
    const el = tableColumns[i];
    columnsTypes.push(sql`${sql(el.name)} ${sql.unsafe(el.type)},`);
  }
  const lastEl = tableColumns[tableColumns.length - 1];
  columnsTypes.push(sql`${sql(lastEl.name)} ${sql.unsafe(lastEl.type)}`);

  await sql`
CREATE TABLE IF NOT EXISTS ${sql(tableName)} (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  date_created timestamptz DEFAULT CURRENT_TIMESTAMP,
  ${columnsTypes}
)`;
};
