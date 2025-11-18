import {
  LAYER_DATA_FOLDER_ID,
  LAYER_PREVIEWS_FOLDER_ID,
  PUBLIC_FOLDER_ID,
} from "./const/FOLDER_IDS.mjs";

export async function up(knex) {
  await knex.raw(`CREATE TABLE IF NOT EXISTS external_vector (
  layer_id uuid NOT NULL,
  user_created uuid NULL,
  date_created timestamptz NULL,
  user_updated uuid NULL,
  date_updated timestamptz NULL,
  endpoint text NOT NULL,
  layer_alias varchar(255) DEFAULT NULL::character varying NOT NULL,
  format varchar(255) DEFAULT 'json'::character varying NOT NULL,
  "options" json NULL,
  transform_script text NULL,
  bounds json NULL,
  preview uuid NULL,
  description text NULL,
  category uuid NULL,
  hover_popup_columns text NULL,
  click_popup_columns text NULL,
  image_columns text NULL,
  feature_detail_template text NULL,
  feature_detail_attachments json NULL,
  listed bool DEFAULT false NOT NULL,
  active bool DEFAULT false NULL,
  cache_duration int4 DEFAULT 0 NOT NULL,
  permission_type varchar(255) DEFAULT 'admin'::character varying NOT NULL,
  fill_style int4 NULL,
  line_style int4 NULL,
  circle_style int4 NULL,
  symbol_style int4 NULL,
  CONSTRAINT external_vector_pkey PRIMARY KEY (layer_id),
  CONSTRAINT external_vector_category_foreign FOREIGN KEY (category) REFERENCES categories(category_id) ON DELETE SET NULL,
  CONSTRAINT external_vector_circle_style_foreign FOREIGN KEY (circle_style) REFERENCES circle(id) ON DELETE SET NULL,
  CONSTRAINT external_vector_fill_style_foreign FOREIGN KEY (fill_style) REFERENCES fill(id) ON DELETE SET NULL,
  CONSTRAINT external_vector_line_style_foreign FOREIGN KEY (line_style) REFERENCES line(id) ON DELETE SET NULL,
  CONSTRAINT external_vector_preview_foreign FOREIGN KEY (preview) REFERENCES directus_files(id) ON DELETE SET NULL,
  CONSTRAINT external_vector_symbol_style_foreign FOREIGN KEY (symbol_style) REFERENCES symbol(id) ON DELETE SET NULL,
  CONSTRAINT external_vector_user_created_foreign FOREIGN KEY (user_created) REFERENCES directus_users(id),
  CONSTRAINT external_vector_user_updated_foreign FOREIGN KEY (user_updated) REFERENCES directus_users(id)
);

CREATE TABLE IF NOT EXISTS external_vector_directus_roles (
  id serial4 NOT NULL,
  external_vector_layer_id uuid NULL,
  directus_roles_id uuid NULL,
  CONSTRAINT external_vector_directus_roles_pkey PRIMARY KEY (id),
  CONSTRAINT external_vector_directus_roles_directus_roles_id_foreign FOREIGN KEY (directus_roles_id) REFERENCES directus_roles(id) ON DELETE CASCADE,
  CONSTRAINT external_vector_directus_roles_external_vector_layer_id_foreign FOREIGN KEY (external_vector_layer_id) REFERENCES external_vector(layer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS external_vector_cache (
  layer_id uuid NOT NULL,
  value text NULL,
  expired_at timestamptz NULL,
  CONSTRAINT external_vector_cache_pkey PRIMARY KEY (layer_id),
  CONSTRAINT external_vector_cache_layer_id_foreign FOREIGN KEY (layer_id) REFERENCES external_vector(layer_id) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO directus_collections (collection,icon,note,display_template,hidden,singleton,translations,archive_field,archive_app_filter,archive_value,unarchive_value,sort_field,accountability,color,item_duplication_fields,sort,"group",collapse,preview_url,"versioning") VALUES
  ('external_vector','code',NULL,NULL,false,false,NULL,NULL,true,NULL,NULL,NULL,'all','#FFA439',NULL,NULL,'layer_configuration','open',NULL,false),
  ('external_vector_directus_roles','import_export',NULL,NULL,true,false,NULL,NULL,true,NULL,NULL,NULL,'all',NULL,NULL,NULL,'external_vector','open',NULL,false),
  ('external_vector_cache','cached',NULL,NULL,false,false,NULL,NULL,true,NULL,NULL,NULL,'all','#E35169',NULL,NULL,'internal','open',NULL,false);

INSERT INTO directus_fields (collection,field,special,interface,"options",display,display_options,readonly,hidden,sort,width,translations,note,conditions,required,"group",validation,validation_message) VALUES
  ('external_vector','layer_id','uuid','input',NULL,NULL,NULL,true,true,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','user_created','user-created','select-dropdown-m2o','{"template":"{{avatar.$thumbnail}} {{first_name}} {{last_name}}"}','user',NULL,true,true,NULL,'half',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','date_created','date-created','datetime',NULL,'datetime','{"relative":true}',true,true,NULL,'half',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','user_updated','user-updated','select-dropdown-m2o','{"template":"{{avatar.$thumbnail}} {{first_name}} {{last_name}}"}','user',NULL,true,true,NULL,'half',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','date_updated','date-updated','datetime',NULL,'datetime','{"relative":true}',true,true,NULL,'half',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','endpoint',NULL,'input-multiline',NULL,NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,true,NULL,NULL,NULL),
  ('external_vector','layer_alias',NULL,'input',NULL,NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,true,NULL,NULL,NULL),
  ('external_vector','format',NULL,'select-dropdown','{"choices":[{"text":"JSON","value":"json"},{"text":"XML","value":"xml"}]}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,true,NULL,NULL,NULL),
  ('external_vector','options','cast-json','input-code','{"template":"{\\n  \\"__http_opts_comment__delete_me__\\": \\"(This is a comment key. Please delete this key) Options for HTTP or HTTPS will be passed to fetch options. Only listed keys below will be passed to the function\\",\\n  \\"method\\": \\"POST\\",\\n  \\"headers\\": {\\n    \\"Content-Type\\": \\"application/json\\",\\n    \\"Authorization\\": \\"Bearer token\\"\\n  },\\n  \\"body\\": { \\"foo\\": \\"bar\\" },\\n  \\"__ftp_opts_comment__delete_me__\\": \\"(This is a comment key. Please delete this key) Options for FTP will be passed to FTP client access function. Only listed keys below will be passed to the function\\",\\n  \\"user\\": \\"user\\",\\n  \\"password\\": \\"password\\",\\n  \\"secure\\": true\\n}"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','transform_script',NULL,'input-code','{"language":"javascript","template":"// Parsed data available in \\"data\\" variable\\n// Transform by changing \\"data\\" variable\\n\\n// Here are sample script if data is an array of object with lon, lat keys\\n\\nconst featColl = { type: \\"FeatureCollection\\", features: [] };\\n\\nfor (const el of data) {\\n  const feat = {\\n    type: \\"Feature\\",\\n    geometry: {\\n      type: \\"Point\\",\\n      coordinates: [parseFloat(el.lon), parseFloat(el.lat)],\\n    },\\n  };\\n  delete el.lon;\\n  delete el.lat;\\n  feat.properties = el;\\n  featColl.features.push(feat);\\n}\\n\\ndata = featColl;"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','bounds',NULL,'map','{"defaultView":{"center":{"lng":119.95319092402065,"lat":-2.0757454842110974},"zoom":2.57741890603647,"bearing":0,"pitch":0},"geometryType":"Polygon"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','preview','file','file-image','{"folder":"${LAYER_PREVIEWS_FOLDER_ID}"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','description',NULL,'input-multiline',NULL,NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','category','m2o','select-dropdown-m2o',NULL,NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','hover_popup_columns','cast-csv','tags','{"allowOther":true}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','click_popup_columns','cast-csv','tags','{"allowOther":true}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','image_columns','cast-csv','tags','{"allowOther":true}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','feature_detail_template',NULL,'input-rich-text-md','{"folder":"${PUBLIC_FOLDER_ID}"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','feature_detail_attachments','cast-json','list','{"fields":[{"field":"title","name":"title","type":"string","meta":{"field":"title","width":"half","type":"string","required":true,"interface":"input"}},{"field":"description","name":"description","type":"string","meta":{"field":"description","width":"half","type":"string","required":true,"interface":"input"}},{"field":"url_column","name":"url_column","type":"string","meta":{"field":"url_column","width":"half","type":"string","required":true,"note":"Column which will be used as attachment URL source","interface":"input"}},{"field":"icon","name":"icon","type":"string","meta":{"field":"icon","width":"half","type":"string","required":true,"interface":"select-dropdown","options":{"choices":[{"text":"Link","value":"link"},{"text":"Form","value":"form"}]}}}]}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','listed','cast-boolean','boolean',NULL,NULL,NULL,false,false,NULL,'half',NULL,NULL,NULL,true,NULL,NULL,NULL),
  ('external_vector','active','cast-boolean','boolean',NULL,NULL,NULL,false,false,NULL,'half',NULL,NULL,NULL,true,NULL,NULL,NULL),
  ('external_vector','cache_duration',NULL,'input','{"min":0}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,true,NULL,NULL,NULL),
  ('external_vector','permission_type',NULL,'select-dropdown','{"choices":[{"text":"Admin Only","value":"admin"},{"text":"Selected Roles","value":"roles"},{"text":"Selected Roles + Public","value":"roles+public"}]}',NULL,NULL,false,false,NULL,'half',NULL,NULL,NULL,true,NULL,NULL,NULL),
  ('external_vector','allowed_roles','m2m','list-m2m','{"filter":{"_and":[{"admin_access":{"_eq":false}}]},"enableCreate":false,"template":"{{directus_roles_id.name}}"}',NULL,NULL,false,false,NULL,'half',NULL,NULL,'[{"name":"Hide if permission type is admin","rule":{"_and":[{"permission_type":{"_eq":"admin"}}]},"hidden":true,"options":{"layout":"list","enableCreate":false,"enableSelect":true,"limit":15,"junctionFieldLocation":"bottom","allowDuplicates":false,"enableSearchFilter":false,"enableLink":false}},{"name":"Require when permission type is roles","rule":{"_and":[{"permission_type":{"_eq":"roles"}}]},"required":true,"options":{"layout":"list","enableCreate":false,"enableSelect":true,"limit":15,"junctionFieldLocation":"bottom","allowDuplicates":false,"enableSearchFilter":false,"enableLink":false}}]',false,NULL,NULL,NULL),
  ('external_vector','fill_style','m2o','select-dropdown-m2o','{"template":"{{name}}"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','line_style','m2o','select-dropdown-m2o','{"template":"{{name}}"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','circle_style','m2o','select-dropdown-m2o','{"template":"{{name}}"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector','symbol_style','m2o','select-dropdown-m2o','{"template":"{{name}}"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector_directus_roles','id',NULL,NULL,NULL,NULL,NULL,false,true,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector_directus_roles','external_vector_layer_id',NULL,NULL,NULL,NULL,NULL,false,true,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector_directus_roles','directus_roles_id',NULL,NULL,NULL,NULL,NULL,false,true,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector_cache','layer_id','uuid','input',NULL,NULL,NULL,true,true,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector_cache','value',NULL,'input-code','{"language":"JSON"}',NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL),
  ('external_vector_cache','expired_at',NULL,'datetime',NULL,NULL,NULL,false,false,NULL,'full',NULL,NULL,NULL,false,NULL,NULL,NULL);

INSERT INTO directus_relations (many_collection,many_field,one_collection,one_field,one_collection_field,one_allowed_collections,junction_field,sort_field,one_deselect_action) VALUES
  ('external_vector','user_created','directus_users',NULL,NULL,NULL,NULL,NULL,'nullify'),
  ('external_vector','user_updated','directus_users',NULL,NULL,NULL,NULL,NULL,'nullify'),
  ('external_vector','preview','directus_files',NULL,NULL,NULL,NULL,NULL,'nullify'),
  ('external_vector','category','categories',NULL,NULL,NULL,NULL,NULL,'nullify'),
  ('external_vector','fill_style','fill',NULL,NULL,NULL,NULL,NULL,'nullify'),
  ('external_vector','line_style','line',NULL,NULL,NULL,NULL,NULL,'nullify'),
  ('external_vector','circle_style','circle',NULL,NULL,NULL,NULL,NULL,'nullify'),
  ('external_vector','symbol_style','symbol',NULL,NULL,NULL,NULL,NULL,'nullify'),
  ('external_vector_directus_roles','directus_roles_id','directus_roles',NULL,NULL,NULL,'external_vector_layer_id',NULL,'nullify'),
  ('external_vector_directus_roles','external_vector_layer_id','external_vector','allowed_roles',NULL,NULL,'directus_roles_id',NULL,'delete');

INSERT INTO directus_permissions ("role",collection,"action",permissions,validation,presets,fields) VALUES
  (NULL,'external_vector','read','{"_and":[{"permission_type":{"_eq":"roles+public"}},{"listed":{"_eq":true}}]}',NULL,NULL,'layer_id,layer_alias,preview,description,category,hover_popup_columns,click_popup_columns,image_columns,feature_detail_template,feature_detail_attachments,active,fill_style,line_style,circle_style,symbol_style,listed,bounds');

CREATE OR REPLACE FUNCTION handle_non_admin_non_app_directus_roles_insert()
  RETURNS trigger
  LANGUAGE 'plpgsql'
AS $BODY$
  BEGIN
    INSERT INTO directus_permissions(role,collection,action,permissions,validation,fields)
    VALUES
      (NEW.id,'directus_settings','read','{}','{}','project_name,project_descriptor,public_favicon,project_logo_horizontal,basemaps,initial_map_view,help_center_url,public_background'),
      (NEW.id,'directus_files','read','{"_or":[{"folder":{"_eq":"${PUBLIC_FOLDER_ID}"}},{"folder":{"parent":{"_eq":"${PUBLIC_FOLDER_ID}"}}},{"uploaded_by":{"_eq":"$CURRENT_USER"}}]}','{}','*'),
      (NEW.id,'vector_tiles','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,layer_name,geometry_type,bounds,minzoom,maxzoom,layer_alias,preview,description,category,hover_popup_columns,click_popup_columns,image_columns,active,fill_style,line_style,circle_style,symbol_style'),
      (NEW.id,'symbol','read','{}','{}','*'),
      (NEW.id,'raster_tiles','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,bounds,minzoom,maxzoom,terrain_rgb,protocol,color_steps,layer_alias,preview,description,category,active,visible'),
      (NEW.id,'raster_overlays','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,bounds,image,legend_image,layer_alias,category,active,visible'),
      (NEW.id,'line','read','{}','{}','*'),
      (NEW.id,'fill','read','{}','{}','*'),
      (NEW.id,'external_tiles','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,tile_type,is_tilejson,tilejson_url,tile_url,layer_style_url,bounds,minzoom,maxzoom,tile_size,layer_alias,category,active,visible'),
      (NEW.id,'circle','read','{}','{}','*'),
      (NEW.id,'categories','read','{}','{}','*'),
      (NEW.id,'three_d_tiles','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,layer_alias,preview,description,category,active,visible,opacity,point_size,point_color'),
      (NEW.id,'shared_map','create','{}','{}','*'),
      (NEW.id,'shared_map','read','{}','{}','id,map_state'),
      (NEW.id,'directus_files','create','{}','{"_and":[{"folder":{"_in":["${LAYER_DATA_FOLDER_ID}","${LAYER_PREVIEWS_FOLDER_ID}"]}}]}','*'),
      (NEW.id,'geoprocessing_queue','read','{"_and":[{"uploader":{"_eq":"$CURRENT_USER"}}]}','{}','message_id,result,state,filename,status,mtime,result_ttl'),
      (NEW.id,'external_vector','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}',NULL,'layer_id,layer_alias,preview,description,category,hover_popup_columns,click_popup_columns,image_columns,feature_detail_template,feature_detail_attachments,active,fill_style,line_style,circle_style,symbol_style,listed,bounds');
    RETURN NULL;
  END;
$BODY$;`);
  // TODO better default non admin non app default permissions management. maybe use table so additional rule only could be inserted and the trigger function only needs to select it?
}

