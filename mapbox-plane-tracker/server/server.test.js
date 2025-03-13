const request = require('supertest');
const { app, server } = require('./server'); // Adjust the path to your server file
require('dotenv').config({ path: '.env.test' }); // Load test environment variables

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

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SAI469'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SIA951'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SIA7296'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SIA2'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SIA38'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SIA478'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should filter flight plans by callsign', async () => {
        const callsign = 'SIA27'; // Replace with a valid callsign for testing
        const res = await request(app).get(`/api/flight-plans?callsign=${callsign}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.every(flight => flight.aircraftIdentification.includes(callsign))).toBeTruthy();
    });

    it('should return 404 for a non-existent flight plan', async () => {
        const nonExistentCallsign = 'CAAS89';
        const res = await request(app).get(`/api/flight-plan/${nonExistentCallsign}`);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('message', 'Flight not found');
    });
});