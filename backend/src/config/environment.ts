import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

/**
 * Environment configuration schema with validation
 */
const envSchema = z.object({
    // Server configuration
    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    PORT: z.string().transform(Number).default(3000),
    API_VERSION: z.string().default('1.0.0'),
    
    // CORS and security
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('24h'),
    RATE_LIMIT_MAX: z.string().transform(Number).default(100),
    
    // Database configuration
    DATABASE_URL: z.string().url(),
    DATABASE_POOL_SIZE: z.string().transform(Number).default(10),
    
    // Redis configuration
    REDIS_URL: z.string().url(),
    REDIS_PASSWORD: z.string().optional(),
    
    // Blockchain configuration
    ETHEREUM_RPC_URL: z.string().url(),
    POLYGON_RPC_URL: z.string().url(),
    ARBITRUM_RPC_URL: z.string().url(),
    BASE_RPC_URL: z.string().url(),
    XRPL_RPC_URL: z.string().url(),
    SOLANA_RPC_URL: z.string().url(),
    
    // Contract addresses
    YIELD_ESCROW_ADDRESS_ETHEREUM: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    YIELD_VAULT_ADDRESS_ETHEREUM: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    CROSS_CHAIN_BRIDGE_ADDRESS_ETHEREUM: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    
    YIELD_ESCROW_ADDRESS_POLYGON: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    YIELD_VAULT_ADDRESS_POLYGON: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    CROSS_CHAIN_BRIDGE_ADDRESS_POLYGON: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    
    // Private keys for transaction signing
    OPERATOR_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    VALIDATOR_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    
    // External service configurations
    CIRCLE_API_KEY: z.string().optional(),
    CIRCLE_API_URL: z.string().url().default('https://api.circle.com'),
    
    NOBLE_API_KEY: z.string().optional(),
    NOBLE_API_URL: z.string().url().default('https://api.noble.xyz'),
    
    CHAINALYSIS_API_KEY: z.string().optional(),
    CHAINALYSIS_API_URL: z.string().url().default('https://api.chainalysis.com'),
    
    // Notification services
    SENDGRID_API_KEY: z.string().optional(),
    WEBHOOK_SECRET: z.string().min(32),
    
    // Monitoring and logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    SENTRY_DSN: z.string().url().optional(),
    
    // Feature flags
    ENABLE_YIELD_OPTIMIZATION: z.string().transform(Boolean).default(true),
    ENABLE_CROSS_CHAIN_BRIDGES: z.string().transform(Boolean).default(true),
    ENABLE_COMPLIANCE_CHECKS: z.string().transform(Boolean).default(true),
    ENABLE_REAL_TIME_NOTIFICATIONS: z.string().transform(Boolean).default(true),
});

/**
 * Validated environment configuration
 */
export const config = envSchema.parse(process.env);

/**
 * Configuration by environment
 */
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isStaging = config.NODE_ENV === 'staging';

/**
 * Chain configurations
 */
export const chainConfigs = {
    ethereum: {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: config.ETHEREUM_RPC_URL,
        contracts: {
            yieldEscrow: config.YIELD_ESCROW_ADDRESS_ETHEREUM,
            yieldVault: config.YIELD_VAULT_ADDRESS_ETHEREUM,
            crossChainBridge: config.CROSS_CHAIN_BRIDGE_ADDRESS_ETHEREUM,
        },
        blockConfirmations: 12,
        gasMultiplier: 1.1,
    },
    polygon: {
        chainId: 137,
        name: 'Polygon',
        rpcUrl: config.POLYGON_RPC_URL,
        contracts: {
            yieldEscrow: config.YIELD_ESCROW_ADDRESS_POLYGON,
            yieldVault: config.YIELD_VAULT_ADDRESS_POLYGON,
            crossChainBridge: config.CROSS_CHAIN_BRIDGE_ADDRESS_POLYGON,
        },
        blockConfirmations: 6,
        gasMultiplier: 1.2,
    },
    arbitrum: {
        chainId: 42161,
        name: 'Arbitrum One',
        rpcUrl: config.ARBITRUM_RPC_URL,
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
        rpcUrl: config.BASE_RPC_URL,
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
        rpcUrl: config.XRPL_RPC_URL,
        contracts: {
            // XRPL uses different addressing scheme
        },
        blockConfirmations: 1,
    },
    solana: {
        chainId: 3,
        name: 'Solana',
        rpcUrl: config.SOLANA_RPC_URL,
        contracts: {
            // Solana uses different addressing scheme
        },
        blockConfirmations: 1,
    },
} as const;

/**
 * Supported tokens configuration
 */
export const supportedTokens = {
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
} as const;

export type ChainName = keyof typeof chainConfigs;
export type TokenSymbol = keyof typeof supportedTokens;