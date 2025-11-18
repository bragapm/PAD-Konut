export async function up(knex) {
  await knex.raw(`CREATE FUNCTION handle_sidx_qgis_create() RETURNS event_trigger LANGUAGE plpgsql AS $$
DECLARE
  obj record;
  new_idx_ident text[];
  new_table_name text;
  new_table_geom_type text;
  new_table_bounds json;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    IF obj.schema_name = 'public' THEN
      new_idx_ident := parse_ident(obj.object_identity);
      IF starts_with(new_idx_ident[2], 'sidx_qgis_') THEN
        SELECT pg_class.relname::text INTO new_table_name FROM pg_catalog.pg_index INNER JOIN pg_catalog.pg_class ON oid = indrelid WHERE indexrelid = obj.objid;
        SELECT type INTO new_table_geom_type FROM geometry_columns WHERE f_table_schema = 'public' AND f_table_name = new_table_name AND f_geometry_column = 'geom';
        EXECUTE format('SELECT ST_AsGeoJSON(ST_Extent(geom), 6)::json FROM %I', new_table_name) INTO new_table_bounds;
        INSERT INTO vector_tiles(layer_id, layer_name, geometry_type, bounds) VALUES (gen_random_uuid(), new_table_name, new_table_geom_type, new_table_bounds);
        PERFORM graphile_worker.add_job('clearDirectusCache');
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE EVENT TRIGGER on_sidx_qgis_create ON ddl_command_end WHEN TAG IN ('CREATE INDEX')
EXECUTE FUNCTION handle_sidx_qgis_create();`)
}

export async function down(knex) {
  await knex.raw(`DROP EVENT TRIGGER on_sidx_qgis_create;
DROP FUNCTION handle_sidx_qgis_create;`)
}
