// ============================================================================
//  indicators.js — JS reimplementation of the Pine indicators
//  Faithful to: VWMA, FearZone/GreedZone (Zeiierman), Liquidity Spectrum
//  (BigBeluga, volume-profile portion), VSA volume tiers, Wyckoff (faytterro).
//  All functions operate on plain arrays; insufficient values are NaN.
// ============================================================================

// ---- rolling helpers --------------------------------------------------------
function rollHighest(a, len) {
  const out = new Array(a.length).fill(NaN);
  for (let i = len - 1; i < a.length; i++) {
    let m = -Infinity;
    for (let j = i - len + 1; j <= i; j++) if (a[j] > m) m = a[j];
    out[i] = m;
  }
  return out;
}
function rollLowest(a, len) {
  const out = new Array(a.length).fill(NaN);
  for (let i = len - 1; i < a.length; i++) {
    let m = Infinity;
    for (let j = i - len + 1; j <= i; j++) if (a[j] < m) m = a[j];
    out[i] = m;
  }
  return out;
}
function sma(a, len) {
  const out = new Array(a.length).fill(NaN);
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i];
    if (i >= len) s -= a[i - len];
    if (i >= len - 1) out[i] = s / len;
  }
  return out;
}
function ema(a, len) {
  const out = new Array(a.length).fill(NaN);
  const k = 2 / (len + 1);
  let prev;
  for (let i = 0; i < a.length; i++) {
    if (isNaN(a[i])) { out[i] = NaN; continue; }
    prev = prev === undefined ? a[i] : a[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}
function rma(a, len) {
  const out = new Array(a.length).fill(NaN);
  const k = 1 / len;
  let prev;
  for (let i = 0; i < a.length; i++) {
    if (isNaN(a[i])) { out[i] = NaN; continue; }
    prev = prev === undefined ? a[i] : a[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}
function wma(a, len) {
  const out = new Array(a.length).fill(NaN);
  const denom = (len * (len + 1)) / 2;
  for (let i = len - 1; i < a.length; i++) {
    let s = 0;
    for (let j = 0; j < len; j++) s += a[i - j] * (len - j); // most recent weight = len
    out[i] = s / denom;
  }
  return out;
}
function hma(a, len) {
  const half = Math.max(1, Math.floor(len / 2));
  const sq = Math.max(1, Math.round(Math.sqrt(len)));
  const w1 = wma(a, half);
  const w2 = wma(a, len);
  const diff = a.map((_, i) => 2 * w1[i] - w2[i]);
  return wma(diff, sq);
}
function average(a, len, matype) {
  switch (matype) {
    case 'SMA': return sma(a, len);
    case 'EMA': return ema(a, len);
    case 'HMA': return hma(a, len);
    case 'RMA': return rma(a, len);
    default:    return wma(a, len);
  }
}
// Pine ta.stdev = population stdev around SMA mean
function stdev(a, len) {
  const out = new Array(a.length).fill(NaN);
  for (let i = len - 1; i < a.length; i++) {
    let mean = 0;
    for (let j = i - len + 1; j <= i; j++) mean += a[j];
    mean /= len;
    let v = 0;
    for (let j = i - len + 1; j <= i; j++) { const d = a[j] - mean; v += d * d; }
    out[i] = Math.sqrt(v / len);
  }
  return out;
}
function rsi(close, len) {
  const out = new Array(close.length).fill(NaN);
  const up = new Array(close.length).fill(0);
  const dn = new Array(close.length).fill(0);
  for (let i = 1; i < close.length; i++) {
    const ch = close[i] - close[i - 1];
    up[i] = Math.max(ch, 0);
    dn[i] = Math.max(-ch, 0);
  }
  const ru = rma(up, len);
  const rd = rma(dn, len);
  for (let i = 0; i < close.length; i++) {
    if (isNaN(ru[i]) || isNaN(rd[i])) continue;
    out[i] = rd[i] === 0 ? 100 : 100 - 100 / (1 + ru[i] / rd[i]);
  }
  return out;
}
// True Range
function trueRange(h, l, c) {
  const out = new Array(h.length).fill(NaN);
  for (let i = 0; i < h.length; i++) {
    if (i === 0) { out[i] = h[i] - l[i]; continue; }
    out[i] = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
  }
  return out;
}

// ---- FearZone / GreedZone (Zeiierman) --------------------------------------
function fearZone(o, h, l, c, highPeriod, stdevPeriod, matype) {
  const src = o.map((_, i) => (o[i] + h[i] + l[i] + c[i]) / 4); // ohlc4
  const hh = rollHighest(src, highPeriod);
  const FZ1 = src.map((s, i) => (hh[i] - s) / hh[i]);
  const AVG1 = average(FZ1, stdevPeriod, matype);
  const SD1 = stdev(FZ1, stdevPeriod);
  const FZ1Limit = AVG1.map((a, i) => a + SD1[i]);

  const FZ2 = average(src, highPeriod, matype);
  const AVG2 = average(FZ2, stdevPeriod, matype);
  const SD2 = stdev(FZ2, stdevPeriod);
  const FZ2Limit = AVG2.map((a, i) => a - SD2[i]);

  return src.map((_, i) => FZ1[i] > FZ1Limit[i] && FZ2[i] < FZ2Limit[i]);
}
function greedZone(o, h, l, c, lowPeriod, stdevPeriod, matype) {
  const src = o.map((_, i) => (o[i] + h[i] + l[i] + c[i]) / 4);
  const ll = rollLowest(src, lowPeriod);
  const GZ1 = src.map((s, i) => (ll[i] - s) / ll[i]);
  const AVG1 = average(GZ1, stdevPeriod, matype);
  const SD1 = stdev(GZ1, stdevPeriod);
  const GZ1Limit = AVG1.map((a, i) => a - SD1[i]);

  const GZ2 = average(src, lowPeriod, matype);
  const AVG2 = average(GZ2, stdevPeriod, matype);
  const SD2 = stdev(GZ2, stdevPeriod);
  const GZ2Limit = AVG2.map((a, i) => a + SD2[i]);

  return src.map((_, i) => GZ1[i] < GZ1Limit[i] && GZ2[i] > GZ2Limit[i]);
}

// ---- VWMA ------------------------------------------------------------------
function vwma(price, vol, len) {
  const out = new Array(price.length).fill(NaN);
  let sp = 0, sv = 0;
  for (let i = 0; i < price.length; i++) {
    sp += price[i] * vol[i];
    sv += vol[i];
    if (i >= len) { sp -= price[i - len] * vol[i - len]; sv -= vol[i - len]; }
    if (i >= len - 1 && sv > 0) out[i] = sp / sv;
  }
  return out;
}

// ---- VSA volume tiers (palette) --------------------------------------------
function vsaColors(vol) {
  const sd = stdev(vol, 200);
  return vol.map((v, i) => {
    const n = v / sd[i];
    if (isNaN(n)) return '#787b86';
    if (n >= 4) return '#9c27b0';        // ultra  - purple
    if (n >= 3) return '#ef5350';        // very   - red
    if (n >= 1.5) return '#ff9800';      // high   - orange
    if (n >= 0.8) return '#26a69a';      // normal - green
    if (n >= 0.4) return '#42a5f5';      // low    - blue
    return '#b0b3b8';                    // v.low  - silver
  });
}

// ---- Liquidity Spectrum (volume-profile -> liquidity levels) ----------------
// Returns array of {price, val, isSupport} for bins whose normalized volume>threshold.
function liquidityLevels(h, l, c, vol, lookback, lastClose) {
  const n = c.length;
  const start = Math.max(0, n - lookback);
  let hi = -Infinity, lo = Infinity;
  for (let i = start; i < n; i++) { if (h[i] > hi) hi = h[i]; if (l[i] < lo) lo = l[i]; }
  const BINS = 100;
  const step = (hi - lo) / BINS;
  if (!(step > 0)) return [];
  const bins = new Array(BINS).fill(0);
  for (let b = 0; b < BINS; b++) {
    const lower = lo + step * b, upper = lower + step;
    for (let i = start; i < n; i++) {
      if (c[i] >= lower - step && c[i] <= upper + step) bins[b] += vol[i];
    }
  }
  const maxBin = Math.max(...bins);
  const levels = [];
  for (let b = 0; b < BINS; b++) {
    const val = Math.round((bins[b] / maxBin) * 50);
    if (val > 25) {
      const mid = lo + step * b + step / 2;
      levels.push({ price: mid, val, isSupport: lastClose > mid });
    }
  }
  return levels;
}

// ---- Wyckoff Accumulation/Distribution (faytterro) -------------------------
// Pivot detection (left = right = pivotLen). Confirmed at i, actual pivot at i-pivotLen.
function findPivots(arr, len, isHigh) {
  const piv = new Array(arr.length).fill(false); // confirmed at index i
  for (let i = 2 * len; i < arr.length; i++) {
    const center = i - len;
    let ok = true;
    for (let j = center - len; j <= center + len; j++) {
      if (j === center) continue;
      if (isHigh ? arr[j] > arr[center] : arr[j] < arr[center]) { ok = false; break; }
    }
    piv[i] = ok;
  }
  return piv;
}
// Returns array of markers {idx (bar index of the pivot), type, text, color, dir}
function wyckoff(h, l, c, rsiLen, rsiSens, pivotLen) {
  const r = rsi(c, rsiLen);
  const n = c.length;
  const rsiLow = 50 - rsiSens, rsiHigh = 50 + rsiSens;
  const pLow = findPivots(l, pivotLen, false);
  const pHigh = findPivots(h, pivotLen, true);

  const markers = [];
  let scBar = NaN, bcBar = NaN, darBar = NaN, pivotCounter = 0;

  for (let i = 0; i < n; i++) {
    const rAtPivot = r[i - pivotLen];      // rsi at the pivot bar
    if (rAtPivot === undefined || isNaN(rAtPivot)) continue;
    const pivBar = i - pivotLen;
    const utad = r[i] < rsiHigh && r[i - 1] > rsiHigh;
    const spring = r[i] > rsiLow && r[i - 1] < rsiLow;

    // SC
    const isSC = pLow[i] && rAtPivot < rsiLow && !spring;
    if (isSC) { scBar = pivBar; markers.push({ idx: pivBar, dir: 'up', text: 'SC', color: '#26a69a' }); }

    // AR (after SC)
    let isAR = false;
    if (!isNaN(scBar) && pHigh[i] && pivBar > scBar) { isAR = true; scBar = NaN; markers.push({ idx: pivBar, dir: 'down', text: 'AR', color: '#26a69a' }); }

    // ST (accumulation)
    if (pLow[i]) pivotCounter++;
    if (rAtPivot < rsiLow) pivotCounter = 0;
    const isST = pivotCounter === 1 && pLow[i];
    if (isST) markers.push({ idx: pivBar, dir: 'up', text: 'ST', color: '#26a69a' });

    // BC
    const isBC = rAtPivot > rsiHigh && pHigh[i] && !utad;
    if (isBC) { bcBar = pivBar; markers.push({ idx: pivBar, dir: 'down', text: 'BC', color: '#ef5350' }); }

    // DAR (after BC)
    let isDAR = false;
    if (!isNaN(bcBar) && pLow[i] && pivBar > bcBar) { isDAR = true; bcBar = NaN; darBar = pivBar; markers.push({ idx: pivBar, dir: 'up', text: 'AR', color: '#ef5350' }); }

    // DST (after DAR)
    if (!isNaN(darBar) && pHigh[i] && pivBar > darBar && !isBC) { darBar = NaN; markers.push({ idx: pivBar, dir: 'down', text: 'ST', color: '#ef5350' }); }

    // plain pivots (orange)
    if (pLow[i] && !isSC && !isST && !isAR && !isDAR) markers.push({ idx: pivBar, dir: 'up', text: '', color: '#ff9800' });
    if (pHigh[i] && !isAR && !isBC) markers.push({ idx: pivBar, dir: 'down', text: '', color: '#ff9800' });
  }
  return { markers, rsi: r };
}
