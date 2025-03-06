require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Simulated flight plans
const flightPlans = [
  {
    id: "1",
    callsign: "SIA123",
    departure: "WSSS", // Singapore Changi Airport
    destination: "WMKK", // Kuala Lumpur International Airport
  },
  {
    id: "2",
    callsign: "QTR456",
    departure: "OTHH", // Hamad International Airport (Doha)
    destination: "WSSS", // Singapore Changi Airport
  },
];

// Simulated airways
const airways = [
  {
    id: "A1",
    flightPlanId: "1", // Belongs to flight plan SIA123
    name: "Airway A1",
    waypoints: ["SINGA", "BETTY"],
  },
  {
    id: "B12",
    flightPlanId: "1", // Belongs to flight plan SIA123
    name: "Airway B12",
    waypoints: ["BETTY", "WMKK"],
  },
];

// Simulated waypoints
const waypoints = [
  {
    id: "SINGA",
    flightPlanId: "1", // Belongs to flight plan SIA123
    latitude: 1.3521,
    longitude: 103.8198,
  },
  {
    id: "BETTY",
    flightPlanId: "1", // Belongs to flight plan SIA123
    latitude: 2.7456,
    longitude: 101.7079,
  },
  {
    id: "WMKK",
    flightPlanId: "1", // Belongs to flight plan SIA123
    latitude: 3.1390,
    longitude: 101.6869,
  },
];

// API to get flight plans
app.get("/api/flight-plans", (req, res) => {
  res.json(flightPlans);
});

// API to get airways
app.get("/api/airways", (req, res) => {
  res.json(airways);
});

// API to get waypoints
app.get("/api/waypoints", (req, res) => {
  res.json(waypoints);
});

// API to get data for a specific flight plan
app.get("/api/flight-plan/:callsign", (req, res) => {
  const { callsign } = req.params;
  const flightPlan = flightPlans.find((flight) => flight.callsign === callsign);

  if (!flightPlan) {
    return res.status(404).json({ message: "Flight plan not found" });
  }

  // Add airways and waypoints to the flight plan
  const flightRoute = {
    ...flightPlan,
    airways: airways.filter((airway) => airway.flightPlanId === flightPlan.id),
    waypoints: waypoints.filter((waypoint) => waypoint.flightPlanId === flightPlan.id),
  };

  res.json(flightRoute);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));