class PinyinTyperGame {
    constructor(container, words) {
        this.container = container;
        this.allWords = words;
        this.currentRound = 0;
        this.totalRounds = 5;
        this.score = 0;
        
        this.targetWord = null;
        this.hasAnswered = false;
    }

    start() {
        this.currentRound = 0;
        this.score = 0;
        this.nextQuestion();
    }

    nextQuestion() {
        this.hasAnswered = false;
        
        // Pick target word based on current round index
        this.targetWord = this.allWords[this.currentRound % this.allWords.length];
        
        this.renderTyperArena();
    }

    renderTyperArena() {
        this.container.innerHTML = `
            <div class="quiz-wrapper" style="max-width: 420px; align-items:center;">
                <div style="font-size:12px; color:var(--text-muted); text-align:center; width:100%">
                    Câu hỏi ${this.currentRound + 1} / ${this.totalRounds}
                </div>
                
                <div class="quiz-question-box" style="width:100%; background:#ffffff; border:1px solid var(--border-color)">
                    <div class="quiz-question-label">Nhập Pinyin chính xác của từ này:</div>
                    <div class="quiz-question-text chinese" style="font-size: 56px;">${this.targetWord.hanzi}</div>
                    <div style="font-size:15px; color:var(--text-muted); margin-top:8px;">
                        Nghĩa: ${this.targetWord.meaning}
                    </div>
                </div>

                <div class="typer-input-container">
                    <input type="text" class="typer-input" id="typer-user-input" placeholder="Gõ Pinyin (ví dụ: ni hoặc ni3)..." autofocus autocomplete="off">
                    <button id="typer-check-btn" class="btn btn-primary" style="margin-top: 10px; justify-content:center;">Kiểm tra</button>
                </div>

                <div id="typer-feedback" class="quiz-explanation" style="display:none; width:100%"></div>
                
                <div style="display:flex; justify-content:flex-end; width:100%">
                    <button id="typer-next-btn" class="btn btn-primary" style="display:none;">Tiếp tục <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>
        `;

        // Focus input
        const input = document.getElementById("typer-user-input");
        input.focus();

        // Bind enter key
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                this.checkAnswer();
            }
        });

        // Bind check button
        document.getElementById("typer-check-btn").addEventListener("click", () => this.checkAnswer());
    }

    // Pinyin normalizer to support easy keyboard typing
    normalizePinyin(str) {
        if (!str) return "";
        return str.toLowerCase()
            .trim()
            .normalize("NFD") // Split characters into base letter + accent mark
            .replace(/[\u0300-\u036f]/g, "") // Remove all accent marks
            .replace(/[1-5]/g, "") // Remove tone numbers (e.g. ni3 -> ni)
            .replace(/ü/g, "v") // Map ü to v (standard typing convention)
            .replace(/u/g, "v") // Normalize both u and v to v to make comparison easy
            .replace(/[^a-z]/g, ""); // Strip spaces, hyphens, punctuation
    }

    checkAnswer() {
        if (this.hasAnswered) return;
        
        const userInput = document.getElementById("typer-user-input").value;
        const normUser = this.normalizePinyin(userInput);
        const normTarget = this.normalizePinyin(this.targetWord.pinyin);

        if (!userInput.trim()) return; // Don't submit blank
        
        this.hasAnswered = true;
        
        const inputEl = document.getElementById("typer-user-input");
        const feedbackEl = document.getElementById("typer-feedback");
        
        const isCorrect = normUser === normTarget;

        inputEl.disabled = true;
        document.getElementById("typer-check-btn").style.display = "none";

        if (isCorrect) {
            inputEl.classList.add("correct");
            this.score++;
            app.addXP(5); // 5 XP for correct typing
            
            // Speak pronunciation as reward
            app.playAudio(this.targetWord);
            
            feedbackEl.className = "quiz-explanation correct";
            feedbackEl.style.display = "block";
            feedbackEl.innerHTML = `
                <div style="font-weight:bold; color:var(--success)"><i class="fa-solid fa-circle-check"></i> Tuyệt vời! Bạn gõ đúng rồi.</div>
                <div style="margin-top:5px;">Pinyin chuẩn: <strong style="font-size:16px; color:var(--primary);">${this.targetWord.pinyin}</strong></div>
            `;
        } else {
            inputEl.classList.add("incorrect");
            
            // Speak pronunciation
            app.playAudio(this.targetWord);
            
            feedbackEl.className = "quiz-explanation";
            feedbackEl.style.display = "block";
            feedbackEl.innerHTML = `
                <div style="font-weight:bold; color:var(--error)"><i class="fa-solid fa-circle-xmark"></i> Chưa đúng!</div>
                <div style="margin-top:5px;">Pinyin của từ <strong>${this.targetWord.hanzi}</strong> là: <strong style="font-size:16px; color:var(--success);">${this.targetWord.pinyin}</strong></div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">(Bạn có thể gõ không dấu thanh hoặc dùng số ở cuối, ví dụ: <strong>${normTarget.replace(/v/g, "u/v")}</strong>)</div>
            `;
        }

        const nextBtn = document.getElementById("typer-next-btn");
        nextBtn.style.display = "inline-flex";
        nextBtn.addEventListener("click", () => {
            this.currentRound++;
            if (this.currentRound < this.totalRounds) {
                this.nextQuestion();
            } else {
                this.showSummary();
            }
        });
    }

    showSummary() {
        this.container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <i class="fa-solid fa-keyboard animate-fire" style="font-size:64px; color:var(--primary); margin-bottom:20px;"></i>
                <h2>Hoàn thành Luyện Gõ Pinyin!</h2>
                <p style="color:var(--text-muted); margin-bottom:25px;">
                    Bạn đã gõ đúng chính xác <strong>${this.score} / ${this.totalRounds}</strong> từ Pinyin!
                </p>
                <div style="background:var(--secondary); border:1px solid var(--border-color); padding: 15px; border-radius:var(--radius-md); max-width: 250px; margin: 0 auto 25px auto;">
                    <div style="font-size:14px; color:var(--text-muted)">Điểm tích lũy</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--success)">${this.score * 5} XP</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:5px;">+5 XP hoàn thành game</div>
                </div>
                <button class="btn btn-primary" onclick="app.exitGame()" style="margin: 0 auto">Quay lại Bảng điều khiển</button>
            </div>
        `;
        app.addXP(5);
    }

    destroy() {
        // Cleanup if any
    }
}

window.PinyinTyperGame = PinyinTyperGame;
