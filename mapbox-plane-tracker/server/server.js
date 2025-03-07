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

// Health check endpoint
app.get('/healthcheck', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Get all flight plans for display on dropbox
app.get('/api/flight-plans', async (req, res) => {
  try {
    const response = await axiosInstance.get(
      'http://api.swimapisg.info:9080/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching flight plans:', error);
    res.status(500).json({ message: 'Error fetching flight plans' });
  }
});

// Get detailed flight plan with waypoints and airways
app.get('/api/flight-plan/:callsign', async (req, res) => {
  const { callsign } = req.params;
  
  try {
    const [flightRes, fixesRes, airwaysRes] = await Promise.all([
      axiosInstance.get('http://api.swimapisg.info:9080/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711'),
      axiosInstance.get('http://api.swimapisg.info:9080/geopoints/list/fixes?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711'),
      axiosInstance.get('http://api.swimapisg.info:9080/geopoints/list/airways?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711')
    ]);

    const flight = flightRes.data.find(f => f.aircraftIdentification === callsign);
    if (!flight) return res.status(404).json({ message: 'Flight not found' });

    const waypoints = [];
    const airways = [];
    const route = flight.filedRoute.routeElement;

    for (const element of route) {
      // Process waypoints
      if (element.position?.designatedPoint) {
        const fix = fixesRes.data.find(f => f.startsWith(element.position.designatedPoint));
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
        airways.push({
          name: element.airway,
          type: element.airwayType
        });
      }
    }

    res.json({
      ...flight,
      waypoints,
      airways: [...new Set(airways.map(a => a.name))]
    });

  } catch (error) {
    console.error('Error fetching flight details:', error);
    res.status(500).json({ message: 'Error fetching flight details' });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));