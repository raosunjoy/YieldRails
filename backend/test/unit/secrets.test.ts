import { secretsManager } from '../../src/utils/secrets';

describe('Secrets Manager', () => {
    const testSecretKey = 'TEST_SECRET';
    const testSecretValue = 'super-secret-value-123';
    
    beforeAll(() => {
        // Set up a test secret
        secretsManager.setSecret(testSecretKey, testSecretValue);
    });
    
    it('should store and retrieve secrets correctly', () => {
        // Check if secret exists
        expect(secretsManager.hasSecret(testSecretKey)).toBe(true);
        
        // Retrieve and verify secret
        const retrievedSecret = secretsManager.getSecret(testSecretKey);
        expect(retrievedSecret).toBe(testSecretValue);
    });
    
    it('should throw error for non-existent secrets', () => {
        expect(() => {
            secretsManager.getSecret('NON_EXISTENT_SECRET');
        }).toThrow('Secret not found');
    });
    
    it('should rotate secrets correctly', () => {
        // Rotate the secret
        secretsManager.rotateSecret(testSecretKey);
        
        // Secret should still be accessible with the same value
        const rotatedSecret = secretsManager.getSecret(testSecretKey);
        expect(rotatedSecret).toBe(testSecretValue);
    });
    
    it('should delete secrets correctly', () => {
        const tempKey = 'TEMP_SECRET';
        secretsManager.setSecret(tempKey, 'temporary value');
        
        // Verify secret exists
        expect(secretsManager.hasSecret(tempKey)).toBe(true);
        
        // Delete the secret
        const result = secretsManager.deleteSecret(tempKey);
        expect(result).toBe(true);
        
        // Verify secret no longer exists
        expect(secretsManager.hasSecret(tempKey)).toBe(false);
    });
    
    it('should handle API keys correctly', () => {
        // This test assumes the environment has CIRCLE_API_KEY set
        // If not, it will throw an error which is the expected behavior
        try {
            const apiKey = secretsManager.getApiKey('circle');
            expect(typeof apiKey).toBe('string');
        } catch (error) {
            // If API key is not configured, this is expected
            expect((error as Error).message).toContain('API key not configured');
        }
    });
});