import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateAcresFromLatLngs, layerToGeoJSON, geoJSONToLatLngs, DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS, createIntersectedAcreBox } from '../../utils/geoUtils';
import { getPlotScore, getScoreColor, getScoreLabel } from '../../utils/perAcreCalc';
import { formatPKR } from '../../utils/format';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import { IconMap, IconPlus, IconArrowLeft, IconSearch, IconLayersIntersect, IconMapPin, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand, IconSquarePlus, IconDeviceFloppy, IconTrash, IconEdit, IconDragDrop, IconCheck } from '@tabler/icons-react';

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
  const farmLayerRef = useRef(null);
  
  const [mapType, setMapType] = useState('hybrid');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawMode, setIsDrawMode] = useState(null);
  const [redrawPlotId, setRedrawPlotId] = useState(null);
  
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
    if (farmLayerRef.current) {
      if (adjustingFarmBoundary) {
        farmLayerRef.current.pm.enable({ allowSelfIntersection: false, preventMarkerRemoval: false });
        const updateArea = () => {
          try {
            const acres = calculateAcresFromLatLngs(farmLayerRef.current.getLatLngs()[0]);
            setDynamicAreaAcres(acres);
          } catch(e) {}
        };
        farmLayerRef.current.on('pm:markerdrag', updateArea);
        farmLayerRef.current.on('pm:edit', updateArea);
        updateArea();
      } else {
        farmLayerRef.current.pm.disable();
        farmLayerRef.current.off('pm:markerdrag');
        farmLayerRef.current.off('pm:edit');
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
      const { error } = await supabase.from('farms').update({
        boundary: geojson,
        area_acres: acres,
        latitude: lat,
        longitude: lng
      }).eq('id', numericFarmId);
      if (error) throw error;
      alert('Farm boundary saved!');
    } catch (err) {
      alert('Error saving farm boundary: ' + err.message);
    }
  }, [numericFarmId]);

  const handleSaveFarmAdjustment = async () => {
    if (!farmLayerRef.current) return;
    try {
      const layer = farmLayerRef.current;
      const geojson = layerToGeoJSON(layer);
      const latLngs = layer.getLatLngs()[0];
      const acres = calculateAcresFromLatLngs(latLngs);
      const bounds = layer.getBounds();
      const center = bounds.getCenter();

      const { error } = await supabase.from('farms').update({
        boundary: geojson,
        area_acres: acres,
        latitude: center.lat,
        longitude: center.lng
      }).eq('id', numericFarmId);
      if (error) throw error;
      
      setAdjustingFarmBoundary(false);
      alert('Farm boundary adjustments saved!');
    } catch (err) {
      alert('Error saving boundary: ' + err.message);
    }
  };

  const handleDeleteFarmBoundary = async () => {
    if (!window.confirm("Are you sure you want to delete the farm boundary? The plots inside will remain.")) return;
    try {
      const { error } = await supabase.from('farms').update({
        boundary: null,
        area_acres: null,
      }).eq('id', numericFarmId);
      if (error) throw error;
      alert('Farm boundary deleted.');
    } catch (err) {
      alert('Error: ' + err.message);
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
      alert('Error saving adjustments: ' + err.message);
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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/farms')}>
            <IconArrowLeft size={18} /> Back
          </Button>
          <h2 className="text-xl font-bold text-text-primary">Map View: {farm.name}</h2>
        </div>
        <Button variant="outline" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden">
          {isSidebarOpen ? <IconLayoutSidebarRightCollapse size={18} /> : <IconLayoutSidebarRightExpand size={18} />}
          {isSidebarOpen ? ' Hide Panel' : ' Show Panel'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* MAP CONTAINER */}
        <div className={`flex-1 agri-card relative overflow-hidden farm-map-container rounded-xl border border-border transition-all duration-300`} style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
          
          <div className="absolute top-4 left-14 z-[400] flex flex-col gap-2">
            <form onSubmit={handleSearch} className="flex bg-white shadow-md rounded-md overflow-hidden border border-border">
              <input 
                type="text" 
                placeholder="Search location..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 text-sm outline-none w-48 text-text-primary bg-white"
              />
              <button type="submit" className="px-3 hover:bg-bg text-text-muted transition-colors">
                <IconSearch size={16} />
              </button>
            </form>
          </div>

          <div className="absolute top-4 right-4 z-[400] bg-white rounded-md shadow-md border border-border overflow-hidden flex">
            <button 
              className={`px-3 py-2 text-sm font-medium ${mapType === 'hybrid' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg'}`}
              onClick={() => setMapType('hybrid')}
            >
              Hybrid
            </button>
            <button 
              className={`px-3 py-2 text-sm font-medium ${mapType === 'satellite' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg'}`}
              onClick={() => setMapType('satellite')}
            >
              Satellite
            </button>
            <button 
              className={`px-3 py-2 text-sm font-medium ${mapType === 'street' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg'}`}
              onClick={() => setMapType('street')}
            >
              Street
            </button>
          </div>
          
          <div className="absolute bottom-6 right-4 z-[400] hidden lg:block">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="bg-white p-2 rounded-full shadow-lg border border-border text-text-secondary hover:text-primary transition-colors"
              title={isSidebarOpen ? "Hide Panel" : "Show Panel"}
            >
              {isSidebarOpen ? <IconLayoutSidebarRightCollapse size={24} /> : <IconLayoutSidebarRightExpand size={24} />}
            </button>
          </div>

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
                const positions = geoJSONToLatLngs(farm.boundary);
                if (positions.length > 0) {
                  return (
                    <Polygon 
                      positions={positions} 
                      pathOptions={{ color: '#1a4d2e', weight: 3, dashArray: '5, 10', fillOpacity: 0.05, fillColor: '#1a4d2e' }}
                      ref={(ref) => { farmLayerRef.current = ref; }}
                    />
                  );
                }
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
                    pathOptions={{ color: color, weight: 2, fillColor: color, fillOpacity: selectedPlot?.id === plot.id ? 0.6 : 0.35 }}
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

        {/* SIDEBAR */}
        {isSidebarOpen && (
          <div className="w-full lg:w-80 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="agri-card p-4">
              <h3 className="font-bold text-lg text-text-primary mb-1">{farm.name}</h3>
              <div className="flex justify-between items-center text-sm mb-3 pb-3 border-b border-border">
                <span className="text-text-muted flex items-center gap-1"><IconMapPin size={14}/> Area</span>
                <span className="font-bold text-text-primary">
                  {adjustingFarmBoundary && dynamicAreaAcres !== null 
                    ? <span className="text-primary">{dynamicAreaAcres.toFixed(2)} Ac (Live)</span>
                    : `${totalFarmAcres > 0 ? parseFloat(totalFarmAcres).toFixed(2) : '—'} Ac`}
                </span>
              </div>
              
              {!farm.boundary ? (
                <Button variant="primary" className="w-full" onClick={startDrawFarm} disabled={!!isDrawMode}>
                  <IconMap size={16} /> Draw Boundary
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  
                  {adjustingFarmBoundary ? (
                    <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg flex flex-col gap-2">
                      <p className="text-xs font-bold text-primary">Adjusting Boundary</p>
                      <p className="text-xs text-text-muted">Drag the white markers on the map to adjust the farm shape.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 py-1 h-8 text-xs" onClick={() => setAdjustingFarmBoundary(false)}>Cancel</Button>
                        <Button variant="primary" className="flex-1 py-1 h-8 text-xs bg-primary text-white" onClick={handleSaveFarmAdjustment}>
                          <IconCheck size={14} className="mr-1"/> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={startDrawPlot} disabled={!!isDrawMode}>
                        <IconPlus size={16} /> Draw Plot
                      </Button>
                      <Button variant="outline" className="px-2" onClick={() => setAdjustingFarmBoundary(true)} title="Adjust Farm Boundary">
                        <IconDragDrop size={16} className="text-primary"/>
                      </Button>
                      <Button variant="outline" className="px-2 text-expense border-expense/30 hover:bg-expense/10" onClick={handleDeleteFarmBoundary} title="Delete Farm Boundary">
                        <IconTrash size={16} />
                      </Button>
                    </div>
                  )}
                  
                  <div className="border border-border rounded-lg p-3 bg-bg-alt">
                    <div className="text-xs font-bold text-text-secondary uppercase mb-2 flex justify-between items-center">
                      <span>Place Acre Box</span>
                      <button onClick={() => setIsAcreModalOpen(true)} className="text-primary hover:underline flex items-center gap-1">
                        <IconDeviceFloppy size={12}/> New
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <select 
                        className="agri-input h-9 text-xs flex-1 px-2"
                        value={selectedPresetId}
                        onChange={(e) => setSelectedPresetId(e.target.value)}
                      >
                        <option value="">-- Select Dimension --</option>
                        {acrePresets.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.length_ft}' x {p.width_ft}')</option>
                        ))}
                      </select>
                      <Button variant="primary" className="px-2" onClick={startAcreBoxTool} disabled={!!isDrawMode || !selectedPresetId}>
                        <IconSquarePlus size={16} /> Place
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isDrawMode && (
                <div className="mt-3">
                  <p className="text-xs text-accent-blue font-medium bg-blue-50 p-2 rounded-md mb-2 border border-blue-100">
                    {isDrawMode === 'acre_box' 
                      ? 'Click anywhere inside the farm boundary to drop the acre box. It will automatically clip to the borders.' 
                      : isDrawMode === 'redraw_plot'
                      ? 'Redraw the boundary for the selected plot.'
                      : 'Click on the map to draw points. Move mouse to screen edges to scroll map. Connect back to the first point to finish.'}
                  </p>
                  <button onClick={cancelDraw} className="text-xs text-expense font-bold hover:underline">
                    Cancel Tool
                  </button>
                </div>
              )}
            </div>

            <div className="agri-card flex-1 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 430px)', minHeight: '300px' }}>
              <div className="p-3 border-b border-border flex justify-between items-center bg-bg-alt">
                <span className="font-bold text-sm text-text-primary flex items-center gap-2">
                  <IconLayersIntersect size={16} className="text-primary"/> 
                  Plots ({plots.length})
                </span>
              </div>
              
              <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {plots.length === 0 ? (
                  <div className="text-center py-8 opacity-50">
                    <IconLayersIntersect size={32} className="mx-auto mb-2" />
                    <p className="text-sm font-bold">No plots mapped yet.</p>
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
                              if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [30, 30] });
                            } catch (e) {}
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-text-primary text-sm">{plot.name}</span>
                          <Badge variant={score !== null ? (score > 70 ? 'success' : score > 40 ? 'warning' : 'danger') : 'info'}>
                            {getScoreLabel(score)}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs text-text-muted">
                          <span>{plotArea.toFixed(2)} Ac</span>
                          <span>{activeCycle ? activeCycle.crop : 'Fallow'}</span>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            {isAdjustingThis ? (
                              <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg flex flex-col gap-2 my-2">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-bold text-primary">Adjusting Plot</p>
                                  <p className="text-xs font-bold text-primary">{dynamicAreaAcres !== null ? dynamicAreaAcres.toFixed(2) : plotArea.toFixed(2)} Ac</p>
                                </div>
                                <p className="text-xs text-text-muted">Drag the white markers on the map to adjust the plot shape.</p>
                                <div className="flex gap-2">
                                  <Button variant="outline" className="flex-1 py-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); setAdjustingPlotId(null); }}>Cancel</Button>
                                  <Button variant="primary" className="flex-1 py-1 h-8 text-xs bg-primary text-white" onClick={(e) => { e.stopPropagation(); handleSavePlotAdjustment(); }}>
                                    <IconCheck size={14} className="mr-1"/> Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-muted">Total Expense</span>
                                  <span className="font-medium text-expense">{formatPKR(totalExp)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-muted">Total Revenue</span>
                                  <span className="font-medium text-revenue">{formatPKR(totalRev)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-muted">Profit</span>
                                  <span className={`font-bold ${totalRev - totalExp >= 0 ? 'text-revenue' : 'text-expense'}`}>
                                    {formatPKR(totalRev - totalExp)}
                                  </span>
                                </div>
                                
                                <div className="flex gap-2 pt-2 border-t border-border mt-2">
                                  <Button variant="outline" className="flex-1 py-1 text-xs h-7" onClick={(e) => { e.stopPropagation(); startRedrawPlot(plot.id); }} title="Redraw completely">
                                    <IconEdit size={14} /> Redraw
                                  </Button>
                                  <Button variant="outline" className="flex-1 py-1 text-xs h-7" onClick={(e) => { e.stopPropagation(); setAdjustingPlotId(plot.id); }} title="Drag vertices">
                                    <IconDragDrop size={14} /> Adjust
                                  </Button>
                                  <Button variant="outline" className="px-2 py-1 text-xs h-7 text-expense border-expense/30 hover:bg-expense/10" onClick={(e) => { e.stopPropagation(); handleDeletePlot(plot.id); }}>
                                    <IconTrash size={14} />
                                  </Button>
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
      </div>

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
