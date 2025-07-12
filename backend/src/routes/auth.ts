import { Router } from 'express';

const router = Router();

// Placeholder for authentication routes
// POST /api/auth/login
// POST /api/auth/register
// POST /api/auth/refresh
// POST /api/auth/logout

router.post('/login', (req, res) => {
    res.json({ message: 'Auth login endpoint - TODO: implement' });
});

router.post('/register', (req, res) => {
    res.json({ message: 'Auth register endpoint - TODO: implement' });
});

export { router as authRouter };