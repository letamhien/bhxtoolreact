# Hướng dẫn chuyển sang React & Deploy GitHub Pages

## Bước 1 — Cài Node.js (1 lần duy nhất)

1. Vào **https://nodejs.org** → tải bản **LTS** (bản ổn định)
2. Chạy file `.msi` vừa tải → Next → Next → Install
3. **Khởi động lại máy tính** sau khi cài xong
4. Mở PowerShell, gõ kiểm tra: `node --version` (phải ra `v20.x.x`)

---

## Bước 2 — Cài thư viện React

Mở **PowerShell** hoặc **Terminal**, chạy:

```powershell
cd "C:\Users\badbo\.gemini\antigravity\scratch\tinhhsd-react"
npm install
```

Chờ ~1 phút để cài xong.

---

## Bước 3 — Chạy thử local (xem trước trên máy)

```powershell
npm run dev
```

Mở Chrome vào địa chỉ **http://localhost:5173** để xem.

---

## Bước 4 — Build file để lên GitHub Pages

```powershell
npm run build
```

Sau khi xong, thư mục **`dist/`** sẽ được tạo ra, chứa toàn bộ file HTML/CSS/JS đã được build.

---

## Bước 5 — Upload lên GitHub Pages

### Cách A: Upload thư mục `dist` (đơn giản nhất)
1. Vào repo GitHub của bạn
2. Xoá tất cả file cũ (index.html, app.css, hsd.html, gia.html, mas.html)
3. Upload **toàn bộ nội dung bên trong thư mục `dist/`** vào root của repo
4. Vào Settings → Pages → chọn branch `main`, folder `/` (root) → Save

### Cách B: Dùng `gh-pages` package (tự động hơn)
```powershell
npm install --save-dev gh-pages
```

Thêm vào `package.json` (phần `scripts`):
```json
"deploy": "gh-pages -d dist"
```

Rồi chạy:
```powershell
npm run build
npm run deploy
```

---

## Cấu trúc project

```
tinhhsd-react/
├── package.json          ← cấu hình npm
├── vite.config.js        ← cấu hình build
├── index.html            ← HTML gốc (có Tesseract.js CDN)
└── src/
    ├── main.jsx           ← entry point React
    ├── App.jsx            ← Routes + Dark Mode state
    ├── index.css          ← toàn bộ CSS + dark mode tokens
    ├── components/
    │   ├── Header.jsx     ← header + nút 🌙/☀️ dark mode
    │   ├── NavBar.jsx     ← điều hướng 3 trang
    │   └── MicPopup.jsx   ← popup mic + AudioContext bars
    ├── pages/
    │   ├── HsdPage.jsx    ← Tính HSD (camera, lịch sử...)
    │   ├── GiaPage.jsx    ← Tính Giá (bảng quy đổi...)
    │   └── MasPage.jsx    ← Tra Mã Số (tìm kiếm, mic...)
    └── data/
        └── masData.js     ← ← THÊM SẢN PHẨM MỚI Ở ĐÂY
```

---

## Tính năng Dark Mode

- Bấm nút **🌙** trên header để bật dark mode
- Bấm **☀️** để về sáng
- Trạng thái được **lưu vào cache** (localStorage) — tắt mở lại vẫn nhớ

---

## Thêm sản phẩm mới

Mở file `src/data/masData.js`, thêm dòng:

```js
{ name: "TÊN SẢN PHẨM", code: "12345", note: "Ghi chú" },
```

Rồi `npm run build` lại và upload thư mục `dist`.
