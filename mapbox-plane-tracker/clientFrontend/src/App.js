import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";


// mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
mapboxgl.accessToken = "pk.eyJ1IjoidG5lY25pdiIsImEiOiJjbDI1eG9hZGUwMDd5M2xwd3poOGI4dG53In0.C9Mw9x7e-QpHpD5gOuQ2Eg";

const App = () => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [flightPlans, setFlightPlans] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [isMoving, setIsMoving] = useState(false);

  // Fetch flight plans from the server
  useEffect(() => {
    const fetchFlightPlans = async () => {
      try {
        const response = await axios.get("http://13.212.6.28:5000"+"/api/flight-plans");
        setFlightPlans(response.data);
      } catch (error) {
        console.error("Error fetching flight plans:", error);
      }
    };

    fetchFlightPlans();
  }, []);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/streets-v11",
        center: [103.8198, 1.3521], // Default to Singapore
        zoom: 8,
      });

      map.on("load", () => {
        console.log("✅ Mapbox map loaded");

        // Add an empty route source
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

        // Add route layer
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#007AFF",
            "line-width": 2,
          },
        });

        console.log("✅ Route layer added");
      });

      mapRef.current = map;
    }
  }, []);

  // Update map when a flight plan is selected
  useEffect(() => {
    if (mapRef.current && selectedFlight) {
      const fetchFlightRoute = async () => {
        try {
          const response = await axios.get(
            "http://13.212.6.28:5000"+`/api/flight-plan/${selectedFlight}`
          );
          const flightRoute = response.data;

          // Update the route source
          const routeSource = mapRef.current.getSource("route");
          if (routeSource) {
            routeSource.setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: flightRoute.waypoints.map((waypoint) => [
                  waypoint.longitude,
                  waypoint.latitude,
                ]),
              },
            });
          }

          // Center the map on the first waypoint
          if (flightRoute.waypoints.length > 0) {
            mapRef.current.setCenter([
              flightRoute.waypoints[0].longitude,
              flightRoute.waypoints[0].latitude,
            ]);
            mapRef.current.setZoom(8);
          }

          // Start moving the marker along the waypoints
          setIsMoving(true);
          setCurrentWaypointIndex(0);

          // Remove existing markers
          if (markerRef.current) {
            markerRef.current.remove();
          }

          // Create a plane icon element
          const planeIcon = document.createElement("div");
          planeIcon.className = "plane-icon";
          planeIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path d="M22 16v-2l-8.5-5V3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V9L2 14v2l8.5-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13.5 19v-5.5L22 16z"/>
            </svg>
          `;

          // Add a new marker for the plane
          const marker = new mapboxgl.Marker(planeIcon)
            .setLngLat([
              flightRoute.waypoints[0].longitude,
              flightRoute.waypoints[0].latitude,
            ])
            .addTo(mapRef.current);

          markerRef.current = marker;
        } catch (error) {
          console.error("Error fetching flight route:", error);
        }
      };

      fetchFlightRoute();
    }
  }, [selectedFlight]);

  // Move the marker along the waypoints
  useEffect(() => {
    if (isMoving && selectedFlight) {
      const moveMarker = async () => {
        try {
          const response = await axios.get(
            "http://13.212.6.28:5000"+`/api/flight-plan/${selectedFlight}`
          );
          const flightRoute = response.data;

          if (currentWaypointIndex < flightRoute.waypoints.length - 1) {
            const nextWaypointIndex = currentWaypointIndex + 1;
            const currentWaypoint = flightRoute.waypoints[currentWaypointIndex];
            const nextWaypoint = flightRoute.waypoints[nextWaypointIndex];

            // Calculate the distance between waypoints
            const distance = Math.sqrt(
              Math.pow(nextWaypoint.longitude - currentWaypoint.longitude, 2) +
              Math.pow(nextWaypoint.latitude - currentWaypoint.latitude, 2)
            );

            // Simulate movement (adjust speed as needed)
            const steps = 100; // Number of steps between waypoints
            const stepSizeLon = (nextWaypoint.longitude - currentWaypoint.longitude) / steps;
            const stepSizeLat = (nextWaypoint.latitude - currentWaypoint.latitude) / steps;

            let step = 0;
            const interval = setInterval(() => {
              if (step < steps) {
                const newLon = currentWaypoint.longitude + stepSizeLon * step;
                const newLat = currentWaypoint.latitude + stepSizeLat * step;
                markerRef.current.setLngLat([newLon, newLat]);
                step++;
              } else {
                clearInterval(interval);
                setCurrentWaypointIndex(nextWaypointIndex);
              }
            }, 50); // Adjust speed of movement (milliseconds per step)
          } else {
            setIsMoving(false); // Stop moving when the last waypoint is reached
          }
        } catch (error) {
          console.error("Error moving marker:", error);
        }
      };

      moveMarker();
    }
  }, [currentWaypointIndex, isMoving, selectedFlight]);

  return (
    <div>
      <h1>Flight Plan Viewer</h1>

      <div>
        <label>Select Flight Plan:</label>
        <select onChange={(e) => setSelectedFlight(e.target.value)}>
          <option value="">Select Flight Plan</option>
          {flightPlans.map((flight) => (
            <option key={flight.callsign} value={flight.callsign}>
              {flight.callsign}: {flight.departure} to {flight.destination}
            </option>
          ))}
        </select>
      </div>

      <div id="map" style={{ width: "100%", height: "800px" }}></div>
    </div>
  );
};

export default App;