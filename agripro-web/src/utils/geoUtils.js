/**
 * Geospatial utilities for farm mapping
 */

/**
 * Calculate area in acres from an array of [lat, lng] coordinates
 * Uses the Shoelace formula adapted for geodesic calculations
 */
export const calculateAcresFromLatLngs = (latlngs) => {
  if (!latlngs || latlngs.length < 3) return 0;
  
  // Convert to radians and calculate area using spherical excess
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  
  let area = 0;
  const n = latlngs.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(latlngs[i].lat || latlngs[i][0]);
    const lng1 = toRad(latlngs[i].lng || latlngs[i][1]);
    const lat2 = toRad(latlngs[j].lat || latlngs[j][0]);
    const lng2 = toRad(latlngs[j].lng || latlngs[j][1]);
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  area = Math.abs(area * R * R / 2);
  
  // Convert square meters to acres (1 acre = 4046.8564224 sq meters)
  const acres = area / 4046.8564224;
  return Math.round(acres * 100) / 100;
};

/**
 * Convert Leaflet layer to GeoJSON format for storage
 */
export const layerToGeoJSON = (layer) => {
  if (!layer) return null;
  const geoJSON = layer.toGeoJSON();
  return geoJSON.geometry;
};

/**
 * Convert stored GeoJSON back to Leaflet-compatible latlngs
 */
export const geoJSONToLatLngs = (geoJSON) => {
  if (!geoJSON || !geoJSON.coordinates) return [];
  // GeoJSON stores as [lng, lat], Leaflet uses [lat, lng]
  return geoJSON.coordinates[0].map(coord => [coord[1], coord[0]]);
};

/**
 * Get center point of a polygon
 */
export const getPolygonCenter = (latlngs) => {
  if (!latlngs || latlngs.length === 0) return [31.5, 73.1]; // Default: Pakistan center
  
  const latSum = latlngs.reduce((sum, p) => sum + (p.lat || p[0]), 0);
  const lngSum = latlngs.reduce((sum, p) => sum + (p.lng || p[1]), 0);
  
  return [latSum / latlngs.length, lngSum / latlngs.length];
};

/**
 * Default map center (Faisalabad, Punjab, Pakistan)
 */
export const DEFAULT_CENTER = [31.4187, 73.0791];
export const DEFAULT_ZOOM = 16;

/**
 * Map tile layer URLs
 */
export const TILE_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    name: 'Satellite'
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    name: 'Street'
  }
};
