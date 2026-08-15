/** Pulls a human-readable message out of an axios/Nest error response. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const res = (err as any)?.response?.data;
  if (!res) {
    if ((err as any)?.code === 'ERR_NETWORK') {
      return 'Cannot reach the API server. Make sure it is running on port 4000.';
    }
    return (err as any)?.message || fallback;
  }

  // class-validator returns message as string[]
  if (Array.isArray(res.message)) return res.message.join(', ');
  return res.message || res.error || fallback;
}
