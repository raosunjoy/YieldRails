"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceRouter = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.complianceRouter = router;
router.post('/check-address', (req, res) => {
    res.json({ message: 'Address compliance check endpoint - TODO: implement' });
});
router.get('/status/:address', (req, res) => {
    res.json({ message: 'Compliance status endpoint - TODO: implement' });
});
//# sourceMappingURL=compliance.js.map