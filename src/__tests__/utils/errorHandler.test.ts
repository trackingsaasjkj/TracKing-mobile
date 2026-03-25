import { handleApiError } from '@/shared/utils/errorHandler';

describe('handleApiError', () => {
  it('returns message for 400', () => {
    expect(handleApiError(400)).toBe('Invalid request. Please check your input.');
  });

  it('uses serverMessage for 400 when provided', () => {
    expect(handleApiError(400, 'Custom error')).toBe('Custom error');
  });

  it('returns session expired for 401', () => {
    expect(handleApiError(401)).toBe('Session expired. Please log in again.');
  });

  it('returns access denied for 403', () => {
    expect(handleApiError(403)).toBe('Access denied.');
  });

  it('returns not found for 404', () => {
    expect(handleApiError(404)).toBe('Resource not found.');
  });

  it('returns rate limit message for 429', () => {
    expect(handleApiError(429)).toBe('Too many requests — please wait before trying again.');
  });

  it('returns server error for 500', () => {
    expect(handleApiError(500)).toBe('Server error — please try again later.');
  });

  it('returns serverMessage for unknown status', () => {
    expect(handleApiError(503, 'Service unavailable')).toBe('Service unavailable');
  });

  it('returns fallback for unknown status without message', () => {
    expect(handleApiError(0)).toBe('An unexpected error occurred.');
  });
});
