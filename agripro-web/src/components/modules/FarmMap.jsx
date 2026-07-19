import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateAcresFromLatLngs, layerToGeoJSON, geoJSONToLatLngs, DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS, createIntersectedAcreBox, addPolygonToFeatureCollection, autoGeneratePlotsForBoundary, autoAdjustPlotsToBoundary, rotatePolygon90Degrees, getOverlapArea } from '../../utils/geoUtils';
import { getPlotScore, getScoreColor, getScoreLabel } from '../../utils/perAcreCalc';
import { formatPKR } from '../../utils/format';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import { IconMap, IconPlus, IconArrowLeft, IconSearch, IconLayersIntersect, IconMapPin, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand, IconSquarePlus, IconDeviceFloppy, IconTrash, IconEdit, IconDragDrop, IconCheck, IconBuildingCommunity, IconRotate, IconHandGrab, IconGridDots } from '@tabler/icons-react';

const MapController = ({ farm, plots, drawMode, onPlotCreated, onFarmBoundaryCreated, onAcreBoxClick, onPlotRedrawn, mapRef }) => {
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
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawMode, setIsDrawMode] = useState(null);
  const [redrawPlotId, setRedrawPlotId] = useState(null);
  
  // Geoman Vertex Adjustment States
  const [adjustingPlotId, setAdjustingPlotId] = useState(null);
  const [draggingPlotId, setDraggingPlotId] = useState(null);
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
    } else if (draggingPlotId && plotLayersRef.current[draggingPlotId]) {
      const layer = plotLayersRef.current[draggingPlotId];
      if (layer && layer.pm) {
        layer.pm.enableLayerDrag();
        
        const handleDragEnd = async (e) => {
          const draggedLayer = e.layer;
          const draggedGeoJSON = layerToGeoJSON(draggedLayer);
          
          let maxOverlapArea = 0;
          let targetPlotId = null;
          let targetPlotGeoJSON = null;
          
          plots.forEach(p => {
             if (p.id !== draggingPlotId && p.boundary) {
               const overlap = getOverlapArea(draggedGeoJSON, p.boundary);
               if (overlap > maxOverlapArea && overlap > 0) {
                 maxOverlapArea = overlap;
                 targetPlotId = p.id;
                 targetPlotGeoJSON = p.boundary;
               }
             }
          });
          
          if (targetPlotId && maxOverlapArea > 50) { // arbitrary threshold > 50 sqm
            const confirmSwap = window.confirm('Swap these two plots?');
            if (confirmSwap) {
               try {
                 const plotA_oldBoundary = plots.find(p => p.id === draggingPlotId).boundary;
                 const plotB_oldBoundary = targetPlotGeoJSON;
                 
                 await Promise.all([
                   supabase.from('farm_plots').update({ boundary: plotB_oldBoundary }).eq('id', draggingPlotId),
                   supabase.from('farm_plots').update({ boundary: plotA_oldBoundary }).eq('id', targetPlotId)
                 ]);
               } catch (err) {
                 alert('Error swapping plots: ' + err.message);
               }
            } else {
               // Revert by disabling drag and triggering re-render
               setDraggingPlotId(null);
            }
          } else {
             try {
                const newAcres = calculateAcresFromLatLngs(draggedLayer.getLatLngs()[0]);
                await supabase.from('farm_plots').update({ boundary: draggedGeoJSON, area_acres: newAcres }).eq('id', draggingPlotId);
             } catch(err) {
                alert('Error moving plot: ' + err.message);
             }
          }
          setDraggingPlotId(null);
          layer.pm.disableLayerDrag();
        };
        
        layer.on('pm:dragend', handleDragEnd);
      }
    } else if (!adjustingFarmBoundary) {
      setDynamicAreaAcres(null);
    }
  }, [adjustingPlotId, draggingPlotId, plots, adjustingFarmBoundary]);

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
          const promises = adjustedPlots.map(p => 
            supabase.from('farm_plots').update({ boundary: p.boundary, area_acres: p.area_acres }).eq('id', p.id)
          );
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
          const promises = adjustedPlots.map(p => 
            supabase.from('farm_plots').update({ boundary: p.boundary, area_acres: p.area_acres }).eq('id', p.id)
          );
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

  const handleRotatePlot = async (plotId) => {
    const plot = plots.find(p => p.id === plotId);
    if (!plot || !plot.boundary) return;
    
    try {
      const rotatedGeoJSON = rotatePolygon90Degrees(plot.boundary);
      await supabase.from('farm_plots').update({ boundary: rotatedGeoJSON }).eq('id', plotId);
    } catch (err) {
      alert('Error rotating plot: ' + err.message);
    }
  };

  const handleAutoFillFarm = async () => {
    if (!selectedPresetId) {
      alert("Please select an Acre Dimension first!");
      return;
    }
    const preset = acrePresets.find(p => p.id === selectedPresetId);
    if (!preset) return;
    
    if (plots.length > 0) {
      const confirmOverwrite = window.confirm("This will erase all current plots and auto-fill the entire farm boundary. Proceed?");
      if (!confirmOverwrite) return;
    }
    
    try {
      const generatedPlots = autoGeneratePlotsForBoundary(farm.boundary, preset.length_ft, preset.width_ft);
      
      if (generatedPlots.length === 0) {
         alert('Could not generate any plots. Boundary might be too small or irregular for this dimension.');
         return;
      }
      
      // Delete existing plots
      if (plots.length > 0) {
         await supabase.from('farm_plots').delete().eq('farm_id', numericFarmId);
      }
      
      // Insert new plots
      const plotsToInsert = generatedPlots.map((gp, idx) => ({
         farm_id: numericFarmId,
         name: `Auto Plot ${idx + 1}`,
         area_acres: gp.acres,
         boundary: gp.geojson,
         soil_type: 'Loamy',
         soil_quality: 'Good'
      }));
      
      const { error } = await supabase.from('farm_plots').insert(plotsToInsert);
      if (error) throw error;
      
      alert(`Successfully generated ${plotsToInsert.length} plots!`);
    } catch (err) {
      alert("Error auto-filling farm: " + err.message);
    }
  };

  const handleDeletePlot = async (plotId) => {
    if (!window.confirm("Are you sure you want to completely delete this plot?")) return;
    try {
      const { error } = await supabase.from('farm_plots').delete().eq('id', plotId);
      if (error) throw error;
      if (selectedPlot?.id === plotId) setSelectedPlot(null);
      alert('Plot deleted successfully.');
    } catch (err) {
      alert('Error deleting plot: ' + err.message);
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

      {/* Map Type Controls */}
      <div className="absolute top-4 right-4 z-[400] dji-panel flex overflow-hidden">
        <button 
          className={`px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer ${mapType === 'hybrid' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          onClick={() => setMapType('hybrid')}
        >
          Hybrid
        </button>
        <button 
          className={`px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-colors border-l border-r border-slate-700/50 cursor-pointer ${mapType === 'satellite' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          onClick={() => setMapType('satellite')}
        >
          Satellite
        </button>
        <button 
          className={`px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-colors cursor-pointer ${mapType === 'street' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
          onClick={() => setMapType('street')}
        >
          Street
        </button>
      </div>

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

            {plots.map(plot => {
              if (!plot.boundary) return null;
              try {
                const positions = geoJSONToLatLngs(plot.boundary);
                if (positions.length === 0) return null;
                const score = getPlotScore(plot.id, { expenses, revenue, cropCycles, farmPlots: plots, farms });
                const color = getScoreColor(score);
                
                return (
                  <Polygon
                    key={plot.id}
                    positions={positions}
                    pathOptions={{ color: color, weight: 1.5, fillColor: color, fillOpacity: selectedPlot?.id === plot.id ? 0.5 : 0.2 }}
                    eventHandlers={{ click: () => { setSelectedPlot(plot); if (!isSidebarOpen) setIsSidebarOpen(true); } }}
                    ref={(ref) => { if (ref) { plotLayersRef.current[plot.id] = ref; } }}
                  >
                    <Popup>
                      <div className="font-sans">
                        <h3 className="font-bold text-sm m-0">{plot.name}</h3>
                        <p className="text-xs text-gray-500 m-0">{parseFloat(plot.area_acres || 0).toFixed(2)} Acres</p>
                        <p className="text-xs mt-1 m-0">Soil: {plot.soil_type || '—'}</p>
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
              {farm.boundary && (
                <button 
                  className="dji-button-primary w-full mt-2 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white" 
                  onClick={handleAutoFillFarm} 
                  disabled={!!isDrawMode || !selectedPresetId} 
                  title="Auto-fill farm with grid"
                >
                  <IconGridDots size={16} /> Auto-Fill Farm
                </button>
              )}
            </div>

            {!farm.boundary ? (
              <button className="dji-button-primary w-full py-2" onClick={startDrawFarm} disabled={!!isDrawMode}>
                <IconMap size={16} /> Draw First Farm Boundary
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                
                {adjustingFarmBoundary ? (
                  <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Adjusting Boundary</p>
                    <p className="text-xs text-slate-300">Drag the white markers on the map to adjust the farm shape.</p>
                    <div className="flex gap-2 mt-1">
                      <button className="dji-button flex-1" onClick={() => setAdjustingFarmBoundary(false)}>Cancel</button>
                      <button className="dji-button-primary flex-1" onClick={handleSaveFarmAdjustment}>
                        <IconCheck size={14} className="mr-1"/> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button className={`dji-button ${isDrawMode === 'farm' ? 'dji-button-active' : ''}`} onClick={startDrawFarm} disabled={!!isDrawMode}>
                      <IconMap size={14} /> Add Area
                    </button>
                    <button className={`dji-button ${isDrawMode === 'plot' ? 'dji-button-active' : ''}`} onClick={startDrawPlot} disabled={!!isDrawMode}>
                      <IconPlus size={14} /> Draw Plot
                    </button>
                    <button className="dji-button col-span-2" onClick={() => setAdjustingFarmBoundary(true)} title="Adjust Farm Boundary">
                      <IconDragDrop size={14} className="text-emerald-400 mr-1"/> Adjust Farm Boundaries
                    </button>
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
              </div>
            )}

            {isDrawMode && (
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <p className="text-[11px] text-emerald-200 bg-emerald-950/40 p-2.5 rounded-md mb-2 border border-emerald-800/50 leading-relaxed">
                  {isDrawMode === 'acre_box' 
                    ? 'Click inside the farm boundary to drop the acre box. It will automatically clip to the borders.' 
                    : isDrawMode === 'redraw_plot'
                    ? 'Redraw the boundary for the selected plot.'
                    : 'Click to draw points. Move mouse to screen edges to scroll. Connect back to the first point to finish.'}
                </p>
                <button onClick={cancelDraw} className="text-xs text-rose-400 font-bold hover:text-rose-300 flex items-center justify-center w-full py-1">
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
                                    className="text-slate-400 hover:text-emerald-400 p-1.5 hover:bg-slate-800 rounded transition-colors" 
                                    onClick={(e) => { e.stopPropagation(); handleRotatePlot(plot.id); }}
                                    title="Rotate 90° (Horizontal/Vertical)"
                                  >
                                    <IconRotate size={16} />
                                  </button>
                                  <button 
                                    className={`p-1.5 rounded transition-colors ${draggingPlotId === plot.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'}`} 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (draggingPlotId === plot.id) {
                                        setDraggingPlotId(null);
                                      } else {
                                        setDraggingPlotId(plot.id); 
                                        alert('Drag mode enabled! Drag the plot on the map to move it, or drop it onto another plot to swap their positions.');
                                      }
                                    }}
                                    title={draggingPlotId === plot.id ? "Cancel drag" : "Drag to move or swap"}
                                  >
                                    <IconHandGrab size={16} />
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

    </div>
  );
};

export default FarmMap;
