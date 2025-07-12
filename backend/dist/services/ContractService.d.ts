import { ethers } from 'ethers';
import { ChainName } from '../config/environment';
export declare class ContractService {
    private providers;
    constructor();
    private initializeProviders;
    getProvider(chain: ChainName): ethers.JsonRpcProvider;
}
//# sourceMappingURL=ContractService.d.ts.map