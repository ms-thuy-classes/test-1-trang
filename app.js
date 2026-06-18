// ============================================================
// QUIZ BUILDER - APP.JS (FULL VERSION - FIXED)
// ============================================================

// --- TAB SWITCHING ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
});

// --- TOGGLE SAMPLE ---
function toggleSample(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// --- CLEAR INPUT ---
function clearInput(id) {
    document.getElementById(id).value = '';
}

// ============================================================
// PARSERS
// ============================================================

function parseMatching(text) {
    if (!text.trim()) return [];
    const lines = text.trim().split('\n').filter(l => l.includes('|'));
    const result = [];
    lines.forEach((line, idx) => {
        const [a, b] = line.split('|').map(s => s.trim());
        if (a && b) result.push({ id: idx + 1, a, b });
    });
    return result;
}

function parseMCQ(text) {
    if (!text.trim()) return [];
    const blocks = text.trim().split(/\n\s*\n/);
    const result = [];
    let idCounter = 1;
    blocks.forEach(block => {
        const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 6) return;
        const question = lines[0];
        const options = {};
        let answer = '';
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const optMatch = line.match(/^([A-D])\.\s*(.+)$/i);
            if (optMatch) options[optMatch[1].toUpperCase()] = optMatch[2].trim();
            const ansMatch = line.match(/^Answer:\s*([A-D])$/i);
            if (ansMatch) answer = ansMatch[1].toUpperCase();
        }
        if (question && Object.keys(options).length === 4 && answer) {
            result.push({ id: idCounter++, q: question, options, ans: answer });
        }
    });
    return result;
}

function parseFIB(text) {
    if (!text.trim()) return [];
    const lines = text.trim().split('\n').filter(l => l.includes('|'));
    const result = [];
    lines.forEach((line, idx) => {
        const [sentence, ans] = line.split('|').map(s => s.trim());
        if (sentence && ans) result.push({ id: idx + 1, text: sentence, ans });
    });
    return result;
}

function parseWordOrder(text) {
    if (!text.trim()) return [];
    const lines = text.trim().split('\n').filter(l => l.includes('|'));
    const result = [];
    lines.forEach((line, idx) => {
        const [wordsStr, ans] = line.split('|').map(s => s.trim());
        if (wordsStr && ans) {
            const words = wordsStr.split('/').map(w => w.trim()).filter(w => w);
            result.push({ id: idx + 1, words, ans });
        }
    });
    return result;
}

function parsePara(text) {
    if (!text.trim()) return [];
    const lines = text.trim().split('\n').filter(l => l.includes('|'));
    const result = [];
    lines.forEach((line, idx) => {
        const [q, ans] = line.split('|').map(s => s.trim());
        if (q && ans) result.push({ id: idx + 1, q, ans });
    });
    return result;
}

function parseScramble(text) {
    if (!text.trim()) return [];
    const lines = text.trim().split('\n').filter(l => l.includes('|'));
    const result = [];
    lines.forEach((line, idx) => {
        const [word, hint] = line.split('|').map(s => s.trim());
        if (word && hint) result.push({ id: idx + 1, word: word.toUpperCase(), hint });
    });
    return result;
}

// === PARSER LISTENING MỚI - Hỗ trợ đoạn văn dài với (1), (2)... ===
function parseListening(text) {
    if (!text.trim()) return { audioUrl: '', passage: '', sentences: [] };
    
    let audioUrl = '';
    let passageLines = [];
    const answers = {};
    
    const lines = text.trim().split('\n');
    let mode = 'passage'; // 'passage' hoặc 'answers'
    
    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Dòng audio
        if (trimmed.toLowerCase().startsWith('audio:')) {
            audioUrl = trimmed.substring(6).trim();
            continue;
        }
        
        // Dấu phân cách
        if (trimmed === '---' || trimmed.toLowerCase() === '[answers]' || trimmed.toLowerCase() === '===answers===') {
            mode = 'answers';
            continue;
        }
        
        if (trimmed.toLowerCase() === '[passage]' || trimmed.toLowerCase() === '===passage===') {
            mode = 'passage';
            continue;
        }
        
        if (mode === 'answers' && trimmed.includes('|')) {
            const parts = trimmed.split('|').map(s => s.trim());
            const num = parts[0].replace(/\D/g, ''); // Chỉ lấy số
            const ans = parts[1];
            if (num && ans) answers[num] = ans;
        } else if (mode === 'passage') {
            passageLines.push(trimmed);
        }
    }
    
    const passage = passageLines.join('\n');
    
    // Tìm tất cả các ____ (N) trong passage
    const regex = /_+\s*\((\d+)\)/g;
    const foundNums = new Set();
    let match;
    while ((match = regex.exec(passage)) !== null) {
        foundNums.add(match[1]);
    }
    
    // Tạo câu hỏi theo thứ tự số
    const sentences = [];
    const sortedNums = Array.from(foundNums).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedNums.forEach(num => {
        if (answers[num]) {
            sentences.push({
                num: num,
                ans: answers[num]
            });
        }
    });
    
    return { audioUrl, passage, sentences };
}

// ============================================================
// BULK PASTE - Parse tất cả từ 1 ô lớn
// ============================================================

