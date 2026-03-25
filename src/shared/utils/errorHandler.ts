export function handleApiError(status: number, serverMessage?: string): string {
  switch (status) {
    case 400:
      return serverMessage ?? 'Invalid request. Please check your input.';
    case 401:
      return 'Session expired. Please log in again.';
    case 403:
      return 'Access denied.';
    case 404:
      return 'Resource not found.';
    case 429:
      return 'Too many requests — please wait before trying again.';
    case 500:
      return 'Server error — please try again later.';
    default:
      return serverMessage ?? 'An unexpected error occurred.';
  }
}
