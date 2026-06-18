1. Cách thêm dữ liệu
Mở file HTML, tìm phần const QUIZ_CONFIG = {...} ở đầu thẻ <script>. Chỉ cần sửa trong khối này:
javascript
12345678910
2. Format dữ liệu cho từng phần
Phần
Format
Ví dụ
Matching
{ a: "Từ cột A", b: "Từ cột B" }
Cột B tự xáo trộn
MCQ
{ q: "Câu hỏi", options: {A, B, C, D}, ans: "B" }
Đáp án đúng là ký tự
Fill-in
{ text: "Câu có ___", ans: "đáp án" }
Dùng _ cho chỗ trống
Word Order
{ words: ["từ1", "từ2", ...], ans: "Câu đúng" }
Mảng từ xáo trộn
Paraphrasing
{ q: "Câu (gợi ý)", ans: "Câu đúng" }
Gợi ý trong ngoặc
Scramble
{ word: "WORD", hint: "Gợi ý" }
Từ viết HOA
Listening
{ audioUrl, passage, answers: {1: "went", ...} }
Dùng ____ (N)
3. Xóa phần không dùng
Chỉ cần xóa hoặc comment phần đó trong sections:
javascript
123456
4. Thời gian làm bài
Có giới hạn: timeLimit: 45 (45 phút)
Không giới hạn: timeLimit: null
