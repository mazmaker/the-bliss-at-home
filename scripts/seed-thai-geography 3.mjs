/**
 * Seed Thai Geography Data
 * Fetches data from thailand-geography-data/thailand-geography-json
 * and inserts into Supabase thai_provinces, thai_districts, thai_subdistricts tables
 *
 * Usage: node scripts/seed-thai-geography.mjs
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const BASE_URL = 'https://raw.githubusercontent.com/thailand-geography-data/thailand-geography-json/main/src';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function supabaseQuery(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  return res;
}

async function supabaseInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert to ${table} failed (${res.status}): ${text}`);
  }
  return res;
}

async function supabaseSelect(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Select from ${table} failed: ${res.status}`);
  return res.json();
}

async function main() {
  console.log('Fetching Thai geography data from GitHub...');

  const [districts, subdistricts] = await Promise.all([
    fetchJSON(`${BASE_URL}/districts.json`),
    fetchJSON(`${BASE_URL}/subdistricts.json`),
  ]);

  console.log(`Fetched: ${districts.length} districts, ${subdistricts.length} subdistricts`);

  // Get existing provinces to build province_code -> id mapping
  const provinces = await supabaseSelect('thai_provinces', 'select=id,province_code');
  const provinceCodeToId = {};
  provinces.forEach(p => {
    provinceCodeToId[p.province_code] = p.id;
  });
  console.log(`Province mapping built: ${Object.keys(provinceCodeToId).length} provinces`);

  // Insert districts in batches
  console.log('Inserting districts...');
  const districtRows = districts.map(d => ({
    province_id: provinceCodeToId[d.provinceCode],
    district_code: d.districtCode,
    name_th: d.districtNameTh,
    name_en: d.districtNameEn,
  })).filter(d => d.province_id); // Skip if province not found

  const BATCH_SIZE = 200;
  for (let i = 0; i < districtRows.length; i += BATCH_SIZE) {
    const batch = districtRows.slice(i, i + BATCH_SIZE);
    await supabaseInsert('thai_districts', batch);
    console.log(`  Districts: ${Math.min(i + BATCH_SIZE, districtRows.length)}/${districtRows.length}`);
  }

  // Build district_code -> id mapping
  const insertedDistricts = await supabaseSelect('thai_districts', 'select=id,district_code');
  const districtCodeToId = {};
  insertedDistricts.forEach(d => {
    districtCodeToId[d.district_code] = d.id;
  });
  console.log(`District mapping built: ${Object.keys(districtCodeToId).length} districts`);

  // Insert subdistricts in batches
  console.log('Inserting subdistricts...');
  const subdistrictRows = subdistricts.map(s => ({
    district_id: districtCodeToId[s.districtCode],
    name_th: s.subdistrictNameTh,
    name_en: s.subdistrictNameEn,
    zipcode: String(s.postalCode),
  })).filter(s => s.district_id); // Skip if district not found

  for (let i = 0; i < subdistrictRows.length; i += BATCH_SIZE) {
    const batch = subdistrictRows.slice(i, i + BATCH_SIZE);
    await supabaseInsert('thai_subdistricts', batch);
    console.log(`  Subdistricts: ${Math.min(i + BATCH_SIZE, subdistrictRows.length)}/${subdistrictRows.length}`);
  }

  // Verify
  const countDistricts = await supabaseSelect('thai_districts', 'select=id&limit=1&offset=0');
  const countSubdistricts = await supabaseSelect('thai_subdistricts', 'select=id&limit=1&offset=0');

  console.log('\n--- Seeding Complete ---');
  console.log(`Provinces: ${provinces.length}`);
  console.log(`Districts inserted: ${districtRows.length}`);
  console.log(`Subdistricts inserted: ${subdistrictRows.length}`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
