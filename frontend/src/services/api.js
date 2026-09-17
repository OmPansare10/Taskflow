const getDefaultApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "https://taskflow-bwxq.onrender.com";
  }
  return "http://127.0.0.1:8000";
};

const rawApiUrl = getDefaultApiUrl();
export const API_URL = rawApiUrl.replace(/\/+$/, "");

export async function apiRequest(
  endpoint,
  method = "GET",
  body = null,
  token = null
) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  let response;
  try {
    response = await fetch(`${API_URL}${cleanEndpoint}`, options);
  } catch {
    throw new Error(
      "Unable to connect to the backend server. Please check your internet connection or verify the backend service is running."
    );
  }

  let data = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = text ? { detail: text } : null;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg =
      data?.detail ||
      (typeof data === "string" ? data : null) ||
      `Request failed with status ${response.status} (${response.statusText || "Error"})`;
    throw new Error(errorMsg);
  }

  return data;
}