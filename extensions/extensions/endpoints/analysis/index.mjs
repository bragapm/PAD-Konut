import {
  InvalidPayloadError,
  ServiceUnavailableError,
  ForbiddenError,
} from "@directus/errors";

export default (router, { database, logger }) => {
    router.get('/kecamatan-stats/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // SQL Query for calculating the required data
        const result = await database.raw(`
        WITH kecamatan_area AS (
            SELECT ST_Area(ST_Transform(geom, 3857)) / 1e6 AS area_km2  -- Convert area to square kilometers
            FROM kabupaten_konawe_utara
            WHERE id = ?
        ),
        asset_counts AS (
            SELECT 
            (SELECT COUNT(*) 
            FROM unsur_buatan 
            WHERE ST_Within(geom, (SELECT geom FROM kabupaten_konawe_utara WHERE id = ?))) AS built_assets,
            (SELECT COUNT(*) 
            FROM unsur_alami 
            WHERE ST_Within(geom, (SELECT geom FROM kabupaten_konawe_utara WHERE id = ?))) AS natural_assets
        ),
        general AS(
            SELECT wadmkc FROM kabupaten_konawe_utara
            WHERE id = ?
        )
        SELECT 
            (SELECT wadmkc FROM general) AS name,
            (SELECT area_km2 FROM kecamatan_area) AS area_km2,
            (SELECT built_assets FROM asset_counts) AS built_assets,
            (SELECT natural_assets FROM asset_counts) AS natural_assets

        `, [id, id, id, id]);

        const data = result.rows[0];

        res.json({
        name: data.name,
        areaKm2: data.area_km2,
        totalAssets: Number(data.built_assets) + Number(data.natural_assets),
        builtAssets: data.built_assets,
        naturalAssets: data.natural_assets,

        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
    });

    router.get('/kecamatan-assets-distribution/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // SQL Query to calculate asset distribution by 'unsur' category separately for built and natural assets
        const result = await database.raw(`
        -- Calculate built assets distribution by 'unsur' category
        WITH built_assets AS (
            SELECT 
            unsur,
            COUNT(*) AS asset_count
            FROM unsur_buatan
            WHERE ST_Within(geom, (SELECT geom FROM kabupaten_konawe_utara WHERE id = ?))
            GROUP BY unsur
        ),
        
        -- Calculate natural assets distribution by 'nama_unsur' category
        natural_assets AS (
            SELECT 
            nama_unsur AS unsur,
            COUNT(*) AS asset_count
            FROM unsur_alami
            WHERE ST_Within(geom, (SELECT geom FROM kabupaten_konawe_utara WHERE id = ?))
            GROUP BY nama_unsur
        )
        
        -- Combine results from built and natural assets
        SELECT 
            'built' AS category,
            unsur AS name,
            asset_count AS count
        FROM built_assets
        UNION ALL
        SELECT 
            'natural' AS category,
            unsur AS name,
            asset_count AS count
        FROM natural_assets
        ORDER BY category DESC, count DESC;
        `, [id, id]);

        // Split results into built and natural asset categories
        const assetDistribution = result.rows.reduce((acc, row) => {
        if (row.category === 'built') {
            acc.built.push({ name: row.name, count: row.count });
        } else if (row.category === 'natural') {
            acc.natural.push({ name: row.name, count: row.count });
        }
        return acc;
        }, { built: [], natural: [] });

        res.json(assetDistribution);
    } catch (error) {
        console.error('Error fetching asset distribution:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
    });

    router.get('/kecamatan-assets-utilization/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // SQL Query to calculate total utilized and non-utilized area
    const result = await database.raw(`
      WITH utilized_area AS (
        SELECT 
          SUM(luas_m2) AS total_utilized
        FROM aset_tanah
        WHERE ST_Within(geom, (SELECT geom FROM kabupaten_konawe_utara WHERE id = ?))
      ),
    total_area AS (
        SELECT ST_Area(ST_Transform(geom, 3857)) AS total_area
        FROM kabupaten_konawe_utara
        WHERE id = ?
    )
      SELECT 
        (SELECT total_utilized FROM utilized_area) AS total_utilized,
        (SELECT total_area FROM total_area) AS total_area;
    `, [id, id]);

    const totalUtilized = result.rows[0].total_utilized || 0;
    const totalArea = result.rows[0].total_area || 0;

    const utilizedPct = totalArea > 0 ? (totalUtilized / totalArea) * 100 : 0;
    const notUtilizedPct = 100 - utilizedPct;

    res.json({
      utilizedPct: utilizedPct.toFixed(2), // Percentage of utilized assets
      notUtilizedPct: notUtilizedPct.toFixed(2), // Percentage of non-utilized assets
      totalAssets: totalArea, // Total area of assets
    });
  } catch (error) {
    console.error('Error fetching asset utilization:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



};
