"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.authRouter = router;
router.post('/login', (req, res) => {
    res.json({ message: 'Auth login endpoint - TODO: implement' });
});
router.post('/register', (req, res) => {
    res.json({ message: 'Auth register endpoint - TODO: implement' });
});
//# sourceMappingURL=auth.js.map