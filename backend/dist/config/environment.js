"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportedTokens = exports.chainConfigs = exports.isStaging = exports.isProduction = exports.isDevelopment = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3000'),
    API_VERSION: zod_1.z.string().default('1.0.0'),
    ALLOWED_ORIGINS: zod_1.z.string().default('http://localhost:3000,http://localhost:3001'),
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('24h'),
    RATE_LIMIT_MAX: zod_1.z.string().transform(Number).default('100'),
    DATABASE_URL: zod_1.z.string().url(),
    DATABASE_POOL_SIZE: zod_1.z.string().transform(Number).default('10'),
    REDIS_URL: zod_1.z.string().url(),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    ETHEREUM_RPC_URL: zod_1.z.string().url(),
    POLYGON_RPC_URL: zod_1.z.string().url(),
    ARBITRUM_RPC_URL: zod_1.z.string().url(),
    BASE_RPC_URL: zod_1.z.string().url(),
    XRPL_RPC_URL: zod_1.z.string().url(),
    SOLANA_RPC_URL: zod_1.z.string().url(),
    YIELD_ESCROW_ADDRESS_ETHEREUM: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    YIELD_VAULT_ADDRESS_ETHEREUM: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    CROSS_CHAIN_BRIDGE_ADDRESS_ETHEREUM: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    YIELD_ESCROW_ADDRESS_POLYGON: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    YIELD_VAULT_ADDRESS_POLYGON: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    CROSS_CHAIN_BRIDGE_ADDRESS_POLYGON: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    OPERATOR_PRIVATE_KEY: zod_1.z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    VALIDATOR_PRIVATE_KEY: zod_1.z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    CIRCLE_API_KEY: zod_1.z.string().optional(),
    CIRCLE_API_URL: zod_1.z.string().url().default('https://api.circle.com'),
    NOBLE_API_KEY: zod_1.z.string().optional(),
    NOBLE_API_URL: zod_1.z.string().url().default('https://api.noble.xyz'),
    CHAINALYSIS_API_KEY: zod_1.z.string().optional(),
    CHAINALYSIS_API_URL: zod_1.z.string().url().default('https://api.chainalysis.com'),
    SENDGRID_API_KEY: zod_1.z.string().optional(),
    WEBHOOK_SECRET: zod_1.z.string().min(32),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    SENTRY_DSN: zod_1.z.string().url().optional(),
    ENABLE_YIELD_OPTIMIZATION: zod_1.z.string().transform(Boolean).default('true'),
    ENABLE_CROSS_CHAIN_BRIDGES: zod_1.z.string().transform(Boolean).default('true'),
    ENABLE_COMPLIANCE_CHECKS: zod_1.z.string().transform(Boolean).default('true'),
    ENABLE_REAL_TIME_NOTIFICATIONS: zod_1.z.string().transform(Boolean).default('true'),
});
exports.config = envSchema.parse(process.env);
exports.isDevelopment = exports.config.NODE_ENV === 'development';
exports.isProduction = exports.config.NODE_ENV === 'production';
exports.isStaging = exports.config.NODE_ENV === 'staging';
exports.chainConfigs = {
    ethereum: {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: exports.config.ETHEREUM_RPC_URL,
        contracts: {
            yieldEscrow: exports.config.YIELD_ESCROW_ADDRESS_ETHEREUM,
            yieldVault: exports.config.YIELD_VAULT_ADDRESS_ETHEREUM,
            crossChainBridge: exports.config.CROSS_CHAIN_BRIDGE_ADDRESS_ETHEREUM,
        },
        blockConfirmations: 12,
        gasMultiplier: 1.1,
    },
    polygon: {
        chainId: 137,
        name: 'Polygon',
        rpcUrl: exports.config.POLYGON_RPC_URL,
        contracts: {
            yieldEscrow: exports.config.YIELD_ESCROW_ADDRESS_POLYGON,
            yieldVault: exports.config.YIELD_VAULT_ADDRESS_POLYGON,
            crossChainBridge: exports.config.CROSS_CHAIN_BRIDGE_ADDRESS_POLYGON,
        },
        blockConfirmations: 6,
        gasMultiplier: 1.2,
    },
    arbitrum: {
        chainId: 42161,
        name: 'Arbitrum One',
        rpcUrl: exports.config.ARBITRUM_RPC_URL,
        contracts: {
            yieldEscrow: '',
            yieldVault: '',
            crossChainBridge: '',
        },
        blockConfirmations: 1,
        gasMultiplier: 1.0,
    },
    base: {
        chainId: 8453,
        name: 'Base',
        rpcUrl: exports.config.BASE_RPC_URL,
        contracts: {
            yieldEscrow: '',
            yieldVault: '',
            crossChainBridge: '',
        },
        blockConfirmations: 3,
        gasMultiplier: 1.1,
    },
    xrpl: {
        chainId: 2,
        name: 'XRPL',
        rpcUrl: exports.config.XRPL_RPC_URL,
        contracts: {},
        blockConfirmations: 1,
    },
    solana: {
        chainId: 3,
        name: 'Solana',
        rpcUrl: exports.config.SOLANA_RPC_URL,
        contracts: {},
        blockConfirmations: 1,
    },
};
exports.supportedTokens = {
    USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        addresses: {
            ethereum: '0xA0b86a33E6441c78e19C23b9E5A6B67A7e6AD91C',
            polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            arbitrum: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
            base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        },
    },
    RLUSD: {
        symbol: 'RLUSD',
        name: 'Ripple USD',
        decimals: 6,
        addresses: {
            xrpl: 'rlusd_issuer_address',
        },
    },
};
//# sourceMappingURL=environment.js.map