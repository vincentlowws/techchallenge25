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
let fixesData = [];
let airwaysData = [];

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
  const { callsign } = req.query;

  try {
    const response = await axiosInstance.get(
      'https://api.swimapisg.info/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711'
    );

    let flightPlans = response.data;

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
    const flightRes = await axiosInstance.get(
      'https://api.swimapisg.info/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711'
    );

    const flight = flightRes.data.find(f => f.aircraftIdentification === callsign);
    if (!flight) return res.status(404).json({ message: 'Flight not found' });

    const waypoints = [];
    const airways = [];
    const route = flight.filedRoute.routeElement;

    // Add DEPARTURE aerodrome as first waypoint
    try {
      const departureAerodromeCode = flight.departure.departureAerodrome;
      const depAerodromeRes = await axiosInstance.get(
        `https://api.swimapisg.info/geopoints/search/airports/${departureAerodromeCode}?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711`
      );
      const depAerodromeData = depAerodromeRes.data[0]; // e.g., "VCBI (7.18,79.89)"
      if (depAerodromeData) {
        const [name, coordsPart] = depAerodromeData.split(' ');
        const coords = coordsPart.replace(/[()]/g, '');
        const [lat, lon] = coords.split(',');
        waypoints.push({
          id: name,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        });
      }
    } catch (error) {
      console.error('Error fetching departure aerodrome:', error);
    }

    for (let i = 0; i < route.length; i++) {
      const element = route[i];

      // Process fixes - Use exact match instead of startsWith
      if (element.position?.designatedPoint) {
        const fix = fixesData.find(f => f.split(' ')[0] === element.position.designatedPoint);
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
      if (element.airway && element.airwayType === "NAMED") {
        try {
          const airwayRes = await axiosInstance.get(
            `https://api.swimapisg.info/geopoints/search/airways/${element.airway}?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711`
          );

          const airwayDetails = airwayRes.data[0];
          if (airwayDetails) {
            const airwayPoints = airwayDetails.split(':')[1].replace(/[\[\]]/g, '').split(',');

            const startFix = waypoints[waypoints.length - 1]?.id;
            const endFix = route[i + 1]?.position?.designatedPoint;

            if (startFix && endFix) {
              const startIndex = airwayPoints.indexOf(startFix.trim());
              const endIndex = airwayPoints.indexOf(endFix.trim());

              if (startIndex !== -1 && endIndex !== -1) {
                if (startIndex < endIndex) {
                  // Traverse forward, excluding start and end
                  for (let j = startIndex + 1; j < endIndex; j++) {
                    const point = airwayPoints[j].trim();
                    const airwayFix = fixesData.find(f => f.split(' ')[0] === point); // Find fix
                    if (airwayFix) {
                      const [name, coords] = airwayFix.split(' ');
                      const [lat, lon] = coords.replace(/[()]/g, '').split(',');
                      waypoints.push({
                        id: name,
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lon)
                      });
                    }
                  }
                } else if (startIndex > endIndex) {
                  // Traverse backward, excluding start and end
                  for (let j = startIndex - 1; j > endIndex; j--) {
                    const point = airwayPoints[j].trim();
                    const airwayFix = fixesData.find(f => f.split(' ')[0] === point); // Find fix
                    if (airwayFix) {
                      const [name, coords] = airwayFix.split(' ');
                      const [lat, lon] = coords.replace(/[()]/g, '').split(',');
                      waypoints.push({
                        id: name,
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lon)
                      });
                    }
                  }
                }
              }
            }

            airways.push({
              name: element.airway,
              type: element.airwayType,
              details: airwayDetails
            });
          }
        } catch (error) {
          console.error(`Error fetching details for airway ${element.airway}:`, error);
        }
      }
    }

    console.log("Final Waypoints:", JSON.stringify(waypoints, null, 2));

    res.json({
      ...flight,
      waypoints,
      airways: [...new Set(airways.map(a => a.name))],
      airwayDetails: airways
    });

  } catch (error) {
    console.error('Error fetching flight details:', error);
    res.status(500).json({ message: 'Error fetching flight details' });
  }
});

const PORT = 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export the server for testing
module.exports = { app, server };
