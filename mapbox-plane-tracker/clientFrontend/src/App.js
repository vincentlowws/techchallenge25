import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoidG5lY25pdiIsImEiOiJjbDI1eG9hZGUwMDd5M2xwd3poOGI4dG53In0.C9Mw9x7e-QpHpD5gOuQ2Eg';

const App = () => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [flightPlans, setFlightPlans] = useState([]);
  const [filteredFlightPlans, setFilteredFlightPlans] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [flightPath, setFlightPath] = useState(null);

  // Fetch flight plans
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://13.229.125.104:5000/api/flight-plans');
        setFlightPlans(response.data);
        setFilteredFlightPlans(response.data);
      } catch (error) {
        console.error('Error fetching flight plans:', error);
      }
    };
    fetchData();
  }, []);

  // Filter flight plans based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = flightPlans.filter(flight =>
        flight.aircraftIdentification.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFlightPlans(filtered);
    } else {
      setFilteredFlightPlans(flightPlans);
    }
  }, [searchQuery, flightPlans]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/satellite-streets-v11',
        center: [103.8198, 1.3521],
        zoom: 8,
        renderWorldCopies: false,
        maxBounds: [-180, -90, 180, 90]
      });

      map.on('load', () => {
        // Route source
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#007AFF', 'line-width': 2 }
        });

        // Waypoints source
        map.addSource('waypoints', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'waypoints',
          type: 'circle',
          source: 'waypoints',
          paint: { 'circle-radius': 5, 'circle-color': '#007AFF' }
        });

        // Waypoint labels source
        map.addSource('waypoint-labels', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'waypoint-labels',
          type: 'symbol',
          source: 'waypoint-labels',
          layout: { 'text-field': ['get', 'id'], 'text-size': 12, 'text-offset': [0, 1] },
          paint: { 'text-color': '#FFFFFF', 'text-halo-color': '#000000', 'text-halo-width': 2 }
        });

        // Start and departure aerodrome source
        map.addSource('aerodromes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'aerodromes',
          type: 'circle',
          source: 'aerodromes',
          paint: { 'circle-radius': 8, 'circle-color': '#FF0000' }
        });
      });

      mapRef.current = map;
    }
  }, []);

  // Update map when flight is selected
  useEffect(() => {
    if (!mapRef.current || !selectedFlight) return;

    const fetchRoute = async () => {
      try {
        const response = await axios.get(
          `http://13.229.125.104:5000/api/flight-plan/${selectedFlight}`
        );
        const { waypoints } = response.data;

        // Store flight path in state
        setFlightPath(waypoints);

        // Update route
        const coordinates = waypoints.map(w => [w.longitude, w.latitude]);
        mapRef.current.getSource('route').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates }
        });

        // Update waypoints
        mapRef.current.getSource('waypoints').setData({
          type: 'FeatureCollection',
          features: waypoints.map(w => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [w.longitude, w.latitude] },
            properties: { id: w.id }
          }))
        });

        // Update waypoint labels
        mapRef.current.getSource('waypoint-labels').setData({
          type: 'FeatureCollection',
          features: waypoints.map(w => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [w.longitude, w.latitude] },
            properties: { id: w.id }
          }))
        });

        // Highlight start and departure aerodromes
        const startAerodrome = waypoints[0];
        const departureAerodrome = waypoints[waypoints.length - 1];
        mapRef.current.getSource('aerodromes').setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [startAerodrome.longitude, startAerodrome.latitude] },
              properties: { id: 'Start' }
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [departureAerodrome.longitude, departureAerodrome.latitude] },
              properties: { id: 'Departure' }
            }
          ]
        });

        // Add plane marker
        if (markerRef.current) markerRef.current.remove();
        const marker = new mapboxgl.Marker()
          .setLngLat(coordinates[0])
          .addTo(mapRef.current);
        markerRef.current = marker;

        // Start animation
        setIsMoving(true);
        setCurrentWaypointIndex(0);

      } catch (error) {
        console.error('Error loading flight route:', error);
      }
    };

    fetchRoute();
  }, [selectedFlight]);

  // // Animate plane movement
  // useEffect(() => {
  //   if (!isMoving || !selectedFlight || !markerRef.current || !flightPath) return;

  //   const animate = () => {
  //     if (currentWaypointIndex >= flightPath.length - 1) {
  //       setIsMoving(false);
  //       return;
  //     }

  //     const start = flightPath[currentWaypointIndex];
  //     const end = flightPath[currentWaypointIndex + 1];
  //     const steps = 100;
  //     let step = 0;

  //     const interval = setInterval(() => {
  //       if (step >= steps) {
  //         clearInterval(interval);
  //         setCurrentWaypointIndex(i => i + 1);
  //         return;
  //       }

  //       const lng = start.longitude + 
  //         (end.longitude - start.longitude) * (step / steps);
  //       const lat = start.latitude + 
  //         (end.latitude - start.latitude) * (step / steps);
        
  //       markerRef.current.setLngLat([lng, lat]);
  //       step++;
  //     }, 50);
  //   };

  //   animate();
  // }, [currentWaypointIndex, isMoving, selectedFlight, flightPath]);

  return (
    <div>
      <h1>Flight Route Viewer</h1>
      
      <div style={{ margin: '20px 0' }}>
        <label>Search Flight: </label>
        <input
          type="text"
          placeholder="Enter callsign..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={{ margin: '20px 0' }}>
        <label>Select Flight: </label>
        <select onChange={e => setSelectedFlight(e.target.value)}>
          <option value="">Choose a flight...</option>
          {filteredFlightPlans.map(flight => (
            <option key={flight._id} value={flight.aircraftIdentification}>
              {flight.aircraftIdentification}: {flight.departure.departureAerodrome} → 
              {flight.arrival.destinationAerodrome}
            </option>
          ))}
        </select>
      </div>

      <div id="map" style={{ width: '100%', height: '80vh' }} />
    </div>
  );
};

export default App;