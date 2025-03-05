require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let planeData = {
  lat: 37.7749,
  lon: -122.4194,
  alt: 10000,
  speed: 500,
  destination: null,
  moving: false,
};

let animationInterval = null;

// API to get plane data
app.get("/api/plane", (req, res) => {
  res.json(planeData);
});

// API to start movement simulation
app.post("/api/start", (req, res) => {
  const { lat, lon, alt, speed, destination } = req.body;

  if (!lat || !lon || !alt || !speed || !destination) {
    return res.status(400).json({ message: "Invalid data format" });
  }

  planeData = { lat, lon, alt, speed, destination, moving: true };

  // Clear any existing animation
  if (animationInterval) clearInterval(animationInterval);

  const movePlane = () => {
    const { lat: destLat, lon: destLon } = planeData.destination;
    const totalSteps = Math.ceil(100 / (speed / 100)); // Adjust movement smoothness based on speed
    const distanceLat = (destLat - planeData.lat) / totalSteps;
    const distanceLon = (destLon - planeData.lon) / totalSteps;

    animationInterval = setInterval(() => {
      planeData.lat += distanceLat;
      planeData.lon += distanceLon;
      
      if (
        Math.abs(planeData.lat - destLat) < Math.abs(distanceLat) &&
        Math.abs(planeData.lon - destLon) < Math.abs(distanceLon)
      ) {
        clearInterval(animationInterval);
        planeData.lat = destLat;
        planeData.lon = destLon;
        planeData.moving = false;
      }
    }, 500 / (speed / 100)); // Adjust update frequency based on speed
  };

  movePlane();
  res.json({ message: "Plane journey started" });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));