# PHÂN TÍCH CHI TIẾT SƠ ĐỒ ERD (ENTITY RELATIONSHIP DIAGRAM) – ACCESSMAP VN

Tài liệu này giải thích cặn kẽ từng bảng, từng đường nối (quan hệ `1-1`, `1-N`, `0..1-N`, tự tham chiếu) trong sơ đồ ERD của bạn theo cách dễ hiểu nhất để thuyết trình trước Hội đồng.

---

## 1. CÁCH ĐỌC KÝ HIỆU TRÊN HÌNH (CROW'S FOOT NOTATION)

Nếu giảng viên chỉ vào 1 đường kẻ và hỏi *"Ký hiệu ở hai đầu dây này nghĩa là gì?"*, bạn chỉ cần nhớ 4 ký hiệu chuẩn này:
- **Một gạch dọc (`|`)**: **Bắt buộc có đúng 1 (`1`)**. Ví dụ: Một phiếu `COMMUNITY_VOTE` bắt buộc phải thuộc về đúng 1 `USER`.
- **Vòng tròn + gạch dọc (`o|`)**: **Tùy chọn 0 hoặc 1 (`0..1` – Nullable Foreign Key)**. Ví dụ: Một `INACCURATE_INFORMATION_REPORT` có thể gắn với `0 hoặc 1` `DISPUTE_CASE` (vì báo cáo mới gửi chưa chắc đã có tranh chấp).
- **Chân chim 3 nhánh (`|<` hoặc `o<`)**: **Nhiều (`N` – đầu Bảng Con chứa khóa ngoại `FK`)**. Đầu nào có hình chân chim 3 chạc thì bảng đó là **Bảng Con (Child Table)** giữ khóa ngoại trỏ về bảng kia.

---

## 2. BỐ CỤC TỔNG THỂ: HÃY NHÌN TỪ "4 TRÁI TIM" Ở GIỮA SƠ ĐỒ

Nhìn vào hình ERD có rất nhiều dây chằng chịt, nhưng thực chất mọi đường dây đều xoay quanh **4 bảng trung tâm (Core Entities)** nằm ở cột giữa và cột phải:
1. **`USER`** *(Ở chính giữa)*: Ai là người thao tác? (Người đóng góp, Người vote, Người báo cáo, hay Admin kiểm duyệt).
2. **`LOCATION`** *(Ngay dưới `USER`)*: Thao tác đó diễn ra ở địa điểm nào trên bản đồ?
3. **`SUBMISSION`** *(Bên phải `USER`)*: Hồ sơ đóng góp bằng chứng mới (Luồng đầu vào để tạo dữ liệu tiếp cận).
4. **`LOCATION_FEATURE`** *(Ngay dưới `LOCATION`)*: Tiện ích tiếp cận đã được duyệt công bố ra bản đồ (Ram dốc, Cửa chính, Thang máy, WC tiếp cận).

---

## 3. GIẢI THÍCH TỪNG CỤM BẢNG & TỪNG MỐI QUAN HỆ ("BẢNG NÀY SAO SAO?")

---

### CỤM 1: XUNG QUANH `USER` & `LOCATION` (Cột giữa)

#### 1. `USER` ↔ `ACCESSIBILITY_PREFERENCE` (Quan hệ `1 — 0..1`)
- **Đầu dây**: `USER` (`|`) ─── (`o|`) `ACCESSIBILITY_PREFERENCE`.
- **Giải thích**:
  - Bảng `USER` lưu thông tin tài khoản.
  - Bảng `ACCESSIBILITY_PREFERENCE` lưu cấu hình nhu cầu tiếp cận riêng của người đó (ví dụ: tôi đi xe lăn điện, tôi luôn cần lọc những nơi có Ram dốc và Thang máy).
  - **Tại sao là `0..1` (`o|`)?**: Vì một người dùng mới tạo tài khoản có thể **chưa thiết lập** nhu cầu cá nhân (`0`), hoặc nếu thiết lập rồi thì mỗi người chỉ có **1 bộ hồ sơ nhu cầu cá nhân** (`1`).

