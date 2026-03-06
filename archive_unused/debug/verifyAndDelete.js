const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'DEAD_CODE_ANALYSIS_REPORT.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const packageJsonRaw = fs.readFileSync(path.join(__dirname, 'backend/package.json'), 'utf8');

// Pre-load all valid JS/TS files to avoid grep io overhead
const DIRS = ['backend', 'mobile-app', 'frontend', 'scripts', 'config', 'load-testing', 'matching-engine'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.expo', 'coverage', '.aws', '.github', 'logs'];
const VALID_EXTS = ['.js', '.jsx', '.ts', '.tsx'];

function scanDir(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        if (IGNORE_DIRS.includes(item)) continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath, files);
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

const allFiles = [];
for (const d of DIRS) {
    scanDir(path.join(__dirname, d), allFiles);
}
const jsFiles = allFiles.filter(f => VALID_EXTS.includes(path.extname(f)));
const fileContents = jsFiles.map(f => ({ path: f, content: fs.readFileSync(f, 'utf8') }));

let candidates = new Set([
    ...report.unused_files,
    ...report.orphaned_routes,
    ...report.unused_services,
    ...report.unused_components,
    ...report.unused_scripts,
    ...report.obsolete_tests
]);

const PROTECTED_PATH_SUBSTRINGS = [
    '/backend/controllers/',
    '/backend/models/',
    '/backend/routes/',
    '/backend/services/',
    '/backend/middleware/',
    '/backend/workers/',
    '/mobile-app/src/',
    '/frontend/src/',
    '/migrations/',
    '/config/'
];

const PROTECTED_FILE_SUBSTRINGS = [
    '.config.',
    'config.js',
    'setupTests',
    'index.js',
    'App.js',
    'package.json'
];

let deletedCount = 0;
let deletedFiles = [];
let manuallyReviewedCount = 0;

for (const f of candidates) {
    if (!fs.existsSync(f)) continue;

    const normalizedPath = f.replace(/\\/g, '/');
    const ext = path.extname(normalizedPath);
    const basenameExt = path.basename(normalizedPath);
    const basenameNoExt = path.basename(normalizedPath, ext);

    // 1. Strict protections
    let isProtectedPath = PROTECTED_PATH_SUBSTRINGS.some(p => normalizedPath.includes(p));
    let isProtectedFile = PROTECTED_FILE_SUBSTRINGS.some(p => basenameExt.includes(p));

    if (isProtectedPath || isProtectedFile) {
        manuallyReviewedCount++;
        continue;
    }

    // 2. Package.json check
    if (packageJsonRaw.includes(basenameExt) || packageJsonRaw.includes(basenameNoExt)) {
        manuallyReviewedCount++;
        continue;
    }

    // 3. Fast in-memory cross-reference check
    let isReferenced = false;
    for (const fileObj of fileContents) {
        if (fileObj.path === f) continue; // Skip itself
        if (fileObj.content.includes(basenameNoExt)) {
            isReferenced = true;
            break;
        }
    }

    if (isReferenced) {
        manuallyReviewedCount++;
        continue;
    }

    // 4. Safe Deletion!
    console.log(`Deleting: ${f}`);
    fs.unlinkSync(f);
    deletedCount++;
    deletedFiles.push(f);
}

console.log(JSON.stringify({
    deletedCount,
    deletedFiles,
    needsManualReviewCount: manuallyReviewedCount
}, null, 2));
