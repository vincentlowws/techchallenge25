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
    // (1) Fetch flight data
    const flightRes = await axiosInstance.get(
      'https://api.swimapisg.info/flight-manager/displayAll?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711'
    );

    const flight = flightRes.data.find(f => f.aircraftIdentification === callsign);
    if (!flight) return res.status(404).json({ message: 'Flight not found' });

    const waypoints = [];
    const airways = [];
    const route = flight.filedRoute.routeElement;

    // (2) Process route elements e.g. FIX1 -> AIRWAY1 -> FIX2 -> AIRWAY2 -> FIX3
    for (let i = 0; i < route.length; i++) {
      const element = route[i];

      // (3) Process fixes get the lat and lon
      if (element.position?.designatedPoint) {
        const fix = fixesData.find(f => f.startsWith(element.position.designatedPoint));
        if (fix) {
          const [name, coords] = fix.split(' ');
          const [lat, lon] = coords.replace(/[()]/g, '').split(',');
                
          // (4) push the fix's lat lon
          waypoints.push({
            id: name,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
          });
        }
      }

      // (5) Process airways, airwayType = NAMED
      if (element.airway && element.airwayType === "NAMED") {
        try {
          // Fetch detailed airway information
          const airwayRes = await axiosInstance.get(
            `https://api.swimapisg.info/geopoints/search/airways/${element.airway}?apikey=b7bc6577-b73e-4b56-94b6-0d1569bce711`
          );

          //(6) airway details consists of e.g. ["Z650: [MANRO,POGAV,MOLID,BCU,BUCSA,TOMET,RAROS,TGM,REBLA,
          // EREDI,LUNAV,OBARA,RULES,NARKA,ABITU,BERVA,PEPIK,IVOLI,ROKEM,VEMUT,TIPAM,NIKUS,NOGRA,ERETO,
          // TONSU,SULUS]"]

          // TODO: Error Checking
          const airwayDetails = airwayRes.data[0]; // Assuming the API returns an array with one element, 
          if (airwayDetails) {
            // Extract waypoints from the airway details
            const airwayPoints = airwayDetails.split(':')[1].replace(/[\[\]]/g, '').split(',');

            // (7) Find the start and end fixes for the airway
            const startFix = waypoints[waypoints.length - 1]?.id; // Last added fix
            const endFix = route[i + 1]?.position?.designatedPoint; // Next fix in the route

            if (startFix && endFix) {
              // (8) Find the indices of the start and end fixes in the airway details
              const startIndex = airwayPoints.indexOf(startFix.trim());
              const endIndex = airwayPoints.indexOf(endFix.trim());

              if (startIndex !== -1 && endIndex !== -1) {
                // (9) Add the waypoints between the start and end fixes
                for (let j = startIndex; j <= endIndex; j++) {
                  const point = airwayPoints[j].trim();
                  const fix = fixesData.find(f => f.startsWith(point));
                  if (fix) {
                    const [name, coords] = fix.split(' ');
                    const [lat, lon] = coords.replace(/[()]/g, '').split(',');
                    // (10) Push the waypoints
                    waypoints.push({
                      id: name,
                      latitude: parseFloat(lat),
                      longitude: parseFloat(lon)
                    });
                  }
                }
              }
            }

            //Not necessary to keep this.
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
      airways: [...new Set(airways.map(a => a.name))], // Deduplicate airway names
      airwayDetails: airways // Include detailed airway information
    });

  } catch (error) {
    console.error('Error fetching flight details:', error);
    res.status(500).json({ message: 'Error fetching flight details' });
  }
});

const PORT = 5001;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export the server for testing
module.exports = {app, server} ;