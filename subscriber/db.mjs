import postgres from "postgres";

const sql = postgres(process.env.DB_CONNECTION_STRING, { onnotice: () => {} });

export default sql;
