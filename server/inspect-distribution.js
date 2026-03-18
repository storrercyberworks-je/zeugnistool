const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
    const classId = 'b53bce8a-3aaf-4289-b836-e773c529417d'; // Class 25e
    const grades = await prisma.grade.findMany({ where: { class_id: classId } });
    const students = await prisma.student.findMany({ where: { class_id: classId } });

    const subjectGrades = {}; // subject_id -> student_id -> count
    const subjectNames = {};

    grades.forEach(g => {
        if (!subjectGrades[g.subject_id]) subjectGrades[g.subject_id] = {};
        subjectGrades[g.subject_id][g.student_id] = (subjectGrades[g.subject_id][g.student_id] || 0) + 1;
        subjectNames[g.subject_id] = g.subject_name;
    });

    for (const [subId, counts] of Object.entries(subjectGrades)) {
        const studentCounts = Object.entries(counts).map(([sid, c]) => {
            const s = students.find(stud => stud.id === sid);
            return `${s ? s.first_name + ' ' + s.last_name : sid}: ${c}`;
        });
        const max = Math.max(...Object.values(counts));
        console.log(`Subject: ${subjectNames[subId]} (${subId})`);
        console.log(`  Max: ${max}`);
        console.log(`  Counts:`, studentCounts.join(', '));
    }

    await prisma.$disconnect();
}
inspect();
