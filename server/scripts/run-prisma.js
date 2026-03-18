const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isElectron = process.env.ELECTRON === 'true';
const defaultDataPath = process.platform === 'win32'
    ? path.join(__dirname, '../../data')
    : '/app/data'; // Fallback for Linux/Containers

const DATA_ROOT = process.env.DATA_PATH || (isElectron ? defaultDataPath : path.join(process.cwd(), 'data'));

// Ensure the directory exists before Prisma tries to access/create the DB
if (!fs.existsSync(DATA_ROOT)) {
    fs.mkdirSync(DATA_ROOT, { recursive: true });
}

const dbPath = path.join(DATA_ROOT, 'dev.db');
process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${dbPath}`;

const args = process.argv.slice(2).join(' ');

console.log(`[Prisma CLI Wrapper] DATABASE_URL resolved to: ${process.env.DATABASE_URL}`);
console.log(`[Prisma CLI Wrapper] Executing: npx prisma ${args}`);

try {
    // Run the prisma command with the injected environment variable
    execSync(`npx prisma ${args}`, { stdio: 'inherit' });
} catch (error) {
    console.error(`[Prisma CLI Wrapper] Failed to execute prisma command.`);
    process.exit(1);
}
