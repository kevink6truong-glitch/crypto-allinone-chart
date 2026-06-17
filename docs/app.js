// ============================================================================
//  app.js — fetch Binance OHLCV, compute indicators, render lightweight-charts
// ============================================================================
const $ = (id) => document.getElementById(id);
const chartEl = $('chart');

const chart = LightweightCharts.createChart(chartEl, {
  layout: { background: { color: '#0c0e15' }, textColor: '#d1d4dc' },
  grid: { vertLines: { color: '#1b1f2b' }, horzLines: { color: '#1b1f2b' } },
  rightPriceScale: { borderColor: '#2a2e3e' },
  timeScale: { borderColor: '#2a2e3e', timeVisible: true, secondsVisible: false },
  crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
});
window.addEventListener('resize', () =>
  chart.applyOptions({ width: chartEl.clientWidth, height: chartEl.clientHeight }));
chart.applyOptions({ width: chartEl.clientWidth, height: chartEl.clientHeight });

const candleSeries = chart.addCandlestickSeries({
  upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
  wickUpColor: '#26a69a', wickDownColor: '#ef5350',
});
const vwmaSeries = chart.addLineSeries({ color: '#2962FF', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
const volSeries = chart.addHistogramSeries({
  priceFormat: { type: 'volume' }, priceScaleId: 'vol',
});
chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

let priceLines = [];

async function fetchKlines(symbol, interval, limit = 600) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Binance API: ' + res.status);
  const raw = await res.json();
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
  }));
}

function render(data) {
  const t = data.map((d) => d.time);
  const o = data.map((d) => d.open);
  const h = data.map((d) => d.high);
  const l = data.map((d) => d.low);
  const c = data.map((d) => d.close);
  const v = data.map((d) => d.volume);
  const matype = $('matype').value;

  candleSeries.setData(data.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })));

  // VWMA
  if ($('t_vwma').checked) {
    const m = vwma(c, v, 20);
    vwmaSeries.setData(t.map((time, i) => (isNaN(m[i]) ? null : { time, value: m[i] })).filter(Boolean));
  } else vwmaSeries.setData([]);

  // Volume (VSA colored)
  if ($('t_vol').checked) {
    const cols = vsaColors(v);
    volSeries.setData(data.map((d, i) => ({ time: d.time, value: d.volume, color: cols[i] })));
  } else volSeries.setData([]);

  // Liquidity levels (clear old, draw new)
  priceLines.forEach((pl) => candleSeries.removePriceLine(pl));
  priceLines = [];
  if ($('t_liq').checked) {
    const levels = liquidityLevels(h, l, c, v, 200, c[c.length - 1]);
    levels.forEach((lv) => {
      priceLines.push(candleSeries.createPriceLine({
        price: lv.price,
        color: lv.isSupport ? '#22b16c' : '#dd7e2a',
        lineWidth: lv.val > 45 ? 3 : lv.val > 35 ? 2 : 1,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: false,
      }));
    });
  }

  // Markers: Fear / Greed / Wyckoff
  let markers = [];
  if ($('t_fear').checked) {
    const fz = fearZone(o, h, l, c, 30, 50, matype);
    fz.forEach((on, i) => { if (on) markers.push({ time: t[i], position: 'belowBar', color: '#FC6C85', shape: 'circle', text: 'Fear' }); });
  }
  if ($('t_greed').checked) {
    const gz = greedZone(o, h, l, c, 30, 50, matype);
    gz.forEach((on, i) => { if (on) markers.push({ time: t[i], position: 'aboveBar', color: '#90EE90', shape: 'circle', text: 'Greed' }); });
  }
  if ($('t_wyk').checked) {
    const { markers: wm } = wyckoff(h, l, c, 14, 20, 5);
    wm.forEach((m) => {
      if (m.idx < 0 || m.idx >= t.length) return;
      markers.push({
        time: t[m.idx],
        position: m.dir === 'up' ? 'belowBar' : 'aboveBar',
        color: m.color,
        shape: m.dir === 'up' ? 'arrowUp' : 'arrowDown',
        text: m.text,
      });
    });
  }
  markers.sort((a, b) => a.time - b.time);
  candleSeries.setMarkers(markers);
}

async function load() {
  const symbol = $('symbol').value.trim().toUpperCase();
  const interval = $('interval').value;
  $('status').textContent = 'Đang tải ' + symbol + ' ' + interval + '…';
  try {
    const data = await fetchKlines(symbol, interval);
    render(data);
    const last = data[data.length - 1];
    $('status').textContent = symbol + ' ' + interval + ' · ' + data.length + ' nến · last ' + last.close;
    $('legend').innerHTML =
      '<b style="color:#2962FF">━ VWMA(20)</b> · ' +
      '<span style="color:#FC6C85">● FearZone</span> · ' +
      '<span style="color:#90EE90">● GreedZone</span><br>' +
      '<span style="color:#22b16c">━ Support</span> / <span style="color:#dd7e2a">━ Resistance</span> (Liquidity) · ' +
      '<span style="color:#26a69a">▲ Acc</span> / <span style="color:#ef5350">▼ Dist</span> (Wyckoff)';
  } catch (e) {
    $('status').textContent = '⚠️ ' + e.message + ' (thử symbol khác hoặc kiểm tra mạng/CORS)';
    console.error(e);
  }
}

['t_vwma', 't_fear', 't_greed', 't_liq', 't_vol', 't_wyk', 'matype'].forEach((id) =>
  $(id).addEventListener('change', load));
$('reload').addEventListener('click', load);
$('interval').addEventListener('change', load);
$('symbol').addEventListener('keydown', (e) => { if (e.key === 'Enter') load(); });

load();
