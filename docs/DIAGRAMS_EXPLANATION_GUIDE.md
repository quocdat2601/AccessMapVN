# CẨM NANG GIẢI THÍCH TOÀN BỘ 18 SƠ ĐỒ TRONG `Diagrams.docx` & HƯỚNG DẪN TRẢ LỜI PHẢN BIỆN ĐỒ ÁN (ACCESSMAP VN)

Tài liệu này phân tích chi tiết toàn bộ **18 sơ đồ (Diagrams)** có trong file [`docs/Diagrams.docx`](file:///c:/QUOC%20DAT/STUDY/CAPSTONE/AccessMapVN/docs/Diagrams.docx), bao gồm:
1. **Ý nghĩa của từng sơ đồ** (Hình đó nói về cái gì? Dùng để chứng minh điều gì với Hội đồng?).
2. **Giải thích từng Thực thể (Entity), Trạng thái (State), Tác nhân (Actor) và Luồng dữ liệu (Data Flow)**.
3. **Câu hỏi Hội đồng thường hỏi ("Tại sao lại vẽ như vậy?") & Kịch bản trả lời chuẩn xác**.

---

## MỤC LỤC NHANH 18 SƠ ĐỒ TRONG `Diagrams.docx`

| STT Ảnh | Tên trong `Diagrams.docx` | Loại sơ đồ | Nội dung chính |
| :--- | :--- | :--- | :--- |
| **Hình 1** | **Figure 1.1** – System context diagram of AccessMap VN | Context Diagram (DFD Mức 0) | Biên giới hệ thống, 3 tác nhân con người và 5 hệ thống bên ngoài |
| **Hình 2** | **Figure 2.1** – Use case diagram of AccessMap VN | Use Case Diagram | Toàn bộ chức năng của `Guest`, `User`, `Admin` và quan hệ `<<include>>` / `<<extend>>` |
| **Hình 3** | **Figure 3.1** – Mobile app screen flow | Screen Flow Diagram | Luồng chuyển màn hình Mobile từ `M-01` đến `M-10` |
| **Hình 4** | **Figure 3.2** – Web Admin Portal screen flow | Screen Flow Diagram | Luồng chuyển màn hình Web Admin từ `A-00` đến `A-08` |
| **Hình 5** | **Figure 3.3** – System Main Entity Relationship Diagram | ERD (23 Entities) | Cấu trúc dữ liệu logic toàn hệ thống với 23 thực thể |
| **Hình 6** | **Figure 5.1** – Submission lifecycle | State Machine Diagram | Vòng đời hồ sơ đóng góp (`Submitted` → `Published` / `Rejected` / `Cancelled`) |
| **Hình 7** | **Figure 5.2** – Dispute case lifecycle | State Machine Diagram | Vòng đời hồ sơ tranh chấp (`Open` → `ResolvedBaseline` / `ResolvedUpdated`) |
| **Hình 8** | **Figure 5.3** – Inaccuracy report lifecycle | State Machine Diagram | Vòng đời báo cáo sai lệch (`Submitted` → `Resolved` / `Rejected`) |
| **Hình 9** | **Figure 5.4** – AI processing job lifecycle | State Machine Diagram | Vòng đời tiến trình chấm điểm AI ngầm (`Queued` → `Succeeded` / `Failed` / `Cancelled`) |
| **Hình 10** | **Figure 5.5** – Community vote lifecycle | State Machine Diagram | Vòng đời phiếu biểu quyết cộng đồng (`Recorded` → `Eligible` / `Superseded` / `Archived`) |
| **Hình 11** | **Figure 5.6** – Reputation source event lifecycle | State Machine Diagram | Vòng đời sự kiện cộng điểm uy tín (`Pending` → `Credited` / `Cancelled`) |
| **Hình 12** | **Figure 5.7** – Coverage report lifecycle | State Machine Diagram | Vòng đời báo cáo độ phủ tiếp cận của Admin (`Requested` → `Exported` → `Archived`) |
| **Hình 13** | **Figure 5.8** – Coverage export lifecycle | State Machine Diagram | Vòng đời tiến trình kết xuất file CSV/PDF/GeoJSON (`Queued` → `Rendering` → `Ready`) |
| **Hình 14** | *(Không đánh số caption)* – AccessMap VN Overall Flow | Activity Diagram (4 Swimlanes) | Luồng hoạt động tổng thể toàn hệ thống xuyên suốt `Guest` – `User` – `Admin` – `System` |
| **Hình 15** | *(Không đánh số caption)* – Contribute and Review Evidence | Activity Diagram (4 Swimlanes) | Luồng đóng góp minh chứng, chấm điểm AI và Admin kiểm duyệt |
| **Hình 16** | *(Không đánh số caption)* – Accessibility Search and Exploration | Activity Diagram (3 Swimlanes) | Luồng tìm kiếm, lọc tiện ích tiếp cận và chuyển đổi từ `Guest` sang `User` |
| **Hình 17** | *(Không đánh số caption)* – Reputation and Contributor Leaderboard | Activity Diagram (3 Swimlanes) | Luồng cộng điểm uy tín tự động (+5 / +2), xem bảng xếp hạng và khiếu nại điểm |
| **Hình 18** | *(Không đánh số caption)* – Community Validation and Reports | Activity Diagram (3 Swimlanes) | Luồng biểu quyết cộng đồng, báo cáo sai lệch, mở tranh chấp và giải quyết |

---

## PHẦN 1: SƠ ĐỒ NGỮ CẢNH & USE CASE (HÌNH 1 & HÌNH 2)

---

### 1. Hình 1 — `Figure 1.1 – System context diagram of AccessMap VN`

#### A. Hình này nói về cái gì?
Đây là **Sơ đồ Ngữ cảnh Hệ thống (System Context Diagram / DFD Level 0)**. Mục đích của sơ đồ là xác định **ranh giới hệ thống (System Boundary)**: coi toàn bộ **AccessMap VN** là 1 vòng tròn trung tâm duy nhất và chỉ ra nó giao tiếp với những ai (Con người) và những dịch vụ bên ngoài nào (External Systems), gửi đi dữ liệu gì và nhận về dữ liệu gì.

#### B. Giải thích từng Thực thể bên ngoài (External Entities – Hình chữ nhật)
Trong hình có **8 thực thể bên ngoài** chia làm 2 nhóm:

**Nhóm 1 – Tác nhân con người (Bên trái):**
1. **`Guest` (Khách vãng lai chưa đăng nhập)**:
   - *Gửi vào hệ thống*: `Search criteria` (Từ khóa tìm kiếm, tọa độ vùng bản đồ, bộ lọc tiện ích tiếp cận).
   - *Nhận từ hệ thống*: `Published place details` (Danh sách địa điểm đạt chuẩn, trạng thái các tiện ích tiếp cận đã được duyệt công bố, hình ảnh minh chứng).
2. **`User` (Người dùng đã đăng nhập / Người đóng góp)**:
   - *Gửi vào hệ thống*: `Evidence, claims, votes and reports` (Ảnh/video minh chứng chụp thực địa, thông số đo đạc QCVN 10:2014, phiếu vote xác nhận/báo thay đổi, báo cáo thông tin sai lệch, bình luận cộng đồng).
   - *Nhận từ hệ thống*: `Submission status and reputation` (Trạng thái duyệt hồ sơ đóng góp, điểm số AI, điểm uy tín và thứ hạng đóng góp).
3. **`Admin` (Quản trị viên / Điều phối viên kiểm duyệt)**:
   - *Gửi vào hệ thống*: `Review decisions and report parameters` (Quyết định Phê duyệt / Từ chối / Yêu cầu bổ sung minh chứng, quyết định phân xử tranh chấp, tham số tạo báo cáo độ phủ).
   - *Nhận từ hệ thống*: `Review cases and coverage reports` (Danh sách hồ sơ chờ duyệt, hồ sơ tranh chấp, báo cáo sai lệch kèm điểm AI và báo cáo thống kê độ phủ).

**Nhóm 2 – Dịch vụ kỹ thuật bên ngoài (Phía trên, bên phải và phía dưới):**
4. **`Map Provider` (Nhà cung cấp bản đồ nền – OpenStreetMap / MapLibre / Carto)**:
   - *Hệ thống gửi*: `Map area parameters` (Tọa độ khung nhìn `bbox`, mức zoom).
   - *Hệ thống nhận*: `Map data` (Vector/Raster map tiles để vẽ bản đồ đường phố).
5. **`Place Provider` (Nhà cung cấp dữ liệu địa điểm bên ngoài – Nominatim / Overpass / Geocoding)**:
   - *Hệ thống gửi*: `Place search criteria` (Tên địa điểm hoặc tọa độ cần tìm).
   - *Hệ thống nhận*: `Place results` (Danh sách địa điểm gợi ý từ bản đồ quốc tế khi trong DB nội bộ chưa có).
6. **`Object Storage` (Hệ thống lưu trữ đối tượng – S3-compatible / RustFS / Supabase Storage)**:
   - *Hệ thống gửi*: `Media data and object identifiers` (File ảnh/video minh chứng và khóa lưu trữ `StorageKey`).
   - *Hệ thống nhận*: `Media objects and operation status` (Pre-signed URL để xem/tải ảnh và trạng thái lưu trữ file).
7. **`Email Provider` & `SMS Provider` (Nhà cung cấp dịch vụ gửi Email / SMS xác thực)**:
   - *Hệ thống gửi*: `Email OTP payload` / `SMS OTP payload` (Nội dung mã xác thực / email xác nhận tài khoản hoặc khôi phục mật khẩu).
   - *Hệ thống nhận*: `Email delivery status` / `SMS delivery status` (Trạng thái gửi thành công hay thất bại).
8. **`Push Notification Provider` (Dịch vụ thông báo đẩy – Firebase Cloud Messaging / FCM)**:
   - *Hệ thống gửi*: `Notification payload` (Thông báo đẩy khi hồ sơ được duyệt, khi Admin yêu cầu bổ sung bằng chứng, hoặc khi có cảnh báo tiếp cận tạm thời).
   - *Hệ thống nhận*: `Push acceptance status` (Kết quả FCM nhận lệnh gửi).

#### C. Câu hỏi Giảng viên hay hỏi ở Hình 1.1 & Cách trả lời
- **Hỏi**: *"Tại sao trong Context Diagram không thấy Database (PostgreSQL) hay AI Service (FastAPI)?"*
  - **Trả lời**: Thưa thầy/cô, theo chuẩn thiết kế DFD Mức 0 (Context Diagram), cả Backend API, Database PostgreSQL/PostGIS và AI Microservice đều nằm **bên trong biên giới nội bộ (System Boundary)** của hệ thống AccessMap VN (nằm gọn trong hình tròn trung tâm). Context Diagram chỉ vẽ các **External Entities** (tác nhân và dịch vụ bên thứ 3 nằm ngoài quyền sở hữu của hệ thống).
- **Hỏi**: *"Tại sao phải tách `Map Provider` và `Place Provider` thành 2 ô riêng?"*
  - **Trả lời**: Vì theo quy tắc vẽ Context Diagram, mỗi thực thể ngoài phải đại diện cho một vai trò độc lập và không được gộp chung 2 thực thể (`Map Provider` chuyên trả về bản đồ nền Map Tiles để hiển thị thị giác, còn `Place Provider` chuyên về Geocoding / tìm kiếm thông tin tọa độ và tên địa điểm).

---

### 2. Hình 2 — `Figure 2.1 – Use case diagram of AccessMap VN`

#### A. Hình này nói về cái gì?
Sơ đồ tổng hợp toàn bộ các **ca sử dụng (Use Cases)** của hệ thống, phân quyền rõ ràng theo **3 tác nhân (`Guest`, `User`, `Admin`)** và thể hiện mối quan hệ phụ thuộc bắt buộc (`<<include>>`) hoặc mở rộng có điều kiện (`<<extend>>`).

#### B. Giải thích 3 nhóm màu Use Case trong hình
1. **Nhóm màu xanh dương (`Guest` – Khách vãng lai)**:
   - `Register account` ──`<<include>>`──> `Verify registration OTP`: Đăng ký tài khoản kèm bước xác thực.
   - `Sign in to mobile`: Đăng nhập vào ứng dụng Mobile.
   - `Search / discover accessible places`, `Browse published map layers`, `View published place facts and evidence`: Cho phép người khuyết tật tra cứu địa điểm và xem bằng chứng tiếp cận ngay lập tức **không cần đăng nhập** (giảm rào cản tiếp cận khẩn cấp).
2. **Nhóm màu xanh lá (`User` – Người dùng đã đăng nhập)**:
   - Kế thừa các chức năng tra cứu của `Guest` và mở khóa thêm các nhóm chức năng:
   - **Cá nhân hóa**: `Manage saved accessibility needs` (Lưu nhu cầu tiếp cận cá nhân), `Manage favorites` (Lưu địa điểm yêu thích), `View / clear recent places on device`.
   - **Đóng góp dữ liệu mới (Contribution Flow)**:
     - `Find / select a place for contribution` ←──`<<extend>> [few local results]`── `Search external place candidates` (Nếu tìm trong DB nội bộ ít kết quả thì mở rộng tìm trên bản đồ ngoài).
     - `Prepare contribution evidence` ──`<<include>>`──> `Upload owned photo / video evidence` và `Run pre-submit quality check` (Bắt buộc kiểm tra độ mờ/sáng/khuôn mặt trước khi gửi).
     - `Submit accessibility evidence and claims` ──`<<include>>`──> `Validate submitted evidence and ownership` & `Resolve Location and access scope`.
     - `Track own submissions and outcomes` ←──`<<extend>>`── `Resubmit corrected evidence` / `Cancel an actionable correction request` (Khi Admin yêu cầu bổ sung ảnh, người dùng có thể gửi lại ảnh mới hoặc hủy).
   - **Xác thực cộng đồng & Báo cáo (Community Validation Flow)**:
     - `Reconfirm a published feature` (Vote "Vẫn chính xác"), `Report a changed / blocked feature` (Vote "Đã thay đổi"), `Report inaccurate information` (Gửi báo cáo sai lệch), `Track / supplement own report` (Theo dõi và bổ sung bằng chứng cho báo cáo), `Post a community comment` (Đăng bình luận cộng đồng).
   - **Uy tín & Xếp hạng**: `View own reputation and rank`, `View contributor leaderboard`.
3. **Nhóm màu cam (`Admin` – Quản trị viên trên Web Admin)**:
   - **Kiểm duyệt đóng góp**: `Review submissions and private evidence` ←──`<<extend>>`── `Approve selected evidence-backed claims` (──`<<include>>`──> `Publish approved scoped features`), `Request more evidence`, `Reject a submission`.
   - **Xử lý sự cố AI**: `Retry a recoverable failed AI job`.
   - **Kiểm duyệt cộng đồng**: `Review / resolve inaccuracy reports`, `Review / resolve community disputes` (←──`<<extend>> [temporary limit]`── `Manage temporary access advisories` – gắn biển cảnh báo tạm thời khi công trình đang sửa chữa), `Moderate community comments`.
   - **Quản trị địa điểm & dữ liệu**: `Correct place metadata`, `Review scope / entrance metadata`, `Merge duplicate Locations` (──`<<include>>`──> `Preview merge impact and resolve conflicts`).
   - **Quản trị uy tín & báo cáo độ phủ**: `Review reputation adjustments`, `Generate coverage report`, `Preview coverage metrics and warnings`, `Approve coverage report snapshot`, `Request coverage export` (──`<<include>>`──> `Select export format CSV / PDF / GeoJSON`), `Download a ready report export`, `Record manual partner sharing`.

---

## PHẦN 2: SƠ ĐỒ LUỒNG MÀN HÌNH – SCREEN FLOW (HÌNH 3 & HÌNH 4)

---

### 3. Hình 3 — `Figure 3.1 – Mobile Application Screen Flow`

#### A. Hình này nói về cái gì?
Mô tả luồng điều hướng (Navigation Flow) giữa **10 màn hình chính (`M-01` đến `M-10`)** và các hộp thoại (`Dialog` / `Alert` / `Modal` vẽ bằng hình elip) trên ứng dụng di động React Native Expo.

#### B. Giải thích từng màn hình trong Hình 3.1
- **`M-01 Intro`**: Màn hình giới thiệu (Onboarding) khi mở app. Chuyển tiếp sang `M-02 Login & Register`.
- **`M-02 Login & Register`**: Màn hình đăng nhập / đăng ký qua Supabase Auth. Có 2 nhánh phụ nét đứt:
  - `Reset Password Dialog`: Hộp thoại gửi email đặt lại mật khẩu.
  - `Confirm Email Alert`: Thông báo nhắc xác nhận email sau khi đăng ký.
- **`M-03 Discovery Map & Search (Home Hub)`**: Màn hình trung tâm của ứng dụng. Hiển thị bản đồ tiếp cận, thanh tìm kiếm, bộ lọc danh mục.
- **`M-04 Location Detail Sheet`**: Bottom Sheet chi tiết địa điểm khi người dùng bấm vào 1 ghim trên `M-03`. Gồm 3 phần:
  - `Accessibility Summary`: Nhãn tổng quan mức độ tiếp cận cho xe lăn.
  - `Published Features & Evidence`: Danh sách 4 hạng mục tiếp cận (Ram dốc, Cửa chính, Thang máy, WC tiếp cận), trạng thái cộng đồng, hình ảnh minh chứng và nhận xét cộng đồng.
  - `Actions: Contribute / Report`: 2 nút hành động chính dẫn sang 2 nhánh:
- **Nhánh trái – Luồng Đóng góp (`M-05` → `M-08`)**:
  - **`M-05 Capture Media`**: Chụp tối đa 3 ảnh thực địa (kiểm tra độ mờ/sáng/làm mờ mặt tại chỗ + lấy tọa độ GPS). Từ đây rẽ 2 nhánh:
  - **`M-06 Tag Review`** *(photo mode)*: Gắn thẻ tiêu chuẩn QCVN 10:2014 cho từng hạng mục, nhập mô tả và số đo (độ rộng cửa, độ dốc ram).
  - **`M-07 Video Preview`** *(video mode)*: Quay và xem lại video ngắn 5–10 giây thực địa.
  - **`M-08 Scorecard & Submit`**: Hiển thị bảng điểm ma trận xác thực AI (Computer Vision + NLP Text + GPS Spatial Proximity) và trạng thái định tuyến dự kiến, sau đó gửi hồ sơ và quay về `M-03 (Home Hub)`.
- **Nhánh phải – Luồng Báo cáo sai lệch (`Report Form Modal` → `M-09` → `M-10`)**:
  - **`Report Form Modal`**: Modal gửi báo cáo thông tin sai lệch ngay trên trang chi tiết địa điểm.
  - **`M-09 My Reports`**: Danh sách các báo cáo sai lệch người dùng đã gửi kèm trạng thái xử lý.
  - **`M-10 Report Detail`**: Chi tiết tiến độ xử lý của một báo cáo, lịch sử phản hồi của Admin và chức năng đính kèm thêm ảnh minh chứng.

---

### 4. Hình 4 — `Figure 3.2 – Web Admin Portal Screen Flow`

#### A. Hình này nói về cái gì?
Mô tả cấu trúc điều hướng của cổng quản trị Web Admin (Next.js) từ màn hình đăng nhập `A-00` vào trang tổng quan `A-01` và tỏa ra **4 phân hệ kiểm duyệt chuyên biệt (`A-02` đến `A-08`)**.

#### B. Giải thích từng màn hình trong Hình 3.2
- **`A-00 Admin Login`**: Màn hình đăng nhập dành riêng cho tài khoản có quyền quản trị (`Admin`).
- **`A-01 Dashboard Overview (Admin Hub)`**: Trang trung tâm điều hành hiển thị các thẻ KPI (tổng số hồ sơ, tỷ lệ tự động duyệt, tranh chấp đang mở) và điều hướng sang 4 nhánh:
  1. **Nhánh Kiểm duyệt Đóng góp (`A-02` → `A-03`)**:
     - **`A-02 Contribution Queue`**: Hàng đợi hồ sơ đóng góp mới từ người dùng (kèm bộ lọc trạng thái và SLA xử lý 120 phút).
     - **`A-03 Contribution Review`**: Chi tiết hồ sơ đóng góp gồm `Claims & AI Scores` (Điểm AI Vision/NLP), `Evidence & GPS Result` (Ảnh thực địa & khoảng cách GPS), và `Actions: Approve / Reject` (Duyệt công bố / Từ chối / Yêu cầu bổ sung).
  2. **Nhánh Xử lý Tranh chấp (`A-04` → `A-05`)**:
     - **`A-04 Disputes Queue`**: Hàng đợi các vụ tranh chấp khi có nhiều người dùng vote mâu thuẫn với dữ liệu đang công bố.
     - **`A-05 Dispute Detail`**: Trang đối chiếu tranh chấp gồm `Feature History & Votes` (Lịch sử công bố gốc đối chiếu với danh sách phiếu vote và báo cáo mâu thuẫn) và `Resolution & Advisory` (Giữ nguyên bản gốc, Ghi nhận bản đính chính mới, hoặc Phát hành cảnh báo tạm thời).
  3. **Nhánh Báo cáo Sai lệch (`A-06` → `A-07`)**:
     - **`A-06 Inaccuracy Reports`**: Hàng đợi các báo cáo sai lệch thông tin địa điểm/tiện ích.
     - **`A-07 Report Detail`**: Xem `Report & User Evidence` (Nội dung báo cáo & ảnh bằng chứng riêng tư) và `Metadata Correction Pin` (Sửa trực tiếp địa chỉ/tọa độ/tên địa điểm hoặc yêu cầu người báo cáo gửi thêm bằng chứng).
  4. **Nhánh Kiểm duyệt Bình luận (`A-08`)**:
     - **`A-08 Comment Moderation`**: Hàng đợi kiểm duyệt bình luận cộng đồng ngay trên một màn hình (`Inline Moderation: Approve / Hide`).

---

## PHẦN 3: PHÂN TÍCH CHI TIẾT 23 THỰC THỂ TRONG `Figure 3.3 – Main ERD` (HÌNH 5)

### 5. Hình 5 — `Figure 3.3 – System Main Entity Relationship Diagram`

#### A. Hình này nói về cái gì?
Đây là **Sơ đồ Thực thể Liên kết المức Logic (Logical Domain ERD)** của toàn bộ hệ thống AccessMap VN, gồm **23 thực thể (Entities)** được kết nối bằng ký hiệu chân chim (Crow's Foot Notation).
Để dễ nhớ và trả lời hội đồng, bạn hãy chia 23 thực thể này thành **5 cụm nghiệp vụ cốt lõi**:

---

#### Cụm 1: Thực thể Lõi về Người dùng & Địa điểm (Core User & Location – 5 Entities)

| STT | Tên Entity trên ERD | Ý nghĩa & Vai trò trong hệ thống | Quan hệ chính |
| :--- | :--- | :--- | :--- |
| 1 | **`USER`** | Lưu hồ sơ người dùng trong hệ thống (đồng bộ với UUID `sub` của Supabase Auth), bao gồm tên hiển thị, vai trò (`User` / `Admin`), trạng thái hoạt động và điểm uy tín. | `1-N` với `SUBMISSION`, `COMMUNITY_VOTE`, `INACCURATE_INFORMATION_REPORT`, `COMMUNITY_COMMENT`, `FAVORITE_LOCATION`. |
| 2 | **`ACCESSIBILITY_PREFERENCE`** | Lưu cấu hình nhu cầu tiếp cận cá nhân của người dùng (ví dụ: dùng xe lăn tay, xe lăn điện, cần ram dốc, cần WC tiếp cận) để cá nhân hóa bộ lọc tìm kiếm. | Quan hệ `1-1` (hoặc `1-N`) với `USER`. |
| 3 | **`FAVORITE_LOCATION`** | Bảng trung gian lưu danh sách các địa điểm yêu thích mà người dùng đã đánh dấu (Bookmark) để tra cứu nhanh. | Nối giữa `USER` và `LOCATION` (`N-1` với `USER`, `N-1` với `LOCATION`). |
| 4 | **`LOCATION`** | Thực thể trung tâm lưu thông tin địa điểm (Tên, địa chỉ, danh mục, tọa độ địa lý PostGIS `lat/lng`, điểm tiếp cận tổng hợp, trạng thái `Active` / `Merged`). Hỗ trợ gộp địa điểm trùng qua khóa tự tham chiếu (Self-referencing FK). | `1-N` với `ACCESS_SCOPE`, `LOCATION_FEATURE`, `SUBMISSION`, `COMMUNITY_COMMENT`. |
| 5 | **`ACCESS_SCOPE`** | Lưu "Phạm vi lối tiếp cận" bên trong một địa điểm lớn (ví dụ: *Cổng chính đường Pasteur*, *Sảnh khu B*). Giúp phân biệt trường hợp một tòa nhà có nhiều cổng với mức độ tiếp cận khác nhau. | `N-1` với `LOCATION`; `1-N` với `LOCATION_FEATURE` và `SUBMISSION_CLAIM`. |

---

#### Cụm 2: Thực thể Đóng góp & Xác thực AI (Contribution & AI Verification – 8 Entities)

| STT | Tên Entity trên ERD | Ý nghĩa & Vai trò trong hệ thống | Quan hệ chính |
| :--- | :--- | :--- | :--- |
| 6 | **`SUBMISSION`** | Hồ sơ đóng góp thông tin tiếp cận do người dùng gửi lên từ hiện trường (chứa mã hồ sơ, tọa độ GPS lúc chụp, trạng thái vòng đời `Submitted` → `Published`/`Rejected`). | `N-1` với `USER` và `LOCATION`; `1-N` với `SUBMISSION_MEDIA`, `SUBMISSION_CLAIM`, `AI_ANALYSIS`, `MODERATION_REVIEW`. |
| 7 | **`SUBMISSION_MEDIA`** | Lưu thông tin từng file ảnh hoặc video minh chứng thuộc về một `SUBMISSION` (đường dẫn S3 `StorageKey`, loại MIME, dung lượng, mã băm SHA-256 chống giả mạo). | `N-1` với `SUBMISSION`. |
| 8 | **`SUBMISSION_CLAIM`** | Từng "khẳng định tiếp cận" cụ thể bên trong một hồ sơ đóng góp (ví dụ: Hồ sơ #1 khẳng định *Ram dốc = Có*, *Cửa = Rộng rãi*, kèm điểm tự tin `AiConfidence` và `FinalConfidence`). | `N-1` với `SUBMISSION`, `LOCATION`, `ACCESS_SCOPE`. |
| 9 | **`QCVN_CRITERION_EVIDENCE`** | Lưu các thông số đo đạc và tiêu chí kỹ thuật theo quy chuẩn **QCVN 10:2014/BXD** (như độ rộng thông thủy cửa $\ge 90\text{cm}$, độ dốc ram $\le 1/12$, tay vịn). | Gắn với `SUBMISSION` / `SUBMISSION_CLAIM`. |
| 10 | **`SURROUNDING_OBSERVATION`** | Lưu ghi nhận về hạ tầng xung quanh lối vào địa điểm (vỉa hè, gờ hạ cốt, điểm đỗ xe tiếp cận). | Gắn với `SUBMISSION` và `LOCATION`. |
| 11 | **`AI_ANALYSIS`** | Kết quả phân tích tổng hợp của dịch vụ AI (Vision 60% + NLP 40% + GPS Proximity) cho một hồ sơ đóng góp, lưu điểm số từng trụ cột và quyết định định tuyến tự động. | `N-1` (hoặc `1-1` theo từng lần chạy) với `SUBMISSION`. |
| 12 | **`AI_SUGGESTION`** | Các gợi ý nhận diện tự động do AI sinh ra từ ảnh chụp (ví dụ: AI phát hiện có bậc tam cấp hoặc gợi ý thẻ `has_ramp`) để hỗ trợ người dùng gắn thẻ và hỗ trợ Admin đối chiếu. | Liên kết với `SUBMISSION` / `AI_ANALYSIS`. |
| 13 | **`RESUBMISSION`** | Lưu vết các lần người dùng gửi bổ sung/chụp lại bằng chứng mới khi hồ sơ đang ở trạng thái `AwaitingMoreInfo` mà không làm mất lịch sử bằng chứng cũ. | Liên kết với `SUBMISSION` và `USER`. |
| 14 | **`MODERATION_REVIEW`** | Lưu nhật ký quyết định kiểm duyệt của Admin đối với một `SUBMISSION` (Ai duyệt, duyệt lúc nào, hành động `Approve` / `Reject` / `RequestMoreInfo`, lý do). | `N-1` với `SUBMISSION` và `USER` (Admin). |

---

#### Cụm 3: Thực thể Tiện ích Công bố, Biểu quyết Cộng đồng & Tranh chấp (Community Validation & Dispute – 6 Entities)

| STT | Tên Entity trên ERD | Ý nghĩa & Vai trò trong hệ thống | Quan hệ chính |
| :--- | :--- | :--- | :--- |
| 15 | **`LOCATION_FEATURE`** | **Sự thật đã công bố (Published Truth)** của từng hạng mục tiếp cận tại một địa điểm (Ram dốc, Cửa vào, Thang máy, WC tiếp cận) cùng số phiên bản `Version` tăng dần. Chỉ được cập nhật khi có một `SUBMISSION` được duyệt công bố. | `N-1` với `LOCATION` và `ACCESS_SCOPE`; `1-1` với `FEATURE_COMMUNITY_STATE`; `1-N` với `COMMUNITY_VOTE` và `DISPUTE_CASE`. |
| 16 | **`FEATURE_COMMUNITY_STATE`** | Bảng chiếu (Read-model Projection) lưu trạng thái đồng thuận hiện tại của cộng đồng cho 1 `LOCATION_FEATURE` (Nhãn `Fresh`, `Reinforced`, `NeedsRecheck`, `ConflictReported`, `CommunityUnderReview`, tỷ lệ đồng thuận có trọng số `WeightedAgreement`, hệ số độ mới `FreshnessFactor`). | `1-1` với `LOCATION_FEATURE`. |
| 17 | **`COMMUNITY_VOTE`** | Phiếu biểu quyết nhanh của người dùng tại thực địa đối với một phiên bản `LOCATION_FEATURE` (`StillAccurate` – Vẫn đúng, hoặc `Changed` – Đã thay đổi/bị chặn), kèm snapshot điểm uy tín của người vote tại thời điểm vote. | `N-1` với `LOCATION_FEATURE` và `USER`. |
| 18 | **`COMMUNITY_ASSESSMENT`** | Bản ghi lịch sử mỗi lần hệ thống tính toán lại điểm đồng thuận cộng đồng (snapshot kết quả tính toán theo thời gian thực để phục vụ kiểm toán/audit). | `N-1` với `LOCATION_FEATURE`. |
| 19 | **`DISPUTE_CASE`** | Hồ sơ vụ việc tranh chấp được hệ thống mở tự động khi có từ 2 phiếu `COMMUNITY_VOTE` độc lập trở lên phản ánh tiện ích đã thay đổi/mâu thuẫn với trạng thái công bố hiện tại. | `N-1` với `LOCATION_FEATURE`; `1-N` với `DISPUTE_DECISION` và `TEMPORARY_ACCESS_ADVISORY`. |
| 20 | **`DISPUTE_DECISION`** | Quyết định phân xử của Admin cho một `DISPUTE_CASE` (`RetainBaseline` – Giữ nguyên bản gốc, `RecordPublication` – Cập nhật theo hồ sơ đính chính mới, `IssueTemporaryAdvisory` – Phát hành cảnh báo tạm thời). | `N-1` với `DISPUTE_CASE` và `USER` (Moderator). |
| 21 | **`TEMPORARY_ACCESS_ADVISORY`** | Biển cảnh báo tiếp cận tạm thời (ví dụ: *"Thang máy đang bảo trì từ 01/11 đến 15/11"*) có ngày bắt đầu và ngày hết hạn tự động, giúp cảnh báo người khuyết tật ngay lập tức mà không cần xóa bỏ trạng thái gốc của tiện ích. | `N-1` với `LOCATION_FEATURE` và `DISPUTE_CASE`. |

---

#### Cụm 4: Thực thể Báo cáo Sai lệch & Bình luận Cộng đồng (Reports & Comments – 2 Entities)

| STT | Tên Entity trên ERD | Ý nghĩa & Vai trò trong hệ thống | Quan hệ chính |
| :--- | :--- | :--- | :--- |
| 22 | **`INACCURATE_INFORMATION_REPORT`** | Báo cáo chi tiết của người dùng khi phát hiện thông tin sai lệch (sai địa chỉ, sai vị trí ghim, địa điểm đã đóng cửa, hoặc sai trạng thái tiện ích), hỗ trợ đính kèm bằng chứng và liên kết sang `DISPUTE_CASE` hoặc `SUBMISSION`. | `N-1` với `LOCATION`, `USER`, `DISPUTE_CASE`, `SUBMISSION`. |
| 23 | **`COMMUNITY_COMMENT`** | Bình luận chia sẻ kinh nghiệm thực tế của cộng đồng tại một địa điểm (tối đa 2.000 ký tự, kiểm duyệt qua trạng thái `PendingReview` → `Approved` / `Hidden`). | `N-1` với `LOCATION` và `USER`. |

---

#### Cụm 5: Thực thể Uy tín Người đóng góp & Báo cáo Độ phủ (Reputation & Coverage Analytics – 5 Entities)

| STT | Tên Entity trên ERD | Ý nghĩa & Vai trò trong hệ thống | Quan hệ chính |
| :--- | :--- | :--- | :--- |
| 24 | **`REPUTATION_EVENT`** | Sự kiện phát sinh điểm uy tín (ví dụ: khi một `SUBMISSION` được duyệt công bố lần đầu hoặc cập nhật hợp lệ). Quản lý trạng thái xét duyệt cộng điểm (`Pending` → `Credited` / `Cancelled`). | Liên kết với `USER` và `SUBMISSION`. |
| 25 | **`REPUTATION_LEDGER_ENTRY`** | Sổ cái bất biến (Immutable Ledger) ghi nhận từng giao dịch cộng/trừ điểm uy tín (+5 điểm cho đóng góp mới được duyệt, +2 điểm cho cập nhật được duyệt, hoặc điều chỉnh từ Admin). | `N-1` với `USER` và `REPUTATION_EVENT`. |
| 26 | **`REPUTATION_ACCOUNT_SNAPSHOT`** | Bản chụp tổng điểm uy tín, hạng thành viên (`Tier`) và thứ hạng Leaderboard của người dùng tại từng thời điểm để truy vấn nhanh mà không cần cộng dồn lại toàn bộ sổ cái. | `N-1` (hoặc `1-1`) với `USER`. |
| 27 | **`COVERAGE_REPORT_REQUEST`** | Yêu cầu tổng hợp báo cáo thống kê độ phủ tiếp cận theo khu vực địa lý / quận huyện / danh mục do Admin khởi tạo. | `N-1` với `USER` (Admin); `1-N` với `COVERAGE_REPORT_METRIC`. |
| 28 | **`COVERAGE_REPORT_METRIC`** | Các chỉ số thống kê chi tiết (số địa điểm đạt chuẩn, tỷ lệ từng hạng mục ram dốc/thang máy/WC, vùng trắng dữ liệu) thuộc về một `COVERAGE_REPORT_REQUEST`. | `N-1` với `COVERAGE_REPORT_REQUEST`. |

*(Lưu ý: Tổng cộng trên hình `Figure 3.3` có đúng **25 khối chữ nhật** đại diện cho 25 thực thể miền nghiệp vụ).*

#### B. Câu hỏi "Sát thủ" của Hội đồng về Hình 3.3 (ERD) & Cách trả lời
- **Hỏi**: *"Tại sao trên hình ERD (Figure 3.3) có các bảng như `QCVN_CRITERION_EVIDENCE`, `AI_SUGGESTION`, `AI_ANALYSIS`, nhưng trong Database vật lý (Physical Schema) một số thông tin này lại nằm trong cột `JSONB` của bảng `submissions`?"*
  - **Trả lời**: Thưa thầy/cô, Figure 3.3 thể hiện **Conceptual/Logical Domain Model** để làm rõ đầy đủ các khái niệm nghiệp vụ và mối quan hệ giữa Hồ sơ đóng góp (`SUBMISSION`), Tiêu chí QCVN (`QCVN_CRITERION_EVIDENCE`) và Kết quả AI (`AI_ANALYSIS`). Khi chuyển sang **Physical Database Design** trên PostgreSQL, nhóm đã áp dụng kỹ thuật **Denormalization có kiểm soát bằng kiểu dữ liệu `JSONB`** cho kết quả phân tích AI và tiêu chí QCVN bên trong bảng `submissions` (đồng thời vẫn giữ các bảng chuẩn hóa riêng cho `submission_claims`, `location_features`, `community_votes`, `dispute_cases`). Cách làm này giúp:
    1. Đọc/ghi toàn bộ kết quả chấm điểm AI của 1 lần nộp hồ sơ trong 1 thao tác nguyên tử (Atomic Transaction), không tốn nhiều phép `JOIN` nặng.
    2. Linh hoạt mở rộng thêm tiêu chí QCVN hoặc chỉ số AI mới mà không làm đứt gãy schema.

---

## PHẦN 4: 8 SƠ ĐỒ VÒNG ĐỜI TRẠNG THÁI – STATE MACHINE LIFECYCLES (HÌNH 6 ĐẾN HÌNH 13)

Các hình từ **Figure 5.1 đến Figure 5.8** là **UML State Machine Diagrams** biểu diễn quy tắc chuyển trạng thái nghiêm ngặt ở tầng Backend. Hội đồng rất thích hỏi phần này để kiểm tra xem sinh viên có hiểu logic nghiệp vụ không.

---

### 6. Hình 6 — `Figure 5.1 – Submission lifecycle` (Vòng đời Hồ sơ đóng góp)
- **Mục đích**: Kiểm soát một hồ sơ đóng góp từ lúc người dùng bấm Gửi cho đến khi được công bố lên bản đồ hoặc bị từ chối.
- **Các trạng thái & Luồng chuyển**:
  1. **`Submitted`** *(Khởi tạo)*: Người dùng vừa gửi hồ sơ từ màn hình `M-08`.
  2. **`AIProcessing`**: Hệ thống bắt đầu chạy pipeline xác thực AI (`Begin verification`).
     - Nếu AI phát hiện thiếu bằng chứng hoặc ảnh chưa đạt và người dùng **vẫn còn lượt sửa** (`Evidence gap [corrections remain]`) → chuyển sang **`AwaitingMoreInfo`**.
     - Nếu đủ điều kiện kiểm duyệt → chuyển sang **`PendingModeration`** (`Send for Admin review`).
  3. **`AwaitingMoreInfo`**: Chờ người dùng bổ sung/chụp lại bằng chứng:
     - Nếu người dùng hủy (`User cancels`) → **`Cancelled`** *(Kết thúc)*.
     - Nếu người dùng gửi lại nhiều lần chạm ngưỡng giới hạn (`Refer to Admin [limit reached]`) → chuyển sang **`PendingModeration`** để Admin quyết định.
  4. **`PendingModeration`**: Hồ sơ nằm trong hàng đợi `A-02` của Admin:
     - Admin yêu cầu bổ sung thêm bằng chứng (`Request evidence [corrections remain]`) → quay về **`AwaitingMoreInfo`**.
     - Admin phê duyệt (`Admin approves`) → **`Published`** *(Kết thúc – tạo phiên bản `LocationFeature` mới và cộng điểm uy tín)*.
     - Admin từ chối (`Admin rejects`) → **`Rejected`** *(Kết thúc)*.
- **Ghi chú quan trọng ở đáy hình**: *"Resubmission creates a new attempt; previous evidence stays unchanged"* — Khi gửi lại bằng chứng, hệ thống tạo lượt thử mới chứ không xóa đè bằng chứng cũ để đảm bảo tính kiểm toán (Audit Trail).

---

### 7. Hình 7 — `Figure 5.2 – Dispute case lifecycle` (Vòng đời Hồ sơ tranh chấp tiện ích)
- **Mục đích**: Xử lý trường hợp cộng đồng gửi từ $\ge 2$ phiếu biểu quyết mâu thuẫn với trạng thái tiện ích đang công bố.
- **Các trạng thái & Luồng chuyển**:
  1. **`Open`**: Hệ thống tự động mở vụ tranh chấp khi phát hiện xung đột (`Conflict identified`).
     - Từ `Open`, Admin có thể giữ nguyên ngay dữ liệu gốc (`Retain baseline`) → **`ResolvedBaseline`**, yêu cầu thêm bằng chứng (`Request evidence`) → **`AwaitingMoreInfo`**, liên kết hồ sơ đính chính (`Link correction`) → **`CorrectionPending`**, hoặc bắt đầu xem xét (`Admin starts review`) → **`UnderReview`**.
  2. **`UnderReview`**: Admin đang đối chiếu lịch sử công bố và các phiếu vote trên màn hình `A-05`:
     - Có thể chuyển qua lại với **`AwaitingMoreInfo`** (khi cần chờ thêm bằng chứng) hoặc **`CorrectionPending`** (khi chờ một hồ sơ đóng góp đính chính `Submission` được duyệt).
  3. **2 Trạng thái kết thúc (Terminal States)**:
     - **`ResolvedBaseline`**: Kết luận dữ liệu đang công bố trên bản đồ vẫn đúng (`Retain baseline` / `Retain current facts`).
     - **`ResolvedUpdated`**: Kết luận phản ánh của cộng đồng là đúng và đã công bố bản cập nhật mới (`Correction published`).

---

### 8. Hình 8 — `Figure 5.3 – Inaccuracy report lifecycle` (Vòng đời Báo cáo thông tin sai lệch)
- **Mục đích**: Quản lý các báo cáo sai lệch thông tin địa điểm (sai địa chỉ, đóng cửa, sai tiện ích) do người dùng gửi từ `Report Form Modal`.
- **Các trạng thái & Luồng chuyển**:
  1. **`Submitted`**: Người dùng gửi báo cáo (`User submits report`). Nếu báo cáo spam/rác, Admin có thể từ chối ngay (`Admin rejects`) → **`Rejected`**.
  2. **`UnderReview`**: Admin mở xem xét trên màn hình `A-07` (`Admin starts review`):
     - Nếu thiếu ảnh chứng minh → chuyển sang **`AwaitingMoreInfo`** (`Request supplement`). Khi người dùng gửi thêm ảnh (`Supplement / reopen`) → quay lại **`UnderReview`**. Nếu quá hạn hoặc không hợp lệ → **`Rejected`** (`Reject with reason`).
     - Nếu báo cáo này liên quan trực tiếp đến một vụ tranh chấp tiện ích đang mở → chuyển sang **`LinkedToDispute`** (`Link dispute`). Khi vụ tranh chấp đó được giải quyết xong (`Linked outcome confirmed`) → **`Resolved`**.
     - Nếu Admin xử lý trực tiếp (ví dụ sửa lại địa chỉ/ghim bản đồ) → **`Resolved`** (`Resolve`), hoặc bác bỏ → **`Rejected`** (`Reject`).

---

### 9. Hình 9 — `Figure 5.4 – AI processing job lifecycle` (Vòng đời Tiến trình xử lý AI)
- **Mục đích**: Mô tả cơ chế chịu lỗi (Fault-tolerance & Retry) của worker chấm điểm AI bất đồng bộ (Hangfire / Background Worker).
- **Các trạng thái & Luồng chuyển**:
  1. **`Queued`**: Yêu cầu chấm điểm AI được đưa vào hàng đợi (`Verification requested`).
  2. **`Processing`**: Worker bắt đầu xử lý (`Start attempt [attempts remain]`).
  3. **`RetryScheduled`**: Nếu gặp lỗi mạng tạm thời hoặc timeout mà vẫn còn số lần thử (`Retryable failure [attempts remain]`, tối đa 3 lần), job chuyển sang chờ thử lại (`Retry due` → quay về `Processing`).
  4. **3 Trạng thái kết thúc**:
     - **`Succeeded`**: Phân tích Vision + NLP + GPS hoàn tất (`Analysis completed`).
     - **`Failed`**: Lỗi không thể phục hồi (`Cannot complete`) hoặc đã hết sạch số lần thử lại (`Attempts exhausted`).
     - **`Cancelled`**: Hồ sơ gốc bị hủy hoặc không còn hợp lệ (`Submission ineligible`).

---

### 10. Hình 10 — `Figure 5.5 – Community vote lifecycle` (Vòng đời Phiếu biểu quyết cộng đồng)
- **Mục đích**: Đảm bảo mỗi người dùng chỉ có **1 phiếu có hiệu lực** trên cùng 1 phiên bản tiện ích (`ObservedFeatureVersion`), chống spam vote.
- **Các trạng thái & Luồng chuyển**:
  1. **`Recorded`** (hoặc vào thẳng **`PendingValidation`** nếu tài khoản mới cần kiểm tra `Held for validation`): Phiếu vote vừa được ghi nhận.
  2. **`PendingValidation`**: Phiếu đang chờ xác minh thêm bằng chứng hoặc chờ Admin duyệt:
     - Nếu Admin duyệt (`Admin accepts`) hoặc hệ thống xác nhận hợp lệ (`System revalidates [eligible]`) → **`Eligible`**.
     - Nếu Admin từ chối (`Admin rejects`) → **`Rejected`**.
  3. **`Eligible`**: Phiếu hợp lệ và **được tính vào công thức đồng thuận cộng đồng** (`WeightedAgreement`).
  4. **`Superseded`** *(Bị thay thế)*: Khi chính người dùng đó bầu lại một phiếu mới hơn trên cùng phiên bản tiện ích (`New observation` / `Newer observation` / `Observation replaced`), phiếu cũ lập tức chuyển sang `Superseded` để không bị tính trùng 2 lần.
  5. **`Archived`** *(Lưu trữ)*: Khi tiện ích được công bố sang phiên bản mới (`Version + 1`, `Published feature replaced`), toàn bộ các phiếu `Eligible` của phiên bản cũ được chuyển vào `Archived`.

---

### 11. Hình 11 — `Figure 5.6 – Reputation source event lifecycle` (Vòng đời Sự kiện cộng điểm uy tín)
- **Mục đích**: Chống gian lận điểm uy tín (Farming EXP) — chỉ cộng điểm khi đóng góp thực sự được công bố (`Published`) và đủ điều kiện.
- **Các trạng thái & Luồng chuyển**:
  1. **`Pending`**: Được kích hoạt khi một đóng góp được duyệt công bố (`Approved contribution published`).
  2. **`HeldForReview`**: Nếu hệ thống phát hiện dấu hiệu bất thường cần Admin kiểm tra (`Eligibility needs review`).
  3. **`Credited`**: Điểm uy tín chính thức được ghi vào sổ cái `REPUTATION_LEDGER_ENTRY` (`Eligible credit applied` hoặc `Review confirms eligibility`).
  4. **`Cancelled`**: Không được cộng điểm do trùng lặp hoặc vi phạm quy tắc (`Source ineligible` / `Review finds ineligible`).

---

### 12. Hình 12 & Hình 13 — `Figure 5.7 – Coverage report lifecycle` & `Figure 5.8 – Coverage export lifecycle`
- **Hình 12 (`Figure 5.7 – Coverage report`)**: Vòng đời tạo báo cáo thống kê độ phủ tiếp cận cho nhà quản lý đô thị/đối tác:
  - `Requested` (Admin yêu cầu) → `Aggregating` (Đang tổng hợp dữ liệu không gian) → `Generated` (Đã tính xong chỉ số) → `Reviewed` (Admin kiểm tra và duyệt snapshot) → `Exported` (Đã xuất file lần đầu) → `SharedRecorded` (Ghi nhận đã chia sẻ cho đối tác) → `Archived` (Lưu trữ khi hết thời hạn lưu hành).
- **Hình 13 (`Figure 5.8 – Coverage export`)**: Tiến trình kỹ thuật kết xuất báo cáo ra file `CSV / PDF / GeoJSON`:
  - `Queued` (Đưa vào hàng đợi kết xuất) → `Rendering` (Đang vẽ file, cho phép `Retry permitted` nếu lỗi tạm thời) → `Ready` (File sẵn sàng tải xuống) hoặc `Failed` (Hết lượt thử).

---

## PHẦN 5: 5 SƠ ĐỒ HOẠT ĐỘNG ĐA LÀN – SWIMLANE ACTIVITY DIAGRAMS (HÌNH 14 ĐẾN HÌNH 18)

5 hình cuối trong file `Diagrams.docx` (Hình 14 đến Hình 18) là các **Swimlane Activity Diagrams** mô tả sự phối hợp nhịp nhàng giữa các làn (Swimlanes): **`Guest`** (Màu tím), **`User`** (Màu xanh dương), **`Admin`** (Màu xanh lá), và **`System`** (Màu hồng).

---

### 13. Hình 14 — Sơ đồ Hoạt động Tổng thể `AccessMap VN` (4 Làn: `Guest` | `User` | `Admin` | `System`)
- **Ý nghĩa**: Bức tranh toàn cảnh (Big Picture) kết nối mọi luồng của dự án trong 1 sơ đồ duy nhất:
  1. **Làn `Guest`**: Mở app → Hệ thống tách luồng (Fork bar): vừa có thể `Search / discover places` & `View published details and evidence` ngay, vừa kiểm tra `Don't have an account?` → `Register account` → `Sign in`.
  2. **Làn `User`**: Sau khi đăng nhập, người dùng thực hiện song song 4 nhóm hành động:
     - `Contribute / supplement accessibility evidence` (Gửi đóng góp mới → chuyển sang làn `System` chạy `AI verification`).
     - `Vote / report / comment` (Gửi phản hồi cộng đồng → chuyển sang làn `Admin`).
     - `Search by accessibility needs; manage preferences / favorites`.
     - `View reputation, source status and leaderboard`.
  3. **Làn `Admin`**: Đăng nhập `Admin Portal sign in` → Quản lý địa điểm & báo cáo độ phủ, đồng thời nhận kết quả từ `AI verification` và `Reviewable feedback` để ra quyết định `Review contribution / community case; approve or resolve?`:
     - **Nhánh `Yes`**: `Publish approved contribution / comment or resolve community case`.
     - **Nhánh `No`**: `Reject or request additional evidence`.
  4. **Làn `System`**: Thực thi `AI verification` tự động và `Send notification` (gửi thông báo kết quả về lại cho `User` đọc trạng thái và phản hồi).

---

### 14. Hình 15 — `AccessMap VN · Contribute and Review Evidence` (Luồng Đóng góp & Kiểm duyệt Minh chứng)
- **Ý nghĩa**: Mô tả chi tiết quy trình cốt lõi số 1 của đồ án (Contribution Pipeline):
  1. **`Guest` → `User`**: Đăng ký/Đăng nhập → Chọn hoặc đề xuất địa điểm (`Select / propose a place`) → Thêm ảnh/video và gắn thẻ QCVN (`Add media and claims`).
  2. **`System` (Kiểm tra tại chỗ)**: Chạy `Check media quality` (Pre-scan kiểm tra ảnh mờ, thiếu sáng, làm mờ khuôn mặt) rồi trả kết quả về cho `User` xem trước (`Review and submit`).
  3. **`System` (Chấm điểm AI)**: Khi `User` bấm Submit, `System` chạy `AI verification` (Vision + NLP + GPS) rồi đẩy hồ sơ sang làn **`Admin`**.
  4. **`Admin` (Kiểm duyệt 2 bước quyết định)**:
     - **Quyết định 1 (`more evidence needed?`)**: Nếu thiếu bằng chứng (`Yes`) → Yêu cầu `User` (`Provide more evidence?`). Người dùng chọn `Yes` (`Submit correction` → quay lại bước `Add media and claims`) hoặc `No` (`Cancel correction`).
     - **Quyết định 2 (`Approve?`)**: Nếu không thiếu bằng chứng (`No`), Admin xét duyệt:
       - `Yes` → `Publish contribution` (Công bố lên bản đồ).
       - `No` → `Reject with reason` (Từ chối kèm lý do).
  5. **`System` → `User`**: Gửi thông báo (`Send notification`) → Người dùng xem kết quả (`View submission status`).

---

### 15. Hình 16 — `AccessMap VN · Accessibility Search and Exploration` (Luồng Tìm kiếm & Khám phá)
- **Ý nghĩa**: Chứng minh tính nhân văn của ứng dụng — **Guest không cần tạo tài khoản vẫn tra cứu được đầy đủ thông tin tiếp cận**, chỉ khi muốn lưu trữ cá nhân hoặc đóng góp dữ liệu mới cần đăng nhập:
  1. **`Guest`**: Nhập từ khóa và nhu cầu tiếp cận (`Enter search and needs`).
  2. **`System`**: Hiển thị kết quả (`Show accessibility results`). Kiểm tra `Results found?`:
     - Nếu `No` → Hiển thị không có kết quả (`Show no results`) → Cho phép `Refine search` (quay lại tìm kiếm).
     - Nếu `Yes` → `Guest` xem chi tiết địa điểm, ảnh bằng chứng và hạ tầng xung quanh (`View details, evidence and surroundings`).
  3. **Điểm chuyển đổi (`Save or contribute?`)**:
     - Nếu `No` → Kết thúc luồng tra cứu nhanh.
     - Nếu `Yes` → Yêu cầu `Sign in / register if needed` → Chuyển sang làn **`User`** để thực hiện `Manage needs / favorites` hoặc `Contribute / vote / report`.

---

### 16. Hình 17 — `AccessMap VN · Reputation and Contributor Leaderboard` (Luồng Uy tín & Bảng xếp hạng)
- **Ý nghĩa**: Giải thích cơ chế thưởng điểm uy tín minh bạch khi đóng góp được công bố:
  1. **`Admin`**: Công bố đóng góp (`Publish contribution`).
  2. **`System`**: Kiểm tra điều kiện cộng điểm (`Check credit eligibility; eligible?`):
     - **Nhánh `Yes`**: Cộng **`+5` điểm** (cho đóng góp địa điểm/tiện ích mới) hoặc **`+2` điểm** (cho cập nhật thông tin) đúng 1 lần duy nhất (`Credit +5 / +2 once`).
     - **Nhánh `No`**: Giữ ở trạng thái chờ hoặc không cộng điểm (`Pending / under review / ineligible: no credit`).
     - Sau đó `System` gửi thông báo (`Send notification`) về cho `User`.
  3. **`User`**: Xem điểm số, lịch sử cộng điểm, huy hiệu và bảng xếp hạng (`View score, history and rank` & `View leaderboard / badge`).
  4. **Luồng khiếu nại điểm (`Request credit review?`)**: Nếu người dùng thắc mắc về điểm số (`Yes` → `Request investigation`), **`Admin`** sẽ kiểm tra và điều chỉnh sổ cái (`Review credit / audit adjustment`), **`System`** cập nhật và thông báo kết quả (`Update status and notify`) cho **`User`** (`View review outcome`).

---

### 17. Hình 18 — `AccessMap VN · Community Validation and Reports` (Luồng Xác thực Cộng đồng & Giải quyết Tranh chấp)
- **Ý nghĩa**: Mô tả chi tiết quy trình cốt lõi số 2 của đồ án (Community Validation & Dispute Resolution):
  1. **`User`**: Đăng nhập và xem địa điểm (`Sign in and view place`) → Thực hiện `Vote / report / comment` (Biểu quyết tiện ích, gửi báo cáo sai lệch, hoặc bình luận).
  2. **`System`**: Ghi nhận phản hồi và tính toán lại độ đồng thuận (`Record feedback / assess votes`). Kiểm tra `Review required?`:
     - Nếu `No` (ví dụ: vote xác nhận "Vẫn chính xác", chưa có xung đột) → Chỉ cập nhật chỉ số đồng thuận và thông báo.
     - Nếu `Yes` (phát hiện $\ge 2$ phiếu mâu thuẫn mở Dispute, hoặc có Report/Comment cần duyệt) → Chuyển sang làn **`Admin`**.
  3. **`Admin`**: Xem xét hồ sơ (`Review case / request evidence`). Kiểm tra `Correction needed?` (Có cần cập nhật lại dữ liệu gốc trên bản đồ không?):
     - **Nhánh `No`** (Dữ liệu gốc vẫn đúng hoặc chỉ là sự cố tạm thời): Admin chọn `Resolve / moderate / issue advisory` (Đóng tranh chấp giữ nguyên bản gốc, duyệt/ẩn bình luận, hoặc phát hành biển cảnh báo tạm thời).
     - **Nhánh `Yes`** (Cần bằng chứng đính chính): Yêu cầu **`User`** gửi bằng chứng đính chính (`Submit correction evidence`) → **`Admin`** kiểm duyệt (`Review correction; approve?`) → `Publish correction` (`Yes`) hoặc `Reject with reason` (`No`).
  4. **`System` → `User`**: Gửi thông báo (`Send notification`) → Người dùng xem trạng thái phản hồi (`View feedback status`).

---

## PHẦN 6: BÍ KÍP TRẢ LỜI TỔNG HỢP KHI HỘI ĐỒNG HỎI XOÁY

1. **"Tại sao hệ thống vừa có `Submission` (Đóng góp) vừa có `CommunityVote` (Biểu quyết) và `InaccurateInformationReport` (Báo cáo sai lệch)? Có bị trùng lặp không?"**
   - **Trả lời**: Dạ không trùng lặp mà bổ trợ chặt chẽ cho nhau theo **kiến trúc 2 tầng kiểm soát chất lượng**:
     - **`Submission` (Đóng góp chuẩn QCVN)** là luồng **nặng (Heavyweight)**: bắt buộc chụp ảnh/video thực địa, qua AI chấm điểm 3 trụ cột (Vision 60% + NLP 40% + GPS) và Admin duyệt. **Chỉ có `Submission` mới được phép thay đổi trạng thái công bố chính thức (`LocationFeature`) và được cộng điểm uy tín (+5/+2).**
     - **`CommunityVote` (Biểu quyết 1 chạm)** là luồng **nhẹ (Lightweight)**: giúp cộng đồng xác nhận nhanh *"Ram dốc này hôm nay vẫn dùng tốt"* (`StillAccurate`) để duy trì độ tươi mới (`FreshnessFactor`), hoặc cảnh báo nhanh *"Ram dốc đang bị rào chắn"* (`Changed`). Khi có $\ge 2$ người vote `Changed`, hệ thống tự động bật cờ `CommunityUnderReview` và mở `DisputeCase` cho Admin.
     - **`InaccurateInformationReport`** dùng cho các sai lệch rộng hơn ngoài trạng thái tiện ích (như sai địa chỉ, sai vị trí ghim bản đồ, địa điểm đã giải tỏa/đóng cửa).

2. **"Tại sao khi người dùng Vote hoặc Report thì không tự động sửa luôn dữ liệu trên bản đồ và không cộng điểm EXP ngay?"**
   - **Trả lời**: Đây là **Safety Boundary (Ranh giới an toàn dữ liệu)** quan trọng nhất của AccessMap VN. Với người sử dụng xe lăn, một thông tin sai lệch trên bản đồ có thể khiến họ bị mắc kẹt ngoài đời thực. Nếu cho phép vote 1 chạm tự động đổi trạng thái trên bản đồ hoặc cộng điểm EXP, kẻ xấu sẽ dễ dàng spam vote ảo để cày điểm hoặc phá hoại dữ liệu. Do đó, Vote/Report chỉ làm thay đổi **Nhãn cảnh báo cộng đồng (`FeatureCommunityState`)** và mở **Hồ sơ tranh chấp (`DisputeCase`)**, còn việc thay đổi **Sự thật công bố (`LocationFeature`)** bắt buộc phải thông qua bằng chứng hình ảnh được duyệt.



---

## PHẦN 7: PHÂN TÍCH CHI TIẾT SƠ ĐỒ KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE DIAGRAM)

### 1. Quy ước ký hiệu trên sơ đồ System Architecture
Khi thuyết trình sơ đồ này trước Hội đồng, câu đầu tiên bạn nên nói là:
- **Sơ đồ được chia làm 3 phân vùng rõ rệt (3-Tier Distributed Architecture)**:
  1. **`Client side (Front-end)`** *(Bên trái)*: Gồm `Admin Web Portal` (Next.js) và `Mobile app` (React Native Expo).
  2. **`Server side (Back-end)`** *(Ở giữa)*: Gồm 4 thành phần lõi: `API Layers` (.NET 8 Web API), `Database` (PostgreSQL/PostGIS), `AI Services` (Python FastAPI), và `Background Worker` (Hangfire / Hosted Services).
  3. **`External Services`** *(Bên phải)*: Gồm 4 dịch vụ bên thứ ba: `Places/Maps`, `Email/SMS`, `Notification (Firebase)`, và `Private Object Storage` (S3-compatible).
- **Quy ước mũi tên**:
  - **Mũi tên nét liền (`───►`)**: Là chiều gửi **Request / Lệnh gọi** (Yêu cầu đi).
  - **Mũi tên nét đứt (`- - ►`)**: Là chiều trả về **Response / Kết quả** (Dữ liệu phản hồi về).

---

### 2. Vai trò của 4 khối bên trong `Server side (Back-end)`
1. **`API Layers` (ASP.NET Core 8 Web API)**:
   - Là cổng giao tiếp chính (Single Entry Point) tiếp nhận mọi `HTTPS Requests` từ Web Admin và Mobile App, kiểm tra xác thực JWT, phân quyền RBAC (`Admin` / `User`), chống gửi trùng (`Idempotency-Key`) và giới hạn tần suất (`Rate Limiting`).
2. **`DB (Database – PostgreSQL + PostGIS)`**:
   - Lưu trữ toàn bộ dữ liệu có cấu trúc, tọa độ không gian địa lý (`PostGIS geography`), lịch sử phiên bản tiện ích, phiếu vote, tranh chấp và hàng đợi công việc. Chỉ có `API Layers` (và Worker thông qua tầng nội bộ) mới được phép truy vấn (`Query` / `Result`) vào DB.
3. **`AI Services` (FastAPI Python Microservice)**:
   - Chuyên trách xử lý thị giác máy tính (YOLOv8 nhận diện ram dốc/cửa/thang máy/WC, OpenCV kiểm tra độ mờ/độ sáng, MediaPipe làm mờ khuôn mặt/biển số xe bảo vệ quyền riêng tư) và xử lý ngôn ngữ tự nhiên tiếng Việt (NLP).
4. **`Background Worker` (Hangfire & Background Services)**:
   - Xử lý các tác vụ nặng hoặc chạy định kỳ ở chế độ nền (Asynchronous Processing) để không làm treo ứng dụng của người dùng:
     - Gọi `AI Services` chạy kiểm định sâu (`Verification Request`).
     - Tính toán lại điểm đồng thuận cộng đồng và quét độ cũ của dữ liệu (`Freshness Scan`).
     - Quét bảng `OutboxMessages` để bắn thông báo đẩy qua `Notification (Firebase)`.

---

### 3. Giải thích từng luồng mũi tên kết nối (Tại sao lại nối như vậy?)

#### Luồng 1: Giao tiếp giữa `Client side` và `Server side`
- **`HTTPS Requests` (nét liền) & `HTTPS Responses` (nét đứt)**:
  - Mọi thao tác nghiệp vụ (đăng nhập, tìm kiếm địa điểm, gửi hồ sơ đóng góp, vote, báo cáo sai lệch, duyệt hồ sơ của Admin) đều đi từ `Front-end` vào `API Layers` qua giao thức HTTPS và nhận kết quả JSON trả về.

#### Luồng 2: Giao tiếp nội bộ bên trong `Server side` (4 cặp mũi tên)
1. **`API Layers` ⇄ `DB` (`Query` / `Result`)**:
   - `API Layers` thực thi các câu lệnh đọc/ghi dữ liệu thông qua Entity Framework Core & PostGIS.
2. **`API Layers` ⇄ `AI Services` (`Pre-scan Request` / `Pre-scan Result`)**:
   - **Tại sao `API Layers` gọi trực tiếp `AI Services` ở bước Pre-scan?**
   - Vì khi người dùng vừa chụp ảnh xong ở màn hình Camera (`M-05`), họ cần biết **ngay lập tức (Synchronous, < 1–2 giây)** xem bức ảnh có bị mờ, bị tối hay có mặt người cần che mờ hay không để còn chụp lại ngay tại hiện trường.
3. **`Background Worker` ⇄ `AI Services` (`Verification Request` / `Verification Response`)**:
   - **Tại sao bước `Verification` lại đi từ `Background Worker` sang `AI Services` mà không đi từ `API Layers`?**
   - Vì bước phân tích sâu toàn bộ hồ sơ (nhận diện đa vật thể QCVN, phân tích ngữ nghĩa mô tả NLP, tính điểm tổng hợp) tốn nhiều thời gian hơn. Giao cho `Background Worker` chạy ngầm giúp người dùng bấm Submit xong là nhận phản hồi ngay mà không phải chờ đợi.
4. **`Background Worker` ⇄ `API Layers` (`Read/Update Request` / `Data/Update Result`)**:
   - Sau khi `Background Worker` nhận kết quả chấm điểm từ `AI Services` (hoặc tính xong điểm đồng thuận cộng đồng), nó cập nhật lại trạng thái hồ sơ (`PendingModeration` / `AutoApproved` / `AwaitingMoreInfo`) và điểm số vào hệ thống.

#### Luồng 3: Giao tiếp từ `Server side` ra `External Services` (Vòng trên & vòng giữa)
1. **`API Layers` ⇄ `Places/Maps` (`Lookup Request` / `Lookup Result`)** *(2 đường vòng trên cùng)*:
   - Khi người dùng tìm kiếm một địa điểm mới chưa có trong Database nội bộ, `API Layers` gửi `Lookup Request` sang dịch vụ bản đồ ngoài (Nominatim/Overpass) để tra cứu tọa độ/địa chỉ (`Lookup Result`).
2. **`API Layers` ⇄ `Email/SMS` (`OTP Request` / `Provider Response`)**:
   - Khi người dùng đăng ký tài khoản hoặc yêu cầu đặt lại mật khẩu, `API Layers` gọi sang nhà cung cấp `Email/SMS` để gửi mã xác thực/email xác nhận và nhận về trạng thái gửi (`Provider Response`).
3. **`Background Worker` ⇄ `Notification Firebase` (`Push Request` / `Provider Response`)**:
   - Khi có sự kiện cần báo cho người dùng (hồ sơ được duyệt, Admin yêu cầu bổ sung ảnh, có cảnh báo tiếp cận mới), `Background Worker` đọc từ Outbox và gửi `Push Request` sang **Firebase Cloud Messaging (FCM)**.
4. **`API Layers` & `AI Services` ⇄ `Private Object Storage` (`Media Request` / `Media Data` / `Media Result`)**:
   - `API Layers` giao tiếp với `Private Object Storage` để khởi tạo phiên upload (`Upload Intent` / Pre-signed URL) và kiểm tra metadata/hash SHA-256 của file.
   - `AI Services` gửi `Media Request` vào `Private Object Storage` để tải bức ảnh/video gốc (`Media Result`) về chấm điểm AI.

#### Luồng 4: Giao tiếp trực tiếp giữa `Client side` và `External Services` (6 đường chạy vòng dưới đáy hình)
Hội đồng rất hay chỉ vào **các đường chạy dưới đáy hình** và hỏi: *"Tại sao Client lại nối thẳng sang External Services mà không đi xuyên qua Backend?"*. Bạn trả lời 3 ý này sẽ đạt điểm tuyệt đối:
1. **`Client side` ⇄ `Private Object Storage` (`Upload/Download Request` & `Status/Media Data`)**:
   - Hệ thống sử dụng cơ chế **Pre-signed URL (Đường dẫn có chữ ký số và thời hạn ngắn 5–20 phút)**.
   - Thay vì bắt Mobile App đẩy file ảnh/video nặng hàng chục MB đi xuyên qua `API Layers` (gây nghẽn băng thông và tốn RAM của Backend), `API Layers` chỉ cấp cho Mobile một `Pre-signed URL`. Sau đó Mobile dùng URL đó để **Upload/Download trực tiếp** với `Private Object Storage`. Vừa bảo mật tuyệt đối (bucket vẫn là Private), vừa giảm tải 100% băng thông file media cho Backend!
2. **`Notification (Firebase)` ───► `Client side` (`Push Message`)**:
   - Sau khi `Background Worker` gửi lệnh sang Firebase, chính hạ tầng của **Firebase (FCM)** sẽ đẩy gói tin `Push Message` trực tiếp về thiết bị di động của người dùng.
3. **`Client side` ⇄ `Places/Maps` (`Map Request` & `Map Data`)**:
   - Khi người dùng vuốt/phóng to bản đồ trên Mobile App hoặc Web Admin, SDK bản đồ (MapLibre) trên máy khách sẽ tải trực tiếp các mảnh bản đồ nền (`Map Tiles` – `Map Request` / `Map Data`) từ máy chủ bản đồ để tốc độ hiển thị mượt 60 FPS, còn `API Layers` chỉ trả về tọa độ các ghim địa điểm tiếp cận (GeoJSON/Markers).
