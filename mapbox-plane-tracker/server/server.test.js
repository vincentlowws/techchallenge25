const request = require('supertest');
const {app, server} = require('./server'); // Adjust the path to your server file

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
        const res = await request(app).get('/api/flight-plans');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SIA325'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should return 404 for a non-existent flight plan', async () => {
        const nonExistentCallsign = 'DAVIDLOH';
        const res = await request(app).get(`/api/flight-plan/${nonExistentCallsign}`);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('message', 'Flight not found');
    });

    it('should fetch detailed flight plan with waypoints and airways', async () => {
        const callsign = 'SIA325'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plan/${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('waypoints');
        expect(res.body).toHaveProperty('airways');
    });
});