"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePersona } from '../../components/layout/PersonaContext';
import { getListings } from '../../lib/services/properties';
import { Property } from '../../lib/mock-data/properties';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Drawer } from '../../components/ui/Drawer';
import InteractiveSVGMap from '../../components/property/InteractiveSVGMap';
import PropertyCard from '../../components/property/PropertyCard';
import {
  Compass, Train, MapPin, Sparkles, Trash2,
  LayoutList, Map as MapIcon, SlidersHorizontal, X
} from 'lucide-react';

/* ─────────── Global callback name ─────────── */
const GMAPS_CALLBACK = '__vrentMapsReady__';

function MapSearchPage() {
  const { isDarkMode } = usePersona();

  const [viewMode, setViewMode] = useState<'google' | 'svg'>('google');
  const [allListings, setAllListings] = useState<Property[]>([]);
  const [filteredListings, setFilteredListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState('All');
  const [maxPrice, setMaxPrice] = useState(15000000);
  const [minBeds, setMinBeds] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);
  const [showPins, setShowPins] = useState(true);

  /* ── Stable ref so event listeners always call the LATEST runPolygonFilter ── */
  const polygonFilterRef = useRef<(poly: any, google: any) => void>(() => {});
  const [debugText, setDebugText] = useState('');

  /* ── Google Maps refs & state ── */
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const labelsRef = useRef<any[]>([]);          // overlay price-label divs
  const drawingMgrRef = useRef<any>(null);
  const activePolygonRef = useRef<any>(null);
  const openInfoRef = useRef<any>(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [enclosedArea, setEnclosedArea] = useState<number | null>(null);
  const [lassoPct, setLassoPct] = useState(0);  // % of listings inside lasso

  /* ── Load Google Maps once using the callback pattern ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // already loaded
    if ((window as any).google?.maps?.Map) {
      setMapsReady(true);
      return;
    }

    // prevent double injection
    if (document.getElementById('gmaps-vrent')) return;

    // register callback BEFORE injecting script
    (window as any)[GMAPS_CALLBACK] = () => {
      setMapsReady(true);
    };

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const keyParam = apiKey ? `&key=${apiKey}` : '';

    const s = document.createElement('script');
    s.id = 'gmaps-vrent';
    // v=3.64 keeps DrawingManager alive (removed in 3.65+)
    s.src = `https://maps.googleapis.com/maps/api/js?v=3.64&libraries=drawing,geometry${keyParam}&callback=${GMAPS_CALLBACK}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => console.warn('[V-RENT] Google Maps failed to load — check API key / network.');
    document.head.appendChild(s);

    return () => {
      delete (window as any)[GMAPS_CALLBACK];
    };
  }, []);

  /* ── Fetch listings ── */
  useEffect(() => {
    getListings().then(res => {
      setAllListings(res);
      setFilteredListings(res);
      setLoading(false);
    });
  }, []);

  /* ── Mount map once SDK is ready ── */
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapMounted) return;
    if (viewMode !== 'google') return;
    setMapMounted(true);
    initMap();
  }, [mapsReady, viewMode, mapMounted]);

  /* ── Re-init map when switching back to google view ── */
  useEffect(() => {
    if (viewMode !== 'google' || !mapsReady || !mapDivRef.current) return;
    if (!mapInstanceRef.current) {
      setMapMounted(false); // trigger re-mount
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'google' && mapsReady && !mapInstanceRef.current && mapDivRef.current && !mapMounted) {
      setMapMounted(true);
      initMap();
    }
  }, [mapMounted, viewMode, mapsReady]);

  /* ── Update map styles on dark-mode toggle ── */
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setOptions({ styles: isDarkMode ? darkStyle() : lightStyle() });
  }, [isDarkMode]);

  /* ────────────────────────────────────────────────
     Core map initialiser
  ──────────────────────────────────────────────── */
  const initMap = useCallback(() => {
    const google = (window as any).google;
    if (!google?.maps || !mapDivRef.current) return;

    /* -- Base map -- */
    const map = new google.maps.Map(mapDivRef.current, {
      center: { lat: 1.3521, lng: 103.8198 },
      zoom: 12,
      styles: isDarkMode ? darkStyle() : lightStyle(),
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });
    mapInstanceRef.current = map;

    /* -- Drawing Manager for lasso polygon -- */
    const dm = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
      },
      polygonOptions: {
        fillColor: '#0B1E3F',
        fillOpacity: 0.08,
        strokeColor: '#D4AF37',
        strokeWeight: 2.5,
        clickable: true,
        editable: true,
        draggable: false,
        zIndex: 1,
      },
    });
    dm.setMap(map);
    drawingMgrRef.current = dm;

    google.maps.event.addListener(dm, 'overlaycomplete', (evt: any) => {
      if (evt.type !== google.maps.drawing.OverlayType.POLYGON) return;
      // remove previous lasso
      activePolygonRef.current?.setMap(null);
      activePolygonRef.current = evt.overlay;
      dm.setDrawingMode(null);

      // Always call via ref — avoids stale closure over allListings
      polygonFilterRef.current(evt.overlay, google);

      const path = evt.overlay.getPath();
      google.maps.event.addListener(path, 'set_at', () => polygonFilterRef.current(evt.overlay, google));
      google.maps.event.addListener(path, 'insert_at', () => polygonFilterRef.current(evt.overlay, google));
    });
  }, [isDarkMode]);

  /* ── Keep polygonFilterRef pointing to the LATEST runPolygonFilter (fixes stale closure) ── */
  useEffect(() => {
    polygonFilterRef.current = runPolygonFilter;
  });  // No dep array — runs after every render, keeping ref always fresh

  /* ── Effect to draw markers on Google Maps dynamically ── */
  useEffect(() => {
    const google = (window as any).google;
    if (!google?.maps || !mapInstanceRef.current) return;

    // Clear old markers/labels
    markersRef.current.forEach(m => m.setMap(null));
    labelsRef.current.forEach(l => l.setMap(null));
    markersRef.current = [];
    labelsRef.current = [];

    /* -- Custom price-label overlay class -- */
    class PriceLabel extends google.maps.OverlayView {
      private pos: any;
      public div: HTMLDivElement | null = null;
      public property: Property;
      public highlighted: boolean = true;

      constructor(pos: any, prop: Property) {
        super();
        this.pos = pos;
        this.property = prop;
        this.setMap(mapInstanceRef.current);
      }

      onAdd() {
        this.div = document.createElement('div');
        this.updateStyle();
        this.div.addEventListener('click', () => {
          setPreviewProperty(this.property);
        });
        this.div.style.cursor = 'pointer';
        const panes = this.getPanes()!;
        panes.overlayMouseTarget.appendChild(this.div);
      }

      updateStyle() {
        if (!this.div) return;
        const p = this.property;
        const priceLabel = p.price >= 1_000_000
          ? `S$${(p.price / 1_000_000).toFixed(2)}M`
          : `S$${(p.price / 1000).toFixed(0)}K`;

        this.div.innerHTML = `
          <div style="
            background: ${this.highlighted ? (isDarkMode ? '#D4AF37' : '#0B1E3F') : '#6b7280'};
            color: ${this.highlighted ? (isDarkMode ? '#0B1E3F' : '#fff') : '#fff'};
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            font-family: system-ui, sans-serif;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,${isDarkMode ? '0.6' : '0.25'});
            border: 2px solid ${this.highlighted ? '#D4AF37' : '#94a3b8'};
            transition: all 0.2s;
            opacity: ${this.highlighted ? '1' : '0.45'};
            transform: ${this.highlighted ? 'scale(1)' : 'scale(0.85)'};
          ">
            ${priceLabel}
          </div>
        `;
      }

      draw() {
        if (!this.div) return;
        const proj = this.getProjection();
        const point = proj.fromLatLngToDivPixel(this.pos);
        if (point) {
          this.div.style.position = 'absolute';
          this.div.style.left = `${point.x - 32}px`;
          this.div.style.top = `${point.y - 16}px`;
        }
      }

      onRemove() {
        this.div?.parentNode?.removeChild(this.div);
        this.div = null;
      }

      setHighlight(on: boolean) {
        this.highlighted = on;
        this.updateStyle();
      }

      setVisible(visible: boolean) {
        if (this.div) {
          this.div.style.display = visible ? 'block' : 'none';
        }
      }
    }

    // Always draw markers for all listings
    allListings.forEach(p => {
      const pos = new google.maps.LatLng(p.coordinates.lat, p.coordinates.lng);
      const label = new PriceLabel(pos, p);
      labelsRef.current.push(label);

      /* Invisible click-catchable marker for InfoWindow */
      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0, fillOpacity: 0, strokeOpacity: 0 },
        title: p.title,
      });
      markersRef.current.push(marker);

      const iw = new google.maps.InfoWindow({
        content: infoWindowHTML(p),
        maxWidth: 200,
      });

      marker.addListener('click', () => {
        openInfoRef.current?.close();
        iw.open(mapInstanceRef.current, marker);
        openInfoRef.current = iw;
        setPreviewProperty(p);
      });
    });

    // Run visibility check once on mount
    labelsRef.current.forEach(l => {
      if (typeof (l as any).setVisible === 'function') {
        (l as any).setVisible(showPins);
      }
    });
    markersRef.current.forEach(m => {
      m.setVisible(showPins);
    });

  }, [allListings, mapsReady, isDarkMode]);

  /* ── Effect to toggle pin visibility based on showPins state ── */
  useEffect(() => {
    labelsRef.current.forEach(l => {
      if (typeof (l as any).setVisible === 'function') {
        (l as any).setVisible(showPins);
      }
    });
    markersRef.current.forEach(m => {
      m.setVisible(showPins);
    });
  }, [showPins]);

  /* ── Polygon containment filter ── */
  const runPolygonFilter = (poly: any, google: any) => {
    try {
      let areaSqm = 0;
      try {
        areaSqm = google.maps.geometry.spherical.computeArea(poly.getPath());
      } catch (err) {
        console.warn("spherical computeArea failed:", err);
      }
      setEnclosedArea(areaSqm / 1_000_000);

      // Extract vertices for our custom ray-casting point-in-polygon math check
      const vertices: { lat: number; lng: number }[] = [];
      try {
        const path = poly.getPath();
        for (let i = 0; i < path.getLength(); i++) {
          const xy = path.getAt(i);
          let vLat = 0;
          let vLng = 0;
          if (xy) {
            if (typeof xy.lat === 'function') {
              vLat = xy.lat();
              vLng = xy.lng();
            } else if (typeof xy.lat === 'number') {
              vLat = xy.lat;
              vLng = xy.lng;
            }
          }
          vertices.push({ lat: vLat, lng: vLng });
        }
      } catch (err) {
        console.error("Failed to extract polygon vertices:", err);
      }

      // Ray-casting point-in-polygon algorithm (Jordan Curve Theorem)
      const isPointInPolygon = (lat: number, lng: number, vs: { lat: number; lng: number }[]) => {
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
          const xi = vs[i].lng, yi = vs[i].lat;
          const xj = vs[j].lng, yj = vs[j].lat;
          
          const intersect = ((yi > lat) !== (yj > lat))
              && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      };

      let inside = 0;
      const matched: Property[] = [];

      let debugInfo = `Vertices: ${vertices.length}\n`;
      if (vertices.length > 0) {
        debugInfo += `V0: Lat=${vertices[0].lat.toFixed(4)}, Lng=${vertices[0].lng.toFixed(4)}\n`;
      }

      allListings.forEach((p, idx) => {
        const inPolyMath = vertices.length > 0 ? isPointInPolygon(p.coordinates.lat, p.coordinates.lng, vertices) : false;
        
        let inPolyGoogle = false;
        if (google?.maps?.geometry?.poly) {
          try {
            const latLng = new google.maps.LatLng(p.coordinates.lat, p.coordinates.lng);
            inPolyGoogle = google.maps.geometry.poly.containsLocation(latLng, poly);
          } catch (e) {}
        }

        const inPoly = inPolyMath || inPolyGoogle;
        const meetsType = selectedType === 'All' || p.propertyType === selectedType;
        const meetsPrice = p.price <= maxPrice;
        const meetsBeds = minBeds === 0 || p.bedrooms >= minBeds;
        const match = inPoly && meetsType && meetsPrice && meetsBeds;

        if (match) { matched.push(p); inside++; }
        
        try {
          if (labelsRef.current[idx] && typeof labelsRef.current[idx].setHighlight === 'function') {
            labelsRef.current[idx].setHighlight(match);
          }
        } catch (err) {}
      });

      debugInfo += `Found inside: ${inside}`;
      setDebugText(debugInfo);

      setFilteredListings(matched);
      setLassoPct(allListings.length > 0 ? Math.round((inside / allListings.length) * 100) : 0);
    } catch (globalErr: any) {
      console.error("Global error in runPolygonFilter:", globalErr);
      setDebugText(`Global error: ${globalErr.message}`);
    }
  };

  /* ── Non-polygon filter (type/price/beds) ── */
  useEffect(() => {
    if (viewMode !== 'google' || !mapsReady) return;

    if (!activePolygonRef.current) {
      const matched = allListings.filter(p => {
        const meetsType = selectedType === 'All' || p.propertyType === selectedType;
        const meetsPrice = p.price <= maxPrice;
        const meetsBeds = minBeds === 0 || p.bedrooms >= minBeds;
        return meetsType && meetsPrice && meetsBeds;
      });
      setFilteredListings(matched);
      // update label highlights
      allListings.forEach((p, idx) => {
        const meetsType = selectedType === 'All' || p.propertyType === selectedType;
        const meetsPrice = p.price <= maxPrice;
        const meetsBeds = minBeds === 0 || p.bedrooms >= minBeds;
        labelsRef.current[idx]?.setHighlight(meetsType && meetsPrice && meetsBeds);
      });
    } else {
      const google = (window as any).google;
      if (google?.maps) runPolygonFilter(activePolygonRef.current, google);
    }
  }, [selectedType, maxPrice, minBeds, allListings, viewMode, mapsReady]);

  /* ── Clear lasso ── */
  const clearLasso = () => {
    activePolygonRef.current?.setMap(null);
    activePolygonRef.current = null;
    setEnclosedArea(null);
    setLassoPct(0);
    const matched = allListings.filter(p => {
      return (selectedType === 'All' || p.propertyType === selectedType) && p.price <= maxPrice && (minBeds === 0 || p.bedrooms >= minBeds);
    });
    setFilteredListings(matched);
    labelsRef.current.forEach((l, idx) => {
      const p = allListings[idx];
      const ok = (selectedType === 'All' || p?.propertyType === selectedType) && (p?.price ?? 0) <= maxPrice;
      l?.setHighlight(ok);
    });
  };

  /* ── SVG region filter ── */
  useEffect(() => {
    if (viewMode !== 'svg') return;
    let districts: number[] = [];
    if (selectedRegion === 'central') districts = [1,2,3,4,5,6,7,8,9,10,11,21];
    else if (selectedRegion === 'east') districts = [14,15,16,17,18];
    else if (selectedRegion === 'northeast') districts = [19,20,28];
    else if (selectedRegion === 'north') districts = [25,26,27];
    else if (selectedRegion === 'west') districts = [22,23,24];
    getListings({ districts: districts.length ? districts : undefined }).then(res => {
      setFilteredListings(res);
    });
  }, [selectedRegion, viewMode]);

  /* ── Stats ── */
  const avgPrice = filteredListings.length
    ? filteredListings.reduce((s, p) => s + p.price, 0) / filteredListings.length
    : 0;
  const avgPsf = filteredListings.length
    ? filteredListings.reduce((s, p) => s + p.psf, 0) / filteredListings.length
    : 0;
  const transitPct = filteredListings.length
    ? Math.round((filteredListings.filter(p => p.mrtDistanceMeters <= 400).length / filteredListings.length) * 100)
    : 0;

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-0 overflow-hidden bg-background">

      {/* ══════════ LEFT PANEL ══════════ */}
      <div className="order-2 lg:order-1 w-full lg:w-[380px] xl:w-[420px] flex flex-col flex-1 lg:flex-none h-[55vh] lg:h-full border-t lg:border-t-0 lg:border-r border-border bg-card text-left overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <Compass className="h-4 w-4 text-brand-gold" />
              Map Explorer
            </h2>
            <Badge variant="gold" className="text-[9px] font-black tabular-nums">
              {filteredListings.length} matches
            </Badge>
          </div>

          {/* View toggle */}
          <div className="flex border border-border rounded-xl bg-background p-1">
            <button
              onClick={() => {
                setViewMode('google');
                setMapMounted(false);
                mapInstanceRef.current = null;
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                viewMode === 'google' ? 'bg-brand-gold text-brand-navy shadow-sm' : 'text-neutral-500 hover:text-foreground'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" /> Google Maps
            </button>
            <button
              onClick={() => setViewMode('svg')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                viewMode === 'svg' ? 'bg-brand-gold text-brand-navy shadow-sm' : 'text-neutral-500 hover:text-foreground'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> SVG Heatmap
            </button>
          </div>

          {/* Pins Toggle Button */}
          <button
            onClick={() => setShowPins(prev => !prev)}
            className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
              showPins 
                ? 'bg-brand-navy border-brand-navy text-white dark:bg-brand-gold dark:border-brand-gold dark:text-brand-navy shadow-sm' 
                : 'bg-card border-border hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-500'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {showPins ? 'Hide Property Pins' : 'Show Property Pins'}
          </button>

          {/* Filters */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-neutral-400 tracking-widest block">Type</label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="w-full text-[10px] font-bold rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Condo">Condo</option>
                <option value="HDB">HDB</option>
                <option value="Landed">Landed</option>
                <option value="EC">EC</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-neutral-400 tracking-widest block">Max Price</label>
              <select
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full text-[10px] font-bold rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
              >
                <option value={15000000}>Any</option>
                <option value={8000000}>≤ S$8M</option>
                <option value={4000000}>≤ S$4M</option>
                <option value={2000000}>≤ S$2M</option>
                <option value={1000000}>≤ S$1M</option>
                <option value={600000}>≤ S$600K</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-neutral-400 tracking-widest block">Min Beds</label>
              <select
                value={minBeds}
                onChange={e => setMinBeds(Number(e.target.value))}
                className="w-full text-[10px] font-bold rounded-lg border border-border bg-card px-2 py-1.5 text-foreground focus:outline-none focus:border-brand-gold cursor-pointer"
              >
                <option value={0}>Any</option>
                <option value={1}>1+</option>
                <option value={2}>2+</option>
                <option value={3}>3+</option>
                <option value={4}>4+</option>
              </select>
            </div>
          </div>

          {/* Lasso Stats Card */}
          {enclosedArea !== null && (
            <div className="rounded-xl border border-brand-gold/30 bg-brand-navy-dark text-white p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-gold animate-pulse" />
                  <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Lasso Selection</span>
                </div>
                <button
                  onClick={clearLasso}
                  className="text-[9px] font-black text-neutral-400 hover:text-white uppercase tracking-wider cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[8px] text-neutral-500 uppercase font-black block">Area</span>
                  <span className="font-bold text-white font-mono">{enclosedArea.toFixed(2)} km²</span>
                </div>
                <div>
                  <span className="text-[8px] text-neutral-500 uppercase font-black block">Matches</span>
                  <span className="font-bold text-brand-gold font-mono">{filteredListings.length} listings</span>
                </div>
                <div>
                  <span className="text-[8px] text-neutral-500 uppercase font-black block">Avg PSF</span>
                  <span className="font-bold text-white font-mono">S${Math.round(avgPsf)}</span>
                </div>
                <div>
                  <span className="text-[8px] text-neutral-500 uppercase font-black block">Near MRT</span>
                  <span className="font-bold text-emerald-400 font-mono">{transitPct}%</span>
                </div>
              </div>
              <div className="border-t border-neutral-800 pt-2 flex justify-between items-baseline">
                <span className="text-[8px] text-neutral-400 uppercase font-black">Avg Price</span>
                <span className="text-sm font-black text-brand-gold">
                  {avgPrice >= 1_000_000 ? `S$${(avgPrice / 1_000_000).toFixed(2)}M` : `S$${Math.round(avgPrice).toLocaleString()}`}
                </span>
              </div>
              {debugText && (
                <pre className="text-[8px] text-neutral-400 font-mono mt-2 pt-2 border-t border-neutral-800 whitespace-pre-wrap">
                  {debugText}
                </pre>
              )}
            </div>
          )}

          {/* Draw instructions (only google mode, no lasso yet) */}
          {viewMode === 'google' && !enclosedArea && (
            <div className="flex items-start gap-2 p-3 bg-brand-gold/5 border border-brand-gold/20 rounded-xl">
              <Sparkles className="h-3.5 w-3.5 text-brand-gold flex-shrink-0 mt-0.5 animate-pulse" />
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Click the <span className="font-black text-brand-gold">polygon icon</span> at the top-center of the map to draw a custom search boundary. Listings inside update in real-time.
              </p>
            </div>
          )}
        </div>

        {/* Listings Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse border border-border" />
            ))
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Compass className="h-8 w-8 text-neutral-300 mx-auto" />
              <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">No results found</p>
              <p className="text-[10px] text-neutral-500 max-w-[200px] mx-auto leading-relaxed">
                {viewMode === 'google' ? 'Try drawing a larger area or relaxing your filters.' : 'Select a different region on the map.'}
              </p>
              {enclosedArea !== null && (
                <button onClick={clearLasso} className="text-[10px] font-bold text-brand-gold underline cursor-pointer">Clear lasso</button>
              )}
            </div>
          ) : (
            filteredListings.map(p => (
              <div
                key={p.id}
                onClick={() => setPreviewProperty(p)}
                className="cursor-pointer transition-all duration-150 hover:scale-[1.01]"
              >
                <PropertyCard property={p} layout="grid" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ══════════ RIGHT MAP PANEL ══════════ */}
      <div className="order-1 lg:order-2 flex-1 h-[45vh] lg:h-full relative overflow-hidden flex-shrink-0">

        {viewMode === 'google' ? (
          <>
            {/* Google Maps mount target */}
            <div ref={mapDivRef} className="w-full h-full" />

            {/* Loading overlay while SDK fetches */}
            {!mapsReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 gap-4 z-20">
                <div className="h-10 w-10 rounded-full border-4 border-brand-gold border-t-transparent animate-spin" />
                <p className="text-xs font-bold uppercase text-neutral-400 tracking-wider">Loading Google Maps…</p>
                {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                  <p className="text-[10px] text-neutral-500 max-w-xs text-center leading-relaxed">
                    Add <code className="bg-neutral-200 dark:bg-neutral-800 px-1 rounded font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code className="font-mono">.env.local</code> for full map features.
                  </p>
                )}
              </div>
            )}

            {/* Region label pill (top-left) */}
            {mapsReady && (
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="bg-card/90 backdrop-blur border border-border rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-foreground shadow-lg flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-brand-gold" />
                  Singapore · {filteredListings.length} listings
                </div>
              </div>
            )}

            {/* Clear lasso button (top-right) */}
            {enclosedArea !== null && (
              <button
                onClick={clearLasso}
                className="absolute top-4 right-4 z-10 bg-card/90 backdrop-blur border border-brand-gold/40 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-gold shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-card transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Clear lasso
              </button>
            )}
          </>
        ) : (
          /* SVG Heatmap */
          <div className="w-full h-full p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                {selectedRegion ? `Region: ${selectedRegion}` : 'Click a region to filter'}
              </span>
              {selectedRegion && (
                <button onClick={() => setSelectedRegion(null)} className="text-[10px] font-black text-brand-gold flex items-center gap-1 cursor-pointer uppercase">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <InteractiveSVGMap
                priceHeatmap
                showMrtLines
                activeRegion={selectedRegion}
                onSelectRegion={reg => setSelectedRegion(reg)}
                listings={showPins ? filteredListings : []}
                onSelectProperty={setPreviewProperty}
              />
            </div>
          </div>
        )}
      </div>

      {/* ══════════ PROPERTY PREVIEW DRAWER ══════════ */}
      <Drawer
        isOpen={!!previewProperty}
        onClose={() => setPreviewProperty(null)}
        title="Property Quick View"
      >
        {previewProperty && (
          <div className="space-y-5 text-left">
            <div className="h-48 rounded-xl overflow-hidden bg-neutral-100">
              <img src={previewProperty.images[0]} alt={previewProperty.title} className="h-full w-full object-cover" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">
                  D{previewProperty.district} · {previewProperty.areaName}
                </span>
                <Badge variant="ai">{previewProperty.aiMatchedScore}% Match</Badge>
              </div>
              <h3 className="text-base font-bold text-foreground leading-snug">{previewProperty.title}</h3>
              <p className="text-xs text-neutral-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {previewProperty.address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-border rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20">
                <span className="text-[8px] text-neutral-400 uppercase font-black block">Asking Price</span>
                <span className="text-base font-black text-brand-navy dark:text-brand-gold mt-1 block">
                  S${previewProperty.price.toLocaleString()}
                  {previewProperty.listingType === 'Rent' && <span className="text-xs font-normal">/mo</span>}
                </span>
              </div>
              <div className="p-3 border border-border rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20">
                <span className="text-[8px] text-neutral-400 uppercase font-black block">Unit Rate</span>
                <span className="text-base font-black text-foreground mt-1 block">S${previewProperty.psf} psf</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold uppercase tracking-wider text-neutral-500">
              {[
                { label: 'Beds', value: previewProperty.bedrooms },
                { label: 'Baths', value: previewProperty.bathrooms },
                { label: 'Sqft', value: previewProperty.sizeSqft },
              ].map(s => (
                <div key={s.label} className="p-3 border border-border rounded-xl bg-card">
                  <span className="block text-foreground font-black text-sm">{s.value}</span>
                  <span className="text-[8px] mt-0.5 block">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="p-3 border border-border rounded-xl bg-card flex items-center justify-between text-xs font-bold">
              <span className="text-neutral-400 flex items-center gap-1.5 uppercase">
                <Train className="h-4 w-4 text-emerald-400" /> Transit
              </span>
              <span className="text-foreground">{previewProperty.mrtStation} ({previewProperty.mrtDistanceMeters}m)</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 font-bold" onClick={() => setPreviewProperty(null)}>Close</Button>
              <a href={`/property/${previewProperty.id}`} className="flex-1">
                <Button variant="gold" className="w-full font-bold uppercase tracking-wider">Full Details</Button>
              </a>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ────────── Map style helpers ────────── */
function lightStyle() {
  return [
    { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#f0f2f5' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d8e8' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e8eaed' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dde1e6' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  ];
}

function darkStyle() {
  return [
    { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020712' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2035' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243050' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  ];
}

/* ────────── InfoWindow HTML ────────── */
function infoWindowHTML(p: Property) {
  const price = p.price >= 1_000_000
    ? `S$${(p.price / 1_000_000).toFixed(2)}M`
    : `S$${(p.price / 1000).toFixed(0)}K`;
  return `
    <div style="font-family:system-ui,sans-serif;width:180px;text-align:left;padding:2px">
      <img src="${p.images[0]}" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:6px" />
      <p style="margin:0;font-size:10px;font-weight:800;color:#0B1E3F;line-height:1.3">${p.title}</p>
      <p style="margin:3px 0;font-size:11px;font-weight:900;color:#D4AF37">${price}</p>
      <p style="margin:0 0 6px;font-size:9px;color:#6b7280;font-weight:600">${p.bedrooms} BR · ${p.sizeSqft} sqft · D${p.district}</p>
      <a href="/property/${p.id}" style="display:block;text-align:center;background:#0B1E3F;color:#fff;text-decoration:none;font-size:9px;font-weight:800;padding:5px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em">
        View Details →
      </a>
    </div>
  `;
}

export default function MapSearchPageWrapper() {
  return (
    <React.Suspense fallback={
      <div className="h-screen flex items-center justify-center text-xs font-bold uppercase text-neutral-400 tracking-widest">
        Loading Map Explorer…
      </div>
    }>
      <MapSearchPage />
    </React.Suspense>
  );
}
