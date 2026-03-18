const { PrismaClient } = require('@prisma/client');
const path = require('path');

const DATA_ROOT = 'C:\\CODE\\zeugnis\\data';
const dbUrl = `file:${path.join(DATA_ROOT, 'dev.db')}`;

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl
        }
    }
});

async function main() {
    try {
        console.log('Testing connection to:', dbUrl);
        const students = await prisma.student.findMany({ take: 1 });
        console.log('Successfully fetched students:', students.length);
        const classes = await prisma.class.findMany({ take: 1 });
        console.log('Successfully fetched classes:', classes.length);
    } catch (error) {
        console.error('DATABASE ERROR:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
