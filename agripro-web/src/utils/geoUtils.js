/**
 * Geospatial utilities for farm mapping
 */
import * as turf from '@turf/helpers';
import intersect from '@turf/intersect';
import area from '@turf/area';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import bbox from '@turf/bbox';
import transformRotate from '@turf/transform-rotate';
import union from '@turf/union';
import truncate from '@turf/truncate';

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
  if (!geoJSON) return [];
  
  if (geoJSON.type === 'FeatureCollection') {
    return geoJSON.features.map(f => geoJSONToLatLngs(f.geometry)[0]);
  }
  
  if (!geoJSON.coordinates) return [];
  
  if (geoJSON.type === 'Polygon') {
    return [geoJSON.coordinates[0].map(coord => [coord[1], coord[0]])];
  } else if (geoJSON.type === 'MultiPolygon') {
    return geoJSON.coordinates.map(polygon => polygon[0].map(coord => [coord[1], coord[0]]));
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

export const addPolygonToFeatureCollection = (existingGeoJSON, newPolygonGeoJSON) => {
  const newFeature = turf.feature(newPolygonGeoJSON);
  
  if (!existingGeoJSON) {
    return turf.featureCollection([newFeature]);
  }
  
  try {
    let features = [];
    if (existingGeoJSON.type === 'FeatureCollection') {
      features = [...existingGeoJSON.features, newFeature];
    } else if (existingGeoJSON.type === 'Feature') {
      features = [existingGeoJSON, newFeature];
    } else {
      features = [turf.feature(existingGeoJSON), newFeature];
    }
    return turf.featureCollection(features);
  } catch (e) {
    return turf.featureCollection([newFeature]);
  }
};

export const autoGeneratePlotsForBoundary = (farmBoundaryGeoJSON, lengthFt, widthFt, angleDegrees = 0, keepInside = false, offsetXFt = 0, offsetYFt = 0) => {
  if (!farmBoundaryGeoJSON || !lengthFt || !widthFt) return [];
  
  try {
    const farmFeature = farmBoundaryGeoJSON.type === 'FeatureCollection' ? farmBoundaryGeoJSON : (farmBoundaryGeoJSON.type === 'Feature' ? farmBoundaryGeoJSON : turf.feature(farmBoundaryGeoJSON));
    const farmFeatures = farmFeature.type === 'FeatureCollection' ? farmFeature.features : [farmFeature];
    const [farmMinLng, farmMinLat, farmMaxLng, farmMaxLat] = bbox(farmFeature);
    const pivot = [(farmMinLng + farmMaxLng) / 2, (farmMinLat + farmMaxLat) / 2];
    
    // Degrees per foot roughly
    const midLat = pivot[1];
    const latOffsetPerFt = 1 / 364000;
    const lngOffsetPerFt = 1 / (Math.cos(midLat * Math.PI / 180) * 364000);
    
    const stepLat = lengthFt * latOffsetPerFt;
    const stepLng = widthFt * lngOffsetPerFt;
    
    // Expand bounding box so rotated grids still cover the corners
    const expandFactor = 0.5;
    const width = farmMaxLng - farmMinLng;
    const height = farmMaxLat - farmMinLat;
    const expandedMinLng = farmMinLng - (width * expandFactor);
    const expandedMaxLng = farmMaxLng + (width * expandFactor);
    const expandedMinLat = farmMinLat - (height * expandFactor);
    const expandedMaxLat = farmMaxLat + (height * expandFactor);
    
    const plots = [];
    const offsetLat = (offsetYFt || 0) * latOffsetPerFt;
    const offsetLng = (offsetXFt || 0) * lngOffsetPerFt;
    
    for (let lat = expandedMinLat; lat < expandedMaxLat; lat += stepLat) {
      for (let lng = expandedMinLng; lng < expandedMaxLng; lng += stepLng) {
        let boxGeoJSON = turf.polygon([[
          [lng + offsetLng, lat + offsetLat],
          [lng + stepLng + offsetLng, lat + offsetLat],
          [lng + stepLng + offsetLng, lat + stepLat + offsetLat],
          [lng + offsetLng, lat + stepLat + offsetLat],
          [lng + offsetLng, lat + offsetLat] // close
        ]]);
        
        if (angleDegrees !== 0) {
           boxGeoJSON = transformRotate(boxGeoJSON, angleDegrees, { pivot });
        }
        
        let added = false;
        for (const f of farmFeatures) {
          if (added) break;
          if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
            try {
              if (booleanIntersects(boxGeoJSON, f)) {
                const intersection = intersect(turf.featureCollection([boxGeoJSON, f]));
                if (intersection) {
                  if (keepInside) {
                    const intersectArea = area(intersection);
                    const originalArea = area(boxGeoJSON);
                    if (intersectArea > originalArea * 0.99) {
                      const acres = Math.round((originalArea / 4046.8564224) * 100) / 100;
                      if (acres > 0.05) { plots.push({ geojson: boxGeoJSON.geometry, acres }); added = true; }
                    }
                  } else {
                    const areaSqMeters = area(intersection);
                    const acres = Math.round((areaSqMeters / 4046.8564224) * 100) / 100;
                    if (acres > 0.05) { plots.push({ geojson: intersection.geometry, acres }); added = true; }
                  }
                }
              }
            } catch (err) {
              // Ignore topological errors for this specific box and continue
            }
          }
        }
      }
    }
    return plots;
  } catch (err) {
    console.error('Auto grid error:', err);
    return [];
  }
};

