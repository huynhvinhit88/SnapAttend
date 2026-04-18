# Agent Workflow Skills

Tài liệu này quy bản các quy tắc làm việc giữa Agent và User cho dự án SnapAttend.

## 1. Quy trình Điều tra (Investigation)
- Trước khi bắt đầu phân tích mã nguồn hoặc tính năng mới, Agent luôn phải kiểm tra thư mục `project-structure/` để hiểu cấu trúc hiện tại.
- Mục tiêu: Nắm bắt nhanh mối quan hệ giữa các submodule và tránh tạo ra các logic chồng chéo.

## 2. Quy trình Thực thi (Implementation)
- **Tiêu chuẩn Coding PWA:**
    * **Architecture:** Sử dụng Functional Components + Hooks. Tách biệt logic xử lý dữ liệu (Custom Hooks) và UI.
    * **Mobile-First:** Code CSS/Tailwind ưu tiên cho di động, sử dụng các hiệu ứng chạm (Active state) thay vì chỉ hover.
    * **Offline First:** Đảm bảo tất cả các trang quan trọng (Điểm danh, Danh sách) có thể truy cập khi không có mạng thông qua Service Worker.
    * **Performance:** Tối ưu hóa việc render danh sách dài học sinh bằng kỹ thuật Virtualization hoặc Memoization.
- **Đồng bộ định dạng (Input Sync):** Luôn đảm bảo tất cả các ô nhập liệu (Input, Select, Textarea) có chung một bộ style (Border, Padding, Rounding, Focus Ring, Placeholder). Phải xây dựng các Component dùng chung để đảm bảo tính nhất quán này.
- **Luôn luôn hỏi ý kiến:** Trước khi thực hiện bất kỳ lệnh sửa đổi file (`replace_file_content`, `write_to_file`) hoặc lệnh terminal nào liên quan đến logic ứng dụng, Agent phải trình bày kế hoạch và chờ User xác nhận "Đồng ý/Bắt đầu".
- **Cập nhật Chỉ mục:** Ngay sau khi hoàn thành một khối lượng công việc (Finish a phase), Agent phải cập nhật file sơ đồ cấu trúc trong thư mục `project-structure/`.

## 3. Quản lý Cấu trúc Dự án
- Lưu trữ các file Markdown mô tả cây thư mục và vai trò của từng file tại: `project-structure/summary.md`.

---
*Ghi chú: Agent phải tuân thủ nghiêm ngặt các quy tắc này trong suốt quá trình phát triển.*
