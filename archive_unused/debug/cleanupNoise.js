const fs = require('fs');
const path = require('path');

const DIRS = ['backend', 'mobile-app', 'frontend'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.expo'];
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

const jsFiles = [];
for (const d of DIRS) {
    scanDir(path.join(__dirname, d), jsFiles);
}

let cleanedFilesCount = 0;

jsFiles.forEach(f => {
    if (!VALID_EXTS.includes(path.extname(f))) return;
    try {
        let content = fs.readFileSync(f, 'utf8');
        let originalContent = content;

        // 1. Remove console.debug leftovers
        content = content.replace(/console\.debug\([^)]*\);?/g, '');

        // 2. Remove commented blocks > 20 lines
        // A naive heuristic: match /* ... */ and count newlines. 
        content = content.replace(/\/\*([\s\S]*?)\*\//g, (match, innerText) => {
            const newlineCount = (innerText.match(/\n/g) || []).length;
            if (newlineCount > 20) {
                return ''; // Delete it
            }
            return match; // Keep it
        });

        if (content !== originalContent) {
            fs.writeFileSync(f, content, 'utf8');
            cleanedFilesCount++;
        }
    } catch (e) {
        console.error(`Error processing ${f}:`, e.message);
    }
});

console.log(`Cleaned console.debug and large block comments in ${cleanedFilesCount} files.`);
