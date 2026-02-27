const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const secretsClient = new SecretsManagerClient({
    region: process.env.AWS_REGION || "us-east-1",
});

let cachedSecrets = null;
let tokenExpiresAt = 0;

/**
 * Fetches secrets from AWS Secrets Manager based on the current environment.
 * Uses aggressive caching to prevent overwhelming AWS API limits.
 */
async function getSecret(secretName) {
    const currentEnv = process.env.NODE_ENV || 'development';
    const fullSecretId = `hireapp/${currentEnv}/${secretName}`;

    if (cachedSecrets && cachedSecrets[fullSecretId] && Date.now() < tokenExpiresAt) {
        return cachedSecrets[fullSecretId];
    }

    try {
        const response = await secretsClient.send(
            new GetSecretValueCommand({
                SecretId: fullSecretId,
            })
        );

        if (response.SecretString) {
            if (!cachedSecrets) cachedSecrets = {};

            const parsed = JSON.parse(response.SecretString);
            cachedSecrets[fullSecretId] = parsed;
            tokenExpiresAt = Date.now() + 15 * 60 * 1000; // Cache for 15 minutes

            return parsed;
        }

        throw new Error("SecretBinary not supported in this simplistic wrapper.");
    } catch (error) {
        console.error(`Error fetching secret ${fullSecretId}:`, error);
        // Graceful fallback to local process.env variables if Secrets Manager fails
        // Critical for local development where AWS access might be restricted
        return process.env;
    }
}

module.exports = { getSecret };
