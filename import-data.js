const fs = require('fs');
const csv = require('csv-parser');
const pool = require('./db');

async function importData() {
  try {
    console.log('Starting data import...');

    // Import country first
    console.log('Importing country...');
    await pool.query(`
      INSERT INTO country (name, code) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING
    `, ['India', 'IN']);

    const countryId = (await pool.query('SELECT id FROM country WHERE name = $1', ['India'])).rows[0].id;

    // Import states
    console.log('Importing states...');
    const states = [];
    fs.createReadStream('../states.csv')
      .pipe(csv())
      .on('data', (row) => states.push(row))
      .on('end', async () => {
        for (const state of states) {
          await pool.query(`
            INSERT INTO state (state_code, state_name, country_id)
            VALUES ($1, $2, $3) ON CONFLICT (state_code) DO NOTHING
          `, [state.state_code, state.state_name, countryId]);
        }
        console.log(`✅ Imported ${states.length} states`);

        // Get state map
        const stateRows = await pool.query('SELECT id, state_code FROM state');
        const stateMap = {};
        stateRows.rows.forEach(row => stateMap[row.state_code] = row.id);

        // Import districts
        console.log('Importing districts...');
        const districts = [];
        fs.createReadStream('../districts.csv')
          .pipe(csv())
          .on('data', (row) => districts.push(row))
          .on('end', async () => {
            for (const district of districts) {
              const stateId = stateMap[district.state_code];
              if (stateId) {
                await pool.query(`
                  INSERT INTO district (district_code, district_name, state_id)
                  VALUES ($1, $2, $3) ON CONFLICT (district_code) DO NOTHING
                `, [district.district_code, district.district_name, stateId]);
              }
            }
            console.log(`✅ Imported ${districts.length} districts`);

            // Get district map
            const districtRows = await pool.query('SELECT id, district_code FROM district');
            const districtMap = {};
            districtRows.rows.forEach(row => districtMap[row.district_code] = row.id);

            // Import subdistricts
            console.log('Importing subdistricts...');
            const subdistricts = [];
            fs.createReadStream('../subdistricts.csv')
              .pipe(csv())
              .on('data', (row) => subdistricts.push(row))
              .on('end', async () => {
                for (const subdistrict of subdistricts) {
                  const districtId = districtMap[subdistrict.district_code];
                  if (districtId) {
                    await pool.query(`
                      INSERT INTO subdistrict (subdistrict_code, subdistrict_name, district_id)
                      VALUES ($1, $2, $3) ON CONFLICT (subdistrict_code) DO NOTHING
                    `, [subdistrict.subdistrict_code, subdistrict.subdistrict_name, districtId]);
                  }
                }
                console.log(`✅ Imported ${subdistricts.length} subdistricts`);

                // Get subdistrict map
                const subdistrictRows = await pool.query('SELECT id, subdistrict_code FROM subdistrict');
                const subdistrictMap = {};
                subdistrictRows.rows.forEach(row => subdistrictMap[row.subdistrict_code] = row.id);

                // Import villages (batch insert for performance)
                console.log('Importing villages...');
                const villages = [];
                fs.createReadStream('../villages.csv')
                  .pipe(csv())
                  .on('data', (row) => villages.push(row))
                  .on('end', async () => {
                    const batchSize = 1000;
                    for (let i = 0; i < villages.length; i += batchSize) {
                      const batch = villages.slice(i, i + batchSize);
                      const values = batch.map(village => {
                        const subdistrictId = subdistrictMap[village.subdistrict_code];
                        return subdistrictId ? `('${village.village_code}', '${village.village_name.replace(/'/g, "''")}', ${subdistrictId})` : null;
                      }).filter(Boolean).join(', ');

                      if (values) {
                        await pool.query(`
                          INSERT INTO village (village_code, village_name, subdistrict_id)
                          VALUES ${values} ON CONFLICT (village_code) DO NOTHING
                        `);
                      }
                      console.log(`✅ Imported ${Math.min(i + batchSize, villages.length)}/${villages.length} villages`);
                    }
                    console.log('✅ All data imported successfully!');
                    pool.end();
                  });
              });
          });
      });

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    pool.end();
  }
}

importData();