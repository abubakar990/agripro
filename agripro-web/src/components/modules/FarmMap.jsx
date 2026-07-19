import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateAcresFromLatLngs, layerToGeoJSON, geoJSONToLatLngs, DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS, createIntersectedAcreBox, addPolygonToFeatureCollection, autoGeneratePlotsForBoundary, autoAdjustPlotsToBoundary, rotatePolygon, getOverlapArea, mergePolygons } from '../../utils/geoUtils';
import { getPlotScore, getScoreColor, getScoreLabel } from '../../utils/perAcreCalc';
import { formatPKR } from '../../utils/format';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import { IconMap, IconPlus, IconArrowLeft, IconSearch, IconLayersIntersect, IconMapPin, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand, IconSquarePlus, IconDeviceFloppy, IconTrash, IconEdit, IconDragDrop, IconCheck, IconBuildingCommunity, IconRotate, IconHandGrab, IconGridDots, IconCut, IconVectorTriangle, IconList } from '@tabler/icons-react';

const MapController = ({ farm, plots, drawMode, onPlotCreated, onFarmBoundaryCreated, onAcreBoxClick, onPlotRedrawn, onPlotCut, mapRef }) => {
  const map = useMap();
  
  useEffect(() => {
    if (mapRef) mapRef.current = map;
  }, [map, mapRef]);

  useEffect(() => {
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
    });
    return () => { map.pm.removeControls(); };
  }, [map]);

  // Handle pm:create event (Freeform Polygons)
  useEffect(() => {
    const handleCreate = (e) => {
      const layer = e.layer;
      const geojson = layerToGeoJSON(layer);
      const latLngs = layer.getLatLngs()[0];
      const acres = calculateAcresFromLatLngs(latLngs);
      const bounds = layer.getBounds();
      const center = bounds.getCenter();

      if (drawMode === 'farm') {
        onFarmBoundaryCreated(geojson, acres, center.lat, center.lng);
      } else if (drawMode === 'plot') {
        onPlotCreated(geojson, acres);
      } else if (drawMode === 'redraw_plot') {
        onPlotRedrawn(geojson, acres);
      }
      
      map.removeLayer(layer);
    };

    map.on('pm:create', handleCreate);
    return () => { map.off('pm:create', handleCreate); };
  }, [map, drawMode, onPlotCreated, onFarmBoundaryCreated, onPlotRedrawn]);

  useEffect(() => {
    if (drawMode === 'cut_plot') {
      map.pm.enableGlobalCutMode({
        allowSelfIntersection: false,
      });
    } else {
      map.pm.disableGlobalCutMode();
    }
  }, [map, drawMode]);

  useEffect(() => {
    const handleCut = (e) => {
      if (onPlotCut) onPlotCut(e);
    };
    map.on('pm:cut', handleCut);
    return () => map.off('pm:cut', handleCut);
  }, [map, onPlotCut]);

  // Handle Click for Acre Box Tool
  useEffect(() => {
    const handleMapClick = (e) => {
      if (drawMode === 'acre_box') {
        onAcreBoxClick(e.latlng);
      }
    };
    
    if (drawMode === 'acre_box') {
      map.on('click', handleMapClick);
      document.getElementById('farm-map-container').style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClick);
      document.getElementById('farm-map-container').style.cursor = '';
    }
    
    return () => { map.off('click', handleMapClick); };
  }, [map, drawMode, onAcreBoxClick]);

  // Auto Edge Panning while Drawing
  useEffect(() => {
    if (!drawMode) return;
    let animationFrame;
    let currentDx = 0;
    let currentDy = 0;
    const edgeZone = 50; // pixels from edge to trigger pan
    const panSpeed = 8; // pixels per frame

    const panStep = () => {
      if (currentDx !== 0 || currentDy !== 0) {
        map.panBy([currentDx, currentDy], { animate: false });
      }
      animationFrame = requestAnimationFrame(panStep);
    };

    const handleMouseMove = (e) => {
      const { x, y } = e.containerPoint;
      const size = map.getSize();
      
      currentDx = 0;
      currentDy = 0;
      
      if (x < edgeZone) currentDx = -panSpeed;
      else if (x > size.x - edgeZone) currentDx = panSpeed;
      
      if (y < edgeZone) currentDy = -panSpeed;
      else if (y > size.y - edgeZone) currentDy = panSpeed;
    };
    
    const handleMouseOut = () => {
      currentDx = 0;
      currentDy = 0;
    };

    map.on('mousemove', handleMouseMove);
    map.on('mouseout', handleMouseOut);
    animationFrame = requestAnimationFrame(panStep);
    
    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrame);
    };
  }, [map, drawMode]);

  // Fit bounds when farm or plots change
  useEffect(() => {
    try {
      if (farm?.boundary) {
        const geoLayer = L.geoJSON({ type: 'Feature', geometry: farm.boundary });
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
      } else if (farm?.latitude && farm?.longitude) {
        map.setView([parseFloat(farm.latitude), parseFloat(farm.longitude)], 15);
      } else if (plots && plots.length > 0) {
        const validPlots = plots.filter(p => p.boundary);
        if (validPlots.length > 0) {
          const group = L.featureGroup(
            validPlots.map(p => L.geoJSON({ type: 'Feature', geometry: p.boundary }))
          );
          const bounds = group.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
        }
      }
    } catch (err) {
      console.warn('Map fit bounds error:', err);
    }
  }, [map, farm?.boundary, farm?.latitude, farm?.longitude, plots]);

  return null;
};