function addAllFromBulk() {
    const bulkText = document.getElementById('bulk-input').value;
    if (!bulkText.trim()) {
        document.getElementById('bulk-status').innerHTML = '<span class="status-error">❌ Ô trống!</span>';
        return;
    }
    
    // Tách theo delimiter ===NAME===
    const sections = {
        matching: '',
        mcq: '',
        fib: '',
        wordorder: '',
        para: '',
        scramble: '',
        listening: ''
    };
    
    const sectionNames = ['matching', 'mcq', 'fib', 'wordorder', 'para', 'scramble', 'listening'];
    
    // Regex tìm ===NAME===
    const delimiterRegex = /===\s*(MATCHING|MCQ|FIB|WORDORDER|PARA|SCRAMBLE|LISTENING)\s*===/gi;
    
    const parts = bulkText.split(delimiterRegex);
    
    // parts sẽ có dạng: [trước_delim_1, NAME_1, nội_dung_1, NAME_2, nội_dung_2, ...]
    for (let i = 1; i < parts.length; i += 2) {
        const name = parts[i].toLowerCase();
        const content = parts[i + 1] ? parts[i + 1].trim() : '';
        if (sections.hasOwnProperty(name)) {
            sections[name] = content;
        }
    }
    
    // Đổ vào từng textarea
    let count = 0;
    const mapping = {
        matching: 'input-matching',
        mcq: 'input-mcq',
        fib: 'input-fib',
        wordorder: 'input-wordorder',
        para: 'input-para',
        scramble: 'input-scramble',
        listening: 'input-listening'
    };
    
    for (const [key, textareaId] of Object.entries(mapping)) {
        if (sections[key]) {
            document.getElementById(textareaId).value = sections[key];
            count++;
        }
    }
    
    const statusEl = document.getElementById('bulk-status');
    if (count > 0) {
        statusEl.innerHTML = `<span class="status-success">✅ Đã phân vào ${count} tab thành công!</span>`;
    } else {
        statusEl.innerHTML = '<span class="status-error">❌ Không tìm thấy delimiter ===NAME===. Xem mẫu để biết cách nhập.</span>';
    }
    
    setTimeout(() => { statusEl.textContent = ''; }, 4000);
}

function toggleBulk() {
    const content = document.getElementById('bulk-content');
    const icon = document.getElementById('bulk-icon');
    const btn = document.querySelector('.btn-toggle-bulk');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.textContent = '▼';
        btn.innerHTML = '<span id="bulk-icon">▼</span> Thu hẹp';
    } else {
        content.classList.add('collapsed');
        icon.textContent = '▶';
        btn.innerHTML = '<span id="bulk-icon">▶</span> Mở rộng';
    }
}

// ============================================================
// GENERATE QUIZ
// ============================================================

function generateQuiz() {
    const statusEl = document.getElementById('generate-status');
    
    const matching = parseMatching(document.getElementById('input-matching').value);
    const mcq = parseMCQ(document.getElementById('input-mcq').value);
    const fib = parseFIB(document.getElementById('input-fib').value);
    const wordOrder = parseWordOrder(document.getElementById('input-wordorder').value);
    const para = parsePara(document.getElementById('input-para').value);
    const scramble = parseScramble(document.getElementById('input-scramble').value);
    const listening = parseListening(document.getElementById('input-listening').value);
    
    const totalQuestions = matching.length + mcq.length + fib.length + 
                          wordOrder.length + para.length + scramble.length + 
                          listening.sentences.length;
    
    if (totalQuestions === 0) {
        statusEl.innerHTML = '<span class="status-error">❌ Vui lòng nhập ít nhất 1 câu hỏi!</span>';
        return;
    }
    
    const quizTitle = document.getElementById('quizTitle').value || 'Learn with Ms. Thúy - English Quiz';
    const teacherName = document.getElementById('teacherName').value || 'Ms. Thúy';
    const timeLimit = document.getElementById('timeLimit').value;
    
    // Matching: xáo trộn cột B
    const shuffledB = [...matching].sort(() => Math.random() - 0.5);
    const matchingB = shuffledB.map((item, idx) => ({
        key: String.fromCharCode(65 + idx),
        text: item.b
    }));
    
    const matchingData = matching.map((item) => {
        const found = matchingB.find(b => b.text === item.b);
        return { id: item.id, a: item.a, b: item.b, ans: found.key };
    });
    
    let currentId = 1;
    const finalMatching = matchingData.map(m => ({ ...m, id: currentId++ }));
    const finalMcq = mcq.map(m => ({ ...m, id: currentId++ }));
    const finalFib = fib.map(f => ({ ...f, id: currentId++ }));
    const finalWordOrder = wordOrder.map(w => ({ ...w, id: currentId++ }));
    const finalPara = para.map(p => ({ ...p, id: currentId++ }));
    const finalScramble = scramble.map(s => ({ ...s, id: currentId++ }));
    
    const sections = [
        { name: 'matching', count: finalMatching.length, title: 'Matching (Nối từ)' },
        { name: 'mcq', count: finalMcq.length, title: 'Multiple Choice' },
        { name: 'fib', count: finalFib.length, title: 'Fill in the Blanks' },
        { name: 'wordorder', count: finalWordOrder.length, title: 'Word Order' },
        { name: 'para', count: finalPara.length, title: 'Paraphrasing' },
        { name: 'scramble', count: finalScramble.length, title: 'Scramble Words' },
        { name: 'listening', count: listening.sentences.length, title: 'Listening' }
    ].filter(s => s.count > 0);
    
    const html = buildQuizHTML({
        quizTitle, teacherName, timeLimit,
        matching: finalMatching, matchingB,
        mcq: finalMcq, fib: finalFib,
        wordOrder: finalWordOrder, para: finalPara,
        scramble: finalScramble, listening: listening,
        sections, totalQuestions
    });
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    statusEl.innerHTML = `<span class="status-success">✅ Đã tạo quiz thành công! (${totalQuestions} câu hỏi)</span>`;
}

// ============================================================
// BUILD HTML TEMPLATE
// ============================================================

