export async function fetchData() {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}
