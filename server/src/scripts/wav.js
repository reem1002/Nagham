// Tiny WAV synthesiser used only to create demo tracks for testing the app.
// Writes RIFF INFO tags so the import pipeline can read title/artist/album.

const NOTES = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88, c: 523.25, d: 587.33, e: 659.25 };

function infoChunk(tags) {
  const parts = Object.entries(tags).map(([id, value]) => {
    const text = Buffer.from(`${value}\0`, 'utf8');
    const pad = text.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
    const head = Buffer.alloc(8);
    head.write(id, 0, 'ascii');
    head.writeUInt32LE(text.length, 4);
    return Buffer.concat([head, text, pad]);
  });
  const body = Buffer.concat([Buffer.from('INFO', 'ascii'), ...parts]);
  const head = Buffer.alloc(8);
  head.write('LIST', 0, 'ascii');
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

export function synthWav({ melody, bpm = 96, seconds = 40, sampleRate = 22050, tags = {} }) {
  const total = seconds * sampleRate;
  const pcm = Buffer.alloc(total * 2);
  const beat = (60 / bpm) * sampleRate;
  const notes = melody.split(' ');
  for (let i = 0; i < total; i++) {
    const n = Math.floor(i / beat);
    const f = NOTES[notes[n % notes.length]] || 0;
    const t = (i % beat) / sampleRate;
    const env = Math.exp(-3 * t) * 0.6 + 0.05;
    const bass = Math.sin((2 * Math.PI * (NOTES[notes[(Math.floor(n / 4) * 4) % notes.length]] / 2) * i) / sampleRate) * 0.15;
    const v = f ? (Math.sin((2 * Math.PI * f * i) / sampleRate) + 0.3 * Math.sin((4 * Math.PI * f * i) / sampleRate)) * env * 0.35 + bass : bass;
    const fade = Math.min(1, i / sampleRate, (total - i) / sampleRate);
    pcm.writeInt16LE(Math.max(-1, Math.min(1, v * fade)) * 32767, i * 2);
  }
  const fmt = Buffer.alloc(24);
  fmt.write('fmt ', 0, 'ascii');
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(1, 8);
  fmt.writeUInt16LE(1, 10);
  fmt.writeUInt32LE(sampleRate, 12);
  fmt.writeUInt32LE(sampleRate * 2, 16);
  fmt.writeUInt16LE(2, 20);
  fmt.writeUInt16LE(16, 22);
  const dataHead = Buffer.alloc(8);
  dataHead.write('data', 0, 'ascii');
  dataHead.writeUInt32LE(pcm.length, 4);
  const info = infoChunk(tags);
  const riffBody = Buffer.concat([Buffer.from('WAVE', 'ascii'), fmt, info, dataHead, pcm]);
  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0, 'ascii');
  riff.writeUInt32LE(riffBody.length, 4);
  return Buffer.concat([riff, riffBody]);
}
