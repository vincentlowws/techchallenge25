const request = require('supertest');
const { app, server } = require('./server'); // Adjust the path to your server file
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('Server Endpoints', () => {
    afterAll((done) => {
        server.close(done); // Close the server after tests
    });

    it('should return a healthy status from /healthcheck', async () => {
        const res = await request(app).get('/healthcheck');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'healthy');
    });

    it('should fetch flight plans from /api/flight-plans', async () => {
        // Mock the external API response
        axios.get.mockResolvedValue({
            data: [
                { aircraftIdentification: 'SIA325', filedRoute: { routeElement: [] } },
                { aircraftIdentification: 'BAW123', filedRoute: { routeElement: [] } },
            ],
        });

        const res = await request(app).get('/api/flight-plans');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SIA325';
        // Mock the external API response
        axios.get.mockResolvedValue({
            data: [
                { aircraftIdentification: 'SIA325', filedRoute: { routeElement: [] } },
                { aircraftIdentification: 'BAW123', filedRoute: { routeElement: [] } },
            ],
        });

        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should return 404 for a non-existent flight plan', async () => {
        const nonExistentCallsign = 'DAVIDLOH';
        // Mock the external API response
        axios.get.mockResolvedValue({
            data: [],
        });

        const res = await request(app).get(`/api/flight-plan/${nonExistentCallsign}`);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('message', 'Flight not found');
    });
});