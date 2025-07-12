"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yieldRouter = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.yieldRouter = router;
router.get('/strategies', (req, res) => {
    res.json({ message: 'Yield strategies endpoint - TODO: implement' });
});
router.get('/apy', (req, res) => {
    res.json({ message: 'Current APY endpoint - TODO: implement' });
});
//# sourceMappingURL=yield.js.map