#### 2. `USER` ↔ `FAVORITE_LOCATION` ↔ `LOCATION` (Quan hệ Nhiều-Nhiều tách thành hai quan hệ `1 — N`)
- **Đầu dây**:
  - `USER` (`|`) ─── (`o<`) `FAVORITE_LOCATION`
  - `LOCATION` (`|`) ─── (`o<`) `FAVORITE_LOCATION`
- **Giải thích**:
  - Một `USER` có thể lưu yêu thích nhiều `LOCATION`, và một `LOCATION` cũng có thể được nhiều `USER` yêu thích (Quan hệ `N - N`).
  - Trong cơ sở dữ liệu quan hệ, không vẽ trực tiếp `N - N` mà phải tách ra bảng trung gian **`FAVORITE_LOCATION`** (chứa `user_id` và `location_id`).

#### 3. `LOCATION` ↔ `ACCESS_SCOPE` (Quan hệ `1 — 0..N`)
- **Đầu dây**: `LOCATION` (`|`) ─── (`o<`) `ACCESS_SCOPE`.
- **Giải thích**:
  - Một địa điểm lớn (`LOCATION`) như Bệnh viện Chợ Rẫy hay Trung tâm thương mại có nhiều cổng/khu vực khác nhau.
  - Bảng **`ACCESS_SCOPE`** dùng để chia nhỏ các khu vực/lối tiếp cận trong cùng 1 địa điểm (ví dụ: *Cổng A đường Nguyễn Chí Thanh*, *Cổng cấp cứu khu B*).
  - Một `LOCATION` có thể có nhiều `ACCESS_SCOPE` (`o<`), nhưng một `ACCESS_SCOPE` bắt buộc phải thuộc về đúng 1 `LOCATION` (`|`).

#### 4. Vòng tự nối (Self-Referencing) ngay dưới đáy bảng `LOCATION` (`0..1 — 0..N`)
- **Đầu dây**: Từ `LOCATION` vòng ra rồi quay lại chính `LOCATION` (`o|` ─── `|<`).
- **Giải thích (Điểm ăn điểm khi giảng viên hỏi)**:
  - Đây là mối quan hệ **Gộp địa điểm bị trùng (`MergedIntoLocationId`)**.
  - Khi người dùng tạo mới địa điểm vô tình trùng với một địa điểm đã có sẵn trên bản đồ, Admin dùng chức năng **Merge Duplicate Locations**: địa điểm bị trùng sẽ trỏ khóa ngoại `merged_into_location_id` về **Địa điểm gốc (Canonical Location)** thay vì xóa cứng, để toàn bộ lịch sử bình luận/đóng góp cũ không bị mất.

---

### CỤM 2: XUNG QUANH `SUBMISSION` – LUỒNG ĐÓNG GÓP & AI (Cột 4 & Cột 5 bên phải)

Khi một `USER` đi khảo sát thực tế và gửi một hồ sơ đóng góp (`SUBMISSION`) cho một `LOCATION`:
- `USER` (`|`) ─── (`o<`) `SUBMISSION`: Một User gửi được nhiều hồ sơ đóng góp.
- `LOCATION` (`|`) ─── (`o<`) `SUBMISSION`: Một Địa điểm nhận được nhiều hồ sơ đóng góp theo thời gian.
- `ACCESS_SCOPE` (`o|`) ─── (`o<`) `SUBMISSION`: Hồ sơ đóng góp có thể chỉ định rõ lối vào nào (`ACCESS_SCOPE`), hoặc để trống nếu áp dụng cho toàn địa điểm (`o|`).

Từ bảng **`SUBMISSION`** tỏa ra **7 bảng vệ tinh** xung quanh nó:

