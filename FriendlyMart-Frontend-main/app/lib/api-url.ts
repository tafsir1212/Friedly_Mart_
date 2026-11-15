const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiBaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_URL must be set to the backend base URL before building or running the frontend.",
  );
}

export const API_BASE_URL = apiBaseUrl.replace(/\/+$/, "");
