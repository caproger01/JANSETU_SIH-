import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default icon path in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom styled pin for JanSetu civic problems
const createPinIcon = (status, priority) => {
  const color = priority === 'CRITICAL' ? '#DC2626' : priority === 'HIGH' ? '#D97706' : '#075844';
  const svgHtml = `
    <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 38 14 38C14 38 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}"/>
      <circle cx="14" cy="14" r="6" fill="#FFFFFF"/>
    </svg>
  `;
  return L.divIcon({
    html: svgHtml,
    className: 'custom-problem-pin',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -36]
  });
};

export default function ProblemLocationMap({ problems = [], selectedProblem = null, onSelectProblem = null }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const wardPolygonRef = useRef(null);
  const [showWardBounds, setShowWardBounds] = useState(false);

  // Delhi / Central Municipal reference coordinates matching portal screenshot
  const defaultCenter = [28.6180, 77.2100]; // New Delhi

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Ensure Leaflet calculates exact dimensions after DOM layout
      setTimeout(() => {
        map.invalidateSize();
      }, 150);

      const handleResize = () => {
        map.invalidateSize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }
  }, []);

  // Update Problem Markers when problems change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    const bounds = L.latLngBounds();
    let hasCoords = false;

    problems.forEach((p) => {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);

      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], {
        icon: createPinIcon(p.status, p.priority_level)
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; min-width: 180px;">
          <div style="font-weight: 700; color: #075844; margin-bottom: 2px;">${p.title}</div>
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
            ${p.code || ''} &bull; ${p.category || 'Civic'}
          </div>
          <div style="margin: 4px 0;">
            <span style="background: #E0F2FE; color: #0369A1; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 700;">
              ${p.status}
            </span>
            <span style="margin-left: 4px; font-size: 11px; color: #444;">
              ${p.ward || ''}
            </span>
          </div>
          <p style="font-size: 11px; color: #555; margin: 4px 0 0 0; line-height: 1.3;">
            ${p.location || 'Reported Location'}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectProblem) {
          onSelectProblem(p);
        }
      });

      marker.addTo(markersGroup);
      bounds.extend([lat, lng]);
      hasCoords = true;
    });

    if (hasCoords && problems.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else {
      mapInstanceRef.current.setView(defaultCenter, 12);
    }
  }, [problems, onSelectProblem]);

  // Pan to selected problem when changed
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedProblem) return;

    const lat = parseFloat(selectedProblem.latitude) || 28.6180;
    const lng = parseFloat(selectedProblem.longitude) || 77.2100;

    mapInstanceRef.current.setView([lat, lng], 14, { animate: true });
  }, [selectedProblem]);

  // Toggle Ward Boundaries polygon
  const toggleWardBoundaries = () => {
    if (!mapInstanceRef.current) return;

    if (showWardBounds && wardPolygonRef.current) {
      mapInstanceRef.current.removeLayer(wardPolygonRef.current);
      wardPolygonRef.current = null;
      setShowWardBounds(false);
    } else {
      // Mock Central Delhi municipal ward boundary outline
      const wardCoords = [
        [28.6420, 77.1950],
        [28.6450, 77.2350],
        [28.6150, 77.2450],
        [28.5880, 77.2250],
        [28.5950, 77.1850]
      ];
      const polygon = L.polygon(wardCoords, {
        color: '#075844',
        weight: 2,
        fillColor: '#075844',
        fillOpacity: 0.12,
        dashArray: '5, 5'
      }).addTo(mapInstanceRef.current);

      polygon.bindPopup('<strong>Ward 12 — Central Civil Lines Zone</strong><br/>Jurisdiction: Municipal Council');
      wardPolygonRef.current = polygon;
      mapInstanceRef.current.fitBounds(polygon.getBounds());
      setShowWardBounds(true);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '440px' }}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '440px',
          borderRadius: '0 0 4px 4px'
        }}
      />

      {/* Ward Boundaries Button matching Screenshot */}
      <button
        type="button"
        onClick={toggleWardBoundaries}
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 1000,
          background: '#ffffff',
          border: '1px solid #D1D5DB',
          borderRadius: '4px',
          padding: '6px 10px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#374151',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <span>Ward boundaries</span>
      </button>
    </div>
  );
}
