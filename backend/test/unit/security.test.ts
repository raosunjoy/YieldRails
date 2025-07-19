import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { securityMiddleware } from '../../src/middleware/security';
import { errorHandler } from '../../src/middleware/errorHandler';

describe('Security Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(securityMiddleware.enhancedHelmet);
        app.use(cors(securityMiddleware.corsOptions));
        app.use(securityMiddleware.inputSanitizer);
        app.use(securityMiddleware.sqlInjectionProtection);
        
        // Test route for input sanitization
        app.post('/api/test/sanitize', (req, res) => {
            res.json({ body: req.body });
        });
        
        // Test route for SQL injection protection
        app.get('/api/test/sql-injection', (req, res) => {
            res.json({ query: req.query });
        });
        
        app.use(errorHandler);
    });

    describe('Security Headers', () => {
        it('should set security headers correctly', async () => {
            const response = await request(app).get('/');
            
            // Check for security headers set by helmet
            expect(response.headers['content-security-policy']).toBeDefined();
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBeDefined();
            expect(response.headers['x-xss-protection']).toBeDefined();
        });
    });

    describe('Input Sanitization', () => {
        it('should sanitize XSS payloads in request body', async () => {
            const xssPayload = {
                name: '<script>alert("XSS")</script>',
                description: 'Normal text with <img src="x" onerror="alert(1)">',
                htmlContent: '<div>Some content with <script>evil()</script></div>'
            };
            
            const response = await request(app)
                .post('/api/test/sanitize')
                .send(xssPayload);
            
            expect(response.status).toBe(200);
            expect(response.body.body.name).not.toContain('<script>');
            // The string is HTML-escaped, so we check for HTML escaping
            expect(response.body.body.description).toContain('&lt;img');
            // HTML content should be sanitized but preserve safe tags
            expect(response.body.body.htmlContent).toContain('<div>');
            expect(response.body.body.htmlContent).not.toContain('<script>');
        });
        
        it('should handle nested objects for sanitization', async () => {
            const nestedPayload = {
                user: {
                    name: '<script>alert("XSS")</script>',
                    profile: {
                        bio: 'Text with <img src="x" onerror="alert(1)">'
                    }
                }
            };
            
            const response = await request(app)
                .post('/api/test/sanitize')
                .send(nestedPayload);
            
            expect(response.status).toBe(200);
            expect(response.body.body.user.name).not.toContain('<script>');
            // The string is HTML-escaped, so we check for HTML escaping
            expect(response.body.body.user.profile.bio).toContain('&lt;img');
        });
    });

    describe('SQL Injection Protection', () => {
        it('should block SQL injection attempts in query parameters', async () => {
            const response = await request(app)
                .get('/api/test/sql-injection')
                .query({ id: "1' OR '1'='1" });
            
            expect(response.status).toBe(403);
            expect(response.body.error).toBeDefined();
        });
        
        it('should block SQL injection attempts with UNION', async () => {
            const response = await request(app)
                .get('/api/test/sql-injection')
                .query({ query: "UNION ALL SELECT username, password FROM users" });
            
            expect(response.status).toBe(403);
            expect(response.body.error).toBeDefined();
        });
        
        it('should allow valid query parameters', async () => {
            const response = await request(app)
                .get('/api/test/sql-injection')
                .query({ id: "12345" });
            
            expect(response.status).toBe(200);
        });
    });
});