import assert from 'node:assert';
import {
  approxDistanceMeters,
  fallbackGeocodeFromMocks,
  fallbackReverseGeocodeFromMocks,
} from '@/entities/place/lib/geocodeFallback.ts';
import { MOCK_S901_PLACES } from '@/entities/place/model/mockS901Places.ts';
import type { PlaceDto } from '@/entities/place/model/types.ts';
import {
  DEFAULT_ACCESSIBILITY_FILTERS,
  PRESET_CONFIGS,
  countActiveAccessibilityFilters,
  filterAndSortPlacesByAccessibility,
  normalizeAccessibilityFilters,
} from '../model/accessibilityFilter.ts';

function makePlace(overrides: Partial<PlaceDto>): PlaceDto {
  return {
    id: 'place-default',
    name: 'Test Place',
    category: 'cafe',
    lng: 106.7,
    lat: 10.78,
    accessibility_score: 0.7,
    accessibility_note: null,
    has_ramp: false,
    door_width_ok: false,
    has_elevator: false,
    has_accessible_elevator: false,
    has_accessible_restroom: false,
    has_accessible_parking: false,
    has_step_free: false,
    has_tactile_paving: false,
    floor_level: 1,
    ...overrides,
  };
}

export function runDiscoveryFilterTests() {
  console.log('🧪 [TEST SUITE 4] discoveryFilter.test.ts');

  // Test Case 1: Legacy boolean filter normalization migrates to structured criteria
  {
    const normalized = normalizeAccessibilityFilters({
      wheelchair: true,
      restroom: true,
    });
    assert.strictEqual(normalized.ramp, 'required');
    assert.strictEqual(normalized.stepFree, 'required');
    assert.strictEqual(normalized.wideEntrance, 'preferred');
    assert.strictEqual(normalized.restroomMode, 'required');
    assert.strictEqual(normalized.wheelchair, true);
    assert.strictEqual(normalized.restroom, true);
    console.log('  ✅ Test Case 1: normalizeAccessibilityFilters legacy migration (PASSED)');
  }

  // Test Case 2: Active filter count includes both criteria and targetFloor
  {
    const presetFilters = normalizeAccessibilityFilters({
      ...DEFAULT_ACCESSIBILITY_FILTERS,
      preset: 'wheelchair',
      ...PRESET_CONFIGS.wheelchair.criteria,
      targetFloor: '3',
    });
    assert.strictEqual(countActiveAccessibilityFilters(presetFilters), 7);
    assert.strictEqual(countActiveAccessibilityFilters(DEFAULT_ACCESSIBILITY_FILTERS), 0);
    console.log('  ✅ Test Case 2: PRESET_CONFIGS & countActiveAccessibilityFilters (PASSED)');
  }

  // Test Case 3: Filter & sort applies wheelchair requirements, floor ceiling, and preferred ranking
  {
    const idealAllPreferred = makePlace({
      id: 'p-best',
      has_step_free: true,
      door_width_ok: true,
      has_ramp: true,
      has_elevator: true,
      has_accessible_restroom: true,
      has_accessible_parking: true,
      accessibility_score: 0.9,
      floor_level: 5,
    });
    const requiredOnly = makePlace({
      id: 'p-ok',
      has_step_free: true,
      door_width_ok: true,
      has_ramp: true,
      has_elevator: true,
      has_accessible_restroom: false,
      has_accessible_parking: false,
      accessibility_score: 0.95,
      floor_level: 3,
    });
    const lowFloorCap = makePlace({
      id: 'p-too-low',
      has_step_free: true,
      door_width_ok: true,
      has_ramp: true,
      has_elevator: true,
      floor_level: 2,
    });
    const missingDoor = makePlace({
      id: 'p-no-door',
      has_step_free: true,
      door_width_ok: false,
      has_ramp: true,
      has_elevator: true,
    });

    const filtered = filterAndSortPlacesByAccessibility(
      [requiredOnly, missingDoor, lowFloorCap, idealAllPreferred],
      {
        ...DEFAULT_ACCESSIBILITY_FILTERS,
        preset: 'wheelchair',
        ...PRESET_CONFIGS.wheelchair.criteria,
        targetFloor: '3',
      }
    );

    assert.deepStrictEqual(
      filtered.map((p) => p.id),
      ['p-best', 'p-ok']
    );
    console.log('  ✅ Test Case 3: filterAndSortPlacesByAccessibility filtering & sorting (PASSED)');
  }

  // Test Case 4: Reverse & forward geocode offline fallbacks resolve nearest mock / query matches
  {
    assert.strictEqual(approxDistanceMeters(10.77, 106.7, 10.77, 106.7), 0);

    const sampleMock = MOCK_S901_PLACES[0];
    assert.ok(sampleMock, 'Expected MOCK_S901_PLACES seed data');

    const nearbyReverse = fallbackReverseGeocodeFromMocks(
      sampleMock.lat + 0.00001,
      sampleMock.lng
    );
    assert.ok(nearbyReverse && nearbyReverse.includes(sampleMock.name));

    const farReverse = fallbackReverseGeocodeFromMocks(21.0285, 105.8542);
    assert.strictEqual(farReverse, '21.0285, 105.8542');

    const queryKeyword = sampleMock.name.slice(0, Math.min(6, sampleMock.name.length));
    const forwardMatches = fallbackGeocodeFromMocks(queryKeyword, 2);
    assert.ok(forwardMatches.length >= 1 && forwardMatches.length <= 2);
    assert.strictEqual(forwardMatches[0].source, 'accessmap');
    assert.deepStrictEqual(fallbackGeocodeFromMocks('a', 5), []);
    console.log('  ✅ Test Case 4: Offline geocode fallback helpers (PASSED)');
  }
}
