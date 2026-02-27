# 📧 Antigravity + Gmail MCP Tool

> **Công cụ CLI tương tác với Gmail API** – Tìm kiếm email ứng tuyển, đọc nội dung và reply chuyên nghiệp ngay từ Terminal.

---

## ✨ Tính năng

| Bước | Chức năng |
|------|-----------|
| **1** | 🔍 Tìm email ứng tuyển đã gửi theo tiêu đề |
| **2** | 📖 Đọc chi tiết: ngày gửi, nơi nhận, 10 từ đầu |
| **3** | 📌 Chọn email ứng tuyển để lấy nội dung |
| **4** | 🔍 Tìm email cần reply theo tiêu đề (từ nhà tuyển dụng) |
| **5** | 💬 Chọn email và reply chính xác vào đúng thread |
| **6** | 🖼️ Đính kèm ảnh tuỳ chọn trước khi gửi |

---

## 📋 Yêu cầu

- **Node.js** v16 trở lên
- **Tài khoản Google** với Gmail API được bật
- File credentials đã lưu tại `~/.gmail-mcp/`

---

## 🚀 Cài đặt

### 1. Clone hoặc tải dự án

```bash
git clone <repo-url>
cd "Gmail MCP"
```

### 2. Cài dependencies

```bash
npm install googleapis
```

### 3. Cấu hình Gmail API

Bạn cần hai file trong thư mục `~/.gmail-mcp/` (Windows: `C:\Users\<tên>\\.gmail-mcp\`):

| File | Mô tả |
|------|-------|
| `gcp-oauth.keys.json` | OAuth2 Keys tải từ Google Cloud Console |
| `credentials.json` | Token đã xác thực (tự sinh khi login lần đầu) |

> **Cách lấy `gcp-oauth.keys.json`:**
> 1. Vào [Google Cloud Console](https://console.cloud.google.com/)
> 2. Tạo project → Bật **Gmail API**
> 3. Tạo **OAuth 2.0 Client ID** (loại Desktop App)
> 4. Tải file JSON → đổi tên thành `gcp-oauth.keys.json` → đặt vào `~/.gmail-mcp/`

---

## ▶️ Chạy chương trình

```bash
cd "e:\TUYENDUNG\Gmail MCP"
node gmail_tool.js
```

---

## 🖥️ Demo luồng sử dụng

```
╔══════════════════════════════════════════════════════════╗
║         ANTIGRAVITY  +  GMAIL MCP  TOOL                  ║
║         Tìm email ứng tuyển – Xem chi tiết – Reply       ║
╚══════════════════════════════════════════════════════════╝

  BƯỚC 1   Tìm email ứng tuyển (mcp_gmail_search_emails)
  ──────────────────────────────────────────────────────────
  🔍 Nhập tiêu đề (subject) cần tìm [Enter để dùng mặc định]: Software Engineer

  BƯỚC 2   Đọc chi tiết email (mcp_gmail_read_email)
  ──────────────────────────────────────────────────────────
  [1] Ứng tuyển vị trí Software Engineer - Nguyễn Văn A
      📅 Ngày gửi  : 27/02/2026, 10:30:00
      📧 Gửi đến   : hr@company.com
      💬 10 từ đầu : "Kính gửi Quý công ty, tôi xin ứng tuyển vào vị trí..."

  BƯỚC 3   Chọn email ứng tuyển để lấy nội dung
  ──────────────────────────────────────────────────────────
  📌 Chọn số email ứng tuyển muốn dùng (1-1): 1

  BƯỚC 4   Tìm email cần reply (mcp_gmail_search_emails)
  ──────────────────────────────────────────────────────────
  🔍 Nhập tiêu đề email cần reply: Mời phỏng vấn

  BƯỚC 5   Chọn email để reply
  ──────────────────────────────────────────────────────────
  📌 Chọn số email muốn reply (1-1): 1

  BƯỚC 6   Chọn ảnh đính kèm từ thư mục
  ──────────────────────────────────────────────────────────
  📁 Nhập đường dẫn thư mục chứa ảnh [Enter để bỏ qua]:

  ╔══════════════════════════════════════════════════════════╗
  ║            ĐÃ GỬI REPLY THÀNH CÔNG!                      ║
  ╚══════════════════════════════════════════════════════════╝
```

---

## ⚙️ Tuỳ chỉnh cấu hình

Mở `gmail_tool.js` và chỉnh phần `CONFIG` ở đầu file:

```js
const CONFIG = {
    // Số email tối đa trả về mỗi lần tìm (tối đa 500)
    maxResults: 10,

    // Query mặc định khi nhấn Enter (không nhập tiêu đề)
    query: "in:sent subject:ứng tuyển OR subject:xin việc OR subject:application OR subject:CV",
};
```

---

## 📁 Cấu trúc dự án

```
Gmail MCP/
├── gmail_tool.js       # File chính – toàn bộ logic
├── README.md           # Hướng dẫn này
└── .gitignore          # Bỏ qua node_modules, credentials
```

---

## 🔒 Bảo mật

> [!WARNING]
> **Không commit file credentials lên Git!**
> Đảm bảo `.gitignore` đã bao gồm:
> ```
> credentials.json
> gcp-oauth.keys.json
> ```

---

## 🛠️ Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|------------|-----------|
| `Cannot find module 'googleapis'` | Chưa cài package | Chạy `npm install googleapis` |
| `ENOENT: gcp-oauth.keys.json` | Thiếu file keys | Xem hướng dẫn cấu hình ở trên |
| `invalid_grant` | Token hết hạn | Xoá `credentials.json` và đăng nhập lại |
| `Không tìm thấy email nào` | Query không khớp | Thử nhập tiêu đề khác hoặc bỏ trống |

---

## 📜 License

MIT © 2026