export async function down(knex) {
  await knex.raw(`CREATE OR REPLACE FUNCTION handle_non_admin_non_app_directus_roles_insert()
  RETURNS trigger
  LANGUAGE 'plpgsql'
AS $BODY$
  BEGIN
    INSERT INTO directus_permissions(role,collection,action,permissions,validation,fields)
    VALUES
      (NEW.id,'directus_settings','read','{}','{}','project_name,project_descriptor,public_favicon,project_logo_horizontal,basemaps,initial_map_view,help_center_url,public_background'),
      (NEW.id,'directus_files','read','{"_or":[{"folder":{"_eq":"${PUBLIC_FOLDER_ID}"}},{"folder":{"parent":{"_eq":"${PUBLIC_FOLDER_ID}"}}},{"uploaded_by":{"_eq":"$CURRENT_USER"}}]}','{}','*'),
      (NEW.id,'vector_tiles','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,layer_name,geometry_type,bounds,minzoom,maxzoom,layer_alias,preview,description,category,hover_popup_columns,click_popup_columns,image_columns,active,fill_style,line_style,circle_style,symbol_style'),
      (NEW.id,'symbol','read','{}','{}','*'),
      (NEW.id,'raster_tiles','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,bounds,minzoom,maxzoom,terrain_rgb,protocol,color_steps,layer_alias,preview,description,category,active,visible'),
      (NEW.id,'raster_overlays','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,bounds,image,legend_image,layer_alias,category,active,visible'),
      (NEW.id,'line','read','{}','{}','*'),
      (NEW.id,'fill','read','{}','{}','*'),
      (NEW.id,'external_tiles','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,tile_type,is_tilejson,tilejson_url,tile_url,layer_style_url,bounds,minzoom,maxzoom,tile_size,layer_alias,category,active,visible'),
      (NEW.id,'circle','read','{}','{}','*'),
      (NEW.id,'categories','read','{}','{}','*'),
      (NEW.id,'three_d_tiles','read','{"_and":[{"permission_type":{"_in":["roles","roles+public"]}},{"allowed_roles":{"directus_roles_id":{"_eq":"$CURRENT_ROLE"}}},{"listed":{"_eq":true}}]}','{}','layer_id,layer_alias,preview,description,category,active,visible,opacity,point_size,point_color'),
      (NEW.id,'shared_map','create','{}','{}','*'),
      (NEW.id,'shared_map','read','{}','{}','id,map_state'),
      (NEW.id,'directus_files','create','{}','{"_and":[{"folder":{"_in":["${LAYER_DATA_FOLDER_ID}","${LAYER_PREVIEWS_FOLDER_ID}"]}}]}','*'),
      (NEW.id,'geoprocessing_queue','read','{"_and":[{"uploader":{"_eq":"$CURRENT_USER"}}]}','{}','message_id,result,state,filename,status,mtime,result_ttl');
    RETURN NULL;
  END;
$BODY$;

DELETE FROM directus_permissions WHERE "role" IS NULL AND collection = 'external_vector' AND action = 'read';
DELETE FROM directus_relations WHERE many_collection IN ('external_vector', 'external_vector_directus_roles');
DELETE FROM directus_fields WHERE collection IN ('external_vector', 'external_vector_directus_roles', 'external_vector_cache');
DELETE FROM directus_collections WHERE collection IN ('external_vector', 'external_vector_directus_roles', 'external_vector_cache');

DROP TABLE IF EXISTS external_vector_cache;
DROP TABLE IF EXISTS external_vector_directus_roles;
DROP TABLE IF EXISTS external_vector;`);
}
