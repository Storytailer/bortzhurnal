/* Рисует значки приложения (эмблема: крылья + звезда): node tools/make-icons.js */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });

const BG = [0x1c, 0x21, 0x26], SAND = [0xd9, 0xc9, 0xa0], RED = [0xd8, 0x45, 0x3c];

// Геометрия в координатах эмблемы 80×40 (как в app.js)
const wings = [
  [[29, 12.5], [7, 12.5], [3, 16], [29, 16]], [[29, 18.5], [11, 18.5], [7, 22], [29, 22]], [[29, 24.5], [16, 24.5], [12, 28], [29, 28]],
  [[51, 12.5], [73, 12.5], [77, 16], [51, 16]], [[51, 18.5], [69, 18.5], [73, 22], [51, 22]], [[51, 24.5], [64, 24.5], [68, 28], [51, 28]],
];
function starPoints(cx, cy, R) {
  const r = R * 0.42, pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  return pts;
}
const star = starPoints(40, 20.7, 7.6);

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function colorAt(ex, ey) {
  if (inPoly(ex, ey, star)) return RED;
  const d = Math.hypot(ex - 40, ey - 20);
  if (d >= 9.5 && d <= 11.5) return SAND;
  if (wings.some(w => inPoly(ex, ey, w))) return SAND;
  return BG;
}

function render(size) {
  const k = size / 100;                    // эмблема занимает 80% ширины
  const ox = size * 0.1, oy = size / 2 - 20 * k;
  const rgb = Buffer.alloc(size * size * 3);
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt((x + (sx + 0.5) / SS - ox) / k, (y + (sy + 0.5) / SS - oy) / k);
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
        }
      }
      const i = (y * size + x) * 3;
      rgb[i] = Math.round(acc[0] / (SS * SS));
      rgb[i + 1] = Math.round(acc[1] / (SS * SS));
      rgb[i + 2] = Math.round(acc[2] / (SS * SS));
    }
  }
  return rgb;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 бит, RGB
  const stride = size * 3 + 1, raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) rgb.copy(raw, y * stride + 1, y * size * 3, (y + 1) * size * 3);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  fs.writeFileSync(path.join(out, name), png(size, render(size)));
}

const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
const poly = pts => pts.map(p => p.map(v => +v.toFixed(2)).join(',')).join(' ');
fs.writeFileSync(path.join(out, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${hex(BG)}"/>
  <g transform="translate(10 30)">
    <g fill="${hex(SAND)}">${wings.map(w => `<polygon points="${poly(w)}"/>`).join('')}</g>
    <circle cx="40" cy="20" r="10.5" fill="none" stroke="${hex(SAND)}" stroke-width="2"/>
    <polygon points="${poly(star)}" fill="${hex(RED)}"/>
  </g>
</svg>
`);
console.log('Значки готовы:', out);
