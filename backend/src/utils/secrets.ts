import { config } from '../config/environment';
import { logger } from './logger';
import crypto from 'crypto';

/**
 * Secrets management utility
 * Provides secure access to sensitive configuration values
 */
class SecretsManager {
    private encryptionKey: Buffer;
    private algorithm = 'aes-256-cbc';
    private secrets: Map<string, string> = new Map();
    
    constructor() {
        // Derive encryption key from JWT_SECRET for simplicity
        // In production, this should use a dedicated key management system
        this.encryptionKey = crypto
            .createHash('sha256')
            .update(config.JWT_SECRET)
            .digest();
            
        this.initializeSecrets();
    }
    
    /**
     * Initialize secrets from environment variables
     */
    private initializeSecrets(): void {
        // Store sensitive configuration values
        this.setSecret('JWT_SECRET', config.JWT_SECRET);
        this.setSecret('OPERATOR_PRIVATE_KEY', config.OPERATOR_PRIVATE_KEY);
        this.setSecret('VALIDATOR_PRIVATE_KEY', config.VALIDATOR_PRIVATE_KEY);
        
        // External API keys
        if (config.CIRCLE_API_KEY) {
            this.setSecret('CIRCLE_API_KEY', config.CIRCLE_API_KEY);
        }
        
        if (config.NOBLE_API_KEY) {
            this.setSecret('NOBLE_API_KEY', config.NOBLE_API_KEY);
        }
        
        if (config.CHAINALYSIS_API_KEY) {
            this.setSecret('CHAINALYSIS_API_KEY', config.CHAINALYSIS_API_KEY);
        }
        
        if (config.SENDGRID_API_KEY) {
            this.setSecret('SENDGRID_API_KEY', config.SENDGRID_API_KEY);
        }
        
        this.setSecret('WEBHOOK_SECRET', config.WEBHOOK_SECRET);
        
        logger.info(`Initialized secrets manager with ${this.secrets.size} secrets`);
    }
    
    /**
     * Set a secret value with encryption
     */
    public setSecret(key: string, value: string): void {
        try {
            // Generate random initialization vector
            const iv = crypto.randomBytes(16);
            
            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
            
            // Encrypt the value
            let encrypted = cipher.update(value, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Store encrypted value with IV
            this.secrets.set(key, `${iv.toString('hex')}:${encrypted}`);
        } catch (error) {
            logger.error('Failed to encrypt secret:', error);
            throw new Error(`Failed to set secret: ${key}`);
        }
    }
    
    /**
     * Get a secret value with decryption
     */
    public getSecret(key: string): string {
        try {
            const encryptedValue = this.secrets.get(key);
            
            if (!encryptedValue) {
                throw new Error(`Secret not found`);
            }
            
            // Split the stored value to get IV and encrypted data
            const [ivHex, encryptedData] = encryptedValue.split(':');
            
            // Convert hex to buffer
            const iv = Buffer.from(ivHex, 'hex');
            
            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
            
            // Decrypt the value
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            logger.error('Failed to decrypt secret:', error);
            
            // If the error is about a missing secret, preserve that message
            if ((error as Error).message === 'Secret not found') {
                throw error;
            }
            
            throw new Error(`Failed to get secret: ${key}`);
        }
    }
    
    /**
     * Check if a secret exists
     */
    public hasSecret(key: string): boolean {
        return this.secrets.has(key);
    }
    
    /**
     * Delete a secret
     */
    public deleteSecret(key: string): boolean {
        return this.secrets.delete(key);
    }
    
    /**
     * Rotate a secret (generate new encryption)
     */
    public rotateSecret(key: string): void {
        if (!this.secrets.has(key)) {
            throw new Error(`Secret not found: ${key}`);
        }
        
        const value = this.getSecret(key);
        this.setSecret(key, value);
        logger.info(`Rotated secret: ${key}`);
    }
    
    /**
     * Get API key for external service
     */
    public getApiKey(service: 'circle' | 'noble' | 'chainalysis' | 'sendgrid'): string {
        const keyMap = {
            circle: 'CIRCLE_API_KEY',
            noble: 'NOBLE_API_KEY',
            chainalysis: 'CHAINALYSIS_API_KEY',
            sendgrid: 'SENDGRID_API_KEY',
        };
        
        const key = keyMap[service];
        
        if (!this.hasSecret(key)) {
            throw new Error(`API key not configured for service: ${service}`);
        }
        
        return this.getSecret(key);
    }
    
    /**
     * Get private key for blockchain operations
     */
    public getPrivateKey(type: 'operator' | 'validator'): string {
        const keyMap = {
            operator: 'OPERATOR_PRIVATE_KEY',
            validator: 'VALIDATOR_PRIVATE_KEY',
        };
        
        const key = keyMap[type];
        
        if (!this.hasSecret(key)) {
            throw new Error(`Private key not configured for: ${type}`);
        }
        
        return this.getSecret(key);
    }
}

// Export singleton instance
export const secretsManager = new SecretsManager();

export default secretsManager;