export const autoAdjustPlotsToBoundary = (plots, newFarmBoundaryGeoJSON) => {
  if (!plots || plots.length === 0) return [];
  
  try {
    const updatedPlots = [];
    
    if (!newFarmBoundaryGeoJSON) {
      // If farm boundary is completely gone, nullify all plots
      for (const plot of plots) {
        if (plot.boundary) {
          updatedPlots.push({ id: plot.id, boundary: null, area_acres: 0 });
        }
      }
      return updatedPlots;
    }

    const farmFeature = turf.feature(newFarmBoundaryGeoJSON);

    for (const plot of plots) {
      if (!plot.boundary) continue;
      
      const plotFeature = turf.feature(plot.boundary);
      
      if (booleanIntersects(plotFeature, farmFeature)) {
        const intersection = intersect(turf.featureCollection([plotFeature, farmFeature]));
        if (intersection) {
          const areaSqMeters = area(intersection);
          const acres = Math.round((areaSqMeters / 4046.8564224) * 100) / 100;
          
          updatedPlots.push({
            id: plot.id,
            boundary: intersection.geometry,
            area_acres: acres
          });
        } else {
          // completely outside, area 0
          updatedPlots.push({
            id: plot.id,
            boundary: null,
            area_acres: 0
          });
        }
      } else {
        // completely outside
        updatedPlots.push({
          id: plot.id,
          boundary: null,
          area_acres: 0
        });
      }
    }
    
    return updatedPlots;
  } catch (err) {
    console.error('Auto adjust plots error:', err);
    return [];
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

export const rotatePolygon = (geoJSON, angle = 90) => {
  if (!geoJSON || geoJSON.type !== 'Polygon') return geoJSON;
  
  try {
     const center = getPolygonCenter(geoJSONToLatLngs(geoJSON)[0]);
     return transformRotate(geoJSON, angle, { pivot: [center[1], center[0]] }).geometry;
  } catch(e) {
     return geoJSON;
  }
};

/**
 * Merges multiple GeoJSON polygons into one using Turf union
 */
export const mergePolygons = (geoJSONs) => {
  if (!geoJSONs || geoJSONs.length === 0) return null;
  if (geoJSONs.length === 1) return geoJSONs[0];
  
  try {
    let merged = turf.feature(geoJSONs[0]);
    for (let i = 1; i < geoJSONs.length; i++) {
      const f2 = turf.feature(geoJSONs[i]);
      try {
        merged = union(turf.featureCollection([merged, f2]));
      } catch (err) {
        console.warn("Union precision error, truncating geometries...");
        const t1 = truncate(merged, { precision: 6 });
        const t2 = truncate(f2, { precision: 6 });
        merged = union(turf.featureCollection([t1, t2]));
      }
    }
    return merged.geometry;
  } catch (e) {
    console.error("Merge error:", e);
    return null;
  }
};

/**
 * Calculates the overlap area (in sq meters) between two GeoJSON geometries
 */
export const getOverlapArea = (geoJSON1, geoJSON2) => {
  try {
    const f1 = turf.feature(geoJSON1);
    const f2 = turf.feature(geoJSON2);
    if (!booleanIntersects(f1, f2)) return 0;
    const intersection = intersect(turf.featureCollection([f1, f2]));
    if (!intersection) return 0;
    return area(intersection);
  } catch (e) {
    return 0;
  }
};
