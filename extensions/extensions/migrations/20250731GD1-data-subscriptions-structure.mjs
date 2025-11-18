export async function up(knex) {
  await knex.raw(`CREATE TABLE IF NOT EXISTS data_subscriptions (
  subscription_id uuid NOT NULL,
  user_created uuid NULL,
  date_created timestamptz NULL,
  protocol varchar(255) NOT NULL,
  url text NOT NULL,
  username text NULL,
  "password" text NULL,
  topics json NOT NULL,
  CONSTRAINT data_subscriptions_pkey PRIMARY KEY (subscription_id),
  CONSTRAINT data_subscriptions_user_created_foreign FOREIGN KEY (user_created) REFERENCES directus_users(id)
);

INSERT INTO directus_collections (collection,icon,hidden,singleton,archive_app_filter,accountability,sort,collapse,"versioning")
  VALUES('data_subscriptions','rss_feed',false,false,true,'all',NULL,'open',false);

INSERT INTO directus_fields (collection, field, special, interface, "options", display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message) VALUES
  ('data_subscriptions', 'topics', 'cast-json', 'list', '{"template":"{{ topic }} - {{ tableName }} - {{ active }}","fields":[{"field":"topic","name":"topic","type":"string","meta":{"field":"topic","width":"half","type":"string","required":true,"interface":"input","options":{"trim":true}}},{"field":"active","name":"active","type":"boolean","meta":{"field":"active","width":"half","type":"boolean","required":true,"interface":"boolean"}},{"field":"tableName","name":"tableName","type":"string","meta":{"field":"tableName","type":"string","required":true,"note":"Lowercase alphabet, numeric, and underscore only","interface":"input","options":{"trim":true}}},{"field":"tableColumns","name":"tableColumns","type":"json","meta":{"field":"tableColumns","type":"json","required":true,"note":"This field will only be used when creating a new table. Editing this field after the table is created will not affect the aforementioned table.","interface":"list","options":{"template":"{{ name }} - {{ type }}","fields":[{"field":"name","name":"name","type":"string","meta":{"field":"name","width":"half","type":"string","required":true,"note":"Lowercase alphabet, numeric, and underscore only","interface":"input","options":{"trim":true}}},{"field":"type","name":"type","type":"string","meta":{"field":"type","width":"half","type":"string","required":true,"interface":"select-dropdown","options":{"choices":[{"text":"varchar","value":"varchar"},{"text":"integer","value":"integer"},{"text":"float","value":"float"},{"text":"timestamptz","value":"timestamptz"}]}}}]}}},{"field":"transformScript","name":"transformScript","type":"text","meta":{"field":"transformScript","type":"text","required":true,"interface":"input-code","options":{"language":"javascript","template":"// Parsed data available in \\"data\\" variable as string\\n// Transform by changing \\"data\\" variable into object with column name as its keys\\n\\n// Here are sample script if data is in csv format\\n\\nconst arr = data.split(\\",\\");\\n\\ndata = {\\n  string_column: arr[0],\\n  integer_column: parseInt(arr[1]),\\n  float_column: parseFloat(arr[2]),\\n  timestamp_column: new Date(arr[3]),\\n};"}}}]}'::json, NULL, NULL, false, false, 5, 'full', NULL, NULL, NULL, true, NULL, NULL, NULL),
  ('data_subscriptions', 'auth_configuration', NULL, NULL, NULL, NULL, NULL, false, false, 7, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('data_subscriptions', 'password', NULL, 'input', '{"masked":true}'::json, NULL, NULL, false, false, 2, 'full', NULL, NULL, NULL, false, 'auth', NULL, NULL),
  ('data_subscriptions', 'protocol', NULL, 'select-dropdown', '{"choices":[{"text":"MQTT","value":"mqtt"}]}'::json, NULL, NULL, false, false, 1, 'full', NULL, NULL, NULL, true, 'connection', NULL, NULL),
  ('data_subscriptions', 'subscription_id', 'uuid', 'input', NULL, NULL, NULL, true, true, 1, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('data_subscriptions', 'url', NULL, 'input', NULL, NULL, NULL, false, false, 2, 'full', NULL, NULL, '[{"name":"MQTT placeholder","rule":{"_and":[{"protocol":{"_eq":"mqtt"}}]},"options":{"font":"sans-serif","trim":true,"masked":false,"clear":false,"slug":false,"placeholder":"mqtt://mqttserver.example.com"}}]'::json, true, 'connection', NULL, NULL),
  ('data_subscriptions', 'user_created', 'user-created', 'select-dropdown-m2o', '{"template":"{{avatar.$thumbnail}} {{first_name}} {{last_name}}"}'::json, 'user', NULL, true, true, 2, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('data_subscriptions', 'auth', 'alias,no-data,group', 'group-detail', NULL, NULL, NULL, false, false, 3, 'full', NULL, NULL, NULL, false, 'connection', NULL, NULL),
  ('data_subscriptions', 'date_created', 'date-created', 'datetime', NULL, 'datetime', '{"relative":true}'::json, true, true, 3, 'half', NULL, NULL, NULL, false, NULL, NULL, NULL),
  ('data_subscriptions', 'username', NULL, 'input', NULL, NULL, NULL, false, false, 1, 'full', NULL, NULL, NULL, false, 'auth', NULL, NULL),
  ('data_subscriptions', 'connection', 'alias,no-data,group', 'group-detail', NULL, NULL, NULL, false, false, 4, 'full', NULL, NULL, NULL, false, NULL, NULL, NULL);

INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
  VALUES('data_subscriptions', 'user_created', 'directus_users', NULL, NULL, NULL, NULL, NULL, 'nullify');`);
}

export async function down(knex) {
  await knex.raw(`DELETE FROM directus_relations WHERE many_collection = 'data_subscriptions';
DELETE FROM directus_fields WHERE collection = 'data_subscriptions';
DELETE FROM directus_collections WHERE collection = 'data_subscriptions';
DROP TABLE IF EXISTS data_subscriptions;`);
}
