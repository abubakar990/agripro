import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateAcresFromLatLngs, layerToGeoJSON, geoJSONToLatLngs, DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS } from '../../utils/geoUtils';
import { getPlotScore, getScoreColor, getScoreLabel } from '../../utils/perAcreCalc';
import { formatPKR } from '../../utils/format';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import { IconMap, IconPlus, IconArrowLeft, IconSearch, IconLayersIntersect, IconMapPin } from '@tabler/icons-react';

// Inner component that has access to the map instance via useMap()
const MapController = ({ farm, plots, drawMode, onPlotCreated, onFarmBoundaryCreated, mapRef }) => {
  const map = useMap();
  
  // Store map reference for parent access
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

    return () => {
      map.pm.removeControls();
    };
  }, [map]);

  // Handle pm:create event
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
      }
      
      map.removeLayer(layer);
    };

    map.on('pm:create', handleCreate);
    return () => { map.off('pm:create', handleCreate); };
  }, [map, drawMode, onPlotCreated, onFarmBoundaryCreated]);

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

const FarmMap = ({ farms = [], farmPlots = [], cropCycles = [], expenses = [], revenue = [] }) => {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [mapType, setMapType] = useState('satellite');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawMode, setIsDrawMode] = useState(null);
  
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

  // Parse farmId as integer for comparison with farm.id
  const numericFarmId = parseInt(farmId);
  
  const farm = useMemo(() => farms.find(f => f.id === numericFarmId), [farms, numericFarmId]);
  const plots = useMemo(() => farmPlots.filter(p => p.farm_id === numericFarmId), [farmPlots, numericFarmId]);

  const mapCenter = useMemo(() => {
    if (farm?.latitude && farm?.longitude) return [parseFloat(farm.latitude), parseFloat(farm.longitude)];
    return DEFAULT_CENTER;
  }, [farm]);

  // Handle Search Location
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

  // Draw mode controls
  const startDrawFarm = () => {
    setIsDrawMode('farm');
    if (mapRef.current) {
      mapRef.current.pm.enableDraw('Polygon', { snappable: true, snapDistance: 20 });
    }
  };

  const startDrawPlot = () => {
    setIsDrawMode('plot');
    if (mapRef.current) {
      mapRef.current.pm.enableDraw('Polygon', { snappable: true, snapDistance: 20 });
    }
  };

  const cancelDraw = () => {
    setIsDrawMode(null);
    if (mapRef.current) {
      mapRef.current.pm.disableDraw();
    }
  };

  // When Farm boundary is created
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
      alert('Farm boundary saved! It will appear after data refreshes.');
    } catch (err) {
      console.error(err);
      alert('Error saving farm boundary: ' + err.message);
    }
  }, [numericFarmId]);

  // When Plot boundary is created
  const handlePlotCreated = useCallback((geojson, acres) => {
    setIsDrawMode(null);
    setPendingPlotGeoJSON(geojson);
    setPendingPlotAcres(acres);
    setIsPlotModalOpen(true);
  }, []);

  // Save Plot
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
      console.error(err);
      alert('Error saving plot: ' + err.message);
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
  const tileUrl = mapType === 'satellite' ? TILE_LAYERS.satellite.url : TILE_LAYERS.street.url;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/farms')}>
          <IconArrowLeft size={18} /> Back
        </Button>
        <h2 className="text-xl font-bold text-text-primary">Map View: {farm.name}</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* MAP CONTAINER */}
        <div className="flex-1 agri-card relative overflow-hidden farm-map-container rounded-xl border border-border" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
          
          {/* Top Controls Overlay */}
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

          <MapContainer 
            center={mapCenter} 
            zoom={DEFAULT_ZOOM} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              url={tileUrl}
              maxZoom={20}
              attribution='&copy; OpenStreetMap & Esri'
            />
            
            <MapController 
              farm={farm} 
              plots={plots} 
              drawMode={isDrawMode} 
              onPlotCreated={handlePlotCreated}
              onFarmBoundaryCreated={handleFarmBoundaryCreated}
              mapRef={mapRef}
            />

            {/* Farm Boundary */}
            {farm.boundary && (() => {
              try {
                const positions = geoJSONToLatLngs(farm.boundary);
                if (positions.length > 0) {
                  return (
                    <Polygon 
                      positions={positions} 
                      pathOptions={{ color: '#1a4d2e', weight: 3, dashArray: '5, 10', fillOpacity: 0.05, fillColor: '#1a4d2e' }}
                    />
                  );
                }
              } catch (e) { console.warn('Farm boundary render error:', e); }
              return null;
            })()}

            {/* Plot Polygons */}
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
                    pathOptions={{ 
                      color: color, 
                      weight: 2, 
                      fillColor: color, 
                      fillOpacity: selectedPlot?.id === plot.id ? 0.6 : 0.35
                    }}
                    eventHandlers={{
                      click: () => setSelectedPlot(plot)
                    }}
                  >
                    <Popup>
                      <div className="font-sans">
                        <h3 className="font-bold text-sm m-0">{plot.name}</h3>
                        <p className="text-xs text-gray-500 m-0">{parseFloat(plot.area_acres || 0).toFixed(2)} Acres</p>
                        <p className="text-xs mt-1 m-0">Soil: {plot.soil_type || '—'} | Drainage: {plot.drainage || '—'}</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              } catch (e) {
                console.warn('Plot render error:', plot.id, e);
                return null;
              }
            })}
          </MapContainer>
        </div>

        {/* SIDEBAR */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          
          <div className="agri-card p-4">
            <h3 className="font-bold text-lg text-text-primary mb-1">{farm.name}</h3>
            <div className="flex justify-between items-center text-sm mb-3 pb-3 border-b border-border">
              <span className="text-text-muted flex items-center gap-1"><IconMapPin size={14}/> Area</span>
              <span className="font-bold text-text-primary">{totalFarmAcres > 0 ? parseFloat(totalFarmAcres).toFixed(2) : '—'} Acres</span>
            </div>
            
            <div className="flex gap-2">
              {!farm.boundary ? (
                <Button variant="primary" className="flex-1 w-full" onClick={startDrawFarm} disabled={!!isDrawMode}>
                  <IconMap size={16} /> Draw Boundary
                </Button>
              ) : (
                <Button variant="outline" className="flex-1 w-full" onClick={startDrawPlot} disabled={!!isDrawMode}>
                  <IconPlus size={16} /> Add Plot
                </Button>
              )}
            </div>
            {isDrawMode && (
              <div className="mt-2">
                <p className="text-xs text-accent-blue font-medium bg-blue-50 p-2 rounded-md mb-2">
                  Click on the map to draw points. Connect back to the first point to finish.
                </p>
                <button onClick={cancelDraw} className="text-xs text-expense font-bold hover:underline">
                  Cancel Drawing
                </button>
              </div>
            )}
          </div>

          <div className="agri-card flex-1 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 380px)' }}>
            <div className="p-3 border-b border-border flex justify-between items-center">
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
                  <p className="text-xs text-text-muted mt-1">
                    {farm.boundary ? 'Click "Add Plot" to subdivide your farm.' : 'Draw the farm boundary first.'}
                  </p>
                </div>
              ) : (
                plots.map(plot => {
                  const activeCycle = cropCycles.find(c => c.plot_id === plot.id && c.status !== 'Harvested' && c.status !== 'Failed');
                  const score = getPlotScore(plot.id, { expenses, revenue, cropCycles, farmPlots: plots, farms });
                  const isSelected = selectedPlot?.id === plot.id;
                  
                  // Calculate plot-level financials
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
                          } catch (e) { /* ignore */ }
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
                          {plotArea > 0 && (
                            <div className="flex justify-between text-xs pt-1 border-t border-border">
                              <span className="text-text-muted">Profit/Acre</span>
                              <span className={`font-bold ${totalRev - totalExp >= 0 ? 'text-revenue' : 'text-expense'}`}>
                                {formatPKR((totalRev - totalExp) / plotArea)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs">
                            <span className="text-text-muted">Soil</span>
                            <span className="font-medium">{plot.soil_type || '—'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-text-muted">Drainage</span>
                            <span className="font-medium">{plot.drainage || '—'}</span>
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
            <label className="agri-label">Water Source</label>
            <input 
              type="text" 
              className="agri-input" 
              value={plotFormData.water_source} 
              onChange={e => setPlotFormData({...plotFormData, water_source: e.target.value})} 
              placeholder="e.g. Tube-well, Canal"
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="agri-label">Notes</label>
            <textarea 
              className="agri-input min-h-[80px]" 
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
