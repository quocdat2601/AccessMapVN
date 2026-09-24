interface UserLocationMarkerProps {
  MapLibreGL: any;
  latitude: number;
  longitude: number;
}

export function UserLocationMarker({ MapLibreGL, latitude, longitude }: UserLocationMarkerProps) {
  if (!MapLibreGL) return null;
  return (
    <MapLibreGL.ShapeSource
      id="user-location"
      shape={{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        properties: {},
      }}
    >
      {/* Pulsing outer ring */}
      <MapLibreGL.CircleLayer
        id="user-location-pulse"
        style={{
          circleRadius: 20,
          circleColor: '#006874',
          circleOpacity: 0.15,
          circleStrokeWidth: 0,
        }}
      />

      {/* Inner blue dot */}
      <MapLibreGL.CircleLayer
        id="user-location-dot"
        style={{
          circleRadius: 8,
          circleColor: '#006874',
          circleStrokeWidth: 3,
          circleStrokeColor: '#ffffff',
        }}
      />

      {/* Center white dot */}
      <MapLibreGL.CircleLayer
        id="user-location-center"
        style={{
          circleRadius: 3,
          circleColor: '#ffffff',
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}
