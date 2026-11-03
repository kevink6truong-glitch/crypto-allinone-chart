---
description: Phân tích cổ phiếu (stock) bằng bộ indicator VWMA / Wyckoff / Liquidity / Fear-Greed của repo và đưa ra kế hoạch giao dịch
argument-hint: <TICKER> [timeframe, vd: 1D, 4H]
---

Phân tích cổ phiếu: **$ARGUMENTS** (mặc định khung 1D nếu không nêu timeframe).

Các bước:

1. Lấy dữ liệu giá/khối lượng gần nhất cho mã trên (dùng WebSearch/WebFetch hoặc dữ liệu người dùng cung cấp). Nêu rõ nguồn và thời điểm dữ liệu.
2. Áp dụng logic các indicator trong repo (xem các file `*.pine` ở thư mục gốc):
   - **VWMA**: xu hướng và vị trí giá so với VWMA.
   - **Fear/Greed Zone**: vùng sợ hãi / tham lam.
   - **Liquidity Spectrum**: vùng thanh khoản, hỗ trợ/kháng cự.
   - **Wyckoff Accumulation/Distribution + VSA**: pha thị trường, bất thường khối lượng.
3. Đưa ra kế hoạch dạng bảng: bias (mua/bán/đứng ngoài), vùng vào lệnh, stop-loss, take-profit, tỷ lệ R:R, điều kiện vô hiệu hóa.
4. Nêu rủi ro chính và các sự kiện sắp tới (earnings, tin vĩ mô) nếu có.

Quy tắc:
- Trả lời bằng tiếng Việt, ngắn gọn.
- Không bịa số liệu; nếu thiếu dữ liệu thì nói rõ.
- Kết thúc bằng: *Chỉ mang tính tham khảo, không phải lời khuyên đầu tư.*
