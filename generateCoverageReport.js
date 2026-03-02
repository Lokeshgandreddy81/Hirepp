const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, 'backend/coverage/coverage-summary.json');
const reportPath = path.join(__dirname, 'COVERAGE_FINAL_REPORT.md');

if (!fs.existsSync(summaryPath)) {
    console.error('Coverage summary not found at', summaryPath);
    process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

const total = summary.total;
let md = `# Final Code Coverage Report\n\n`;

md += `## 🚀 Overall Coverage Summary\n\n`;
md += `| Metric | Coverage % | Covered / Total |\n`;
md += `|---|---|---|\n`;
md += `| **Lines** | ${total.lines.pct}% | ${total.lines.covered} / ${total.lines.total} |\n`;
md += `| **Statements** | ${total.statements.pct}% | ${total.statements.covered} / ${total.statements.total} |\n`;
md += `| **Functions** | ${total.functions.pct}% | ${total.functions.covered} / ${total.functions.total} |\n`;
md += `| **Branches** | ${total.branches.pct}% | ${total.branches.covered} / ${total.branches.total} |\n\n`;

const under80 = [];
const allModules = Object.keys(summary).filter(k => k !== 'total');

md += `## ⚠️ Modules Under 80% Coverage\n\n`;

allModules.forEach(modPath => {
    const data = summary[modPath];
    const isUnder = data.lines.pct < 80 || data.functions.pct < 80 || data.branches.pct < 80;

    if (isUnder) {
        const relativePath = path.relative(__dirname, modPath);
        under80.push({
            path: relativePath,
            lines: data.lines.pct,
            funcs: data.functions.pct,
            branches: data.branches.pct
        });
    }
});

if (under80.length === 0) {
    md += `*Excellent! All tracked modules have >80% coverage across lines, functions, and branches.*\n\n`;
} else {
    md += `| Module | Lines % | Functions % | Branches % |\n`;
    md += `|---|---|---|---|\n`;
    under80.sort((a, b) => a.lines - b.lines).forEach(mod => {
        md += `| \`${mod.path}\` | ${mod.lines}% | ${mod.funcs}% | ${mod.branches}% |\n`;
    });
    md += `\n`;
}

md += `## 📊 Per-Module Breakdown\n\n`;
md += `<details><summary>Click to expand all modules</summary>\n\n`;
md += `| Module | Lines % | Functions % | Branches % |\n`;
md += `|---|---|---|---|\n`;

allModules.forEach(modPath => {
    const data = summary[modPath];
    const relativePath = path.relative(__dirname, modPath);
    md += `| \`${relativePath}\` | ${data.lines.pct}% | ${data.functions.pct}% | ${data.branches.pct}% |\n`;
});

md += `\n</details>\n`;

fs.writeFileSync(reportPath, md);
console.log(`Generated COVERAGE_FINAL_REPORT.md covering ${allModules.length} modules.`);
