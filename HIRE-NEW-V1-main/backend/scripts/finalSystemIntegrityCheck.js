#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { validateEnvironment } = require('../config/env');
const { startupIntegrityCheck } = require('../services/startupIntegrityService');
const packageJson = require('../package.json');

const projectRoot = path.resolve(__dirname, '..');

const resolveNodeScriptTarget = (command) => {
    const normalized = String(command || '').trim();
    if (!normalized.startsWith('node ')) {
        return null;
    }

    const tokens = normalized.split(/\s+/);
    const candidate = tokens[1];
    if (!candidate || candidate.startsWith('-')) {
        return null;
    }

    return path.resolve(projectRoot, candidate);
};

const gatherMissingNodeScriptTargets = () => Object.entries(packageJson.scripts || {})
    .map(([name, command]) => {
        const target = resolveNodeScriptTarget(command);
        if (!target || fs.existsSync(target)) {
            return null;
        }
        return {
            name,
            command,
            target: path.relative(projectRoot, target),
        };
    })
    .filter(Boolean);

const requiredRuntimePaths = [
    'index.js',
    'controllers',
    'routes',
    'services',
    'models',
    'workflow/applicationStateMachine.js',
];

const gatherMissingRuntimePaths = () => requiredRuntimePaths
    .filter((relativePath) => !fs.existsSync(path.join(projectRoot, relativePath)));

try {
    const env = validateEnvironment();
    const startupIntegrity = startupIntegrityCheck({ strict: true });
    const missingScriptTargets = gatherMissingNodeScriptTargets();
    const missingRuntimePaths = gatherMissingRuntimePaths();

    const failureReasons = [];
    if (!startupIntegrity.passed) {
        failureReasons.push('startup_integrity_failed');
    }
    if (missingScriptTargets.length > 0) {
        failureReasons.push('missing_script_targets');
    }
    if (missingRuntimePaths.length > 0) {
        failureReasons.push('missing_runtime_paths');
    }

    const output = {
        success: failureReasons.length === 0,
        runtime: env.runtime,
        checks: {
            startupIntegrity,
            missingScriptTargets,
            missingRuntimePaths,
        },
        checkedAt: new Date().toISOString(),
    };

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

    if (failureReasons.length > 0) {
        process.exit(1);
    }

    process.exit(0);
} catch (error) {
    process.stderr.write(`Final integrity check failed: ${error.message}\n`);
    process.exit(1);
}
