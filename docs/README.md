# All-in-One Chart (Web)

Web app nhúng chart với 5 indicator viết lại từ Pine Script sang JavaScript, chạy trên
[lightweight-charts](https://github.com/tradingview/lightweight-charts) + dữ liệu **Binance public API**.

> ⚠️ Vì TradingView không cho nạp Pine custom vào widget nhúng, logic indicator đã được
> **viết lại bằng JS** (`indicators.js`). Đây là bản tái hiện, không phải chạy file `.pine` gốc.

## Indicators
- **VWMA(20)** — đường xanh
- **FearZone / GreedZone** (Zeiierman) — chấm tròn hồng/xanh dưới/trên nến
- **Liquidity Levels** (BigBeluga, phần volume profile) — đường ngang support (xanh) / resistance (cam)
- **Volume VSA** — cột volume đổi màu theo độ lớn tương đối
- **Wyckoff Acc/Dist** (faytterro) — mũi tên SC/AR/ST/BC/DAR/DST

## Chạy thử local
Mở `index.html` bằng trình duyệt (cần internet để gọi Binance API). Hoặc chạy server tĩnh:
```bash
cd docs
python -m http.server 8080
# mở http://localhost:8080
```

## Deploy lên GitHub Pages
1. Tạo repo trên GitHub, đẩy thư mục này lên:
   ```bash
   git init && git add . && git commit -m "All-in-one chart web app"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
2. Trên GitHub: **Settings → Pages → Source = Deploy from branch → main / root (hoặc /web)**.
3. Vài phút sau truy cập `https://<user>.github.io/<repo>/web/`.

## Giới hạn so với bản Pine gốc
- Không vẽ được **box Accumulation/Distribution** (lightweight-charts v4 chưa có rectangle) — Wyckoff
  chỉ hiển thị tín hiệu mũi tên. Cần box thì nâng lên lightweight-charts v5 (primitives).
- Fear/Greed hiển thị bằng **chấm tròn** thay cho nến phụ dưới giá (markers không vẽ nến tùy ý).
- Volume bubbles của Liquidity Spectrum được thay bằng **cột volume VSA + đường liquidity** cho gọn.
- Dữ liệu phụ thuộc Binance (symbol phải có trên Binance, vd ETHUSDT, BTCUSDT).
