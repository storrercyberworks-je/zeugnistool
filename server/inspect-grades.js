const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
    const sem = await prisma.grade.groupBy({ by: ['semester'] });
    const years = await prisma.grade.groupBy({ by: ['school_year'] });
    console.log('Semesters:', sem.map(s => s.semester));
    console.log('Years:', years.map(y => y.school_year));

    const livia = await prisma.student.findFirst({ where: { last_name: 'Stucki' } });
    if (livia) {
        const grades = await prisma.grade.findMany({ where: { student_id: livia.id } });
        console.log(`Livia Stucki (${livia.id}) has ${grades.length} grades.`);
        const counts = {};
        grades.forEach(g => {
            counts[g.subject_name] = (counts[g.subject_name] || 0) + 1;
        });
        console.log('Grade counts per subject:', counts);
    }

    await prisma.$disconnect();
}
inspect();
