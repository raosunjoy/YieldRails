"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crossChainRouter = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.crossChainRouter = router;
router.post('/bridge', (req, res) => {
    res.json({ message: 'Cross-chain bridge endpoint - TODO: implement' });
});
router.get('/supported-chains', (req, res) => {
    res.json({ message: 'Supported chains endpoint - TODO: implement' });
});
//# sourceMappingURL=crosschain.js.map