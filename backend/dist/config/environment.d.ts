export declare const config: {
    NODE_ENV: "development" | "staging" | "production";
    PORT: number;
    API_VERSION: string;
    ALLOWED_ORIGINS: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    RATE_LIMIT_MAX: number;
    DATABASE_URL: string;
    DATABASE_POOL_SIZE: number;
    REDIS_URL: string;
    ETHEREUM_RPC_URL: string;
    POLYGON_RPC_URL: string;
    ARBITRUM_RPC_URL: string;
    BASE_RPC_URL: string;
    XRPL_RPC_URL: string;
    SOLANA_RPC_URL: string;
    YIELD_ESCROW_ADDRESS_ETHEREUM: string;
    YIELD_VAULT_ADDRESS_ETHEREUM: string;
    CROSS_CHAIN_BRIDGE_ADDRESS_ETHEREUM: string;
    YIELD_ESCROW_ADDRESS_POLYGON: string;
    YIELD_VAULT_ADDRESS_POLYGON: string;
    CROSS_CHAIN_BRIDGE_ADDRESS_POLYGON: string;
    OPERATOR_PRIVATE_KEY: string;
    VALIDATOR_PRIVATE_KEY: string;
    CIRCLE_API_URL: string;
    NOBLE_API_URL: string;
    CHAINALYSIS_API_URL: string;
    WEBHOOK_SECRET: string;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    ENABLE_YIELD_OPTIMIZATION: boolean;
    ENABLE_CROSS_CHAIN_BRIDGES: boolean;
    ENABLE_COMPLIANCE_CHECKS: boolean;
    ENABLE_REAL_TIME_NOTIFICATIONS: boolean;
    REDIS_PASSWORD?: string | undefined;
    CIRCLE_API_KEY?: string | undefined;
    NOBLE_API_KEY?: string | undefined;
    CHAINALYSIS_API_KEY?: string | undefined;
    SENDGRID_API_KEY?: string | undefined;
    SENTRY_DSN?: string | undefined;
};
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isStaging: boolean;
export declare const chainConfigs: {
    readonly ethereum: {
        readonly chainId: 1;
        readonly name: "Ethereum Mainnet";
        readonly rpcUrl: string;
        readonly contracts: {
            readonly yieldEscrow: string;
            readonly yieldVault: string;
            readonly crossChainBridge: string;
        };
        readonly blockConfirmations: 12;
        readonly gasMultiplier: 1.1;
    };
    readonly polygon: {
        readonly chainId: 137;
        readonly name: "Polygon";
        readonly rpcUrl: string;
        readonly contracts: {
            readonly yieldEscrow: string;
            readonly yieldVault: string;
            readonly crossChainBridge: string;
        };
        readonly blockConfirmations: 6;
        readonly gasMultiplier: 1.2;
    };
    readonly arbitrum: {
        readonly chainId: 42161;
        readonly name: "Arbitrum One";
        readonly rpcUrl: string;
        readonly contracts: {
            readonly yieldEscrow: "";
            readonly yieldVault: "";
            readonly crossChainBridge: "";
        };
        readonly blockConfirmations: 1;
        readonly gasMultiplier: 1;
    };
    readonly base: {
        readonly chainId: 8453;
        readonly name: "Base";
        readonly rpcUrl: string;
        readonly contracts: {
            readonly yieldEscrow: "";
            readonly yieldVault: "";
            readonly crossChainBridge: "";
        };
        readonly blockConfirmations: 3;
        readonly gasMultiplier: 1.1;
    };
    readonly xrpl: {
        readonly chainId: 2;
        readonly name: "XRPL";
        readonly rpcUrl: string;
        readonly contracts: {};
        readonly blockConfirmations: 1;
    };
    readonly solana: {
        readonly chainId: 3;
        readonly name: "Solana";
        readonly rpcUrl: string;
        readonly contracts: {};
        readonly blockConfirmations: 1;
    };
};
export declare const supportedTokens: {
    readonly USDC: {
        readonly symbol: "USDC";
        readonly name: "USD Coin";
        readonly decimals: 6;
        readonly addresses: {
            readonly ethereum: "0xA0b86a33E6441c78e19C23b9E5A6B67A7e6AD91C";
            readonly polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
            readonly arbitrum: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
            readonly base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
        };
    };
    readonly RLUSD: {
        readonly symbol: "RLUSD";
        readonly name: "Ripple USD";
        readonly decimals: 6;
        readonly addresses: {
            readonly xrpl: "rlusd_issuer_address";
        };
    };
};
export type ChainName = keyof typeof chainConfigs;
export type TokenSymbol = keyof typeof supportedTokens;
//# sourceMappingURL=environment.d.ts.map