function buildQuizHTML(data) {
    const { quizTitle, teacherName, timeLimit, matching, matchingB, mcq, fib, wordOrder, para, scramble, listening, sections, totalQuestions } = data;
    
    let sectionsHTML = '';
    let sectionIndex = 0;
    
    if (matching.length > 0) {
        sectionIndex++;
        sectionsHTML += `
        <section class="quiz-section" id="section${sectionIndex}">
            <div class="section-header">
                <h2 class="section-title">Phần ${sectionIndex}: Matching (Nối từ)</h2>
                <div class="section-score">Đúng: <span id="score${sectionIndex}">0</span>/${matching.length}</div>
            </div>
            <p style="margin-bottom: 20px; font-weight: 600;">Hãy ghép các từ/cụm từ ở cột A với từ/cụm từ đồng nghĩa thích hợp ở cột B.</p>
            <div id="matching-container"></div>
            <div class="section-actions">
                <button class="btn btn-reset" onclick="resetSection(${sectionIndex})">Làm lại</button>
                <button class="btn btn-check" onclick="checkSection(${sectionIndex})">Kiểm tra</button>
            </div>
        </section>`;
    }
    
    if (mcq.length > 0) {
        sectionIndex++;
        sectionsHTML += `
        <section class="quiz-section" id="section${sectionIndex}">
            <div class="section-header">
                <h2 class="section-title">Phần ${sectionIndex}: Multiple Choice</h2>
                <div class="section-score">Đúng: <span id="score${sectionIndex}">0</span>/${mcq.length}</div>
            </div>
            <p style="margin-bottom: 20px; font-weight: 600;">Chọn đáp án đúng nhất (A, B, C hoặc D).</p>
            <div id="mcq-container"></div>
            <div class="section-actions">
                <button class="btn btn-reset" onclick="resetSection(${sectionIndex})">Làm lại</button>
                <button class="btn btn-check" onclick="checkSection(${sectionIndex})">Kiểm tra</button>
            </div>
        </section>`;
    }
    
    if (fib.length > 0) {
        sectionIndex++;
        sectionsHTML += `
        <section class="quiz-section" id="section${sectionIndex}">
            <div class="section-header">
                <h2 class="section-title">Phần ${sectionIndex}: Fill in the Blanks</h2>
                <div class="section-score">Đúng: <span id="score${sectionIndex}">0</span>/${fib.length}</div>
            </div>
            <p style="margin-bottom: 15px; font-weight: 600;">Chọn từ thích hợp từ danh sách để điền vào chỗ trống. <em>Nhấn vào chỗ trống, sau đó nhấn vào từ. Nhấn lại từ đã chọn để hủy.</em></p>
            <div class="word-bank" id="fib-bank"></div>
            <div id="fib-container"></div>
            <div class="section-actions">
                <button class="btn btn-reset" onclick="resetSection(${sectionIndex})">Làm lại</button>
                <button class="btn btn-check" onclick="checkSection(${sectionIndex})">Kiểm tra</button>
            </div>
        </section>`;
    }
    
    if (wordOrder.length > 0) {
        sectionIndex++;
        sectionsHTML += `
        <section class="quiz-section" id="section${sectionIndex}">
            <div class="section-header">
                <h2 class="section-title">Phần ${sectionIndex}: Word Order</h2>
                <div class="section-score">Đúng: <span id="score${sectionIndex}">0</span>/${wordOrder.length}</div>
            </div>
            <p style="margin-bottom: 20px; font-weight: 600;">Sắp xếp các từ xáo trộn thành câu hoàn chỉnh. <em>Nhấn vào từ để di chuyển.</em></p>
            <div id="word-order-container"></div>
            <div class="section-actions">
                <button class="btn btn-reset" onclick="resetSection(${sectionIndex})">Làm lại</button>
                <button class="btn btn-check" onclick="checkSection(${sectionIndex})">Kiểm tra</button>
            </div>
        </section>`;
    }
    
    if (para.length > 0) {
        sectionIndex++;
        sectionsHTML += `
        <section class="quiz-section" id="section${sectionIndex}">
            <div class="section-header">
                <h2 class="section-title">Phần ${sectionIndex}: Paraphrasing</h2>
                <div class="section-score">Đúng: <span id="score${sectionIndex}">0</span>/${para.length}</div>
            </div>
            <p style="margin-bottom: 20px; font-weight: 600;">Viết lại câu dựa vào từ gợi ý sao cho nghĩa không đổi.</p>
            <div id="para-container"></div>
            <div class="section-actions">
                <button class="btn btn-reset" onclick="resetSection(${sectionIndex})">Làm lại</button>
                <button class="btn btn-check" onclick="checkSection(${sectionIndex})">Kiểm tra</button>
            </div>
        </section>`;
    }
    
    if (scramble.length > 0) {
        sectionIndex++;
        sectionsHTML += `
        <section class="quiz-section" id="section${sectionIndex}">
            <div class="section-header">
                <h2 class="section-title">Phần ${sectionIndex}: Scramble Words</h2>
                <div class="section-score">Đúng: <span id="score${sectionIndex}">0</span>/${scramble.length}</div>
            </div>
            <p style="margin-bottom: 20px; font-weight: 600;">Sắp xếp các chữ cái bị xáo trộn thành từ có nghĩa. <em>Nhấn vào chữ cái để di chuyển.</em></p>
            <div id="scramble-container"></div>
            <div class="section-actions">
                <button class="btn btn-reset" onclick="resetSection(${sectionIndex})">Làm lại</button>
                <button class="btn btn-check" onclick="checkSection(${sectionIndex})">Kiểm tra</button>
            </div>
        </section>`;
    }
    
    // === LISTENING MỚI - Đoạn văn dài với ô nhập inline ===
    if (listening.sentences.length > 0) {
        sectionIndex++;
        sectionsHTML += `
        <section class="quiz-section" id="section${sectionIndex}">
            <div class="section-header">
                <h2 class="section-title">Phần ${sectionIndex}: Listening</h2>
                <div class="section-score">Đúng: <span id="score${sectionIndex}">0</span>/${listening.sentences.length}</div>
            </div>
            <p style="margin-bottom: 20px; font-weight: 600;">Nghe file audio và điền từ thích hợp vào chỗ trống trong đoạn văn.</p>
            
            <div class="audio-player-wrapper">
                <h3>🎧 BÀI NGHE</h3>
                <audio controls id="listening-audio">
                    <source src="${listening.audioUrl}" type="audio/mpeg">
                    Trình duyệt của bạn không hỗ trợ phát audio.
                </audio>
            </div>
            
            <div class="listening-scroll-controls">
                <button class="btn-scroll" onclick="scrollListening('top')">↑ Lên đầu</button>
                <button class="btn-scroll" onclick="scrollListening('bottom')">↓ Xuống cuối</button>
            </div>
            
            <div class="listening-passage-wrapper" id="listening-scroll-area">
                <div id="listening-passage"></div>
            </div>
            
            <div class="section-actions">
                <button class="btn btn-reset" onclick="resetSection(${sectionIndex})">Làm lại</button>
                <button class="btn btn-check" onclick="checkSection(${sectionIndex})">Kiểm tra</button>
            </div>
        </section>`;
    }
    
    const timerHTML = timeLimit ? `
        <div class="score-item" style="background:#000;color:#fff;padding:5px 12px;border:2px solid #000;">
            ⏱️ <span id="timer">00:00</span>
        </div>` : '';
    
    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${quizTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root {
    --bg-gradient: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
    --card-bg: #ffffff;
    --border: 3px solid #000000;
    --shadow: 6px 6px 0px #000000;
    --shadow-hover: 8px 8px 0px #000000;
    --color-correct: #86efac;
    --color-wrong: #fca5a5;
    --color-primary: #c4b5fd;
    --color-accent: #fde68a;
    --text-main: #111111;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; scroll-padding-top: 140px; }
body { font-family: 'Inter', sans-serif; background: var(--bg-gradient); color: var(--text-main); line-height: 1.6; min-height: 100vh; padding-bottom: 50px; }
h1, h2, h3, .brand { font-family: 'Space Grotesk', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: -0.5px; }
.sticky-header { position: sticky; top: 0; z-index: 1000; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: var(--border); box-shadow: 0 4px 0 rgba(0,0,0,0.1); padding: 15px 20px; display: flex; flex-wrap: wrap; gap: 15px; align-items: center; justify-content: space-between; }
.brand { font-size: 1.5rem; background: var(--color-accent); padding: 5px 15px; border: var(--border); box-shadow: 3px 3px 0 #000; transform: rotate(-2deg); }
.student-info { display: flex; gap: 10px; align-items: center; flex: 1; min-width: 250px; }
.student-info input { flex: 1; padding: 10px; border: var(--border); font-family: 'Inter', sans-serif; font-weight: 600; font-size: 1rem; outline: none; }
.score-board { display: flex; gap: 15px; align-items: center; background: var(--color-primary); padding: 10px 20px; border: var(--border); box-shadow: var(--shadow); font-weight: 800; font-size: 1.1rem; }
.score-item span { color: #fff; text-shadow: 1px 1px 0 #000; }
.score-big { font-size: 1.4rem; background: #000; color: #fff; padding: 2px 8px; margin-left: 5px; }
.container { max-width: 900px; margin: 40px auto; padding: 0 20px; display: flex; flex-direction: column; gap: 40px; }
.quiz-section { background: var(--card-bg); border: var(--border); box-shadow: var(--shadow); padding: 30px; transition: all 0.3s; }
.quiz-section:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-hover); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px dashed #000; flex-wrap: wrap; gap: 10px; }
.section-title { font-size: 1.4rem; background: #000; color: #fff; padding: 8px 16px; display: inline-block; }
.section-score { font-weight: 700; background: var(--color-accent); padding: 5px 12px; border: 2px solid #000; }
.question-block { margin-bottom: 25px; padding: 20px; border: 2px solid #000; background: #fafafa; transition: all 0.3s; }
.question-block.is-correct { background: var(--color-correct); }
.question-block.is-wrong { background: var(--color-wrong); }
.q-text { font-weight: 700; margin-bottom: 15px; font-size: 1.05rem; }
.matching-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; align-items: center; }
.matching-a { font-weight: 600; padding: 10px; background: #fff; border: 2px solid #000; }
select.matching-select { width: 100%; padding: 10px; border: 2px solid #000; font-family: 'Inter', sans-serif; font-weight: 600; background: #fff; cursor: pointer; outline: none; }
.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.option-label { display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid #000; background: #fff; cursor: pointer; transition: all 0.2s; font-weight: 600; }
.option-label:hover { background: var(--color-primary); transform: translate(-2px,-2px); box-shadow: 3px 3px 0 #000; }
.option-label input[type="radio"] { accent-color: #000; width: 18px; height: 18px; }
.word-bank { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px; padding: 15px; border: 2px dashed #000; background: #f0f0f0; }
.word-chip { padding: 8px 16px; background: #fff; border: 2px solid #000; font-weight: 700; cursor: pointer; transition: all 0.2s; user-select: none; }
.word-chip:hover { background: var(--color-accent); transform: translateY(-2px); box-shadow: 3px 3px 0 #000; }
.word-chip.used { opacity: 0.3; cursor: not-allowed; text-decoration: line-through; }
.blank { display: inline-block; min-width: 120px; padding: 5px 10px; border-bottom: 3px solid #000; background: #fff; font-weight: 700; text-align: center; cursor: pointer; margin: 0 5px; }
.blank.active { background: var(--color-accent); transform: scale(1.05); }
.blank.filled { border: 2px solid #000; background: #e0e7ff; }
.word-order-area { min-height: 60px; border: 2px solid #000; background: #fff; padding: 15px; margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.word-order-area .word-chip { background: var(--color-primary); color: #fff; }
.word-order-controls { display: flex; gap: 10px; margin-bottom: 15px; }
.para-input { width: 100%; padding: 15px; border: 2px solid #000; font-family: 'Inter', sans-serif; font-size: 1rem; margin-top: 10px; outline: none; }
.para-input:focus { box-shadow: var(--shadow); background: #fffef0; }
.btn { padding: 12px 24px; border: 2px solid #000; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; text-transform: uppercase; display: inline-flex; align-items: center; gap: 8px; }
.btn-check { background: var(--color-correct); color: #000; }
.btn-reset { background: var(--color-wrong); color: #000; }
.btn-undo { background: #cbd5e1; font-size: 0.9rem; padding: 8px 16px; }
.btn-clear { background: #94a3b8; font-size: 0.9rem; padding: 8px 16px; }
.btn:hover { transform: translate(-2px,-2px); box-shadow: 4px 4px 0 #000; }
.btn:active { transform: translate(0,0); box-shadow: 0 0 0 #000; }
.section-actions { display: flex; gap: 15px; margin-top: 25px; justify-content: flex-end; flex-wrap: wrap; }
.matching-column-b { margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 3px solid #000; box-shadow: 4px 4px 0 #000; }
.column-b-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.column-b-item { padding: 12px 15px; background: #fff; border: 2px solid #000; font-weight: 600; }
.matching-questions { display: flex; flex-direction: column; gap: 15px; }
.audio-player-wrapper { background: linear-gradient(135deg, #c4b5fd 0%, #8ec5fc 100%); border: 3px solid #000; box-shadow: 4px 4px 0 #000; padding: 20px; margin-bottom: 25px; text-align: center; }
.audio-player-wrapper h3 { margin-bottom: 12px; font-size: 1.1rem; color: #000; }
.audio-player-wrapper audio { width: 100%; max-width: 500px; outline: none; }
.listening-passage-wrapper { background: #fffef0; border: 3px solid #000; padding: 20px; margin-bottom: 20px; max-height: 400px; overflow-y: auto; font-size: 1.05rem; line-height: 2.2; box-shadow: 3px 3px 0 #000; }
.listening-passage-wrapper::-webkit-scrollbar { width: 12px; }
.listening-passage-wrapper::-webkit-scrollbar-track { background: #f0f0f0; border: 1px solid #000; }
.listening-passage-wrapper::-webkit-scrollbar-thumb { background: var(--color-primary); border: 2px solid #000; }
.listening-scroll-controls { display: flex; gap: 10px; margin-bottom: 15px; justify-content: flex-end; }
.btn-scroll { padding: 6px 14px; border: 2px solid #000; background: var(--color-accent); font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
.btn-scroll:hover { transform: translate(-2px,-2px); box-shadow: 3px 3px 0 #000; }
.listening-blank-input { display: inline-block; min-width: 100px; padding: 4px 8px; border: 2px solid #000; border-bottom: 3px solid #000; background: #fff; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1rem; text-align: center; outline: none; margin: 0 4px; transition: all 0.2s; }
.listening-blank-input:focus { background: var(--color-accent); box-shadow: 2px 2px 0 #000; transform: translate(-1px, -1px); }
.listening-blank-input.filled { background: #e0e7ff; }
.listening-blank-input.is-correct { background: var(--color-correct) !important; }
.listening-blank-input.is-wrong { background: var(--color-wrong) !important; }
.listening-num-label { font-weight: 700; color: #000; background: var(--color-accent); padding: 2px 6px; border: 1px solid #000; font-size: 0.85rem; margin-left: 2px; }
.quiz-section.is-locked .question-block,
.quiz-section.is-locked .listening-passage-wrapper { pointer-events: none; opacity: 0.85; cursor: not-allowed; }
.quiz-section.is-locked .question-block.is-correct,
.quiz-section.is-locked .question-block.is-wrong { opacity: 1; }
@media (max-width: 768px) {
    .sticky-header { flex-direction: column; align-items: stretch; }
    .score-board { justify-content: space-between; flex-wrap: wrap; }
    .options-grid, .matching-row { grid-template-columns: 1fr; }
    .quiz-section { padding: 20px; }
}
</style>
</head>
<body>
<header class="sticky-header">
    <div class="brand">Learn with ${teacherName}</div>
    <div class="student-info">
        <label style="font-weight:700;">Học sinh:</label>
        <input type="text" id="studentName" placeholder="Nhập tên của bạn...">
    </div>
    <div class="score-board">
        <div class="score-item">Đúng: <span id="totalCorrect">0</span>/<span id="totalQuestions">${totalQuestions}</span></div>
        <div class="score-item">Điểm: <span class="score-big" id="totalScore">0.0</span>/10</div>
        ${timerHTML}
    </div>
</header>
<div class="container">
${sectionsHTML}
</div>
<script>
// === DATA ===
const matchingData = ${JSON.stringify(matching)};
const matchingB = ${JSON.stringify(matchingB)};
const mcqData = ${JSON.stringify(mcq)};
const fibData = ${JSON.stringify(fib)};
const wordOrderData = ${JSON.stringify(wordOrder)};
const paraData = ${JSON.stringify(para)};
const scrambleData = ${JSON.stringify(scramble)};
const listeningPassage = ${JSON.stringify(listening.passage)};
const listeningData = ${JSON.stringify(listening.sentences)};
const sectionMap = ${JSON.stringify(sections.map((s, i) => ({ name: s.name, sectionNum: i + 1, count: s.count })))};

// === STATE ===
let scores = {};
sectionMap.forEach(s => scores[s.sectionNum] = 0);
let activeFibBlank = null;

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    sectionMap.forEach(s => {
        if (s.name === 'matching') renderMatching();
        if (s.name === 'mcq') renderMCQ();
        if (s.name === 'fib') renderFIB();
        if (s.name === 'wordorder') renderWordOrder();
        if (s.name === 'para') renderParaphrasing();
        if (s.name === 'scramble') renderScramble();
        if (s.name === 'listening') renderListening();
    });
    updateTotalScore();
    ${timeLimit ? `startTimer(${timeLimit});` : ''}
});

// === RENDER ===
function renderMatching() {
    const container = document.getElementById('matching-container');
    let html = '<div class="matching-column-b"><h3 style="margin-bottom:15px;">📋 CỘT B</h3><div class="column-b-grid">' +
        matchingB.map(i => '<div class="column-b-item"><strong>' + i.key + '.</strong> ' + i.text + '</div>').join('') +
        '</div></div><div class="matching-questions">';
    matchingData.forEach(item => {
        let opts = '<option value="">-- Chọn --</option>';
        matchingB.forEach(o => opts += '<option value="' + o.key + '">' + o.key + '. ' + o.text + '</option>');
        html += '<div class="question-block matching-row" data-id="' + item.id + '" data-ans="' + item.ans + '"><div class="matching-a">' + item.id + '. ' + item.a + '</div><select class="matching-select" onchange="clearStatus(this.closest(\\'.question-block\\'))">' + opts + '</select></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderMCQ() {
    const container = document.getElementById('mcq-container');
    let html = '';
    mcqData.forEach(item => {
        html += '<div class="question-block" data-id="' + item.id + '" data-ans="' + item.ans + '"><div class="q-text">' + item.id + '. ' + item.q + '</div><div class="options-grid">';
        Object.entries(item.options).forEach(([k, v]) => {
            html += '<label class="option-label" onclick="clearStatus(this.closest(\\'.question-block\\'))"><input type="radio" name="q' + item.id + '" value="' + k + '"><span>' + k + '. ' + v + '</span></label>';
        });
        html += '</div></div>';
    });
    container.innerHTML = html;
}

function renderFIB() {
    const bank = document.getElementById('fib-bank');
    const container = document.getElementById('fib-container');
    const words = [...fibData.map(d => d.ans)].sort(() => Math.random() - 0.5);
    bank.innerHTML = words.map(w => '<div class="word-chip" onclick="selectFibWord(this, \\'' + w.replace(/'/g, "\\\\'") + '\\')">' + w + '</div>').join('');
    container.innerHTML = fibData.map(item => '<div class="question-block" data-id="' + item.id + '" data-ans="' + item.ans.toLowerCase().trim() + '"><div class="q-text">' + item.id + '. ' + item.text.replace(/_+/, '<span class="blank" onclick="setActiveBlank(this)" data-val=""></span>') + '</div></div>').join('');
}

function renderWordOrder() {
    const container = document.getElementById('word-order-container');
    container.innerHTML = wordOrderData.map(item => {
        const shuffled = [...item.words].sort(() => Math.random() - 0.5);
        return '<div class="question-block" data-id="' + item.id + '" data-ans="' + item.ans + '"><div class="q-text">' + item.id + '. Sắp xếp câu:</div><div class="word-order-controls"><button class="btn btn-undo" onclick="undoWord(' + item.id + ')">↩ Undo</button><button class="btn btn-clear" onclick="clearWord(' + item.id + ')">✕ Xóa hết</button></div><div class="word-order-area" id="answer-' + item.id + '"></div><div class="word-bank" id="bank-' + item.id + '">' + shuffled.map(w => '<div class="word-chip" onclick="moveWord(this, \\'bank-' + item.id + '\\', \\'answer-' + item.id + '\\')">' + w + '</div>').join('') + '</div></div>';
    }).join('');
}

function renderParaphrasing() {
    const container = document.getElementById('para-container');
    container.innerHTML = paraData.map(item => '<div class="question-block" data-id="' + item.id + '" data-ans="' + item.ans + '"><div class="q-text">' + item.id + '. ' + item.q + '</div><input type="text" class="para-input" placeholder="Nhập câu trả lời..." oninput="clearStatus(this.closest(\\'.question-block\\'))"></div>').join('');
}

function renderScramble() {
    const container = document.getElementById('scramble-container');
    container.innerHTML = scrambleData.map(item => {
        let chars = item.word.split('').sort(() => Math.random() - 0.5);
        return '<div class="question-block" data-id="' + item.id + '" data-ans="' + item.word + '"><div class="q-text">' + item.id + '. ' + item.hint + '</div><div class="word-order-controls"><button class="btn btn-undo" onclick="undoScramble(' + item.id + ')">↩ Undo</button><button class="btn btn-clear" onclick="clearScramble(' + item.id + ')">✕ Xóa hết</button></div><div class="word-order-area" id="scramble-answer-' + item.id + '" style="min-height:50px;justify-content:center;font-size:1.2rem;letter-spacing:2px;"></div><div class="word-bank" id="scramble-bank-' + item.id + '" style="justify-content:center;">' + chars.map(c => '<div class="word-chip" onclick="moveScrambleChar(this, \\'scramble-bank-' + item.id + '\\', \\'scramble-answer-' + item.id + '\\')">' + c + '</div>').join('') + '</div></div>';
    }).join('');
}

// === RENDER LISTENING MỚI - Đoạn văn với input inline ===
function renderListening() {
    const passageDiv = document.getElementById('listening-passage');
    if (!passageDiv) return;
    
    // Thay thế ____ (N) bằng input có thể gõ
    let html = listeningPassage.replace(/_+\\s*\\((\\d+)\\)/g, (match, num) => {
        return '<input type="text" class="listening-blank-input" data-num="' + num + '" placeholder="(' + num + ')" autocomplete="off"> <span class="listening-num-label">(' + num + ')</span>';
    });
    
    // Xuống dòng
    html = html.replace(/\\n/g, '<br>');
    
    passageDiv.innerHTML = html;
    
    // Thêm sự kiện input để đổi màu khi gõ
    passageDiv.querySelectorAll('.listening-blank-input').forEach(input => {
        input.addEventListener('input', (e) => {
            if (e.target.value.trim()) {
                e.target.classList.add('filled');
            } else {
                e.target.classList.remove('filled');
            }
            // Xóa trạng thái chấm điểm cũ
            const section = e.target.closest('.quiz-section');
            if (section) section.classList.remove('is-locked');
            clearStatus(e.target.closest('.question-block') || e.target.closest('.listening-passage-wrapper'));
        });
    });
}

// === SCROLL LISTENING ===
function scrollListening(direction) {
    const area = document.getElementById('listening-scroll-area');
    if (!area) return;
    if (direction === 'top') {
        area.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
    }
}

// === INTERACTION ===
function clearStatus(block) { if (block) block.classList.remove('is-correct', 'is-wrong'); }

function setActiveBlank(el) {
    document.querySelectorAll('.blank').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    activeFibBlank = el;
}

function selectFibWord(chip, word) {
    if (chip.classList.contains('used')) {
        const blanks = document.querySelectorAll('.blank');
        blanks.forEach(blank => {
            if (blank.dataset.val === word) {
                blank.textContent = '';
                blank.dataset.val = '';
                blank.classList.remove('filled', 'active');
            }
        });
        chip.classList.remove('used');
        activeFibBlank = null;
        clearStatus(chip.closest('.question-block'));
        return;
    }

    let targetBlank = activeFibBlank;
    if (!targetBlank) {
        const blanks = document.querySelectorAll('.blank:not(.filled)');
        if (blanks.length > 0) {
            targetBlank = blanks[0];
        } else {
            return;
        }
    }

    if (targetBlank.dataset.val) {
        const oldWord = targetBlank.dataset.val;
        const bankChips = document.querySelectorAll('#fib-bank .word-chip');
        bankChips.forEach(c => {
            if (c.textContent.trim() === oldWord && c.classList.contains('used')) {
                c.classList.remove('used');
            }
        });
    }

    targetBlank.textContent = word;
    targetBlank.dataset.val = word;
    targetBlank.classList.add('filled');
    targetBlank.classList.remove('active');
    chip.classList.add('used');
    activeFibBlank = null;
    clearStatus(chip.closest('.question-block'));
}

function moveWord(chip, fromId, toId) {
    const to = document.getElementById(toId), from = document.getElementById(fromId);
    if (chip.parentElement.id === fromId) to.appendChild(chip); else from.appendChild(chip);
    clearStatus(chip.closest('.question-block'));
}

function undoWord(id) {
    const ans = document.getElementById('answer-' + id), bank = document.getElementById('bank-' + id);
    const chips = ans.querySelectorAll('.word-chip');
    if (chips.length > 0) { bank.appendChild(chips[chips.length - 1]); clearStatus(ans.closest('.question-block')); }
}

function clearWord(id) {
    const ans = document.getElementById('answer-' + id), bank = document.getElementById('bank-' + id);
    ans.querySelectorAll('.word-chip').forEach(c => bank.appendChild(c));
    clearStatus(ans.closest('.question-block'));
}

function moveScrambleChar(chip, fromId, toId) {
    const to = document.getElementById(toId), from = document.getElementById(fromId);
    if (chip.parentElement.id === fromId) to.appendChild(chip); else from.appendChild(chip);
    clearStatus(chip.closest('.question-block'));
}

function undoScramble(id) {
    const ans = document.getElementById('scramble-answer-' + id), bank = document.getElementById('scramble-bank-' + id);
    const chips = ans.querySelectorAll('.word-chip');
    if (chips.length > 0) { bank.appendChild(chips[chips.length - 1]); clearStatus(ans.closest('.question-block')); }
}

function clearScramble(id) {
    const ans = document.getElementById('scramble-answer-' + id), bank = document.getElementById('scramble-bank-' + id);
    ans.querySelectorAll('.word-chip').forEach(c => bank.appendChild(c));
    clearStatus(ans.closest('.question-block'));
}

// === GRADING ===
function normalizeText(t) { return t.toLowerCase().replace(/[.,\\/#!$%^&*;:{}=\\-_\\\`~()]/g, '').replace(/\\s{2,}/g, ' ').trim(); }

function checkSection(num) {
    let correct = 0;
    const sectionInfo = sectionMap.find(s => s.sectionNum === num);
    const section = document.getElementById('section' + num);
    
    if (sectionInfo.name === 'listening') {
        // === CHECK LISTENING ĐẶC BIỆT ===
        const inputs = section.querySelectorAll('.listening-blank-input');
        inputs.forEach(input => {
            const num = input.dataset.num;
            const item = listeningData.find(d => d.num === num);
            if (!item) return;
            
            const userAns = input.value.trim().toLowerCase();
            const correctAns = item.ans.toLowerCase().trim();
            
            input.classList.remove('is-correct', 'is-wrong');
            if (userAns === correctAns) {
                input.classList.add('is-correct');
                correct++;
            } else {
                input.classList.add('is-wrong');
            }
        });
    } else {
        const blocks = section.querySelectorAll('.question-block');
        blocks.forEach(block => {
            const ans = block.dataset.ans.toLowerCase().trim();
            let userAns = '', isCorrect = false;
            if (sectionInfo.name === 'matching') {
                userAns = block.querySelector('select').value.toLowerCase();
                isCorrect = userAns === ans;
            } else if (sectionInfo.name === 'mcq') {
                const c = block.querySelector('input[type="radio"]:checked');
                if (c) { userAns = c.value.toLowerCase(); isCorrect = userAns === ans; }
            } else if (sectionInfo.name === 'fib') {
                const b = block.querySelector('.blank');
                userAns = b.dataset.val.toLowerCase().trim();
                isCorrect = userAns === ans;
            } else if (sectionInfo.name === 'wordorder') {
                const area = block.querySelector('.word-order-area');
                userAns = Array.from(area.querySelectorAll('.word-chip')).map(c => c.textContent).join(' ').toLowerCase();
                isCorrect = normalizeText(userAns) === normalizeText(ans);
            } else if (sectionInfo.name === 'para') {
                userAns = block.querySelector('.para-input').value.toLowerCase();
                isCorrect = normalizeText(userAns) === normalizeText(ans);
            } else if (sectionInfo.name === 'scramble') {
                const area = block.querySelector('#scramble-answer-' + block.dataset.id);
                userAns = Array.from(area.querySelectorAll('.word-chip')).map(c => c.textContent).join('');
                isCorrect = userAns === ans.toUpperCase();
            }
            if (isCorrect) { block.classList.add('is-correct'); block.classList.remove('is-wrong'); correct++; }
            else { block.classList.add('is-wrong'); block.classList.remove('is-correct'); }
        });
    }
    
    scores[num] = correct;
    document.getElementById('score' + num).textContent = correct;
    updateTotalScore();
    
    // KHÓA BÀI TẬP
    section.classList.add('is-locked');
}

function resetSection(num) {
    scores[num] = 0;
    document.getElementById('score' + num).textContent = 0;
    const section = document.getElementById('section' + num);
    const sectionInfo = sectionMap.find(s => s.sectionNum === num);
    
    if (sectionInfo.name === 'listening') {
        section.querySelectorAll('.listening-blank-input').forEach(input => {
            input.value = '';
            input.classList.remove('filled', 'is-correct', 'is-wrong');
        });
    } else {
        section.querySelectorAll('.question-block').forEach(block => {
            block.classList.remove('is-correct', 'is-wrong');
            if (sectionInfo.name === 'matching') block.querySelector('select').value = '';
            else if (sectionInfo.name === 'mcq') block.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
            else if (sectionInfo.name === 'fib') {
                const b = block.querySelector('.blank');
                b.textContent = ''; b.dataset.val = ''; b.classList.remove('filled', 'active');
            }
            else if (sectionInfo.name === 'wordorder') clearWord(block.dataset.id);
            else if (sectionInfo.name === 'para') block.querySelector('.para-input').value = '';
            else if (sectionInfo.name === 'scramble') clearScramble(block.dataset.id);
        });
        if (sectionInfo.name === 'fib') document.querySelectorAll('#fib-bank .word-chip').forEach(c => c.classList.remove('used'));
    }
    
    section.classList.remove('is-locked');
    updateTotalScore();
}

function updateTotalScore() {
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const totalQ = ${totalQuestions};
    const score10 = (total / totalQ * 10).toFixed(1);
    document.getElementById('totalCorrect').textContent = total;
    document.getElementById('totalScore').textContent = score10;
}

${timeLimit ? `
function startTimer(minutes) {
    let seconds = minutes * 60;
    const timerEl = document.getElementById('timer');
    const interval = setInterval(() => {
        const m = Math.floor(seconds / 60), s = seconds % 60;
        timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        if (seconds <= 0) {
            clearInterval(interval);
            alert('⏰ Hết giờ làm bài!');
            sectionMap.forEach(s => checkSection(s.sectionNum));
        }
        seconds--;
    }, 1000);
}` : ''}
<\/script>
</body>
</html>`;
}

// ============================================================
// QUICK EXAMPLES (giữ nguyên cho từng tab riêng lẻ)
// ============================================================

function toggleExamples() {
    const content = document.getElementById('examples-content');
    const icon = document.getElementById('toggle-icon');
    const btn = document.querySelector('.btn-toggle-examples');
    if (!content) return;
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.textContent = '▼';
        btn.innerHTML = '<span id="toggle-icon">▼</span> Thu hẹp';
    } else {
        content.classList.add('collapsed');
        icon.textContent = '▶';
        btn.innerHTML = '<span id="toggle-icon">▶</span> Mở rộng';
    }
}

function addQuickExample(type) {
    const examples = {
        matching: `More and more | Increasingly\nUse | Employ\nAdvertisements | Promotional campaigns`,
        mcq: `What is the capital of France?\nA. London\nB. Paris\nC. Berlin\nD. Madrid\nAnswer: B`,
        fib: `The capital of France is ______________. | Paris\nShe goes to ______________ by bus. | school`,
        wordorder: `is / capital / Paris / . | The capital is Paris.`,
        para: `She is beautiful. (extremely) | She is extremely beautiful.`,
        scramble: `SCHOOL | Trường học\nTEACHER | Giáo viên`,
        listening: `Audio: https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3\nToday, I ____ (1) to the market. My friend ____ (2) with me.\n---\n1 | went\n2 | came`
    };
    
    const textarea = document.getElementById('input-' + type);
    if (textarea) {
        textarea.value = examples[type];
        const tabBtn = document.querySelector('.tab-btn[data-tab="' + type + '"]');
        if (tabBtn) tabBtn.click();
        const statusEl = document.getElementById('status-' + type);
        if (statusEl) {
            statusEl.textContent = '✅ Đã thêm ví dụ mẫu!';
            setTimeout(() => { statusEl.textContent = ''; }, 3000);
        }
    }
}
