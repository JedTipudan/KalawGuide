import { askCloud, checkCloudReply, extractText, factsFromSnapshot } from './cloudModel';
import { KnowledgeSnapshot } from './knowledgeCache';

const snapshot: KnowledgeSnapshot = {
  version: 1,
  syncedAt: '2026-11-17T08:00:00.000Z',
  destinations: [{
    id: 'd1', name: 'Dahican Beach', location: 'Mati City', description: 'Long white-sand beach.',
    fee: 20, feeVerified: true, category: 'Beach', latitude: null, longitude: null, isFeatured: true,
  }],
  businesses: [{ id: 'b1', name: 'Kalaw Inn', category: 'accommodation', address: 'Dahican', description: '', contact: null, hours: '24/7' }],
  prices: [{ businessId: 'b1', businessName: 'Kalaw Inn', businessCategory: 'accommodation', title: 'Room', amount: 1500, unit: 'per night', category: 'room', verified: false }],
  facilities: { b1: ['WiFi'] },
  emergency: [{ name: 'Mati Police', organization: 'PNP', number: '911', verified: true }],
};

describe('extractText', () => {
  it('reads model_output steps from an Interactions response', () => {
    expect(extractText({ steps: [
      { type: 'user_input', content: [{ type: 'text', text: 'hi' }] },
      { type: 'model_output', content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'there' }] },
    ] })).toBe('Hello there');
  });
  it('falls back to generateContent candidates', () => {
    expect(extractText({ candidates: [{ content: { parts: [{ text: 'Hi' }] } }] })).toBe('Hi');
  });
  it('returns empty text for an unknown shape', () => {
    expect(extractText({ status: 'requires_action' })).toBe('');
  });
});

describe('factsFromSnapshot', () => {
  it('lists destinations, prices with labels, facilities and emergency numbers', () => {
    const f = factsFromSnapshot(snapshot);
    expect(f).toContain('Dahican Beach');
    expect(f).toContain('(verified)');
    expect(f).toContain('per night (estimate)');
    expect(f).toContain('facilities: WiFi');
    expect(f).toContain('Mati Police');
  });
  it('handles a missing snapshot', () => {
    expect(factsFromSnapshot(null)).toBe('(no synced data)');
  });
});

describe('askCloud', () => {
  const cfg = (fetchImpl: jest.Mock) => ({ apiKey: 'k', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch });
  const args = { question: 'Where to swim?', draft: 'Try **Dahican Beach**.', facts: 'facts', history: [] };

  it('sends the key header, system rules and the draft, and returns the text', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Go to Dahican!' }] }] }),
    });
    await expect(askCloud(args, cfg(fetchImpl))).resolves.toBe('Go to Dahican!');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/v1beta/interactions');
    expect(init.headers['x-goog-api-key']).toBe('k');
    const body = JSON.parse(init.body);
    expect(body.system_instruction).toContain('Kalaw Assistance');
    expect(JSON.stringify(body.input)).toContain('Try **Dahican Beach**.');
  });

  it('throws on HTTP errors so the local answer is kept', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    await expect(askCloud(args, cfg(fetchImpl))).rejects.toThrow('429');
  });

  it('throws when not configured', async () => {
    await expect(askCloud(args, null)).rejects.toThrow();
  });
});

describe('checkCloudReply (cloud output guardrail)', () => {
  const ground = {
    draft: '• **Kalaw Inn** — Dahican\n  From Room: ₱1,500.00 per night (estimate)',
    facts: factsFromSnapshot(snapshot),
    question: 'Where can I stay near Dahican for 2 people?',
  };
  const check = (reply: string) => checkCloudReply(reply, ground);

  it('accepts a grounded reply', () => {
    expect(check('You can stay at **Kalaw Inn** in Dahican. A room is ₱1,500 per night (estimate). Near **Dahican Beach**!')).toBeNull();
  });
  it('rejects invented prices', () => {
    expect(check('**Kalaw Inn** costs ₱999 per night.')).toBe('unknown_price');
    expect(check('About 2500 pesos per night.')).toBe('unknown_price');
  });
  it('rejects invented places', () => {
    expect(check('Try **Shangri-La Resort** instead.')).toBe('unknown_name');
  });
  it('rejects invented phone numbers but allows ones from the data', () => {
    expect(check('Call 0917 123 4567 to book.')).toBe('unknown_number');
    expect(check('For emergencies call **Mati Police** at 911.')).toBeNull();
  });
  it('rejects off-topic content, links and code', () => {
    expect(check('Here is some python code for you.')).toBe('off_topic');
    expect(check('Who will win the election? Also stay at **Kalaw Inn**.')).toBe('off_topic');
    expect(check('Book at https://example.com')).toBe('link_or_code');
    expect(check('Visit booking.com for more.')).toBe('link_or_code');
    expect(check('```js\nalert(1)\n```')).toBe('link_or_code');
  });
  it('rejects very long replies', () => {
    expect(check('Mati '.repeat(400))).toBe('too_long');
  });
});
