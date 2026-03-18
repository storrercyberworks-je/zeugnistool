import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export async function parseFile(file) {
    return new Promise((resolve, reject) => {
        const extension = file.name.split('.').pop().toLowerCase()

        if (extension === 'csv') {
            // Try UTF-8 first, fallback to Windows-1252
            const reader = new FileReader()
            reader.onload = (e) => {
                const text = e.target.result
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => resolve(results.data),
                    error: (error) => reject(error),
                })
            }
            reader.readAsText(file, 'UTF-8') // Simple approach, improvement possible with encoding-detector
        } else if (['xlsx', 'xls'].includes(extension)) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                const json = XLSX.utils.sheet_to_json(worksheet)
                resolve(json)
            }
            reader.readAsArrayBuffer(file)
        } else {
            reject(new Error('Ungültiges Dateiformat. Bitte .csv, .xlsx oder .xls verwenden.'))
        }
    })
}

export const HEADER_MAPPINGS = {
    student_last_name: ['Name Student', 'Nachname', 'Last Name'],
    student_first_name: ['Vorname Student', 'Vorname', 'First Name'],
    student_email: ['Email Student', 'E-Mail-Adresse', 'Email'],
    student_address: ['Adresse Student', 'Adresse'],
    class_name: ['Klasse', 'Kurs'],
    teacher_name: ['Dozent Name Vorname', 'Dozent', 'Teacher'],
    teacher_email: ['Dozent Email', 'Dozent, Email', 'Teacher Email'],
    attended_course: ['Besuchter Kurs', 'Kursbesuch'],
    module_name: ['Modul/Lernfeld', 'Modul', 'Fach', 'Subject'],
    remarks: ['Bemerkungen', 'Bemerkung', 'Remarks'],
    birth_date: ['Geburtsdatum', 'Birthday'],
}

export function findHeader(row, searchKeys) {
    const rowKeys = Object.keys(row)
    for (const key of searchKeys) {
        const found = rowKeys.find(rk => rk.trim().toLowerCase() === key.toLowerCase())
        if (found) return found
    }
    return null
}

export function getGradeColumns(row) {
    return Object.keys(row).filter(key => key.trim().toLowerCase().startsWith('note'))
}

export function getLearningFieldName(header, row, index) {
    // Try searching for "Name Lernfeld X"
    const searchKey = `Name Lernfeld ${index}`
    const found = Object.keys(row).find(k => k.toLowerCase().includes(searchKey.toLowerCase()))
    if (found && row[found]) return row[found]

    // Suffix from header "Note Test1" -> "Test1"
    const suffix = header.replace(/^note\s*/i, '').trim()
    return suffix || `Note ${index}`
}

export function getWeight(row, index) {
    const searchKey = `gewichtung`
    const found = Object.keys(row).find(k => k.toLowerCase().includes(searchKey.toLowerCase()) && k.includes(String(index)))
    if (found) {
        const val = parseFloat(row[found])
        return isNaN(val) ? null : val
    }
    return null
}
