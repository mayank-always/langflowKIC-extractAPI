const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Parse JSON body
  let body;
  try {
    body = await req.json();
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { text } = body;
  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Missing or empty "text" field' });
  }

  // Invoke your Langflow flow on Astra
  const lfRes = await fetch(process.env.LANGFLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LANGFLOW_TOKEN}`,
    },
    body: JSON.stringify({
      input_value: text,
      output_type: 'chat',
      input_type: 'chat',
    }),
  });

  if (!lfRes.ok) {
    const detail = await lfRes.text();
    return res.status(502).json({ error: 'Langflow call failed', detail });
  }

  const payload = await lfRes.json();

  // Extract and clean the JSON payload from the model's markdown
  const raw = payload.outputs?.[0]?.results?.message?.text || '';
  const cleaned = raw.replace(/^```json\s*/, '').replace(/```$/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return res.status(502).json({ error: 'Failed to parse JSON from model' });
  }

  // Return the final structured JSON
  res.status(200).json(parsed);
};
