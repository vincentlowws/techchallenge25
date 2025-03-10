import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

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

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Fetch flight plans
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/flight-plans`);
        setFlightPlans(response.data);
        setFilteredFlightPlans(response.data);
      } catch (error) {
        console.error('Error fetching flight plans:', error);
      }
    };
    fetchData();
  }, [API_BASE_URL]);

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
      });

      mapRef.current = map;
    }
  }, []);

  // Update map when flight is selected
  useEffect(() => {
    if (!mapRef.current || !selectedFlight) return;

    const fetchRoute = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/flight-plan/${selectedFlight}`);
        const { waypoints } = response.data;

        setFlightPath(waypoints);
        const coordinates = waypoints.map(w => [w.longitude, w.latitude]);
        mapRef.current.getSource('route').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates }
        });

        if (markerRef.current) markerRef.current.remove();
        const marker = new mapboxgl.Marker().setLngLat(coordinates[0]).addTo(mapRef.current);
        markerRef.current = marker;

        setIsMoving(true);
        setCurrentWaypointIndex(0);
      } catch (error) {
        console.error('Error loading flight route:', error);
      }
    };

    fetchRoute();
  }, [selectedFlight, API_BASE_URL]);

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
