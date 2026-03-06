const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'mobile-app', 'src');

const walkSync = (dir, filelist = []) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const dirFile = path.join(dir, file);
        const dirent = fs.statSync(dirFile);
        if (dirent.isDirectory()) {
            filelist = walkSync(dirFile, filelist);
        } else {
            if (dirFile.endsWith('.js') || dirFile.endsWith('.jsx') || dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
                filelist.push(dirFile);
            }
        }
    }
    return filelist;
};

const appJsPath = path.join(__dirname, 'mobile-app', 'App.js');
let allFiles = [];
if (fs.existsSync(srcDir)) {
    allFiles = walkSync(srcDir);
}
if (fs.existsSync(appJsPath)) {
    allFiles.push(appJsPath);
}

let modifiedCount = 0;

for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace console.log(...) with // console.log(...) only if not already commented out
    const regex = /^(?!.*\/\/.*console\.log)(.*)(console\.log\()/gm;
    if (regex.test(content)) {
        content = content.replace(regex, '$1// $2');
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
}

console.log(`Formatted frontend logs. Commented out console.logs in ${modifiedCount} files.`);
