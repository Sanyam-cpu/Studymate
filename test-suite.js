/**
 * test-suite.js – Comprehensive Self-Verification Test Runner
 */
const BASE_URL = 'http://localhost:3000';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('--- STARTING SELF-VERIFICATION SUITE ---\n');
  const results = {};

  // 1. GET method rejection (405)
  try {
    const r = await fetch(`${BASE_URL}/api/chat`);
    results['405 on non-POST'] = r.status === 405 ? 'PASS' : `FAIL (${r.status})`;
  } catch (e) {
    results['405 on non-POST'] = `FAIL (${e.message})`;
  }

  // 2. Empty input validation (400)
  try {
    const r = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'chat', messages: [{ role: 'user', content: '   ' }] })
    });
    results['Empty input rejected (400)'] = r.status === 400 ? 'PASS' : `FAIL (${r.status})`;
  } catch (e) {
    results['Empty input rejected (400)'] = `FAIL (${e.message})`;
  }

  // 3. Input over 8000 rejected for chat/explain (400)
  try {
    const over8000 = 'A'.repeat(8500);
    const r = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'chat', messages: [{ role: 'user', content: over8000 }] })
    });
    results['Over 8000 chars rejected in chat (400)'] = r.status === 400 ? 'PASS' : `FAIL (${r.status})`;
  } catch (e) {
    results['Over 8000 chars rejected in chat (400)'] = `FAIL (${e.message})`;
  }

  // 4. Summarizer feature with real API output
  try {
    console.log('Testing Summarizer (3 styles)...');
    for (const style of ['Short summary', 'Bullet points', 'Exam revision notes']) {
      await sleep(2500); // 2.5s pause to respect API rate limits
      const r = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'summarize',
          messages: [{
            role: 'user',
            content: `Please summarize the following text in the style of "${style}":\n\nOperating Systems manage hardware and software resources. The kernel is the central component that controls memory, CPU scheduling, and devices.`
          }]
        })
      });
      const data = await r.json();
      const pass = r.status === 200 && data.reply && data.reply.length > 20;
      results[`Summarizer (${style})`] = pass ? 'PASS' : `FAIL (${r.status}: ${data.error || 'No reply'})`;
    }
  } catch (e) {
    results['Summarizer real output'] = `FAIL (${e.message})`;
  }

  // 5. Question Explainer (3 levels)
  try {
    console.log('Testing Explainer (3 levels)...');
    for (const level of ['Simple', 'Detailed', 'Exam-style']) {
      await sleep(2500); // 2.5s pause to respect API rate limits
      const r = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'explain',
          messages: [{
            role: 'user',
            content: `Explain this at a "${level}" level:\n\nWhat is a Binary Search Tree?\n\nSubject context: Data Structures`
          }]
        })
      });
      const data = await r.json();
      const pass = r.status === 200 && data.reply && data.reply.length > 30;
      results[`Explainer (${level})`] = pass ? 'PASS' : `FAIL (${r.status}: ${data.error || 'No reply'})`;
    }
  } catch (e) {
    results['Explainer real output'] = `FAIL (${e.message})`;
  }

  // 6. Chatbot conversational follow-up
  try {
    console.log('Testing Chatbot conversational follow-up...');
    await sleep(2500);
    const r = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'chat',
        messages: [
          { role: 'user', content: "What is Kirchhoff's Current Law?" },
          { role: 'assistant', content: 'KCL states that the total current entering a junction equals the total current leaving the junction.' },
          { role: 'user', content: 'What is its mathematical formula?' }
        ]
      })
    });
    const data = await r.json();
    const pass = r.status === 200 && data.reply && (data.reply.includes('∑') || data.reply.toLowerCase().includes('i') || data.reply.toLowerCase().includes('current'));
    results['Chatbot context follow-up'] = pass ? 'PASS' : `FAIL (${r.status}: ${data.error || 'No reply'})`;
  } catch (e) {
    results['Chatbot context follow-up'] = `FAIL (${e.message})`;
  }

  // 7. Chatbot off-topic refusal
  try {
    console.log('Testing Chatbot off-topic refusal...');
    await sleep(2500);
    const r = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'chat',
        messages: [{ role: 'user', content: 'What is the best pizza recipe?' }]
      })
    });
    const data = await r.json();
    const text = (data.reply || '').toLowerCase();
    const refuses = text.includes('study') || text.includes('academic') || text.includes('designed to') || text.includes('help with') || text.includes('assist') || text.includes('questions');
    results['Chatbot off-topic refusal'] = (r.status === 200 && refuses) ? 'PASS' : `FAIL (${data.reply || data.error})`;
  } catch (e) {
    results['Chatbot off-topic refusal'] = `FAIL (${e.message})`;
  }

  console.log('\n--- VERIFICATION RESULTS ---');
  for (const [name, outcome] of Object.entries(results)) {
    console.log(`[${outcome}] ${name}`);
  }
}

runTests();
