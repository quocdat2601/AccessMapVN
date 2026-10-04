import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.error('Error: Supabase URL or Key not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function cleanDisplayName(raw) {
  if (!raw) return '';
  return raw
    .replace(/,\s*\d{5,6}/g, '')
    .replace(/,\s*Việt Nam$/i, '')
    .trim();
}

function formatNominatim(data) {
  const addr = data?.address;
  const displayName = data?.display_name;
  if (!addr) return cleanDisplayName(displayName) || displayName;

  const num = addr.house_number ? `${addr.house_number} ` : '';
  const road = addr.road || addr.pedestrian || addr.footway || '';
  const streetPart = `${num}${road}`.trim();

  const locality = addr.residential || '';
  const ward = addr.suburb || addr.quarter || addr.neighbourhood || addr.ward || addr.hamlet || '';
  const district = addr.city_district || addr.district || addr.county || '';
  const city = addr.city || addr.town || addr.province || addr.state || '';

  const parts = [streetPart, locality, ward, district, city].filter(Boolean);
  if (parts.length >= 2) {
    return parts.join(', ');
  }
  return cleanDisplayName(displayName) || parts.join(', ') || null;
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AccessMapVN/1.0 (contact@accessmap.vn)',
        'Accept-Language': 'vi,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return formatNominatim(data);
  } catch {
    return null;
  }
}

async function main() {
  console.log('🚀 Starting address enrichment for Supabase places using Nominatim...');
  let totalProcessed = 0;
  let totalUpdated = 0;
  const BATCH_SIZE = 25;

  while (true) {
    const { data: places, error } = await supabase.rpc('get_places_needing_address', {
      limit_count: BATCH_SIZE,
    });

    if (error) {
      console.error('Failed to fetch places:', error.message);
      break;
    }

    if (!places || places.length === 0) {
      console.log('✨ All places have addresses!');
      break;
    }

    console.log(`\n📦 Processing batch of ${places.length} places (Total processed: ${totalProcessed})...`);

    const updates = [];
    for (const place of places) {
      const address = await reverseGeocode(place.lat, place.lng);
      if (address) {
        updates.push({ id: place.id, address });
        console.log(`  📍 [${place.name}]: ${address}`);
      } else {
        console.log(`  ⚠️ [${place.name}]: No address resolved`);
      }
      totalProcessed++;
      // Nominatim usage policy: 1 request per second
      await new Promise((r) => setTimeout(r, 1100));
    }

    if (updates.length > 0) {
      const { data: updatedCount, error: updateError } = await supabase.rpc(
        'bulk_update_place_addresses',
        { updates_json: updates }
      );
      if (updateError) {
        console.error('Update error:', updateError.message);
      } else {
        totalUpdated += updatedCount ?? 0;
        console.log(`💾 Saved ${updatedCount} addresses to database (Total saved: ${totalUpdated})`);
      }
    }
  }

  console.log(`\n🎉 Enrichment complete! Total processed: ${totalProcessed}, total updated: ${totalUpdated}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
