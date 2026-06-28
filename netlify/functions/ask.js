const GEMINI_MODEL = "gemini-2.5-flash";

export default async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "Server missing GEMINI_API_KEY" }, 500);
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const contents = (body.messages || []).map((m) => {
    const role = m.role === "assistant" ? "model" : "user";
    const parts = [];
    if (typeof m.content === "string") parts.push({ text: m.content });
    else if (Array.isArray(m.content)) {
      for (const b of m.content) {
        if (b.type === "text") parts.push({ text: b.text });
        else if (b.type === "image" && b.source) parts.push({ inline_data: { mime_type: b.source.media_type, data: b.source.data } });
      }
    }
    return { role, parts };
  });
  const payload = { contents, generationConfig: { maxOutputTokens: body.max_tokens || 1000, temperature: 0.7 } };
  if (body.system) payload.system_instruction = { parts: [{ text: body.system }] };
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json();
    if (!r.ok) return json({ content: [{ type: "text", text: "" }] }, 200);
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
    return json({ content: [{ type: "text", text }] }, 200);
  } catch (e) { return json({ content: [{ type: "text", text: "" }] }, 200); }
};
function json(obj, status) { return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } }); }
