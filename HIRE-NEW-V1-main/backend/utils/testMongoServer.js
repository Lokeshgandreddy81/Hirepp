const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');

const LOOPBACK_IP = String(process.env.MONGOMS_IP || '127.0.0.1');
const BASE_PORT = Number.parseInt(process.env.MONGOMS_PORT_BASE || '27017', 10);
const MAX_ATTEMPTS = Number.parseInt(process.env.MONGOMS_MAX_PORT_ATTEMPTS || '30', 10);
const EXPLICIT_PORT = Number.parseInt(process.env.MONGOMS_PORT || '', 10);

const getStableOffset = (namespace) => {
    const digest = crypto
        .createHash('sha1')
        .update(String(namespace || 'mongo-test'))
        .digest();
    return digest.readUInt16BE(0) % 1000;
};

const createMongoMemoryServer = async (namespace = 'mongo-test') => {
    const hasExplicitPort = Number.isInteger(EXPLICIT_PORT) && EXPLICIT_PORT > 0;
    const startPort = hasExplicitPort
        ? EXPLICIT_PORT
        : BASE_PORT + getStableOffset(namespace);

    let lastError;
    for (let attempt = 0; attempt < Math.max(1, MAX_ATTEMPTS); attempt += 1) {
        const port = startPort + attempt;
        try {
            return await MongoMemoryServer.create({
                instance: {
                    ip: LOOPBACK_IP,
                    port,
                },
            });
        } catch (error) {
            lastError = error;

            if (hasExplicitPort) {
                break;
            }

            const message = String(error?.message || '');
            const canRetry = /EADDRINUSE|EACCES|listen|bind|port|EPERM/i.test(message);
            if (!canRetry) {
                break;
            }
        }
    }

    throw lastError;
};

module.exports = {
    createMongoMemoryServer,
};
