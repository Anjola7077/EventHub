const sanitizeError = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  const raw = err.response?.data?.error || err.message || err.error || '';
  if (!raw) return fallback;
  if (typeof raw !== 'string') return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes('internal server') || lower.includes('unhandled') || lower.includes('exception') || lower.includes('econnrefused') || lower.includes('timeout') || lower.includes('network error')) {
    return 'A network error occurred. Please check your connection and try again.';
  }
  if (lower.includes('jwt') || lower.includes('token') || lower.includes('unauthorized')) {
    return 'Your session has expired. Please log in again.';
  }
  if (lower.includes('validation') || lower.includes('required')) {
    return 'Please check your input and try again.';
  }
  if (lower.includes('not found')) {
    return 'The requested resource was not found.';
  }
  if (lower.includes('duplicate') || lower.includes('already')) {
    return raw;
  }
  if (raw.length > 120) return fallback;
  return raw;
};

export default sanitizeError;