#### 1. `SUBMISSION` ↔ `SUBMISSION_MEDIA` (`1 — 1..N`)
- **Giải thích**: Một hồ sơ đóng góp (`SUBMISSION`) bắt buộc đính kèm từ 1 đến nhiều file minh chứng ảnh/video thực địa (`SUBMISSION_MEDIA`). Bảng này lưu đường dẫn file trên Object Storage, định dạng ảnh và mã hash SHA-256.

#### 2. `SUBMISSION` ↔ `SUBMISSION_CLAIM` (`1 — 1..N`)
- **Giải thích**: Trong 1 lần gửi hồ sơ (`SUBMISSION`), người dùng có thể đánh giá nhiều hạng mục cùng lúc. Mỗi hạng mục được tách thành 1 dòng trong **`SUBMISSION_CLAIM`** (Ví dụ: Dòng 1: *Ram dốc = Có*, Dòng 2: *Cửa vào = Đạt chuẩn*, Dòng 3: *WC tiếp cận = Không có*).
- Đồng thời `SUBMISSION_CLAIM` cũng nối với `ACCESS_SCOPE` (`o|`) và `LOCATION_FEATURE` (`o|`) để biết khẳng định này đang đề xuất cập nhật cho tiện ích nào.

#### 3. `SUBMISSION` / `SUBMISSION_CLAIM` ↔ `QCVN_CRITERION_EVIDENCE` (`1 — 0..N`)
- **Giải thích**: Bảng **`QCVN_CRITERION_EVIDENCE`** lưu chi tiết các thông số kỹ thuật theo quy chuẩn xây dựng Việt Nam **QCVN 10:2014/BXD** (như độ rộng cửa $\ge 90\text{cm}$, độ dốc ram $\le 1:12$, có tay vịn 2 bên hay không) đi kèm với từng khẳng định.

#### 4. `SUBMISSION` ↔ `SURROUNDING_OBSERVATION` (`1 — 0..N`)
- **Giải thích**: Ngoài các tiện ích bên trong công trình, người đóng góp có thể ghi nhận thêm tình trạng **hạ tầng xung quanh lối vào** (`SURROUNDING_OBSERVATION` – như vỉa hè bị lấn chiếm, có gờ hạ thấp vỉa hè cho xe lăn lên xuống hay không). Bảng này nối với cả `SUBMISSION` và `LOCATION`.

#### 5. `SUBMISSION` ↔ `AI_ANALYSIS` & `AI_SUGGESTION` (Cột phải & Cột giữa)
- **Giải thích**:
  - **`AI_ANALYSIS`**: Khi `SUBMISSION` được gửi lên, AI Service chạy phân tích tổng thể (Computer Vision 60% + NLP 40% + GPS Proximity) và lưu bảng điểm vào `AI_ANALYSIS`.
  - **`AI_SUGGESTION`**: Từ các bức ảnh người dùng chụp, mô hình thị giác máy tính (YOLO/Vision) phát hiện được vật thể gì (như phát hiện có bậc thang, phát hiện biển báo WC xe lăn) thì sinh ra các gợi ý thẻ trong `AI_SUGGESTION` để đối chiếu với `SUBMISSION_CLAIM` của người dùng.

#### 6. `SUBMISSION` ↔ `MODERATION_REVIEW` (`1 — 0..N`)
- **Giải thích**: Khi hồ sơ được chuyển vào hàng đợi của Admin (`PendingModeration`), mỗi lần Admin vào duyệt (`Approve`), từ chối (`Reject`), hoặc yêu cầu chụp lại ảnh (`RequestMoreInfo`), hệ thống ghi 1 dòng nhật ký vào **`MODERATION_REVIEW`** (nối với cả `SUBMISSION` và `USER` là Admin duyệt).

