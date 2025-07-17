export function detectLanguage(text) {
  if (/def\s+\w+\(/.test(text)) return "Python";
  if (/function\s+\w+\(/.test(text)) return "JavaScript";
  if (/#include\s+<.*>/.test(text)) return "C++";
  if (/public\s+class/.test(text)) return "Java";
  return "Unknown";
}
