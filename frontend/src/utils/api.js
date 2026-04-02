export async function analyzeText(text) {
  const urls = ["http://127.0.0.1:8000/analyze", "http://localhost:8000/analyze"];
  let lastError;
  
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });
      return res.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

