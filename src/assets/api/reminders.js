const API_URL = "http://localhost:3000/reminders";

export async function fetchReminders() {
  const res = await fetch(API_URL);
  return res.json();
}

export async function createReminder(reminder) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reminder),
  });

  return res.json();
}

export async function updateReminderApi(reminder) {
  const res = await fetch(`${API_URL}/${reminder.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reminder),
  });

  return res.json();
}

export async function deleteReminderApi(id) {
  await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}