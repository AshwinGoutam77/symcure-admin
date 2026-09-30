export const doctors = [
  { id: "doc_1", name: "Dr. Amit Sharma", specialization: "Cardiologist", experience: 10, phone: "9876543210", email: "amit@symcure.com", status: "active", createdAt: "2026-05-01" },
  { id: "doc_2", name: "Dr. Priya Verma", specialization: "Dermatologist", experience: 6, phone: "9123456780", email: "priya@symcure.com", status: "active", createdAt: "2026-05-02" },
  { id: "doc_3", name: "Dr. Rajesh Mehta", specialization: "Orthopedic", experience: 12, phone: "9012345678", email: "rajesh@symcure.com", status: "active", createdAt: "2026-05-03" },
  { id: "doc_4", name: "Dr. Sneha Kapoor", specialization: "Pediatrician", experience: 8, phone: "9988776655", email: "sneha@symcure.com", status: "active", createdAt: "2026-05-04" },
  { id: "doc_5", name: "Dr. Vikram Singh", specialization: "Neurologist", experience: 15, phone: "9898989898", email: "vikram@symcure.com", status: "active", createdAt: "2026-05-05" },
  { id: "doc_6", name: "Dr. Anjali Gupta", specialization: "Gynecologist", experience: 9, phone: "9765432109", email: "anjali@symcure.com", status: "active", createdAt: "2026-05-06" },
  { id: "doc_7", name: "Dr. Karan Malhotra", specialization: "ENT Specialist", experience: 7, phone: "9654321098", email: "karan@symcure.com", status: "inactive", createdAt: "2026-05-07" },
  { id: "doc_8", name: "Dr. Pooja Jain", specialization: "Dentist", experience: 5, phone: "9543210987", email: "pooja@symcure.com", status: "active", createdAt: "2026-05-08" },
  { id: "doc_9", name: "Dr. Mohit Bansal", specialization: "General Physician", experience: 11, phone: "9432109876", email: "mohit@symcure.com", status: "active", createdAt: "2026-05-09" },
  { id: "doc_10", name: "Dr. Ritu Arora", specialization: "Psychiatrist", experience: 13, phone: "9321098765", email: "ritu@symcure.com", status: "active", createdAt: "2026-05-10" },
];
export const patients = [
  { id: "pat_1", name: "Ravi Kumar", age: 32, gender: "Male", phone: "9988776655", email: "ravi@gmail.com", address: "Jaipur", createdAt: "2026-05-01" },
  { id: "pat_2", name: "Neha Singh", age: 28, gender: "Female", phone: "9871234567", email: "neha@gmail.com", address: "Delhi", createdAt: "2026-05-02" },
  { id: "pat_3", name: "Aman Verma", age: 40, gender: "Male", phone: "9765432101", email: "aman@gmail.com", address: "Mumbai", createdAt: "2026-05-03" },
  { id: "pat_4", name: "Pooja Sharma", age: 25, gender: "Female", phone: "9654321012", email: "pooja@gmail.com", address: "Chandigarh", createdAt: "2026-05-04" },
  { id: "pat_5", name: "Rahul Mehta", age: 35, gender: "Male", phone: "9543210123", email: "rahul@gmail.com", address: "Ahmedabad", createdAt: "2026-05-05" },
  { id: "pat_6", name: "Simran Kaur", age: 30, gender: "Female", phone: "9432101234", email: "simran@gmail.com", address: "Ludhiana", createdAt: "2026-05-06" },
  { id: "pat_7", name: "Arjun Singh", age: 45, gender: "Male", phone: "9321012345", email: "arjun@gmail.com", address: "Lucknow", createdAt: "2026-05-07" },
  { id: "pat_8", name: "Kavita Jain", age: 38, gender: "Female", phone: "9210123456", email: "kavita@gmail.com", address: "Indore", createdAt: "2026-05-08" },
  { id: "pat_9", name: "Deepak Yadav", age: 29, gender: "Male", phone: "9101234567", email: "deepak@gmail.com", address: "Patna", createdAt: "2026-05-09" },
  { id: "pat_10", name: "Anita Desai", age: 50, gender: "Female", phone: "9012345670", email: "anita@gmail.com", address: "Pune", createdAt: "2026-05-10" },
];

export const appointments = [
  { id: "app_1", doctorId: "doc_1", patientId: "pat_1", date: "2026-05-11", time: "10:00 AM", status: "scheduled", reason: "Chest pain", createdAt: "2026-05-05" },
  { id: "app_2", doctorId: "doc_2", patientId: "pat_2", date: "2026-05-11", time: "11:00 AM", status: "completed", reason: "Skin allergy", createdAt: "2026-05-05" },
  { id: "app_3", doctorId: "doc_3", patientId: "pat_3", date: "2026-05-12", time: "09:30 AM", status: "scheduled", reason: "Knee pain", createdAt: "2026-05-05" },
  { id: "app_4", doctorId: "doc_4", patientId: "pat_4", date: "2026-05-12", time: "01:00 PM", status: "cancelled", reason: "Fever", createdAt: "2026-05-05" },
  { id: "app_5", doctorId: "doc_5", patientId: "pat_5", date: "2026-05-13", time: "02:30 PM", status: "scheduled", reason: "Headache", createdAt: "2026-05-05" },
  { id: "app_6", doctorId: "doc_6", patientId: "pat_6", date: "2026-05-13", time: "03:00 PM", status: "completed", reason: "Routine checkup", createdAt: "2026-05-05" },
  { id: "app_7", doctorId: "doc_7", patientId: "pat_7", date: "2026-05-14", time: "10:15 AM", status: "scheduled", reason: "Ear pain", createdAt: "2026-05-05" },
  { id: "app_8", doctorId: "doc_8", patientId: "pat_8", date: "2026-05-14", time: "11:45 AM", status: "completed", reason: "Tooth pain", createdAt: "2026-05-05" },
  { id: "app_9", doctorId: "doc_9", patientId: "pat_9", date: "2026-05-15", time: "12:30 PM", status: "scheduled", reason: "Cold & cough", createdAt: "2026-05-05" },
  { id: "app_10", doctorId: "doc_10", patientId: "pat_10", date: "2026-05-15", time: "04:00 PM", status: "scheduled", reason: "Anxiety", createdAt: "2026-05-05" },
];