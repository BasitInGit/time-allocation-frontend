const API_URL = "http://localhost:3000/deadlines";

export async function fetchDeadlines() {
  const res = await fetch(API_URL);
  return res.json();
}

export async function createDeadline(deadline) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deadline),
  });

  return res.json();
}

export async function updateDeadlineApi(deadline) {
  const res = await fetch(
    `${API_URL}/${deadline.id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deadline),
    }
  );

  return res.json();
}

export async function deleteDeadlineApi(id) {
  const res = await fetch(
    `${API_URL}/${id}`,
    {
      method: "DELETE",
    }
  );

  return res.json();
}