const FarmMap = ({ farms = [], farmPlots = [], cropCycles = [], expenses = [], revenue = [], acrePresets = [] }) => {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const plotLayersRef = useRef({});
  const farmLayerRef = useRef([]);
  
  const [mapType, setMapType] = useState('hybrid');
  const [mapOverlay, setMapOverlay] = useState('performance'); // performance, crop, soil, none
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawMode, setIsDrawMode] = useState(null);
  const [redrawPlotId, setRedrawPlotId] = useState(null);
  const [gridPreviewPlots, setGridPreviewPlots] = useState([]);
  const [gridParams, setGridParams] = useState({ length_ft: 207, width_ft: 207, angle: 0, keepInside: false, offsetX: 0, offsetY: 0 });
  const [selectedPlotIdsForMerge, setSelectedPlotIdsForMerge] = useState([]);
  const [isPlotManagerOpen, setIsPlotManagerOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  
  // Geoman Vertex Adjustment States
  const [adjustingPlotId, setAdjustingPlotId] = useState(null);
  const [adjustingFarmBoundary, setAdjustingFarmBoundary] = useState(false);
  const [dynamicAreaAcres, setDynamicAreaAcres] = useState(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [isAcreModalOpen, setIsAcreModalOpen] = useState(false);
  const [customPreset, setCustomPreset] = useState({ name: '', length_ft: '', width_ft: '' });
  const [selectedPresetId, setSelectedPresetId] = useState('');

  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [pendingPlotGeoJSON, setPendingPlotGeoJSON] = useState(null);
  const [pendingPlotAcres, setPendingPlotAcres] = useState(0);
  const [plotFormData, setPlotFormData] = useState({
    name: '',
    soil_type: 'Loamy',
    soil_quality: 'Good',
    drainage: 'Good',
    water_source: '',
    notes: ''
  });

  const numericFarmId = parseInt(farmId);
  const farm = useMemo(() => farms.find(f => f.id === numericFarmId), [farms, numericFarmId]);
  const plots = useMemo(() => farmPlots.filter(p => p.farm_id === numericFarmId), [farmPlots, numericFarmId]);

  const mapCenter = useMemo(() => {
    if (farm?.latitude && farm?.longitude) return [parseFloat(farm.latitude), parseFloat(farm.longitude)];
    return DEFAULT_CENTER;
  }, [farm]);

  // Manage Geoman Edit Mode
  useEffect(() => {
    if (farmLayerRef.current && Array.isArray(farmLayerRef.current)) {
      if (adjustingFarmBoundary) {
        farmLayerRef.current.forEach(layer => {
          if (layer && layer.pm) {
            layer.pm.enable({ allowSelfIntersection: false, preventMarkerRemoval: false });
            const updateArea = () => {
              try {
                let totalAcres = 0;
                farmLayerRef.current.forEach(l => {
                  if (l) totalAcres += calculateAcresFromLatLngs(l.getLatLngs()[0]);
                });
                setDynamicAreaAcres(totalAcres);
              } catch(e) {}
            };
            layer.on('pm:markerdrag', updateArea);
            layer.on('pm:edit', updateArea);
            updateArea();
          }
        });
      } else {
        farmLayerRef.current.forEach(layer => {
          if (layer && layer.pm) {
            layer.pm.disable();
            layer.off('pm:markerdrag');
            layer.off('pm:edit');
          }
        });
        if (!adjustingPlotId) setDynamicAreaAcres(null);
      }
    }
  }, [adjustingFarmBoundary, farm?.boundary, adjustingPlotId]);

  useEffect(() => {
    if (isDrawMode === 'grid_preview' && farm?.boundary) {
      const timer = setTimeout(() => {
         const preview = autoGeneratePlotsForBoundary(farm.boundary, parseFloat(gridParams.length_ft) || 100, parseFloat(gridParams.width_ft) || 100, parseFloat(gridParams.angle) || 0, gridParams.keepInside, parseFloat(gridParams.offsetX) || 0, parseFloat(gridParams.offsetY) || 0);
         setGridPreviewPlots(preview);
      }, 100); // debounce slightly
      return () => clearTimeout(timer);
    } else {
      setGridPreviewPlots([]);
    }
  }, [isDrawMode, gridParams, farm?.boundary]);

  useEffect(() => {
    Object.values(plotLayersRef.current).forEach(layer => {
      if (layer && layer.pm) {
        layer.pm.disable();
        layer.off('pm:markerdrag');
        layer.off('pm:edit');
        layer.off('pm:dragend');
      }
    });

    if (adjustingPlotId && plotLayersRef.current[adjustingPlotId]) {
      const layer = plotLayersRef.current[adjustingPlotId];
      if (layer && layer.pm) {
        layer.pm.enable({ allowSelfIntersection: false, preventMarkerRemoval: false });
        const updateArea = () => {
          try {
            const acres = calculateAcresFromLatLngs(layer.getLatLngs()[0]);
            setDynamicAreaAcres(acres);
          } catch(e) {}
        };
        layer.on('pm:markerdrag', updateArea);
        layer.on('pm:edit', updateArea);
        updateArea();
      }
    } else if (!adjustingFarmBoundary) {
      setDynamicAreaAcres(null);
    }
  }, [adjustingPlotId, plots, adjustingFarmBoundary]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0 && mapRef.current) {
        mapRef.current.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 15);
      }
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const startDrawFarm = () => {
    setIsDrawMode('farm');
    if (mapRef.current) mapRef.current.pm.enableDraw('Polygon', { snappable: true, snapDistance: 20 });
  };

  const startDrawPlot = () => {
    setIsDrawMode('plot');
    if (mapRef.current) mapRef.current.pm.enableDraw('Polygon', { snappable: true, snapDistance: 20 });
  };

  const startRedrawPlot = (plotId) => {
    setRedrawPlotId(plotId);
    setIsDrawMode('redraw_plot');
    if (mapRef.current) mapRef.current.pm.enableDraw('Polygon', { snappable: true, snapDistance: 20 });
  };

  const startAcreBoxTool = () => {
    if (!selectedPresetId) {
      alert('Please select or create an Acre Preset first.');
      return;
    }
    setIsDrawMode('acre_box');
    if (mapRef.current) mapRef.current.pm.disableDraw();
  };

  const cancelDraw = () => {
    setIsDrawMode(null);
    setRedrawPlotId(null);
    setAdjustingPlotId(null);
    setAdjustingFarmBoundary(false);
    setDynamicAreaAcres(null);
    if (mapRef.current) mapRef.current.pm.disableDraw();
  };

  const handleFarmBoundaryCreated = useCallback(async (geojson, acres, lat, lng) => {
    setIsDrawMode(null);
    try {
      const newBoundary = addPolygonToFeatureCollection(farm?.boundary, geojson);
      const newTotalAcres = (parseFloat(farm?.area_acres) || 0) + acres;
      
      const { error } = await supabase.from('farms').update({
        boundary: newBoundary,
        area_acres: newTotalAcres,
        latitude: farm?.latitude || lat,
        longitude: farm?.longitude || lng
      }).eq('id', numericFarmId);
      
      if (error) throw error;
      
      // Auto-generate plots if a preset is selected
      if (selectedPresetId) {
        const preset = acrePresets.find(p => p.id === parseInt(selectedPresetId));
        if (preset && window.confirm(`Would you like to automatically fill this new boundary with ${preset.name} (${preset.length_ft}' x ${preset.width_ft}') plots?`)) {
           const generatedPlots = autoGeneratePlotsForBoundary(geojson, parseFloat(preset.length_ft), parseFloat(preset.width_ft));
           
           if (generatedPlots.length > 0) {
             const insertData = generatedPlots.map((p, idx) => ({
               farm_id: numericFarmId,
               name: `${preset.name} ${plots.length + idx + 1}`,
               boundary: p.geojson,
               area_acres: p.acres,
               soil_type: 'Loamy',
               soil_quality: 'Good',
               drainage: 'Good'
             }));
             const { error: insertErr } = await supabase.from('farm_plots').insert(insertData);
             if (insertErr) throw insertErr;
             alert(`Farm boundary added and ${generatedPlots.length} plots auto-generated!`);
             return;
           } else {
             alert('Farm boundary added, but the area was too small or irregular to generate grid plots.');
           }
        }
      }
      
      alert('Farm boundary saved!');
    } catch (err) {
      alert('Error saving farm boundary: ' + err.message);
    }
  }, [numericFarmId, farm, selectedPresetId, acrePresets, plots]);

  const handleSaveFarmAdjustment = async () => {
    if (!farmLayerRef.current || !Array.isArray(farmLayerRef.current)) return;
    try {
      let totalAcres = 0;
      let center = null;
      let features = [];
      
      farmLayerRef.current.forEach(layer => {
        if (!layer) return;
        const geojson = layerToGeoJSON(layer);
        const latLngs = layer.getLatLngs()[0];
        totalAcres += calculateAcresFromLatLngs(latLngs);
        features.push({ type: 'Feature', geometry: geojson });
        if (!center) center = layer.getBounds().getCenter();
      });
      
      const finalBoundary = features.length === 1 ? features[0].geometry : { type: 'FeatureCollection', features };

      const { error } = await supabase.from('farms').update({
        boundary: finalBoundary,
        area_acres: totalAcres,
        latitude: center?.lat || farm.latitude,
        longitude: center?.lng || farm.longitude
      }).eq('id', numericFarmId);
      if (error) throw error;
      
      // Auto-adjust plots to the new farm boundary
      if (plots.length > 0) {
        const adjustedPlots = autoAdjustPlotsToBoundary(plots, finalBoundary);
        if (adjustedPlots.length > 0) {
          const promises = adjustedPlots.map(p => {
            if (p.boundary === null || p.area_acres === 0) {
              return supabase.from('farm_plots').delete().eq('id', p.id);
            } else {
              return supabase.from('farm_plots').update({ boundary: p.boundary, area_acres: p.area_acres }).eq('id', p.id);
            }
          });
          await Promise.all(promises);
        }
      }
      
      setAdjustingFarmBoundary(false);
      alert('Farm boundary adjustments saved and plots adjusted!');
    } catch (err) {
      alert('Error saving boundary: ' + err.message);
    }
  };

  const handleDeleteSpecificBoundary = async (indexToDelete) => {
    if (!window.confirm("Are you sure you want to delete this specific boundary area?")) return;
    try {
      let newBoundary = null;
      let newArea = 0;
      
      const features = farm.boundary.type === 'FeatureCollection' ? farm.boundary.features : [{ geometry: farm.boundary }];
      const remainingFeatures = features.filter((_, idx) => idx !== indexToDelete);
      
      if (remainingFeatures.length > 0) {
        newBoundary = remainingFeatures.length === 1 ? remainingFeatures[0].geometry : { type: 'FeatureCollection', features: remainingFeatures };
        
        remainingFeatures.forEach(f => {
          newArea += calculateAcresFromLatLngs(geoJSONToLatLngs(f.geometry)[0]);
        });
      }
      
      const { error } = await supabase.from('farms').update({
        boundary: newBoundary,
        area_acres: newArea || null,
      }).eq('id', numericFarmId);
      
      if (error) throw error;
      
      // Auto-adjust plots to the new farm boundary
      if (plots.length > 0) {
        const adjustedPlots = autoAdjustPlotsToBoundary(plots, newBoundary);
        if (adjustedPlots.length > 0) {
          const promises = adjustedPlots.map(p => {
            if (p.boundary === null || p.area_acres === 0) {
              return supabase.from('farm_plots').delete().eq('id', p.id);
            } else {
              return supabase.from('farm_plots').update({ boundary: p.boundary, area_acres: p.area_acres }).eq('id', p.id);
            }
          });
          await Promise.all(promises);
        }
      }
      
      alert('Boundary area deleted and plots adjusted.');
    } catch (err) {
      alert('Error deleting boundary: ' + err.message);
    }
  };

  const handlePlotCreated = useCallback((geojson, acres) => {
    setIsDrawMode(null);
    setPendingPlotGeoJSON(geojson);
    setPendingPlotAcres(acres);
    setIsPlotModalOpen(true);
  }, []);

  const handlePlotRedrawn = useCallback(async (geojson, acres) => {
    setIsDrawMode(null);
    if (!redrawPlotId) return;
    try {
      const { error } = await supabase.from('farm_plots').update({
        boundary: geojson,
        area_acres: acres
      }).eq('id', redrawPlotId);
      if (error) throw error;
      setRedrawPlotId(null);
      alert('Plot boundary updated!');
    } catch (err) {
      alert('Error updating boundary: ' + err.message);
    }
  }, [redrawPlotId]);

  const handleSavePlotAdjustment = async () => {
    if (!adjustingPlotId || !plotLayersRef.current[adjustingPlotId]) return;
    try {
      const layer = plotLayersRef.current[adjustingPlotId];
      const geojson = layerToGeoJSON(layer);
      const acres = calculateAcresFromLatLngs(layer.getLatLngs()[0]);
      
      const { error } = await supabase.from('farm_plots').update({
        boundary: geojson,
        area_acres: acres
      }).eq('id', adjustingPlotId);
      
      if (error) throw error;
      setAdjustingPlotId(null);
      alert('Plot adjustments saved!');
    } catch (err) {
      alert('Error saving boundary: ' + err.message);
    }
  };

  const handleRotatePlot = async (plotId, angle = 90) => {
    const plot = plots.find(p => p.id === plotId);
    if (!plot || !plot.boundary) return;
    
    try {
      const rotatedGeoJSON = rotatePolygon(plot.boundary, angle);
      await supabase.from('farm_plots').update({ boundary: rotatedGeoJSON }).eq('id', plotId);
    } catch (err) {
      alert('Error rotating plot: ' + err.message);
    }
  };

  const handlePlotCut = useCallback(async (e) => {
    const { originalLayer, layer } = e;
    setIsDrawMode(null);
    try {
      let newGeoJSONs = [];
      if (typeof layer.getLayers === 'function') {
         newGeoJSONs = layer.getLayers().map(l => layerToGeoJSON(l));
      } else {
         const cutGeoJSON = layer.toGeoJSON();
         if (cutGeoJSON.type === 'FeatureCollection') {
            newGeoJSONs = cutGeoJSON.features.map(f => f.geometry);
         } else if (cutGeoJSON.geometry && cutGeoJSON.geometry.type === 'MultiPolygon') {
            newGeoJSONs = cutGeoJSON.geometry.coordinates.map(coords => ({ type: 'Polygon', coordinates: coords }));
         } else {
            newGeoJSONs = [cutGeoJSON.geometry || cutGeoJSON];
         }
      }
      
      if (newGeoJSONs.length < 2) return;
      
      const origGeoJSON = layerToGeoJSON(originalLayer);
      
      let cutPlot = plots.find(p => {
        if (!p.boundary) return false;
        const overlap = getOverlapArea(origGeoJSON, p.boundary);
        const origAcres = calculateAcresFromLatLngs(geoJSONToLatLngs(origGeoJSON)[0]);
        return overlap > (origAcres * 0.9);
      });
      
      if (!cutPlot) {
         alert("Could not identify the plot that was cut.");
         return;
      }
      
      const newPlots = newGeoJSONs.map((gj, idx) => {
         const acres = calculateAcresFromLatLngs(geoJSONToLatLngs(gj)[0]);
         return {
            farm_id: numericFarmId,
            name: `${cutPlot.name} (Part ${idx + 1})`,
            area_acres: acres,
            boundary: gj,
            soil_type: cutPlot.soil_type,
            soil_quality: cutPlot.soil_quality
         };
      }).filter(p => p.area_acres > 0.01);
      
      if (newPlots.length > 0) {
         await supabase.from('farm_plots').delete().eq('id', cutPlot.id);
         await supabase.from('farm_plots').insert(newPlots);
      }
    } catch(err) {
      alert("Error splitting plot: " + err.message);
    }
  }, [plots, numericFarmId]);

  const handleMergeSelectedPlots = async () => {
    if (selectedPlotIdsForMerge.length < 2) return;
    const plotsToMerge = plots.filter(p => selectedPlotIdsForMerge.includes(p.id));
    if (plotsToMerge.length < 2) return;
    
    try {
       const mergedGeoJSON = mergePolygons(plotsToMerge.map(p => p.boundary));
       if (!mergedGeoJSON) throw new Error("Could not merge plots.");
       
       const newAcres = plotsToMerge.reduce((sum, p) => sum + parseFloat(p.area_acres || 0), 0);
       
       const newPlot = {
         farm_id: numericFarmId,
         name: `${plotsToMerge[0].name} (Merged)`,
         boundary: mergedGeoJSON,
         area_acres: newAcres,
         soil_type: plotsToMerge[0].soil_type,
         soil_quality: plotsToMerge[0].soil_quality
       };
       
       await supabase.from('farm_plots').delete().in('id', selectedPlotIdsForMerge);
       await supabase.from('farm_plots').insert([newPlot]);
       
       setSelectedPlotIdsForMerge([]);
       setIsDrawMode(null);
    } catch (e) {
       alert("Error merging plots: " + e.message);
    }
  };

  const handleStartGridPreview = () => {
    if (!farm.boundary) return;
    const preset = acrePresets.find(p => p.id === selectedPresetId);
    if (preset) {
       setGridParams({ ...gridParams, length_ft: parseFloat(preset.length_ft), width_ft: parseFloat(preset.width_ft) });
    }
    setIsDrawMode('grid_preview');
  };

  const handleSaveGrid = async () => {
    if (plots.length > 0) {
      const confirmOverwrite = window.confirm("This will erase all current plots and auto-fill the entire farm boundary. Proceed?");
      if (!confirmOverwrite) return;
    }
    
    try {
      if (gridPreviewPlots.length === 0) {
         alert('No plots generated in preview.');
         return;
      }
      
      if (plots.length > 0) {
         await supabase.from('farm_plots').delete().eq('farm_id', numericFarmId);
      }
      
      const plotsToInsert = gridPreviewPlots.map((gp, idx) => ({
         farm_id: numericFarmId,
         name: `Auto Plot ${idx + 1}`,
         area_acres: gp.acres,
         boundary: gp.geojson,
         soil_type: 'Loamy',
         soil_quality: 'Good'
      }));
      
      const { error } = await supabase.from('farm_plots').insert(plotsToInsert);
      if (error) throw error;
      
      alert(`Successfully generated ${plotsToInsert.length} plots! The map will now refresh.`);
      setTimeout(() => {
        setIsDrawMode(null);
      }, 1500);
    } catch (err) {
      alert("Error saving grid: " + err.message);
    }
  };

  const handleDeletePlot = async (plotId) => {
    if (!window.confirm("Are you sure you want to completely delete this plot?")) return;
    try {
      const { error } = await supabase.from('farm_plots').delete().eq('id', plotId);
      if (error) throw error;
      if (selectedPlot?.id === plotId) setSelectedPlot(null);
    } catch (err) {
      alert('Error deleting plot: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
     if (bulkSelectedIds.length === 0) return;
     if (!window.confirm(`Are you sure you want to delete ${bulkSelectedIds.length} plots?`)) return;
     try {
       await supabase.from('farm_plots').delete().in('id', bulkSelectedIds);
       setBulkSelectedIds([]);
     } catch (err) {
       alert("Error deleting plots: " + err.message);
     }
  };

  const handleAcreBoxClick = useCallback((latlng) => {
    const preset = acrePresets.find(p => p.id === parseInt(selectedPresetId));
    if (!preset) return;

    const result = createIntersectedAcreBox(latlng, parseFloat(preset.length_ft), parseFloat(preset.width_ft), farm.boundary);
    
    if (result.error) {
      alert(result.error);
      return;
    }

    setIsDrawMode(null);
    setPendingPlotGeoJSON(result.geojson);
    setPendingPlotAcres(result.acres);
    setPlotFormData(prev => ({ ...prev, name: `${preset.name} Plot` }));
    setIsPlotModalOpen(true);
  }, [selectedPresetId, acrePresets, farm]);

  const handleSavePlot = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('farm_plots').insert([{
        farm_id: numericFarmId,
        boundary: pendingPlotGeoJSON,
        area_acres: pendingPlotAcres,
        ...plotFormData
      }]);
      if (error) throw error;
      
      setIsPlotModalOpen(false);
      setPlotFormData({ name: '', soil_type: 'Loamy', soil_quality: 'Good', drainage: 'Good', water_source: '', notes: '' });
      setPendingPlotGeoJSON(null);
      setPendingPlotAcres(0);
      alert('Plot created successfully!');
    } catch (err) {
      alert('Error saving plot: ' + err.message);
    }
  };

  const handleSavePreset = async (e) => {
    e.preventDefault();
    try {
      const orgId = localStorage.getItem('agripro_current_org_id');
      const { error } = await supabase.from('acre_presets').insert([{
        org_id: orgId,
        name: customPreset.name,
        length_ft: customPreset.length_ft,
        width_ft: customPreset.width_ft
      }]);
      if (error) throw error;
      
      setIsAcreModalOpen(false);
      setCustomPreset({ name: '', length_ft: '', width_ft: '' });
      alert('Preset saved! It will be available shortly.');
    } catch (err) {
      alert('Error saving preset: ' + err.message);
    }
  };

  if (!farm) {
    return (
      <div className="flex flex-col items-center justify-center h-64 agri-card p-12">
        <IconMap size={48} className="text-text-muted mb-4" />
        <p className="text-lg font-bold text-text-primary mb-2">Farm not found</p>
        <p className="text-sm text-text-muted mb-4">The farm may have been deleted or the link is invalid.</p>
        <Button variant="primary" onClick={() => navigate('/farms')}>
          <IconArrowLeft size={16} /> Back to Farms
        </Button>
      </div>
    );
  }

  const totalFarmAcres = farm.area_acres || plots.reduce((sum, p) => sum + (parseFloat(p.area_acres) || 0), 0);
  const tileUrl = TILE_LAYERS[mapType]?.url || TILE_LAYERS.hybrid.url;

  return (
    <div className="-m-4 lg:-m-6 h-[calc(100vh-73px)] relative flex flex-col bg-[#0a0a0a]">
      
      {/* Top Floating Header */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-3">
        <button className="dji-panel p-2 hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => navigate('/farms')}>
          <IconArrowLeft size={20} className="text-white" />
        </button>
        <div className="dji-panel px-4 py-2.5 flex items-center gap-3 cursor-default">
          <IconBuildingCommunity size={16} className="text-emerald-400" />
          <h2 className="text-xs font-bold text-white tracking-wider uppercase">{farm.name}</h2>
        </div>
      </div>

      {/* Layers Menu (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[400] flex flex-col-reverse items-start gap-2">
        <button 
          className={`dji-panel p-3 transition-colors cursor-pointer ${isLayersOpen ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          onClick={() => setIsLayersOpen(!isLayersOpen)}
          title="Map Layers & Overlays"
        >
          <IconLayersIntersect size={24} />
        </button>
        
        {isLayersOpen && (
          <div className="dji-panel p-3 mb-2 flex flex-col gap-4 w-48 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Base Map</p>
              <div className="flex flex-col gap-1">
                {['hybrid', 'satellite', 'street'].map(type => (
                  <button 
                    key={type}
                    className={`text-left px-3 py-1.5 rounded text-xs font-medium transition-colors ${mapType === type ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'}`}
                    onClick={() => setMapType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px w-full bg-slate-700/50" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Data Overlay</p>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'performance', label: 'Profit Heatmap' },
                  { id: 'crop', label: 'Crop Types' },
                  { id: 'soil', label: 'Soil Quality' },
                  { id: 'none', label: 'Boundaries Only' }
                ].map(overlay => (
                  <button 
                    key={overlay.id}
                    className={`text-left px-3 py-1.5 rounded text-xs font-medium transition-colors ${mapOverlay === overlay.id ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800'}`}
                    onClick={() => setMapOverlay(overlay.id)}
                  >
                    {overlay.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vertical Toolbar (Left) */}
      <div className="absolute top-32 left-4 z-[400] flex flex-col gap-2">
        <div className="dji-panel flex flex-col overflow-hidden">
          <button 
            className={`p-3 transition-colors border-b border-slate-700/50 ${isDrawMode === 'farm' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-400'} ${!farm.boundary ? 'animate-pulse bg-emerald-600/20 text-emerald-400' : ''}`}
            onClick={startDrawFarm}
            disabled={!!isDrawMode}
            title={!farm.boundary ? "Draw First Farm Boundary" : "Add Farm Area"}
          >
            <IconMap size={20} />
          </button>
          
          <button 
            className={`p-3 transition-colors border-b border-slate-700/50 ${adjustingFarmBoundary ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-400'} ${!farm.boundary ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => farm.boundary && setAdjustingFarmBoundary(!adjustingFarmBoundary)}
            disabled={!!isDrawMode || !farm.boundary}
            title="Adjust Farm Boundaries"
          >
            <IconDragDrop size={20} />
          </button>
          
          <button 
            className={`p-3 transition-colors border-b border-slate-700/50 ${isDrawMode === 'plot' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-400'} ${!farm.boundary ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={startDrawPlot}
            disabled={!!isDrawMode || !farm.boundary}
            title="Draw Freeform Plot"
          >
            <IconPlus size={20} />
          </button>
          
          <button 
            className={`p-3 transition-colors border-b border-slate-700/50 ${isDrawMode === 'acre_box' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-400'} ${!farm.boundary || !selectedPresetId ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={startAcreBoxTool}
            disabled={!!isDrawMode || !farm.boundary || !selectedPresetId}
            title="Place Single Grid Plot (Select Dimension in Sidebar)"
          >
            <IconSquarePlus size={20} />
          </button>
          
          <button 
            className={`p-3 transition-colors ${isDrawMode === 'grid_preview' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-400'} ${!farm.boundary ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleStartGridPreview}
            disabled={!!isDrawMode || !farm.boundary}
            title="Interactive Grid Generator"
          >
            <IconGridDots size={20} />
          </button>
          
          <button 
            className={`p-3 transition-colors border-t border-slate-700/50 ${isDrawMode === 'cut_plot' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-400'} ${!farm.boundary ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => farm.boundary && setIsDrawMode('cut_plot')}
            disabled={!!isDrawMode || !farm.boundary}
            title="Split Plot (Draw a line across a plot)"
          >
            <IconCut size={20} />
          </button>
          
          <button 
            className={`p-3 transition-colors ${isDrawMode === 'merge_plots' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-400'} ${!farm.boundary ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {
               if (!farm.boundary) return;
               setIsDrawMode('merge_plots');
               setSelectedPlotIdsForMerge([]);
            }}
            disabled={!!isDrawMode || !farm.boundary}
            title="Merge Multiple Plots"
          >
            <IconVectorTriangle size={20} />
          </button>
        </div>
      </div>

      {/* Grid Generator Control Panel */}
      {isDrawMode === 'grid_preview' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] w-full max-w-[500px]">
          <div className="dji-panel p-4 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
              <IconGridDots size={16} /> Interactive Grid Generator
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Width (ft)</label>
                <input type="number" className="dji-input" value={gridParams.width_ft} onChange={e => setGridParams({...gridParams, width_ft: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Length (ft)</label>
                <input type="number" className="dji-input" value={gridParams.length_ft} onChange={e => setGridParams({...gridParams, length_ft: e.target.value})} />
              </div>
              
              <div className="flex flex-col gap-1 col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">X Offset (Left/Right) ({gridParams.offsetX}ft)</label>
                </div>
                <input type="range" min="-1000" max="1000" className="w-full accent-emerald-500" value={gridParams.offsetX} onChange={e => setGridParams({...gridParams, offsetX: e.target.value})} />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Y Offset (Up/Down) ({gridParams.offsetY}ft)</label>
                </div>
                <input type="range" min="-1000" max="1000" className="w-full accent-emerald-500" value={gridParams.offsetY} onChange={e => setGridParams({...gridParams, offsetY: e.target.value})} />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rotation Angle ({gridParams.angle}°)</label>
                <input type="range" min="0" max="360" className="w-full accent-emerald-500" value={gridParams.angle} onChange={e => setGridParams({...gridParams, angle: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <input type="checkbox" id="keepInside" className="accent-emerald-500" checked={gridParams.keepInside} onChange={e => setGridParams({...gridParams, keepInside: e.target.checked})} />
                <label htmlFor="keepInside" className="text-xs text-slate-300">Keep perfectly inside boundary (ignore edges)</label>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700/50">
              <span className="text-xs font-bold text-amber-400">{gridPreviewPlots.length} plots generated</span>
              <div className="flex gap-2">
                <button className="dji-button" onClick={() => setIsDrawMode(null)}>Cancel</button>
                <button className="dji-button-primary" onClick={handleSaveGrid}><IconCheck size={14} className="mr-1"/> Save Grid</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="absolute top-16 left-4 z-[400]">
        <form onSubmit={handleSearch} className="dji-panel flex overflow-hidden">
          <input 
            type="text" 
            placeholder="Search location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 text-xs outline-none w-48 bg-transparent text-white placeholder:text-slate-400"
          />
          <button type="submit" className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border-l border-slate-700/50 cursor-pointer">
            <IconSearch size={14} />
          </button>
        </form>
      </div>

      {/* Sidebar Toggle - Mobile */}
      <div className="absolute bottom-24 right-4 z-[400] lg:hidden">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="dji-panel p-3 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
        >
          {isSidebarOpen ? <IconLayoutSidebarRightCollapse size={24} /> : <IconLayoutSidebarRightExpand size={24} />}
        </button>
      </div>

      <div className="flex-1 relative w-full h-full farm-map-container">
        <MapContainer id="farm-map-container" center={mapCenter} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer url={tileUrl} maxZoom={20} attribution={TILE_LAYERS[mapType]?.attribution} />
            
            <MapController 
              farm={farm} plots={plots} drawMode={isDrawMode} 
              onPlotCreated={handlePlotCreated}
              onFarmBoundaryCreated={handleFarmBoundaryCreated}
              onPlotRedrawn={handlePlotRedrawn}
              onAcreBoxClick={handleAcreBoxClick}
              onPlotCut={handlePlotCut}
              mapRef={mapRef}
            />

            {farm.boundary && (() => {
              try {
                const features = farm.boundary.type === 'FeatureCollection' ? farm.boundary.features : [{ geometry: farm.boundary }];
                
                return features.map((f, idx) => {
                  const positions = geoJSONToLatLngs(f.geometry);
                  if (positions.length > 0) {
                    return (
                      <Polygon 
                        key={`farm-bound-${idx}`}
                        positions={positions} 
                        pathOptions={{ color: '#10b981', weight: 2, dashArray: '5, 8', fillOpacity: 0.1, fillColor: '#059669' }}
                        ref={(ref) => { 
                          if (ref) { 
                            if (!farmLayerRef.current || !Array.isArray(farmLayerRef.current)) farmLayerRef.current = []; 
                            farmLayerRef.current[idx] = ref; 
                          } 
                        }}
                      />
                    );
                  }
                  return null;
                });
              } catch (e) {}
              return null;
            })()}

            {/* Grid Preview Overlays */}
            {isDrawMode === 'grid_preview' && gridPreviewPlots.map((plot, idx) => {
              try {
                const positions = geoJSONToLatLngs(plot.geojson);
                if (positions.length === 0) return null;
                return (
                  <Polygon
                    key={`preview-${idx}`}
                    positions={positions}
                    pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '4, 4', fillColor: '#f59e0b', fillOpacity: 0.3 }}
                  />
                );
              } catch (e) { return null; }
            })}

            {/* Render Actual Plots (Only when not previewing a replacement grid to avoid mess) */}
            {isDrawMode !== 'grid_preview' && plots.map(plot => {
              if (!plot.boundary) return null;
              try {
                const positions = geoJSONToLatLngs(plot.boundary);
                if (positions.length === 0) return null;
                
                // Determine color based on overlay
                let color = '#10b981'; // default emerald
                let fillOpacity = selectedPlot?.id === plot.id ? 0.5 : 0.2;
                
                if (isDrawMode === 'merge_plots') {
                   if (selectedPlotIdsForMerge.includes(plot.id)) {
                      color = '#3b82f6'; // blue
                      fillOpacity = 0.8;
                   } else {
                      color = '#94a3b8'; // grey
                      fillOpacity = 0.2;
                   }
                } else if (mapOverlay === 'performance') {
                  const score = getPlotScore(plot.id, { expenses, revenue, cropCycles, farmPlots: plots, farms });
                  color = getScoreColor(score);
                  fillOpacity = selectedPlot?.id === plot.id ? 0.7 : 0.4;
                } else if (mapOverlay === 'crop') {
                  const activeCycle = cropCycles.find(c => c.plot_id === plot.id && c.status !== 'Harvested' && c.status !== 'Failed');
                  if (activeCycle) {
                    // Generate a color based on crop name hash
                    const hash = activeCycle.crop_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const hue = hash % 360;
                    color = `hsl(${hue}, 70%, 50%)`;
                    fillOpacity = selectedPlot?.id === plot.id ? 0.7 : 0.4;
                  } else {
                    color = '#64748b'; // slate-500
                    fillOpacity = 0.2;
                  }
                } else if (mapOverlay === 'soil') {
                  if (plot.soil_quality === 'Excellent') color = '#3b82f6'; // blue
                  else if (plot.soil_quality === 'Good') color = '#22c55e'; // green
                  else if (plot.soil_quality === 'Fair') color = '#eab308'; // yellow
                  else if (plot.soil_quality === 'Poor') color = '#ef4444'; // red
                  else color = '#94a3b8'; // default gray
                  fillOpacity = selectedPlot?.id === plot.id ? 0.7 : 0.4;
                } else if (mapOverlay === 'none') {
                   color = '#10b981';
                   fillOpacity = selectedPlot?.id === plot.id ? 0.3 : 0.05; // very transparent
                }
                
                return (
                  <Polygon
                    key={plot.id}
                    positions={positions}
                    pathOptions={{ color: color, weight: 1.5, fillColor: color, fillOpacity: fillOpacity }}
                    eventHandlers={{ click: () => { 
                      if (isDrawMode === 'merge_plots') {
                         if (selectedPlotIdsForMerge.includes(plot.id)) {
                            setSelectedPlotIdsForMerge(selectedPlotIdsForMerge.filter(id => id !== plot.id));
                         } else {
                            setSelectedPlotIdsForMerge([...selectedPlotIdsForMerge, plot.id]);
                         }
                      } else {
                         setSelectedPlot(plot); if (!isSidebarOpen) setIsSidebarOpen(true); 
                      }
                    } }}
                    ref={(ref) => { if (ref) { plotLayersRef.current[plot.id] = ref; } }}
                  >
                    <Popup>
                      <div className="font-sans">
                        <h3 className="font-bold text-sm m-0">{plot.name}</h3>
                        <p className="text-xs text-gray-500 m-0">{parseFloat(plot.area_acres || 0).toFixed(2)} Acres</p>
                        <p className="text-xs mt-1 m-0">Soil: {plot.soil_type || '—'} ({plot.soil_quality || 'Unknown'})</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              } catch (e) { return null; }
            })}
          </MapContainer>
        </div>

      {/* SIDEBAR PANEL */}
      {isSidebarOpen && (
        <div className="absolute top-16 right-4 bottom-4 w-full max-w-[340px] z-[400] flex flex-col gap-3 pointer-events-none animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="dji-panel p-4 pointer-events-auto">
            <div className="flex justify-between items-center text-xs mb-3 pb-3 border-b border-slate-700/50">
              <span className="text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
                <IconMapPin size={12}/> Total Farm Area
              </span>
              <span className="font-bold text-emerald-400 text-sm">
                {adjustingFarmBoundary && dynamicAreaAcres !== null 
                  ? <span className="text-amber-400">{dynamicAreaAcres.toFixed(2)} Ac (Live)</span>
                  : `${totalFarmAcres > 0 ? parseFloat(totalFarmAcres).toFixed(2) : '—'} Ac`}
              </span>
            </div>
            
            <div className="mb-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex justify-between items-center">
                <span>Acre Dimension (For Auto-Plots)</span>
                <button onClick={() => setIsAcreModalOpen(true)} className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                  <IconDeviceFloppy size={12}/> New
                </button>
              </div>
              <div className="flex gap-2">
                <select 
                  className="dji-input"
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                >
                  <option value="">-- Select Dimension --</option>
                  {acrePresets.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.length_ft}' x {p.width_ft}')</option>
                  ))}
                </select>
                {farm.boundary && (
                  <button className="dji-button-primary px-2" onClick={startAcreBoxTool} disabled={!!isDrawMode || !selectedPresetId} title="Place single Acre Box">
                    <IconSquarePlus size={14} /> Place
                  </button>
                )}
              </div>
            </div>

            {adjustingFarmBoundary && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg flex flex-col gap-2 mt-2">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Adjusting Boundary</p>
                <p className="text-xs text-slate-300">Drag the white markers on the map to adjust the farm shape.</p>
                <div className="flex gap-2 mt-1">
                  <button className="dji-button flex-1" onClick={() => setAdjustingFarmBoundary(false)}>Cancel</button>
                  <button className="dji-button-primary flex-1" onClick={handleSaveFarmAdjustment}>
                    <IconCheck size={14} className="mr-1"/> Save
                  </button>
                </div>
              </div>
            )}
              
            {farm.boundary && (
              <div className="flex flex-col gap-2 mt-2 border-t border-slate-700/50 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Active Boundaries ({farm.boundary.type === 'FeatureCollection' ? farm.boundary.features.length : 1})</p>
                    {(farm.boundary.type === 'FeatureCollection' ? farm.boundary.features : [{ geometry: farm.boundary }]).map((f, idx) => {
                      const acres = calculateAcresFromLatLngs(geoJSONToLatLngs(f.geometry)[0]);
                      return (
                        <div 
                          key={idx} 
                          className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-md border border-slate-800 text-xs cursor-pointer hover:border-emerald-500/50 transition-colors"
                          onClick={() => {
                            if (mapRef.current) {
                              try {
                                const bounds = L.geoJSON({ type: 'Feature', geometry: f.geometry }).getBounds();
                                if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [30, 30] });
                              } catch(e) {}
                            }
                          }}
                          title="Click to zoom"
                        >
                          <div className="flex items-center gap-2">
                            <IconMapPin size={12} className="text-emerald-400"/>
                            <span className="font-medium text-slate-200">Segment {idx + 1}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-bold">{acres.toFixed(2)} Ac</span>
                            {!adjustingFarmBoundary && (
                               <button 
                                 className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-950/50 rounded transition-colors" 
                                 onClick={(e) => { e.stopPropagation(); handleDeleteSpecificBoundary(idx); }}
                                 title="Delete this segment"
                               >
                                 <IconTrash size={14} />
                               </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

            {isDrawMode && isDrawMode !== 'grid_preview' && (
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <p className="text-[11px] text-emerald-200 bg-emerald-950/40 p-2.5 rounded-md mb-2 border border-emerald-800/50 leading-relaxed">
                  {isDrawMode === 'acre_box' 
                    ? 'Click inside the farm boundary to drop the acre box. It will automatically clip to the borders.' 
                    : isDrawMode === 'redraw_plot'
                    ? 'Redraw the boundary for the selected plot.'
                    : isDrawMode === 'cut_plot'
                    ? 'Draw a line perfectly across a plot to slice it in two.'
                    : isDrawMode === 'merge_plots'
                    ? 'Click to select multiple adjacent plots. Then click Merge.'
                    : 'Click to draw points. Move mouse to screen edges to scroll. Connect back to the first point to finish.'}
                </p>
                
                {isDrawMode === 'merge_plots' && (
                  <button 
                    onClick={handleMergeSelectedPlots} 
                    disabled={selectedPlotIdsForMerge.length < 2}
                    className={`dji-button-primary w-full py-2 mb-2 ${selectedPlotIdsForMerge.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Merge {selectedPlotIdsForMerge.length} Plots
                  </button>
                )}
                
                <button onClick={() => setIsDrawMode(null)} className="text-xs text-rose-400 font-bold hover:text-rose-300 flex items-center justify-center w-full py-1">
                  Cancel Tool
                </button>
              </div>
            )}
          </div>

          <div className="dji-panel flex-1 flex flex-col overflow-hidden pointer-events-auto">
            <div className="p-3 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/40">
              <span className="font-bold text-xs text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                <IconLayersIntersect size={14} className="text-emerald-400"/> 
                Mapped Plots ({plots.length})
              </span>
              <button 
                onClick={() => setIsPlotManagerOpen(true)}
                className="text-xs flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors"
                title="Open Bulk Plot Manager"
              >
                <IconList size={14}/> Manager
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
              {plots.length === 0 ? (
                <div className="text-center py-8 opacity-50 text-slate-400">
                  <IconLayersIntersect size={32} className="mx-auto mb-2 text-slate-500" />
                  <p className="text-xs font-bold">No plots mapped yet.</p>
                </div>
              ) : (
                  plots.map(plot => {
                    const activeCycle = cropCycles.find(c => c.plot_id === plot.id && c.status !== 'Harvested' && c.status !== 'Failed');
                    const score = getPlotScore(plot.id, { expenses, revenue, cropCycles, farmPlots: plots, farms });
                    const isSelected = selectedPlot?.id === plot.id;
                    const isAdjustingThis = adjustingPlotId === plot.id;
                    const plotExpenses = expenses.filter(e => e.plot_id === plot.id);
                    const plotRevenue = revenue.filter(r => r.plot_id === plot.id);
                    const totalExp = plotExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
                    const totalRev = plotRevenue.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                    const plotArea = parseFloat(plot.area_acres) || 0;

                    return (
                      <div 
                        key={plot.id} 
                        onClick={() => {
                          setSelectedPlot(plot);
                          if (mapRef.current && plot.boundary) {
                            try {
                              const bounds = L.geoJSON({ type: 'Feature', geometry: plot.boundary }).getBounds();
                              if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [40, 40] });
                            } catch(e) {}
                          }
                        }}
                        className={`
                          p-3 rounded-lg border transition-all cursor-pointer group
                          ${isSelected ? 'bg-slate-800/80 border-emerald-500' : 'bg-slate-950/40 border-slate-800 hover:border-slate-600'}
                        `}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-200">{plot.name}</h4>
                            <span className="text-xs text-slate-400">{plotArea.toFixed(2)} Acres</span>
                          </div>
                          {score !== null && (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-bold" style={{ color: getScoreColor(score) }}>{getScoreLabel(score)}</span>
                              <span className="text-[10px] text-slate-500">Score: {score}/100</span>
                            </div>
                          )}
                        </div>
                        
                        {activeCycle ? (
                          <div className="mb-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Current Crop</span>
                            <p className="text-xs text-emerald-400 font-medium truncate">{activeCycle.crop_name} • {activeCycle.variety}</p>
                          </div>
                        ) : (
                          <div className="mb-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Current Crop</span>
                            <p className="text-xs text-slate-400 italic">No active cycle</p>
                          </div>
                        )}
                        
                        {isSelected && (
                          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-700/50">
                            {isAdjustingThis ? (
                              <div className="bg-emerald-900/20 p-2 rounded border border-emerald-500/30">
                                <p className="text-[10px] text-emerald-400 mb-2">Adjusting plot boundary. Drag markers on map.</p>
                                <div className="flex gap-2">
                                  <button className="dji-button flex-1" onClick={(e) => { e.stopPropagation(); setAdjustingPlotId(null); }}>Cancel</button>
                                  <button className="dji-button-primary flex-1" onClick={(e) => { e.stopPropagation(); handleSavePlotAdjustment(); }}>Save</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Total Expense</span>
                                  <span className="font-medium text-rose-400">{formatPKR(totalExp)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Total Revenue</span>
                                  <span className="font-medium text-emerald-400">{formatPKR(totalRev)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Profit</span>
                                  <span className={`font-bold ${totalRev - totalExp >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatPKR(totalRev - totalExp)}
                                  </span>
                                </div>
                                
                                <div className="flex gap-2 justify-end mt-2">
                                  <button 
                                    className="text-slate-400 hover:text-emerald-400 p-1.5 hover:bg-slate-800 rounded transition-colors flex items-center gap-1" 
                                    onClick={(e) => { e.stopPropagation(); handleRotatePlot(plot.id, 90); }}
                                    title="Rotate 90°"
                                  >
                                    <IconRotate size={16} /> <span className="text-[10px]">90°</span>
                                  </button>
                                  <button 
                                    className="text-slate-400 hover:text-emerald-400 p-1.5 hover:bg-slate-800 rounded transition-colors flex items-center gap-1" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      const angle = window.prompt('Enter rotation angle (degrees):', '45');
                                      if (angle && !isNaN(parseFloat(angle))) handleRotatePlot(plot.id, parseFloat(angle)); 
                                    }}
                                    title="Rotate Custom Angle"
                                  >
                                    <IconRotate size={16} /> <span className="text-[10px]">...</span>
                                  </button>
                                  <button 
                                    className="text-slate-400 hover:text-emerald-400 p-1.5 hover:bg-slate-800 rounded transition-colors" 
                                    onClick={(e) => { e.stopPropagation(); startRedrawPlot(plot.id); }}
                                    title="Redraw completely"
                                  >
                                    <IconEdit size={16} />
                                  </button>
                                  <button 
                                    className="text-slate-400 hover:text-emerald-400 p-1.5 hover:bg-slate-800 rounded transition-colors" 
                                    onClick={(e) => { e.stopPropagation(); setAdjustingPlotId(plot.id); }}
                                    title="Adjust vertices"
                                  >
                                    <IconDragDrop size={16} />
                                  </button>
                                  <button 
                                    className="text-slate-400 hover:text-rose-400 p-1.5 hover:bg-rose-950/50 rounded transition-colors" 
                                    onClick={(e) => { e.stopPropagation(); handleDeletePlot(plot.id); }}
                                    title="Delete plot"
                                  >
                                    <IconTrash size={16} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      {/* Plot Modal */}
      <Modal isOpen={isPlotModalOpen} onClose={() => setIsPlotModalOpen(false)} title="Add New Plot">
        <form onSubmit={handleSavePlot} className="space-y-4">
          <div className="bg-primary/10 p-3 rounded-md mb-4 flex justify-between items-center">
            <span className="text-sm font-medium text-primary">Calculated Area:</span>
            <span className="font-bold text-primary">{parseFloat(pendingPlotAcres).toFixed(2)} Acres</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="agri-label">Plot Name *</label>
            <input type="text" className="agri-input" required value={plotFormData.name} onChange={e => setPlotFormData({...plotFormData, name: e.target.value})} placeholder="e.g. North Field" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Soil Type</label>
              <select className="agri-input" value={plotFormData.soil_type} onChange={e => setPlotFormData({...plotFormData, soil_type: e.target.value})}>
                <option>Loamy</option><option>Clay</option><option>Sandy</option><option>Silt</option><option>Alluvial</option><option>Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Drainage</label>
              <select className="agri-input" value={plotFormData.drainage} onChange={e => setPlotFormData({...plotFormData, drainage: e.target.value})}>
                <option>Good</option><option>Moderate</option><option>Poor</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="agri-label">Notes</label>
            <textarea className="agri-input min-h-[80px]" value={plotFormData.notes} onChange={e => setPlotFormData({...plotFormData, notes: e.target.value})} placeholder="Any additional info..."></textarea>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsPlotModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1">Save Plot</Button>
          </div>
        </form>
      </Modal>

      {/* Preset Modal */}
      <Modal isOpen={isAcreModalOpen} onClose={() => setIsAcreModalOpen(false)} title="Create Acre Dimension">
        <form onSubmit={handleSavePreset} className="space-y-4">
          <p className="text-sm text-text-muted mb-4">Define a custom dimension preset (e.g. Sindh Standard). It will be available for future use.</p>
          <div className="flex flex-col gap-1">
            <label className="agri-label">Preset Name *</label>
            <input type="text" className="agri-input" required value={customPreset.name} onChange={e => setCustomPreset({...customPreset, name: e.target.value})} placeholder="e.g. Sindh Standard" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Length (Feet) *</label>
              <input type="number" step="0.1" className="agri-input" required value={customPreset.length_ft} onChange={e => setCustomPreset({...customPreset, length_ft: e.target.value})} placeholder="207" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Width (Feet) *</label>
              <input type="number" step="0.1" className="agri-input" required value={customPreset.width_ft} onChange={e => setCustomPreset({...customPreset, width_ft: e.target.value})} placeholder="207" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAcreModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1">Save Dimension</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Plot Manager Modal */}
      <Modal isOpen={isPlotManagerOpen} onClose={() => setIsPlotManagerOpen(false)} title="Plot Manager" size="4xl">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-200 text-lg">Manage {plots.length} Plots</h3>
            {bulkSelectedIds.length > 0 && (
              <button 
                className="dji-button-danger flex items-center gap-1"
                onClick={handleBulkDelete}
              >
                <IconTrash size={16} /> Delete Selected ({bulkSelectedIds.length})
              </button>
            )}
          </div>
          
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="accent-emerald-500"
                        checked={plots.length > 0 && bulkSelectedIds.length === plots.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedIds(plots.map(p => p.id));
                          } else {
                            setBulkSelectedIds([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3 text-slate-300 font-bold uppercase tracking-wider text-xs">Name</th>
                    <th className="p-3 text-slate-300 font-bold uppercase tracking-wider text-xs">Area (Acres)</th>
                    <th className="p-3 text-slate-300 font-bold uppercase tracking-wider text-xs">Soil Quality</th>
                    <th className="p-3 text-slate-300 font-bold uppercase tracking-wider text-xs">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {plots.map(plot => {
                    const score = getPlotScore(plot.id, { expenses, revenue, cropCycles, farmPlots: plots, farms });
                    return (
                      <tr key={plot.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox" 
                            className="accent-emerald-500"
                            checked={bulkSelectedIds.includes(plot.id)}
                            onChange={(e) => {
                              if (e.target.checked) setBulkSelectedIds([...bulkSelectedIds, plot.id]);
                              else setBulkSelectedIds(bulkSelectedIds.filter(id => id !== plot.id));
                            }}
                          />
                        </td>
                        <td className="p-3 font-medium text-emerald-400">{plot.name}</td>
                        <td className="p-3 text-slate-300">{parseFloat(plot.area_acres || 0).toFixed(2)}</td>
                        <td className="p-3 text-slate-300">{plot.soil_quality || 'Unknown'}</td>
                        <td className="p-3">
                          {score !== null ? (
                            <span className="font-bold text-xs" style={{ color: getScoreColor(score) }}>
                              {score}/100
                            </span>
                          ) : <span className="text-slate-500 italic text-xs">No Data</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {plots.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-500 italic">No plots available to manage.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="dji-button" onClick={() => setIsPlotManagerOpen(false)}>Close</button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default FarmMap;
