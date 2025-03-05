import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import 'mapbox-gl/dist/mapbox-gl.css';
import airportsData from "./airports.json";

mapboxgl.accessToken = "pk.eyJ1IjoidG5lY25pdiIsImEiOiJjbDI1eG9hZGUwMDd5M2xwd3poOGI4dG53In0.C9Mw9x7e-QpHpD5gOuQ2Eg";

const App = () => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const routeRef = useRef([]); // Stores trajectory points
  const [planeData, setPlaneData] = useState({ lat: 37.7749, lon: -122.4194, alt: 10000, speed: 500, moving: false });
  const [source, setSource] = useState({ lat: '', lon: '', name: '' });
  const [destination, setDestination] = useState({ lat: '', lon: '', name: '' });
  const [speed, setSpeed] = useState(500);

  // Fetch plane data continuously
  useEffect(() => {
    const fetchPlaneData = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/plane");
        setPlaneData(response.data);
      } catch (error) {
        console.error("Error fetching plane data:", error);
      }
    };

    fetchPlaneData();
    const interval = setInterval(fetchPlaneData, 500); // Sync every 500ms
    return () => clearInterval(interval);
  }, []);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: [planeData.lon, planeData.lat], // Initial center
        zoom: 3, // Zoom in closer
      });

      map.on("load", () => {
        console.log("✅ Mapbox map loaded");

        // Create a blue dot marker
        const marker = new mapboxgl.Marker({ color: "#007AFF" })
          .setLngLat([planeData.lon, planeData.lat])
          .addTo(map);

        markerRef.current = marker;

        // Add an empty trajectory line
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [],
            },
          },
        });

        // Add trajectory line as a **dotted grey line**
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#808080", // Grey color
            "line-width": 2,
            "line-dasharray": [2, 4], // Dotted line pattern
          },
        });

        console.log("✅ Trajectory line added");
      });

      mapRef.current = map;
    }
  }, []);

  // Update marker position & trajectory when planeData changes
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      console.log("✈️ Updating plane position:", planeData);

      // Move marker to new position
      markerRef.current.setLngLat([planeData.lon, planeData.lat]);
      mapRef.current.setCenter([planeData.lon, planeData.lat]); // Keep the map centered

      // Keep only the last 5 trajectory points
      routeRef.current.push([planeData.lon, planeData.lat]);
      if (routeRef.current.length > 15) {
        routeRef.current.shift();
      }

      // Update trajectory
      const routeSource = mapRef.current.getSource("route");
      if (routeSource) {
        routeSource.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [...routeRef.current],
          },
        });
      }
    }
  }, [planeData]);

  const handleSubmit = async () => {
    await axios.post("http://localhost:5000/api/start", {
      lat: source.lat,
      lon: source.lon,
      alt: 10000,
      speed,
      destination: { lat: destination.lat, lon: destination.lon }
    });
  };

  return (
    <div>
      <div>
        <label>Source:</label>
        <select onChange={(e) => setSource(airportsData[e.target.value])}>
          <option value="">Select Airport</option>
          {Object.entries(airportsData).map(([key, airport]) => (
            <option key={key} value={key}>{airport.name} ({key})</option>
          ))}
        </select>
      </div>
      <div>
        <label>Destination:</label>
        <select onChange={(e) => setDestination(airportsData[e.target.value])}>
          <option value="">Select Airport</option>
          {Object.entries(airportsData).map(([key, airport]) => (
            <option key={key} value={key}>{airport.name} ({key})</option>
          ))}
        </select>
      </div>
      <div>
        <label>Speed (km/h):</label>
        <input type="number" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} />
      </div>
      <button onClick={handleSubmit}>Start Journey</button>
      <p>Current Position: Lat {planeData.lat}, Lon {planeData.lon}, Alt {planeData.alt}, Speed {planeData.speed} km/h</p>
      <div id="map" style={{ width: "100%", height: "800px" }}></div>
    </div>
  );
};

export default App;