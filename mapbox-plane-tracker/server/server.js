require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

// Variables to store static data
let fixesData = null;
let airwaysData = null;

// Function to fetch static data (fixes and airways)
const fetchStaticData = async () => {
  try {
    const [fixesResponse, airwaysResponse] = await Promise.all([
      axiosInstance.get('https://api.swimapisg.info/geopoints/list/fixes?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711'),
      axiosInstance.get('https://api.swimapisg.info/geopoints/list/airways?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711')
    ]);

    fixesData = fixesResponse.data;
    airwaysData = airwaysResponse.data;
    console.log('Static data (fixes and airways) fetched successfully.');
  } catch (error) {
    console.error('Error fetching static data:', error);
  }
};

// Fetch static data on server startup
fetchStaticData();

// Health check endpoint
app.get('/healthcheck', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Get all flight plans or search by callsign
app.get('/api/flight-plans', async (req, res) => {
  const { callsign } = req.query; // Get callsign from query parameter

  try {
    const response = await axiosInstance.get(
      'https://api.swimapisg.info/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711'
    );

    let flightPlans = response.data;

    // Filter flight plans by callsign if provided
    if (callsign) {
      flightPlans = flightPlans.filter(flight =>
        flight.aircraftIdentification.toLowerCase().includes(callsign.toLowerCase())
      );
    }

    res.json(flightPlans);
  } catch (error) {
    console.error('Error fetching flight plans:', error);
    res.status(500).json({ message: 'Error fetching flight plans' });
  }
});

// Get detailed flight plan with waypoints and airways
app.get('/api/flight-plan/:callsign', async (req, res) => {
  const { callsign } = req.params;

  console.log("callsign--> " + callsign);
  try {
    // Fetch flight data
    const flightRes = await axiosInstance.get(
      'https://api.swimapisg.info/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711'
    );

    const flight = flightRes.data.find(f => f.aircraftIdentification === callsign);
    if (!flight) return res.status(404).json({ message: 'Flight not found' });

    const waypoints = [];
    const airways = [];
    const route = flight.filedRoute.routeElement;

    // Process waypoints and airways using pre-fetched static data
    for (const element of route) {
      // Process waypoints
      if (element.position?.designatedPoint) {
        const fix = fixesData.find(f => f.startsWith(element.position.designatedPoint));
        if (fix) {
          const [name, coords] = fix.split(' ');
          const [lat, lon] = coords.replace(/[()]/g, '').split(',');
          waypoints.push({
            id: name,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
          });
        }
      }

      // Process airways
      if (element.airway) {
        // Check if the airway exists in the airwaysData array
        if (airwaysData.includes(element.airway)) {
          airways.push({
            name: element.airway,
            type: element.airwayType
          });
        }
      }
    }

    res.json({
      ...flight,
      waypoints,
      airways: [...new Set(airways.map(a => a.name))] // Deduplicate airway names
    });

  } catch (error) {
    console.error('Error fetching flight details:', error);
    res.status(500).json({ message: 'Error fetching flight details' });
  }
});

const PORT = 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export the server for testing
module.exports = {app, server} ;