const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const classes = await prisma.class.findMany();
    for (const cls of classes) {
        console.log(`Checking Class: ${cls.name} (${cls.id})`);
        const students = await prisma.student.findMany({ where: { class_id: cls.id } });
        const grades = await prisma.grade.findMany({ where: { class_id: cls.id } });

        const subjectGrades = {};
        grades.forEach(g => {
            if (!subjectGrades[g.subject_id]) subjectGrades[g.subject_id] = {};
            subjectGrades[g.subject_id][g.student_id] = (subjectGrades[g.subject_id][g.student_id] || 0) + 1;
        });

        for (const [subId, studentCounts] of Object.entries(subjectGrades)) {
            const counts = Object.values(studentCounts);
            if (counts.length < 2) continue;
            const maxCount = Math.max(...counts);

            students.forEach(s => {
                const actual = studentCounts[s.id] || 0;
                if (actual < maxCount) {
                    console.log(`  [MISSING] Student ${s.first_name} ${s.last_name} in Subject ${subId}: Actual ${actual} / Expected ${maxCount}`);
                }
            });
        }
    }
    await prisma.$disconnect();
}

check();
