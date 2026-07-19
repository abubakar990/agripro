/**
 * Geospatial utilities for farm mapping
 */
import * as turf from '@turf/helpers';
import intersect from '@turf/intersect';
import area from '@turf/area';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

/**
 * Calculate area in acres from an array of [lat, lng] coordinates
 * Uses the Shoelace formula adapted for geodesic calculations
 */
export const calculateAcresFromLatLngs = (latlngs) => {
  if (!latlngs || latlngs.length < 3) return 0;
  
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  
  let calcArea = 0;
  const n = latlngs.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(latlngs[i].lat || latlngs[i][0]);
    const lng1 = toRad(latlngs[i].lng || latlngs[i][1]);
    const lat2 = toRad(latlngs[j].lat || latlngs[j][0]);
    const lng2 = toRad(latlngs[j].lng || latlngs[j][1]);
    
    calcArea += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  calcArea = Math.abs(calcArea * R * R / 2);
  const acres = calcArea / 4046.8564224;
  return Math.round(acres * 100) / 100;
};

export const layerToGeoJSON = (layer) => {
  if (!layer) return null;
  const geoJSON = layer.toGeoJSON();
  return geoJSON.geometry;
};

export const geoJSONToLatLngs = (geoJSON) => {
  if (!geoJSON || !geoJSON.coordinates) return [];
  // For MultiPolygon we'd need more logic, assuming simple Polygon here
  if (geoJSON.type === 'Polygon') {
    return geoJSON.coordinates[0].map(coord => [coord[1], coord[0]]);
  } else if (geoJSON.type === 'MultiPolygon') {
      // Just return the first polygon ring for display simplicity if it's a multipolygon
      return geoJSON.coordinates[0][0].map(coord => [coord[1], coord[0]]);
  }
  return [];
};

export const getPolygonCenter = (latlngs) => {
  if (!latlngs || latlngs.length === 0) return [31.5, 73.1];
  
  const latSum = latlngs.reduce((sum, p) => sum + (p.lat || p[0]), 0);
  const lngSum = latlngs.reduce((sum, p) => sum + (p.lng || p[1]), 0);
  
  return [latSum / latlngs.length, lngSum / latlngs.length];
};

/**
 * Creates a rectangle GeoJSON feature of specific length/width (in feet) centered at latLng,
 * and intersects it with the farm boundary. Returns the intersected GeoJSON and calculated acres.
 */
export const createIntersectedAcreBox = (latLng, lengthFt, widthFt, farmBoundaryGeoJSON) => {
  // Convert feet to degrees roughly. 1 degree latitude is ~364,000 feet.
  // 1 degree longitude depends on latitude: cos(lat) * 364,000.
  const lat = latLng.lat;
  const lng = latLng.lng;
  
  const latOffset = (lengthFt / 2) / 364000;
  const lngOffset = (widthFt / 2) / (Math.cos(lat * Math.PI / 180) * 364000);

  const boxGeoJSON = turf.polygon([[
    [lng - lngOffset, lat - latOffset],
    [lng + lngOffset, lat - latOffset],
    [lng + lngOffset, lat + latOffset],
    [lng - lngOffset, lat + latOffset],
    [lng - lngOffset, lat - latOffset] // close
  ]]);

  if (!farmBoundaryGeoJSON) {
     // If no farm boundary, just return the box
     const areaSqMeters = area(boxGeoJSON);
     return { geojson: boxGeoJSON.geometry, acres: Math.round((areaSqMeters / 4046.8564224) * 100) / 100 };
  }

  try {
    // Make sure farm boundary is a valid feature
    const farmFeature = turf.feature(farmBoundaryGeoJSON);
    
    // Check if point is inside
    const point = turf.point([lng, lat]);
    if (!booleanPointInPolygon(point, farmFeature)) {
      return { error: 'Click point must be inside the farm boundary.' };
    }

    const intersection = intersect(turf.featureCollection([boxGeoJSON, farmFeature]));
    
    if (!intersection) {
        return { error: 'No overlap with farm boundary.' };
    }

    const areaSqMeters = area(intersection);
    const calculatedAcres = Math.round((areaSqMeters / 4046.8564224) * 100) / 100;
    
    return { geojson: intersection.geometry, acres: calculatedAcres };
  } catch (err) {
    console.error('Turf intersection error:', err);
    return { error: 'Failed to calculate intersection' };
  }
};

export const DEFAULT_CENTER = [31.4187, 73.0791];
export const DEFAULT_ZOOM = 16;

export const TILE_LAYERS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    name: 'Satellite'
  },
  hybrid: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    name: 'Hybrid (Labels)'
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    name: 'Street'
  }
};