#### 7. Vòng tự nối (Self-Referencing) dưới đáy bảng `SUBMISSION` (`0..1 — 0..1`)
- **Giải thích**: Khi hồ sơ bị thiếu ảnh (`AwaitingMoreInfo`) và người dùng gửi bổ sung bằng chứng lại (Resubmission), hồ sơ/lượt gửi mới sẽ nối trỏ về hồ sơ gốc ban đầu để giữ nguyên lịch sử các lần chụp trước.

---

### CỤM 3: XUNG QUANH `LOCATION_FEATURE` – DỮ LIỆU CÔNG BỐ, VOTE CỘNG ĐỒNG & TRANH CHẤP (Góc dưới giữa & trái)

Đây là phần thể hiện rõ nhất sự khác biệt giữa **"Sự thật đã công bố"** và **"Phản hồi cộng đồng"**:

#### 1. `LOCATION` ↔ `LOCATION_FEATURE` (`1 — 0..N`)
- **Giải thích**: Khi một `SUBMISSION_CLAIM` được duyệt công bố, nó tạo ra hoặc cập nhật **`LOCATION_FEATURE`**. Đây là bảng lưu **trạng thái chính thức đang hiển thị trên bản đồ** của từng tiện ích tại địa điểm đó (ví dụ: Địa điểm A có 4 dòng `LOCATION_FEATURE`: *Ramp = Available (v2)*, *EntranceDoor = Available (v1)*, *Elevator = Limited (v1)*, *AccessibleRestroom = NotAvailable (v1)*).

#### 2. `LOCATION_FEATURE` ↔ `FEATURE_COMMUNITY_STATE` (Quan hệ `1 — 0..1`)
- **Đầu dây**: `LOCATION_FEATURE` (`|`) ─── (`o|`) `FEATURE_COMMUNITY_STATE`.
- **Giải thích**:
  - Mỗi tiện ích `LOCATION_FEATURE` có tối đa **1 bảng trạng thái cộng đồng hiện hành (`FEATURE_COMMUNITY_STATE`)**.
  - Bảng này lưu kết quả tính toán sẵn (Read Projection): Nhãn cộng đồng hiện tại là gì (`Fresh`, `Reinforced`, `NeedsRecheck`, `CommunityUnderReview`), có bao nhiêu người đã vote đồng ý, bao nhiêu người vote phản đối, độ tươi mới (`FreshnessFactor`) là bao nhiêu. Nhờ tách bảng `1-1` này, khi người dùng mở bản đồ xem chi tiết địa điểm, hệ thống đọc ra ngay lập tức mà không cần `COUNT(*)` lại hàng nghìn phiếu vote.

#### 3. `LOCATION_FEATURE` ↔ `COMMUNITY_ASSESSMENT` (`1 — 0..N`)
- **Giải thích**: Khác với `FEATURE_COMMUNITY_STATE` chỉ lưu **trạng thái mới nhất (1 dòng)**, bảng **`COMMUNITY_ASSESSMENT`** lưu **lịch sử tất cả các lần hệ thống chạy đánh giá đồng thuận** theo thời gian (`1 — N`) để phục vụ kiểm tra lịch sử biến động.

#### 4. `LOCATION_FEATURE` ↔ `COMMUNITY_VOTE` (`1 — 0..N`)
- **Giải thích**:
  - Khi người dùng (`USER`) đến địa điểm và bấm nút Vote nhanh (*"Vẫn chính xác"* hoặc *"Đã thay đổi"*), hệ thống lưu vào **`COMMUNITY_VOTE`**.
  - Bảng này nối với:
    - `USER` (`|`): Ai là người vote.
    - `LOCATION_FEATURE` (`|`): Vote cho tiện ích nào.
    - `SUBMISSION` (`o|`): Người vote có thể đính kèm 1 hồ sơ bằng chứng `SUBMISSION` của họ để tăng sức nặng cho phiếu vote.
  - **Vòng tự nối trên đỉnh `COMMUNITY_VOTE` (`o|` ─── `|<`)**: Biểu diễn cột `superseded_by_vote_id`. Khi cùng 1 người dùng vote lại lần 2 cho cùng 1 tiện ích, phiếu vote mới sẽ thay thế phiếu vote cũ (phiếu cũ trỏ sang phiếu mới và chuyển sang trạng thái `Superseded`), đảm bảo 1 người không thể spam 10 phiếu để thao túng kết quả.

