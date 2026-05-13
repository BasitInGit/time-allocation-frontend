const API_URL =
  "http://localhost:3000/time-distribution";

export async function fetchTimeDistribution() {
  const res = await fetch(API_URL);
  return res.json();
}

export async function saveTimeDistribution(
  distribution
) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(distribution),
  });

  return res.json();
}