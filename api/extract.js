const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  let body;
  try { body = await req.json(); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  if (!body.text) return res.status(400).json({ error: 'Missing text' });

  // Call your Astra-hosted Langflow
  const lfRes = await fetch(process.env.LANGFLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LANGFLOW_TOKEN}`,
    },
    body: JSON.stringify({
      input_value: body.text,
      output_type: 'chat',
      input_type: 'chat',
    }),
  });
  if (!lfRes.ok) {
    return res.status(502).json({ error: 'Langflow error', status: lfRes.status });
  }

  const j = await lfRes.json();
  const raw = j.outputs[0].results.message.text;
  const cleaned = raw.replace(/^```json\s*/, '').replace(/```$/g, '').trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch { return res.status(502).json({ error: 'Invalid model JSON' }); }

  return res.status(200).json(parsed);
};