#### 5. `LOCATION_FEATURE` ↔ `DISPUTE_CASE` ↔ `DISPUTE_DECISION` & `TEMPORARY_ACCESS_ADVISORY`
- **Giải thích luồng dây**:
  - **`LOCATION_FEATURE` (`|`) ─── (`o<`) `DISPUTE_CASE`**: Khi một tiện ích có từ 2 phiếu `COMMUNITY_VOTE` phản ánh thông tin đã thay đổi/mâu thuẫn với trạng thái công bố, hệ thống tự động mở một hồ sơ tranh chấp **`DISPUTE_CASE`**. (Đồng thời `FEATURE_COMMUNITY_STATE` cũng giữ khóa ngoại `active_dispute_case_id` trỏ sang `DISPUTE_CASE` đang mở).
  - **`DISPUTE_CASE` (`|`) ─── (`o<`) `DISPUTE_DECISION`**: Admin vào trang *Tranh chấp tiếp cận* để phân xử. Mỗi quyết định của Admin được ghi vào **`DISPUTE_DECISION`** (nối với `USER` là Admin phân xử, và tùy chọn nối với `SUBMISSION` đính chính nếu Admin chọn cập nhật theo hồ sơ mới).
  - **`DISPUTE_CASE` (`o|`) ─── (`o<`) `TEMPORARY_ACCESS_ADVISORY`**: Nếu sự cố chỉ mang tính tạm thời (ví dụ: *Thang máy đang bảo trì 1 tuần*), Admin phát hành một cảnh báo tạm thời **`TEMPORARY_ACCESS_ADVISORY`** gắn vào `LOCATION_FEATURE` (và liên kết với `DISPUTE_CASE` đó).

---

### CỤM 4: BÁO CÁO SAI LỆCH & BÌNH LUẬN CỘNG ĐỒNG (`INACCURATE_INFORMATION_REPORT` & `COMMUNITY_COMMENT`)

#### 1. `INACCURATE_INFORMATION_REPORT` (Góc trên bên phải, cột 4)
- **Các đường nối của bảng này**:
  - Nối với **`USER`** (`|`): Ai là người gửi báo cáo sai lệch ( và Admin nào xử lý).
  - Nối với **`LOCATION`** (`|`): Báo cáo sai lệch cho địa điểm nào.
  - Nối với **`ACCESS_SCOPE`** (`o|`) và **`LOCATION_FEATURE`** (`o|`): Báo cáo này phản ánh sai lệch ở cổng nào hoặc tiện ích cụ thể nào (Tùy chọn `o|`, vì người dùng có thể chỉ báo cáo *"Địa điểm này sai địa chỉ"* chứ không báo cáo tiện ích cụ thể).
  - Nối với **`DISPUTE_CASE`** (`o|`) và **`SUBMISSION`** (`o|`): Nếu báo cáo sai lệch được Admin gộp vào một vụ tranh chấp đang mở hoặc giải quyết bằng một hồ sơ đóng góp mới.

#### 2. `COMMUNITY_COMMENT` (Cột 2, phía trên `ACCESSIBILITY_PREFERENCE`)
- **Các đường nối của bảng này**:
  - Nối với **`USER`** (`|`): Ai là người viết bình luận (và Admin nào kiểm duyệt).
  - Nối với **`LOCATION`** (`|`) và **`ACCESS_SCOPE`** (`o|`): Bình luận về địa điểm/lối vào nào.
  - **Vòng tự nối trên đỉnh `COMMUNITY_COMMENT` (`o|` ─── `|<`)**: Biểu diễn quan hệ **Bình luận cha – Bình luận trả lời (Parent-Child Reply Thread)** thông qua `parent_comment_id`. Một bình luận gốc có thể có nhiều bình luận phản hồi bên dưới.

