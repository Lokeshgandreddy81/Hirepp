#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const logger = require('../utils/logger');

const main = async () => {
    const mongoUri = String(process.env.MONGO_URI || '').trim();
    if (!mongoUri) {
        logger.error('MONGO_URI is required');
        process.exit(1);
    }

    const outputRoot = String(process.env.MONGO_BACKUP_DIR || path.join(__dirname, '..', 'backups', 'mongo')).trim();
    const archiveStoreRoot = String(process.env.BACKUP_STORAGE_PATH || path.join(outputRoot, 'archives')).trim();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(outputRoot, `mongo-backup-${timestamp}.archive.gz`);
    const metadataPath = path.join(outputRoot, `mongo-backup-${timestamp}.json`);

    fs.mkdirSync(outputRoot, { recursive: true });
    fs.mkdirSync(archiveStoreRoot, { recursive: true });

    logger.info({ event: 'mongo_backup_started', archivePath });

    const dump = spawnSync('mongodump', [
        `--uri=${mongoUri}`,
        `--archive=${archivePath}`,
        '--gzip',
    ], {
        stdio: 'inherit',
    });

    if (dump.status !== 0) {
        logger.error({ event: 'mongo_backup_failed', code: dump.status });
        process.exit(dump.status || 1);
    }

    const fileBuffer = fs.readFileSync(archivePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileSizeBytes = fileBuffer.length;
    const archivedCopyPath = path.join(archiveStoreRoot, path.basename(archivePath));

    fs.copyFileSync(archivePath, archivedCopyPath);

    const metadata = {
        createdAt: new Date().toISOString(),
        archivePath,
        archivedCopyPath,
        fileSizeBytes,
        checksum,
        mongoUriRedacted: mongoUri.replace(/:\/\/[^@]+@/, '://***@'),
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    logger.info({
        event: 'mongo_backup_completed',
        archivePath,
        archivedCopyPath,
        metadataPath,
        fileSizeBytes,
        checksum,
    });
};

main().catch((error) => {
    logger.error({
        event: 'mongo_backup_unhandled_error',
        message: error.message,
    });
    process.exit(1);
});
