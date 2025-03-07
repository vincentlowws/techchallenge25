require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "b7bc6577-b73e-4b56-94b6-0d1569bce711"; // API key for the external APIs

// Health check endpoint
app.get("/healthcheck", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// API to get flight plans
app.get("/api/flight-plans", async (req, res) => {
  try {
    const response = await axios.get("http://api.swimapisg.info:9080/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711");
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching flight plans:", error);
    res.status(500).json({ message: "Error fetching flight plans" });
  }
});

// API to get data for a specific flight plan
app.get("/api/flight-plan/:callsign", async (req, res) => {
  const { callsign } = req.params;

  try {
    // Fetch flight plans from the external API
    const flightPlansResponse = await axios.get("http://api.swimapisg.info:9080/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711");

    // Find the specific flight plan by callsign
    const flightPlan = flightPlansResponse.data.find(
      (flight) => flight.aircraftIdentification === callsign
    );

    if (!flightPlan) {
      return res.status(404).json({ message: "Flight plan not found" });
    }

    // Fetch waypoints from the Fixes API
    const waypointsResponse = await axios.get("http://api.swimapisg.info:9080/geopoints/list/fixes?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711");

    // Extract waypoints for the flight plan
    const waypoints = flightPlan.filedRoute.routeElement
      .map((element) => {
        // Check if position and designatedPoint exist
        if (element.position && element.position.designatedPoint) {
          const fix = waypointsResponse.data.find((fix) =>
            fix.startsWith(element.position.designatedPoint)
          );
          if (fix) {
            const [name, coords] = fix.split(" ");
            const [lat, lon] = coords.replace(/[()]/g, "").split(",");
            return {
              id: name,
              latitude: parseFloat(lat),
              longitude: parseFloat(lon),
            };
          }
        }
        return null; // Skip invalid waypoints
      })
      .filter((waypoint) => waypoint !== null); // Remove null values

    // Return the flight plan with waypoints
    res.json({ ...flightPlan, waypoints });
  } catch (error) {
    console.error("Error fetching flight route:", error);
    res.status(500).json({ message: "Error fetching flight route" });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));