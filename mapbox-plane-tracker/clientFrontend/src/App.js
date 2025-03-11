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
  const [suggestions, setSuggestions] = useState('');
  const suggestionsTextareaRef = useRef(null); // Ref for the suggestions textarea

  // 1) Fetch flight plans for dropdown list
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/flight-plans');
        setFlightPlans(response.data);
        setFilteredFlightPlans(response.data);
      } catch (error) {
        console.error('Error fetching flight plans:', error);
      }
    };
    fetchData();
  }, []);

  // 2) Filter flight plans based on search query
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

  // 3) Initialize map
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

  // 4) Update map when flight is selected
  useEffect(() => {
    if (!mapRef.current || !selectedFlight) return;

    const fetchRoute = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5001/api/flight-plan/${selectedFlight}`
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

        // Start animation - not in used.
        setIsMoving(true);
        setCurrentWaypointIndex(0);

      } catch (error) {
        console.error('Error loading flight route:', error);
      }
    };

    fetchRoute();
  }, [selectedFlight]);

  // Auto-scroll the suggestions textarea
  useEffect(() => {
    if (suggestionsTextareaRef.current) {
      suggestionsTextareaRef.current.scrollTop = suggestionsTextareaRef.current.scrollHeight;
    }
  }, [suggestions]); // Trigger auto-scroll when suggestions change

  const getSuggestions = async () => {
    if (!flightPath) return;

    try {
      console.log("waypoints= " + JSON.stringify(flightPath));

      // Send the prompt and waypoints to the server
      const response = await fetch('http://172.20.10.3:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama-3.1-8b-instruct',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that provides suggestions to improve flight plans'},
            { role: 'user', content: `Here is the flight plan: ${JSON.stringify(flightPath)}. Can you provide a better flight waypoints? Be concise and only provide all the necessary waypoints, Remove waypoints that are strayed away from the flight path between first point and last point' ` }
          ],
          "temperature": 0.6,
          stream: true, // Enable streaming
        }),
      });

      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Get the readable stream from the response body
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedSuggestions = '';

      // Read chunks from the stream
      const readChunk = async () => {
        const { done, value } = await reader.read();

        if (done) {
          console.log('Stream complete');
          return;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });

        // Process the chunk (handle SSE format)
        const lines = chunk.split('\n'); // Split by newline to handle multiple events
        for (const line of lines) {
          if (line.startsWith('data:')) {
            // Extract the JSON part (remove 'data:' prefix and trim whitespace)
            const jsonStr = line.replace('data:', '').trim();

            if (jsonStr === '[DONE]') {
              // End of stream
              console.log('Stream ended');
              return;
            }

            try {
              // Parse the JSON
              const data = JSON.parse(jsonStr);

              // Extract the content from the response
              const content = data.choices[0]?.delta?.content || '';
              // Append the content to the accumulated suggestions
              accumulatedSuggestions += content;

              // Update the suggestions state with the accumulated text
              setSuggestions(accumulatedSuggestions);
            } catch (error) {
              console.error('Error parsing JSON:', error);
            }
          }
        }

        // Read the next chunk
        readChunk();
      };

      // Start reading the stream
      readChunk();

    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions('Failed to fetch suggestions. Please try again later.');
    }
  };

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

      <div style={{ margin: '20px 0' }}>
        <button onClick={getSuggestions}>Get Suggestions</button>
      </div>

      <div style={{ margin: '20px 0' }}>
        <label>Suggestions: </label>
        <textarea
          ref={suggestionsTextareaRef} // Attach the ref to the textarea
          id="suggestions"
          rows="10"
          cols="50"
          readOnly
          value={suggestions}
          style={{ width: '100%' }}
        />
      </div>

      <div id="map" style={{ width: '100%', height: '80vh' }} />
    </div>
  );
};

export default App;