---

### CỤM 5: HỆ THỐNG ĐIỂM UY TÍN & BÁO CÁO ĐỘ PHỦ (Góc trên bên trái – Cột 1 & Cột 2)

#### 1. Bộ 3 bảng Uy tín: `REPUTATION_EVENT` → `REPUTATION_LEDGER_ENTRY` → `REPUTATION_ACCOUNT_SNAPSHOT`
- **Luồng hoạt động & Mối quan hệ**:
  - Khi một `SUBMISSION` của `USER` được duyệt công bố, nó sinh ra một sự kiện xét thưởng trong **`REPUTATION_EVENT`** (nối với `USER` và `SUBMISSION`).
  - Khi `REPUTATION_EVENT` được xác nhận hợp lệ (`Credited`), hệ thống ghi một bút toán cộng điểm (+5 hoặc +2) vào sổ cái **`REPUTATION_LEDGER_ENTRY`** (`REPUTATION_EVENT` `o|` ─── `o<` `REPUTATION_LEDGER_ENTRY`). Sổ cái này nối với `USER` (`|`) và không bao giờ sửa/xóa dòng cũ (chỉ ghi thêm dòng mới giống sao kê ngân hàng).
  - Để hiển thị nhanh tổng điểm và thứ hạng trên trang cá nhân & Leaderboard, hệ thống tổng hợp thành bảng **`REPUTATION_ACCOUNT_SNAPSHOT`** nối với `USER` (`|`).

#### 2. Bộ 2 bảng Báo cáo độ phủ: `COVERAGE_REPORT_REQUEST` ↔ `COVERAGE_REPORT_METRIC`
- **Đầu dây**:
  - `USER` (Admin) (`|`) ─── (`o<`) `COVERAGE_REPORT_REQUEST`
  - `COVERAGE_REPORT_REQUEST` (`|`) ─── (`|<`) `COVERAGE_REPORT_METRIC`
- **Giải thích**:
  - Khi Admin yêu cầu xuất báo cáo thống kê độ phủ tiếp cận của một quận/huyện hoặc thành phố, hệ thống tạo 1 bản ghi trong **`COVERAGE_REPORT_REQUEST`**.
  - Kết quả thống kê từng chỉ số (tổng số địa điểm, % có ram dốc, % có WC tiếp cận, số vùng thiếu dữ liệu) được lưu thành nhiều dòng chi tiết trong **`COVERAGE_REPORT_METRIC`** (`1 — 1..N`).

---

## 4. TÓM TẮT 4 VÒNG LẶP TỰ THAM CHIẾU (SELF-REFERENCING) TRÊN ERD

Nếu giảng viên hỏi *"Trên ERD của em có mấy bảng có mũi tên tự vòng lại chính nó? Ý nghĩa là gì?"*, bạn trả lời ngay 4 bảng này sẽ cực kỳ ấn tượng:
1. **`LOCATION` tự nối chính nó**: Lưu `merged_into_location_id` khi Admin gộp địa điểm trùng lặp về địa điểm chuẩn.
2. **`SUBMISSION` tự nối chính nó**: Lưu liên kết giữa lượt gửi bổ sung bằng chứng (Resubmission) với hồ sơ đóng góp gốc ban đầu.
3. **`COMMUNITY_VOTE` tự nối chính nó**: Lưu `superseded_by_vote_id` khi cùng một người dùng bầu lại phiếu mới thay thế cho phiếu cũ của chính họ trên cùng phiên bản tiện ích.
4. **`COMMUNITY_COMMENT` tự nối chính nó**: Lưu `parent_comment_id` để hỗ trợ trả lời bình luận (Reply thread) theo cấu trúc cha – con.
