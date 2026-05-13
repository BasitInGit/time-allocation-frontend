const API_URL = "http://localhost:3000/tasks";


export async function fetchTasks() {
  const res = await fetch(API_URL);
  return res.json();
}


export async function createTask(task) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });

  return res.json();
}


export async function updateTaskApi(task) {
  const res = await fetch(`${API_URL}/${task.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });

  return res.json();
}


export async function deleteTaskApi(id) {
  await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}