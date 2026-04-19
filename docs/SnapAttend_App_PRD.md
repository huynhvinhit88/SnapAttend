# ĐẶC TẢ YÊU CẦU PHẦN MỀM (PRD): ỨNG DỤNG QUẢN LÝ VÀ ĐIỂM DANH Học sinh

## 1. Tổng quan dự án
Ứng dụng hỗ trợ Giáo viên/quản lý giáo dục thực hiện các tác vụ quản lý Học sinh, môn học, ca học và điểm danh một cách nhanh chóng, tiện lợi. Ứng dụng tập trung vào trải nghiệm nhập liệu tốc độ cao, hoạt động mượt mà trên đa thiết bị và đảm bảo an toàn dữ liệu thông qua cơ chế lưu trữ nội bộ kết hợp đồng bộ hóa đám mây.

---

## 2. Yêu cầu kỹ thuật & Nền tảng
* **Nền tảng:** Progressive Web App (PWA) sử dụng **Vite + React + TailwindCSS**. Hỗ trợ cài đặt và sử dụng trực tiếp trên cả trình duyệt điện thoại (Mobile) và máy tính (Desktop/Laptop).
* **Ngôn ngữ:** Tiếng Việt (Hoàn toàn).
* **Lưu trữ dữ liệu:**
  * Lưu trữ cục bộ (IndexedDB với Dexie.js) giúp ứng dụng hoạt động offline tốc độ cao.
  * **Cơ chế Mã hóa Hybrid:** 
    * Toàn bộ dữ liệu local được mã hóa bằng một **Master Key** được sinh ngẫu nhiên và lưu an toàn trong trình duyệt (không thể xuất ra ngoài). 
    * Mã PIN đóng vai trò là "Cổng bảo vệ" (App Lock) để truy cập ứng dụng. 
    * Khi xuất file JSON (Backup), người dùng có tùy chọn đặt mật khẩu riêng cho file đó để đảm bảo an toàn tuyệt đối khi lưu trữ đám mây.
* **Đồng bộ & Xuất báo cáo đám mây:** Tích hợp Google Drive API.
  * Hỗ trợ đồng bộ hóa (Backup/Restore) toàn bộ cơ sở dữ liệu dưới định dạng file `.json` lên Google Drive cá nhân.
  * Hỗ trợ **Xuất/Nhập file `.json` thủ công** để người dùng chủ động quản lý hoặc chuyển đổi thiết bị.
  * Xuất trực tiếp các file báo cáo lên Google Drive hoặc tải về máy.

---

## 3. Yêu cầu Giao diện & Trải nghiệm (UI/UX)
* **Giao diện đa nền tảng:** Responsive Web Design, tự động tối ưu hóa hiển thị cho màn hình dọc (điện thoại) và màn hình ngang (máy tính).
* **Trải nghiệm nhập liệu nhanh chóng:**
  * Sử dụng các form nhập liệu tối ưu (auto-focus, hỗ trợ phím Tab chuyển trường nhanh trên PC).
  * Giảm thiểu tối đa số lần nhấp chuột/chạm.
  * Hỗ trợ các thao tác vuốt (swipe) và chạm (tap) thuận tiện trên màn hình cảm ứng.
* **Chế độ hiển thị:** Mặc định là **Chế độ Tối (Dark Mode)**, hỗ trợ chuyển đổi sang Sáng (Light Mode).

---

## 4. Chi tiết tính năng

### 4.1. Xác thực & Đăng nhập
* Yêu cầu người dùng nhập **Mã PIN** (hoặc mật khẩu tĩnh) để truy cập vào ứng dụng, đảm bảo tính riêng tư.

### 4.2. Quản lý Học sinh
* Thêm, sửa, xóa thông tin Học sinh.
* **Trường dữ liệu:** Họ và tên, Mã Học sinh (ID), Lớp, Email, Ảnh đại diện.
* **Xử lý ảnh:** Ảnh khi tải lên hoặc chụp từ camera sẽ được tự động nén và resize về kích thước tối ưu (VD: 200x200px, dung lượng ~20KB/ảnh) để đảm bảo hiệu suất lưu trữ và tốc độ tải.

### 4.3. Quản lý Lớp
* Quản lý danh sách các danh mục lớp học.
* **Trường dữ liệu:** Tên lớp (VD: 10A1), Khối (VD: Khối 10, Khối 11, Khối 12), Chuyên ngành/Khối chuyên (nếu có), Niên khóa.
* **Tính năng:** Xem danh sách Học sinh thuộc lớp đó, thêm nhanh Học sinh vào lớp.

### 4.4. Quản lý Giáo viên
* Quản lý danh sách giáo sư/giáo viên trong trường.
* **Trường dữ liệu:** Họ và tên, Mã giáo viên, Bộ môn.

### 4.4. Quản lý Môn học
* Thêm, sửa, xóa thông tin môn học.
* **Trường dữ liệu:** Mã môn học, Tên môn học, Số tín chỉ.

