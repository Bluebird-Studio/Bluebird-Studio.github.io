// Small, independent canvas HUD. Drawn on a separate canvas so world rendering can evolve.
export function drawMiniMap(canvas, car, marker, city = 2500, block = 250) {
  if (!canvas || !car || !marker) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height, pad = 10;
  const scale = (Math.min(w, h) - pad * 2) / city;
  const toX = x => pad + x * scale;
  const toY = y => pad + y * scale;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0e1024';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#3d3b59';
  ctx.lineWidth = 3;
  for (let i = 0; i <= city; i += block) {
    const at = pad + i * scale;
    ctx.beginPath(); ctx.moveTo(at, pad); ctx.lineTo(at, h - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, at); ctx.lineTo(w - pad, at); ctx.stroke();
  }
  ctx.strokeStyle = '#9e7eab';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad, pad, city * scale, city * scale);
  ctx.strokeStyle = '#f8d270';
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(toX(car.x), toY(car.y)); ctx.lineTo(toX(marker[0]), toY(marker[1])); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd969';
  ctx.beginPath(); ctx.arc(toX(marker[0]), toY(marker[1]), 5, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(toX(car.x), toY(car.y));
  ctx.rotate((car.angle || 0) + Math.PI / 2);
  ctx.fillStyle = '#ff7cb6';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}
