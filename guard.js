const SIMILARITY_THRESHOLD = 0.6; // tune this using your labeled eval set in Phase 4

function evaluateMatch(post, topCandidate) {
  if (!topCandidate) {
    return {
      decision: 'rejected',
      reason: 'No images available to match against.'
    };
  }

  if (topCandidate.confidence < 0.6) {
    return {
      decision: 'rejected',
      reason: `Top candidate's own vision tagging confidence was too low (${topCandidate.confidence}) to trust.`
    };
  }

  if (topCandidate.similarity < SIMILARITY_THRESHOLD) {
    return {
      decision: 'rejected',
      reason: `No confident match found. Highest similarity score (${topCandidate.similarity.toFixed(2)}) is below the threshold (${SIMILARITY_THRESHOLD}).`
    };
  }

  const candidateSubject = topCandidate.subject.toLowerCase();

  // Category-level check: broad bucket mismatch (e.g. animal post, landscape image)
  if (post.expected_category && topCandidate.category !== post.expected_category) {
    return {
      decision: 'rejected',
      reason: `Category mismatch: expected ${post.expected_category}, detected ${topCandidate.category} (${candidateSubject}).`
    };
  }

  // Subject-level check: same category, but wrong specific animal/thing
  // (this is what catches wolf-on-fox-post or wolf-on-dog-post, since both are "animal")
  if (post.expected_subject && !candidateSubject.includes(post.expected_subject.toLowerCase())) {
    return {
      decision: 'rejected',
      reason: `Subject mismatch: expected something related to "${post.expected_subject}", detected "${candidateSubject}".`
    };
  }

  return {
    decision: 'approved',
    reason: `Matched with similarity ${topCandidate.similarity.toFixed(2)}, category and subject checks passed.`
  };
}

module.exports = { evaluateMatch };