export function isDataReset(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('tripot_data_reset') === '1';
}
