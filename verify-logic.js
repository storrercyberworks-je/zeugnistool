import { evaluateReexamination } from './src/lib/reexamination.js';

const testGrades = [
    // Student 1: Overall failure (avg < 4.0)
    { student_id: 's1', subject_id: 'sub1', subject_name: 'Math', grade_value: 3.5, reexamination_required: false },
    { student_id: 's1', subject_id: 'sub2', subject_name: 'English', grade_value: 4.0, reexamination_required: false },

    // Student 2: Module failure (one sub < 4.0)
    { student_id: 's2', subject_id: 'sub1', subject_name: 'Math', grade_value: 3.0, reexamination_required: false },
    { student_id: 's2', subject_id: 'sub2', subject_name: 'English', grade_value: 5.5, reexamination_required: false },

    // Student 3: Manual flag only
    { student_id: 's3', subject_id: 'sub1', subject_name: 'Math', grade_value: 5.0, reexamination_required: true },
    { student_id: 's3', subject_id: 'sub2', subject_name: 'English', grade_value: 5.0, reexamination_required: false },

    // Student 4: Pass
    { student_id: 's4', subject_id: 'sub1', subject_name: 'Math', grade_value: 4.5, reexamination_required: false },
    { student_id: 's4', subject_id: 'sub2', subject_name: 'English', grade_value: 4.5, reexamination_required: false },
];

const runTest = (id) => {
    const studentGrades = testGrades.filter(g => g.student_id === id);
    const result = evaluateReexamination(studentGrades);
    console.log(`Student ${id}:`, JSON.stringify(result, null, 2));
};

console.log("--- VERIFICATION ---");
['s1', 's2', 's3', 's4'].forEach(runTest);
