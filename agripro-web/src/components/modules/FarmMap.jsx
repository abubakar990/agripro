import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateAcresFromLatLngs, layerToGeoJSON, geoJSONToLatLngs, DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS } from '../../utils/geoUtils';
import { getPlotScore, getScoreColor, getScoreLabel, formatPerAcre } from '../../utils/perAcreCalc';
import { formatPKR } from '../../utils/format';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import { IconMap, IconPlus, IconArrowLeft, IconSearch, IconLayersIntersect, IconDroplet, IconPlant, IconMapPin } from '@tabler/icons-react';

// A component to manage geoman controls and map fitting
const MapController = ({ farm, plots, drawMode, onPlotCreated, onFarmBoundaryCreated }) => {
  const map = useMap();
  
  useEffect(() => {
    // Add PM controls
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: false, // We'll trigger this manually via buttons
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
    });

    return () => {
      map.pm.removeControls();
    };
  }, [map]);

  // Handle pm:create event
  useEffect(() => {
    const handleCreate = (e) => {
      const layer = e.layer;
      const geojson = layerToGeoJSON(layer);
      const latLngs = layer.getLatLngs()[0]; // Assumes single polygon ring
      const acres = calculateAcresFromLatLngs(latLngs);
      
      // Calculate center of polygon for farm
      const bounds = layer.getBounds();
      const center = bounds.getCenter();

      if (drawMode === 'farm') {
        onFarmBoundaryCreated(geojson, acres, center.lat, center.lng);
      } else if (drawMode === 'plot') {
        onPlotCreated(geojson, acres);
      }
      
      // Remove the drawn layer immediately since we will re-render from state/DB
      map.removeLayer(layer);
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
    };
  }, [map, drawMode, onPlotCreated, onFarmBoundaryCreated]);

  // Fit bounds when farm or plots change
  useEffect(() => {
    if (farm?.boundary) {
      const bounds = L.geoJSON(farm.boundary).getBounds();
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (farm?.latitude && farm?.longitude) {
      map.setView([farm.latitude, farm.longitude], 15);
    } else if (plots && plots.length > 0) {
      const allPolygons = L.featureGroup(
        plots.map(p => p.boundary ? L.geoJSON(p.boundary) : null).filter(Boolean)
      );
      if (allPolygons.getLayers().length > 0) {
          map.fitBounds(allPolygons.getBounds(), { padding: [20, 20] });
      }
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [map, farm, plots]);

  return null;
};

const FarmMap = ({ farms, farmPlots, cropCycles, expenses, revenue }) => {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const [mapType, setMapType] = useState('satellite');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawMode, setIsDrawMode] = useState(null); // 'farm' | 'plot' | null
  
  // Modal states
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

  const farm = useMemo(() => farms.find(f => f.id === farmId), [farms, farmId]);
  const plots = useMemo(() => farmPlots.filter(p => p.farm_id === farmId), [farmPlots, farmId]);

  const mapCenter = useMemo(() => {
    if (farm?.latitude && farm?.longitude) return [farm.latitude, farm.longitude];
    return DEFAULT_CENTER; // [31.4187, 73.0791] default
  }, [farm]);

  // Handle Search Location
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        // Dispatch custom event to map to flyTo this location
        const mapEl = document.getElementById('farm-map-container');
        if (mapEl) {
          const mapInstance = mapEl._leaflet_map;
          if (mapInstance) {
            mapInstance.flyTo([data[0].lat, data[0].lon], 15);
          }
        }
      }
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  // Turn on draw mode for Farm
  const startDrawFarm = () => {
    setIsDrawMode('farm');
    const mapEl = document.getElementById('farm-map-container');
    if (mapEl?._leaflet_map) {
      mapEl._leaflet_map.pm.enableDraw('Polygon', {
        snappable: true,
        snapDistance: 20,
      });
    }
  };

  // Turn on draw mode for Plot
  const startDrawPlot = () => {
    setIsDrawMode('plot');
    const mapEl = document.getElementById('farm-map-container');
    if (mapEl?._leaflet_map) {
      mapEl._leaflet_map.pm.enableDraw('Polygon', {
        snappable: true,
        snapDistance: 20,
      });
    }
  };

  // When Farm boundary is created
  const handleFarmBoundaryCreated = async (geojson, acres, lat, lng) => {
    setIsDrawMode(null);
    try {
      const { error } = await supabase.from('farms').update({
        boundary: geojson,
        area_acres: acres,
        latitude: lat,
        longitude: lng
      }).eq('id', farmId);
      if (error) throw error;
      // You'll need to refresh parent or hope realtime subscriptions pick it up
      // If we don't have realtime here, we might just alert success
      alert('Farm boundary saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving farm boundary');
    }
  };

  // When Plot boundary is created, show modal
  const handlePlotCreated = (geojson, acres) => {
    setIsDrawMode(null);
    setPendingPlotGeoJSON(geojson);
    setPendingPlotAcres(acres);
    setIsPlotModalOpen(true);
  };

  // Save Plot form
  const handleSavePlot = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('farm_plots').insert([{
        farm_id: farmId,
        boundary: pendingPlotGeoJSON,
        area_acres: pendingPlotAcres,
        ...plotFormData
      }]);
      if (error) throw error;
      
      setIsPlotModalOpen(false);
      setPlotFormData({
        name: '',
        soil_type: 'Loamy',
        soil_quality: 'Good',
        drainage: 'Good',
        water_source: '',
        notes: ''
      });
      setPendingPlotGeoJSON(null);
      setPendingPlotAcres(0);
      alert('Plot created successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving plot');
    }
  };

  if (!farm) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p>Farm not found...</p>
        <Button variant="ghost" onClick={() => navigate('/farms')}>Back to Farms</Button>
      </div>
    );
  }

  const totalFarmAcres = farm.area_acres || plots.reduce((sum, p) => sum + (parseFloat(p.area_acres) || 0), 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/farms')}>
          <IconArrowLeft size={18} /> Back
        </Button>
        <h2 className="text-xl font-bold text-text-primary">Map View: {farm.name}</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* MAP CONTAINER */}
        <div className="flex-1 agri-card relative overflow-hidden farm-map-container h-[calc(100vh-180px)] rounded-xl border border-border-light z-0">
          
          {/* Top Controls Overlay */}
          <div className="absolute top-4 left-14 z-[400] flex flex-col gap-2">
            <form onSubmit={handleSearch} className="flex bg-bg shadow-md rounded-md overflow-hidden border border-border-light">
              <input 
                type="text" 
                placeholder="Search location..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 text-sm outline-none w-48 text-text-primary bg-bg"
              />
              <button type="submit" className="px-3 bg-bg-alt hover:bg-border-light text-text-muted transition-colors">
                <IconSearch size={16} />
              </button>
            </form>
          </div>

          <div className="absolute top-4 right-4 z-[400] bg-bg rounded-md shadow-md border border-border-light overflow-hidden flex">
            <button 
              className={`px-3 py-2 text-sm font-medium ${mapType === 'satellite' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg-alt'}`}
              onClick={() => setMapType('satellite')}
            >
              Satellite
            </button>
            <button 
              className={`px-3 py-2 text-sm font-medium ${mapType === 'street' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-bg-alt'}`}
              onClick={() => setMapType('street')}
            >
              Street
            </button>
          </div>

          <MapContainer 
            id="farm-map-container"
            center={mapCenter} 
            zoom={DEFAULT_ZOOM} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            ref={(mapRef) => { if(mapRef) { document.getElementById('farm-map-container')._leaflet_map = mapRef; } }}
          >
            <TileLayer
              url={mapType === 'satellite' ? TILE_LAYERS.satellite : TILE_LAYERS.street}
              maxZoom={20}
              attribution='&copy; OpenStreetMap & Esri'
            />
            
            <MapController 
              farm={farm} 
              plots={plots} 
              drawMode={isDrawMode} 
              onPlotCreated={handlePlotCreated}
              onFarmBoundaryCreated={handleFarmBoundaryCreated}
            />

            {/* Farm Boundary */}
            {farm.boundary && (
              <Polygon 
                positions={geoJSONToLatLngs(farm.boundary)} 
                pathOptions={{ color: '#1a4d2e', weight: 3, dashArray: '5, 10', fillOpacity: 0.1 }}
              />
            )}

            {/* Plot Polygons */}
            {plots.map(plot => {
              if (!plot.boundary) return null;
              
              const currentCycle = cropCycles.find(c => c.plot_id === plot.id && c.status === 'Active');
              const plotScore = getPlotScore(plot, currentCycle, expenses, revenue);
              const color = getScoreColor(plotScore);
              
              return (
                <Polygon
                  key={plot.id}
                  positions={geoJSONToLatLngs(plot.boundary)}
                  pathOptions={{ 
                    color: color, 
                    weight: 2, 
                    fillColor: color, 
                    fillOpacity: selectedPlot?.id === plot.id ? 0.6 : 0.4 
                  }}
                  eventHandlers={{
                    click: () => setSelectedPlot(plot)
                  }}
                >
                  <Popup>
                    <div className="font-sans">
                      <h3 className="font-bold text-text-primary m-0">{plot.name}</h3>
                      <p className="text-xs text-text-muted m-0">{parseFloat(plot.area_acres).toFixed(2)} Acres</p>
                      {currentCycle && (
                        <p className="text-xs text-text-secondary mt-1">Crop: <strong>{currentCycle.crop_type}</strong></p>
                      )}
                    </div>
                  </Popup>
                </Polygon>
              );
            })}
          </MapContainer>
        </div>

        {/* SIDEBAR */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          
          <div className="agri-card p-4">
            <h3 className="font-bold text-lg text-text-primary mb-1">{farm.name}</h3>
            <div className="flex justify-between items-center text-sm mb-3 pb-3 border-b border-border-light">
              <span className="text-text-muted flex items-center gap-1"><IconMapPin size={14}/> Area</span>
              <span className="font-bold text-text-primary">{totalFarmAcres > 0 ? parseFloat(totalFarmAcres).toFixed(2) : '-'} Acres</span>
            </div>
            
            <div className="flex gap-2">
              {!farm.boundary ? (
                <Button variant="primary" className="flex-1 w-full" onClick={startDrawFarm} disabled={isDrawMode}>
                  <IconMap size={16} /> Draw Boundary
                </Button>
              ) : (
                <Button variant="outline" className="flex-1 w-full" onClick={startDrawPlot} disabled={isDrawMode}>
                  <IconPlus size={16} /> Add Plot
                </Button>
              )}
            </div>
            {isDrawMode && (
              <p className="text-xs text-accent-blue mt-2 font-medium bg-blue-50 p-2 rounded-md">
                Click on the map to draw. Connect back to the first point to finish.
              </p>
            )}
          </div>

          <div className="agri-card flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border-light bg-bg-alt flex justify-between items-center">
              <span className="font-bold text-sm text-text-primary flex items-center gap-2">
                <IconLayersIntersect size={16} className="text-primary"/> 
                Plots ({plots.length})
              </span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {plots.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <IconLayersIntersect size={32} className="mx-auto mb-2" />
                  <p className="text-sm">No plots mapped yet.</p>
                </div>
              ) : (
                plots.map(plot => {
                  const currentCycle = cropCycles.find(c => c.plot_id === plot.id && c.status === 'Active');
                  const score = getPlotScore(plot, currentCycle, expenses, revenue);
                  const isSelected = selectedPlot?.id === plot.id;
                  
                  return (
                    <div 
                      key={plot.id} 
                      onClick={() => {
                        setSelectedPlot(plot);
                        const mapEl = document.getElementById('farm-map-container');
                        if (mapEl?._leaflet_map && plot.boundary) {
                          const bounds = L.geoJSON(plot.boundary).getBounds();
                          mapEl._leaflet_map.fitBounds(bounds, { padding: [20, 20] });
                        }
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border-light hover:border-primary/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-text-primary text-sm">{plot.name}</span>
                        <Badge variant={score > 70 ? 'success' : score > 40 ? 'warning' : 'danger'}>{getScoreLabel(score)}</Badge>
                      </div>
                      <div className="flex justify-between text-xs text-text-muted">
                        <span>{parseFloat(plot.area_acres).toFixed(2)} Ac</span>
                        <span>{currentCycle ? currentCycle.crop_type : 'Fallow'}</span>
                      </div>
                      
                      {isSelected && currentCycle && (
                        <div className="mt-3 pt-3 border-t border-border-light space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-text-muted">Est. Rev/Acre</span>
                            <span className="font-medium text-revenue">{formatPKR(formatPerAcre(currentCycle.expected_yield * 2000, plot.area_acres))}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-text-muted">Soil Type</span>
                            <span className="font-medium">{plot.soil_type}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      <Modal isOpen={isPlotModalOpen} onClose={() => setIsPlotModalOpen(false)} title="Add New Plot">
        <form onSubmit={handleSavePlot} className="space-y-4">
          <div className="bg-primary/10 p-3 rounded-md mb-4 flex justify-between items-center">
            <span className="text-sm font-medium text-primary">Calculated Area:</span>
            <span className="font-bold text-primary">{parseFloat(pendingPlotAcres).toFixed(2)} Acres</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="agri-label">Plot Name *</label>
            <input 
              type="text" 
              className="agri-input" 
              required 
              value={plotFormData.name} 
              onChange={e => setPlotFormData({...plotFormData, name: e.target.value})} 
              placeholder="e.g. North Field"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Soil Type</label>
              <select className="agri-input" value={plotFormData.soil_type} onChange={e => setPlotFormData({...plotFormData, soil_type: e.target.value})}>
                <option>Loamy</option>
                <option>Clay</option>
                <option>Sandy</option>
                <option>Silt</option>
                <option>Alluvial</option>
                <option>Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Drainage</label>
              <select className="agri-input" value={plotFormData.drainage} onChange={e => setPlotFormData({...plotFormData, drainage: e.target.value})}>
                <option>Good</option>
                <option>Moderate</option>
                <option>Poor</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="agri-label">Notes</label>
            <textarea 
              className="agri-input h-20" 
              value={plotFormData.notes} 
              onChange={e => setPlotFormData({...plotFormData, notes: e.target.value})} 
              placeholder="Any additional info..."
            ></textarea>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsPlotModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1">Save Plot</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default FarmMap;