### 4.6. Quản lý Lớp học phần
* Là đơn vị quản lý danh sách Học sinh tham gia một môn học cụ thể.
* **Trường dữ liệu:** Tên lớp học phần, Môn học, Giáo viên phụ trách (chọn từ danh mục), Học kỳ, Năm học.
* **Tính năng Mapping:** 
  * Chọn nhanh Học sinh theo Lớp (Administrative Class) hoặc chọn lẻ từng Học sinh.
  * Xem/Sửa danh sách Học sinh trong lớp học phần.

### 4.6. Quản lý Ca học
* Quản lý lịch biểu và phiên học của từng Lớp học phần.
* **Trường dữ liệu & Thao tác:**
  * Chọn **Lớp học phần** (từ danh sách đã tạo).
  * **Chế độ nhập:** 
    * *Cá nhân:* Chọn một ngày cụ thể.
    * *Định kỳ (Hàng loạt):* Chọn các thứ trong tuần, chọn khoảng ngày.
  * Thiết lập khung thời gian.
  * **Tự động hóa:** Hệ thống tự động sinh ra danh sách các ca học.

### 4.7. Điểm danh (Tính năng cốt lõi)
* Giao diện chọn ca học cần điểm danh. Khi chọn ca học, hệ thống tự động tải danh sách Học sinh từ **Lớp học phần** tương ứng.
* **Màn hình điểm danh:** Hiển thị dạng lưới hoặc danh sách bao gồm **Ảnh đại diện + Mã HS (ID) + Tên HS**.
* **Thao tác chạm (Tap) thông minh:** Trạng thái mặc định ban đầu của tất cả Học sinh là **Có mặt**.
  * **Tap 1 lần:** Chuyển trạng thái thành **Trễ** (UI màu Vàng/Cam + **Rung nhẹ/Haptic Feedback**).
  * **Tap 2 lần:** Chuyển trạng thái thành **Vắng** (UI màu Đỏ + **Rung mạnh hơn**).
  * **Tap 3 lần:** Trở về trạng thái **Có mặt** (UI màu Xanh + **Rung xác nhận**).

### 4.6. Báo cáo & Đồng bộ dữ liệu
* **Báo cáo điểm danh:**
  * Bộ lọc thông minh: Cho phép lọc theo Môn học, sau đó chọn Lớp học phần, sau đó chọn Ca học cụ thể (hiển thị rõ Thứ, Ngày, Giờ).
  * Hiển thị danh sách kết quả gồm: **Họ tên HS, Mã HS, Trạng thái (Có mặt/Trễ/Vắng), và Ghi chú (nếu có)**.
  * Hỗ trợ chỉnh sửa nhanh trạng thái nếu có sai sót trong quá trình báo cáo.
  * Thống kê rõ ràng trạng thái: Số lượng Có mặt / Trễ / Vắng.
* **Xuất file:**
  * Định dạng hỗ trợ: Excel, CSV, PDF.
  * Tùy chọn lưu file trực tiếp xuống thiết bị hoặc **lưu trực tiếp lên Google Drive**.
* **Đồng bộ hóa (Sync):** 
  * Tính năng chủ động đẩy file backup dữ liệu gốc (`.json`) lên Google Drive và phục hồi khi cần.
  * Tính năng **Xuất/Nhập file JSON thủ công** vào bộ nhớ máy để dự phòng.

### 4.7. Cài đặt hệ thống (Settings)
* Tùy chỉnh giao diện: Chuyển đổi Sáng/Tối (Mặc định: **Tối**).
* Tùy chỉnh hiển thị: Định dạng ngày tháng năm (VD: DD/MM/YYYY hoặc MM/DD/YYYY, định dạng 12h/24h).
* Quản lý mã PIN bảo mật.

---

## 5. Sơ đồ Màn hình (Screen Flow)

1. **Màn hình Khởi động & Đăng nhập:** Yêu cầu nhập mã PIN.
2. **Màn hình Quản lý Lớp:** Danh sách các lớp hành chính.
3. **Màn hình Quản lý Học sinh:** Danh sách Học sinh & Form thêm mới.
4. **Màn hình Quản lý Giáo viên:** Danh sách Giáo viên & Form thêm mới.
5. **Màn hình Quản lý Môn học:** Danh mục các môn học.
6. **Màn hình Quản lý Lớp học phần:** Tạo lớp học phần và Mapping Học sinh + Gán Giáo viên.
7. **Màn hình Quản lý Ca học:** Hiển thị lịch học & Form tạo ca học định kỳ.
8. **Màn hình Điểm danh:** Giao diện thẻ Học sinh.
9. **Màn hình Báo cáo & Lịch sử:** Danh sách đã điểm danh theo ca.
10. **Màn hình Xuất file & Sync:** Kết nối Google Drive.
11. **Màn hình Cài đặt:** Theme, định dạng, bảo mật.
