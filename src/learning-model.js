// One quiz contract for static lessons, database rows, editor and learner UI.
export function normalizeLearningQuiz(input) {
  const items = Array.isArray(input) ? input : input && typeof input === 'object' ? [input] : [];
  return items.filter((item) => item && typeof item.prompt === 'string' && item.prompt.trim())
    .slice(0, 6).map((item) => {
      const raw = Array.isArray(item.answers) ? item.answers : [];
      const originalIndex = Number(item.correctAnswer);
      const answers = raw.map((answer, index) => ({ text: String(answer ?? '').trim(), index })).filter((answer) => answer.text);
      return {
        prompt: item.prompt.trim().slice(0, 500),
        answers: answers.map((answer) => answer.text.slice(0, 500)),
        correctAnswer: answers.findIndex((answer) => answer.index === originalIndex),
      };
    }).filter((item) => item.answers.length >= 2 && item.correctAnswer >= 0);
}

export function safeResourceUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
