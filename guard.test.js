const { evaluateMatch } = require('./guard');

test('rejects when no candidate available', () => {
  const result = evaluateMatch({ title: 'Test', body_text: '' }, null);
  expect(result.decision).toBe('rejected');
});

test('rejects low vision confidence', () => {
  const post = { title: 'Red foxes', expected_category: 'animal', expected_subject: 'fox' };
  const candidate = { confidence: 0.4, similarity: 0.9, category: 'animal', subject: 'fox' };
  const result = evaluateMatch(post, candidate);
  expect(result.decision).toBe('rejected');
});

test('rejects low similarity', () => {
  const post = { title: 'Red foxes', expected_category: 'animal', expected_subject: 'fox' };
  const candidate = { confidence: 0.9, similarity: 0.3, category: 'animal', subject: 'fox' };
  const result = evaluateMatch(post, candidate);
  expect(result.decision).toBe('rejected');
});

test('rejects category mismatch', () => {
  const post = { title: 'Red foxes', expected_category: 'animal', expected_subject: 'fox' };
  const candidate = { confidence: 0.9, similarity: 0.85, category: 'landscape', subject: 'forest' };
  const result = evaluateMatch(post, candidate);
  expect(result.decision).toBe('rejected');
});

test('rejects subject mismatch within the same category (the real wolf-on-dog-post case)', () => {
  const post = { title: 'Dog domestication', expected_category: 'animal', expected_subject: 'dog' };
  const candidate = { confidence: 0.98, similarity: 0.609, category: 'animal', subject: 'gray wolf' };
  const result = evaluateMatch(post, candidate);
  expect(result.decision).toBe('rejected');
  expect(result.reason).toMatch(/subject mismatch/i);
});

test('approves a genuinely good match', () => {
  const post = { title: 'Red foxes', expected_category: 'animal', expected_subject: 'fox' };
  const candidate = { confidence: 0.98, similarity: 0.755, category: 'animal', subject: 'red fox' };
  const result = evaluateMatch(post, candidate);
  expect(result.decision).toBe('approved');
});