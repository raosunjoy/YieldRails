"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractService = void 0;
const ethers_1 = require("ethers");
const environment_1 = require("../config/environment");
class ContractService {
    constructor() {
        this.providers = new Map();
        this.initializeProviders();
    }
    initializeProviders() {
        for (const [chainName, config] of Object.entries(environment_1.chainConfigs)) {
            const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
            this.providers.set(chainName, provider);
        }
    }
    getProvider(chain) {
        const provider = this.providers.get(chain);
        if (!provider) {
            throw new Error(`Provider not found for chain: ${chain}`);
        }
        return provider;
    }
}
exports.ContractService = ContractService;
//# sourceMappingURL=ContractService.js.map