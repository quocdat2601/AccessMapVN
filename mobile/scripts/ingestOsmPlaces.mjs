import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env from mobile directory
const envPath = path.resolve(__dirname, '../.env');
let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (key === 'EXPO_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
      if (key === 'EXPO_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target Areas in Ho Chi Minh City (Thu Duc City & District 1)
const TARGET_AREAS = [
  {
    name: 'Vinhomes Grand Park (Q9) - Phước Thiện, Nguyễn Xiển, Origami (S9.01), Rainbow',
    bbox: '10.835,106.835,10.875,106.875',
  },
  {
    name: 'Khu CNC TP.HCM (SHTP) - ĐH FPT, F-Town, Vietjet Plaza, D1, D2',
    bbox: '10.830,106.790,10.865,106.835',
  },
  {
    name: 'Lê Văn Việt - Tăng Nhơn Phú - Man Thiện (gần ĐH FPT & Hutech)',
    bbox: '10.830,106.765,10.860,106.800',
  },
  {
    name: 'Làng Đại Học Quốc Gia (VNU-HCM) - KTX A, KTX B, ĐH KHTN, CNTT, Bách Khoa',
    bbox: '10.865,106.780,10.895,106.820',
  },
  {
    name: 'Trung tâm Thủ Đức (Võ Văn Ngân, Vincom Thủ Đức, SPKT, Đặng Văn Bi)',
    bbox: '10.835,106.745,10.875,106.785',
  },
  {
    name: 'Thảo Điền & An Phú (Quận 2 cũ)',
    bbox: '10.785,106.720,10.825,106.760',
  },
  {
    name: 'Phước Long & Đỗ Xuân Hợp (Q9 cũ)',
    bbox: '10.810,106.755,10.840,106.785',
  },
  {
    name: 'Trung tâm Quận 1 (Bến Nghé, Bến Thành, Nguyễn Thái Bình, Đa Kao)',
    bbox: '10.760,106.685,10.795,106.715',
  },
];

function buildOverpassQuery(bbox) {
  return `
[out:json][timeout:50];
(
  node["amenity"](${bbox});
  way["amenity"](${bbox});
  node["shop"](${bbox});
  way["shop"](${bbox});
  node["tourism"](${bbox});
  way["tourism"](${bbox});
  node["leisure"~"park|playground|sports_centre|fitness_centre|pitch|garden"](${bbox});
  way["leisure"~"park|playground|sports_centre|fitness_centre|pitch|garden"](${bbox});
  node["office"](${bbox});
  way["office"](${bbox});
  node["building"~"apartments|residential|university|college|commercial|hospital|retail"](${bbox});
  way["building"~"apartments|residential|university|college|commercial|hospital|retail"](${bbox});
);
out center;
`;
}

function mapCategory(tags) {
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity === 'fast_food') return 'fast_food';
  if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.amenity === 'pharmacy') return 'hospital';
  if (tags.amenity === 'bank' || tags.amenity === 'atm') return 'bank';
  if (tags.shop === 'mall' || tags.amenity === 'marketplace') return 'mall';
  if (tags.tourism === 'hotel') return 'hotel';
  if (tags.amenity === 'bus_station' || tags.railway === 'subway_entrance' || tags.highway === 'bus_stop') return 'transit';
  if (tags.shop) return 'market';
  if (tags.amenity === 'school' || tags.amenity === 'university' || tags.amenity === 'college' || tags.amenity === 'kindergarten' || tags.building === 'university') return 'school';
  if (tags.amenity === 'townhall' || tags.amenity === 'courthouse' || tags.amenity === 'police') return 'government';
  return tags.amenity || tags.shop || tags.tourism || 'other';
}

function parseAccessibility(tags) {
  let score = -1.0;
  let hasRamp = false;
  let doorWidthOk = false;
  let hasToilet = false;
  let note = 'Chưa có dữ liệu khảo sát tiếp cận';

  if (tags.wheelchair === 'yes') {
    score = 0.95;
    hasRamp = true;
    doorWidthOk = true;
    note = 'OSM: Lối vào xe lăn thuận tiện';
  } else if (tags.wheelchair === 'limited') {
    score = 0.55;
    hasRamp = true;
    doorWidthOk = true;
    note = 'OSM: Hỗ trợ xe lăn có hạn chế';
  } else if (tags.wheelchair === 'no') {
    score = 0.15;
    hasRamp = false;
    doorWidthOk = false;
    note = 'OSM: Không hỗ trợ xe lăn';
  }

  if (tags.ramp === 'yes') hasRamp = true;
  if (tags['toilets:wheelchair'] === 'yes') hasToilet = true;

  return { score, hasRamp, doorWidthOk, hasToilet, note };
}

async function fetchFromOverpass(query) {
  const endpoints = [
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
  ];

  for (const ep of endpoints) {
    try {
      console.log(`Trying Overpass endpoint: ${ep}...`);
      const response = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AccessMapVN/1.0 (https://accessmap.vn)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(45000),
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully fetched data from ${ep}`);
        return data;
      }
      console.warn(`Endpoint ${ep} returned ${response.status}`);
    } catch (err) {
      console.warn(`Endpoint ${ep} failed:`, err.message);
    }
  }
  return null;
}

async function main() {
  let grandTotal = 0;

  for (const area of TARGET_AREAS) {
    console.log(`\n========================================`);
    console.log(`📍 Processing: ${area.name} (BBOX: ${area.bbox})`);
    console.log(`========================================`);

    const query = buildOverpassQuery(area.bbox);
    const data = await fetchFromOverpass(query);

    if (!data || !data.elements) {
      console.warn(`⚠️ Skipping ${area.name} due to fetch failure.`);
      continue;
    }

    const elements = data.elements;
    console.log(`Received ${elements.length} raw elements from OSM for ${area.name}.`);

  const places = [];
  const seen = new Set();

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags['name:vi'] || tags['name:en'] || tags.brand;
    if (!name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;

    // Deduplicate by name and approximate coordinates
    const key = `${name}_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const houseNumber = tags['addr:housenumber'] || '';
    const street = tags['addr:street'] || '';
    let address = [houseNumber, street].filter(Boolean).join(' ');
    if (!address && tags['addr:full']) {
      address = tags['addr:full'];
    }

    const phone = tags.phone || tags['contact:phone'] || null;
    const website = tags.website || tags['contact:website'] || null;
    const opening_hours = tags.opening_hours || null;

    const category = mapCategory(tags);
    const access = parseAccessibility(tags);

    places.push({
      name,
      category,
      address: address || null,
      phone,
      website,
      opening_hours,
      lng,
      lat,
      has_ramp: access.hasRamp,
      door_width_ok: access.doorWidthOk,
      has_accessible_restroom: access.hasToilet,
      accessibility_score: access.score,
      accessibility_note: access.note,
    });
  }

  console.log(`2. Parsed ${places.length} valid places with names.`);

  // Chunk into batches of 100
  const BATCH_SIZE = 100;
  let totalInserted = 0;

    for (let i = 0; i < places.length; i += BATCH_SIZE) {
      const batch = places.slice(i, i + BATCH_SIZE);
      const { data: count, error } = await supabase.rpc('bulk_upsert_places', {
        places_json: batch,
      });

      if (error) {
        console.error(`Batch insert error at [${i}..${i + batch.length}]:`, error);
      } else {
        totalInserted += count;
      }
    }

    grandTotal += totalInserted;
    console.log(`✅ Ingested ${totalInserted} places for ${area.name}`);
  }

  console.log(`\n🎉 ALL DONE! Total ${grandTotal} new places inserted across Thu Duc City.`);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
