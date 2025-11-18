import { LAYER_EXPORTS_FOLDER_ID } from "./const/FOLDER_IDS.mjs";

export async function up(knex) {
  await knex("directus_folders")
    .insert({ id: LAYER_EXPORTS_FOLDER_ID, name: "Layer Exports" })
    .onConflict("id")
    .ignore();
}

export async function down(knex) {
  await knex("directus_folders").where("id", LAYER_EXPORTS_FOLDER_ID).del();
}
