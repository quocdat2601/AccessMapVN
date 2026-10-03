interface UserLocationMarkerProps {
  MapLibreGL: any;
  latitude: number;
  longitude: number;
}

const GOOGLE_BLUE = '#4285F4';

export function UserLocationMarker({ MapLibreGL, latitude, longitude }: UserLocationMarkerProps) {
  if (!MapLibreGL) return null;
  return (
    <MapLibreGL.GeoJSONSource
      id="user-location"
      data={{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        properties: {},
      }}
    >
      <MapLibreGL.Layer
        type="circle"
        id="user-location-halo"
        paint={{
          circleRadius: 26,
          circleColor: GOOGLE_BLUE,
          circleOpacity: 0.2,
          circleStrokeWidth: 0,
        }}
      />

      <MapLibreGL.Layer
        type="circle"
        id="user-location-dot"
        paint={{
          circleRadius: 9,
          circleColor: GOOGLE_BLUE,
          circleStrokeWidth: 3,
          circleStrokeColor: '#ffffff',
        }}
      />
    </MapLibreGL.GeoJSONSource>
  );
}
