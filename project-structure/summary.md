# Cấu trúc Dự án SnapAttend

*Ngày cập nhật: 17/04/2026*

## 1. Sơ đồ cây (Tree)
```text
SnapAttend/
├── .agent/
│   └── skills/
│       └── workflow.md    # Quy tắc làm việc của Agent
├── docs/
│   └── SnapAttend_App_PRD.md  # Tài liệu đặc tả yêu cầu
├── project-structure/
│   └── summary.md         # File này (Chỉ mục dự án)
├── src/                   # Mã nguồn ứng dụng
│   ├── assets/
│   ├── components/        # UI Components (atoms/molecules)
│   │   ├── layout/
│   │   └── ui/            # Reusable UI elements (Input, Button)
│   ├── db/                # Dexie.js configuration
│   ├── hooks/             # Custom React Hooks
│   ├── pages/             # App Screens
│   ├── services/          # Business logic & Crypto
│   ├── types/             # TypeScript definitions
│   ├── App.tsx
│   ├── index.css          # Tailwind & Global styles
│   └── main.tsx           # Entry point (Force Dark Mode)
├── tailwind.config.js     # Tailwind setup
└── vite.config.ts         # Vite & PWA config
```

## 2. Mô tả thành phần
- **docs/**: Chứa toàn bộ tài liệu nghiệp vụ và thiết kế.
- **.agent/skills/**: Chứa các quy tắc và kỹ năng bổ sung cho AI trong quá trình phát triển.
- **project-structure/**: Lưu trữ thông tin định hướng và chỉ mục để tra cứu nhanh.

## Giai đoạn 1, 2, 3 & 4: [HOÀN THÀNH]
- Đã thiết lập môi trường, PWA, Cấu trúc dữ liệu và Bảo mật Master Key.
- Đã hoàn thiện Quản lý Danh mục, Ca học, Module Điểm danh và Hệ thống Bảo mật/Sao lưu.

## Giai đoạn 3: Ca học & Điểm danh [HOÀN THÀNH]
- [x] Logic tạo Ca học hàng loạt (Recurring Logic).
- [x] Giao diện danh sách Ca học.
- [x] Giao diện Điểm danh (Grid, Triple-tap, Haptic Feedback).

## Giai đoạn 4: Bảo mật & Đồng bộ [HOÀN THÀNH]
- [x] Cổng mã PIN bảo vệ App (Auth Service).
- [x] Logic Sao lưu/Khôi phục (Export/Import JSON mã hóa).
- [x] Màn hình Cài đặt (Settings).

## Giai đoạn 5: Báo cáo & Hoàn thiện [HOÀN THÀNH]
- [x] Màn hình Báo cáo (Bộ lọc thông minh).
- [x] Logic xuất file CSV/Excel.
- [x] Tối ưu hóa hiệu suất & Premium UX.

---
*Trạng thái hiện tại: Dự án đã hoàn thành toàn bộ các giai đoạn phát triển.*
