const XLSX = require('xlsx');

const headers = ['topicId','topicName','question','optionA','optionB','optionC','optionD','answer','explain'];
const rows = [
  ['', 'Sample Topic', 'Question 1: Choose the correct answer?', 'Answer A', 'Answer B', 'Answer C', 'Answer D', 'A', 'Explanation for question 1'],
  ['', 'Sample Topic', 'Question 2: Select all correct answers', 'Answer A', 'Answer B', 'Answer C', 'Answer D', 'A,C', 'Explanation: This question has two correct answers A and C'],
  ['', 'Sample Topic', 'Question 3: Single answer', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'D', 'Explanation for question 3']
];

const data = [headers, ...rows];
const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'quiz');
XLSX.writeFile(wb, 'quiz-template.xlsx');
console.log('Created: quiz-template.xlsx');
