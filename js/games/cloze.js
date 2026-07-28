class ClozeGame {
    constructor(container, words) {
        this.container = container;
        this.allWords = words;
        this.currentRound = 0;
        this.totalRounds = 5;
        this.score = 0;
        
        this.targetWord = null;
        this.options = [];
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
        
        // Pick 3 distractors from the remaining words
        const distractors = this.allWords
            .filter(w => w.id !== this.targetWord.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        
        // Build options
        this.options = [this.targetWord, ...distractors];
        this.options.sort(() => Math.random() - 0.5);

        this.renderQuestion();
    }

    renderQuestion() {
        // Create cloze sentence by replacing target hanzi with a blank
        const regex = new RegExp(this.targetWord.hanzi, 'g');
        const clozeSentence = this.targetWord.example.replace(regex, '<span class="cloze-blank">___</span>');
        
        this.container.innerHTML = `
            <div class="quiz-wrapper">
                <div style="font-size:12px; color:var(--text-muted); text-align:center;">
                    Câu hỏi ${this.currentRound + 1} / ${this.totalRounds}
                </div>
                <div class="quiz-question-box" style="background:#ffffff; border:1px solid var(--border-color)">
                    <div class="quiz-question-label">Điền từ còn thiếu vào câu dưới đây:</div>
                    <div class="cloze-sentence-text">${clozeSentence}</div>
                    <div style="color:var(--success); font-size:16px; font-weight:600; margin-top:10px;">
                        "${this.targetWord.example_meaning}"
                    </div>
                </div>
                <div class="quiz-options-list" id="cloze-options"></div>
                <div id="cloze-explanation" class="quiz-explanation" style="display:none"></div>
                <div style="display:flex; justify-content:flex-end;">
                    <button id="cloze-next-btn" class="btn btn-primary" style="display:none;">Tiếp tục <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>
        `;

        const optionsList = document.getElementById("cloze-options");
        const letters = ["A", "B", "C", "D"];
        
        this.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.className = "quiz-option";
            btn.innerHTML = `
                <span class="quiz-option-index">${letters[idx]}</span>
                <span class="chinese" style="font-size:20px; font-family:var(--font-zh)">${opt.hanzi}</span>
                <span style="font-size:13px; color:var(--text-muted); margin-left:10px;">[${opt.pinyin}]</span>
            `;
            btn.addEventListener("click", () => this.handleAnswer(opt, btn));
            optionsList.appendChild(btn);
        });
    }

    handleAnswer(selectedOpt, btnEl) {
        if (this.hasAnswered) return;
        this.hasAnswered = true;

        const isCorrect = selectedOpt.id === this.targetWord.id;

        // Disable options
        document.querySelectorAll("#cloze-options .quiz-option").forEach(el => {
            el.style.pointerEvents = "none";
        });

        if (isCorrect) {
            btnEl.classList.add("correct");
            this.score++;
            app.addXP(4);
            
            // Speak full sentence on correct answer
            app.speakChinese(this.targetWord.example);
        } else {
            btnEl.classList.add("incorrect");
            
            // Find correct one
            const correctIdx = this.options.findIndex(opt => opt.id === this.targetWord.id);
            if (correctIdx !== -1) {
                const optionsList = document.getElementById("cloze-options");
                optionsList.children[correctIdx].classList.add("correct");
            }
            
            // Pronounce target word
            app.playAudio(this.targetWord);
        }

        // Show explanation
        const exp = document.getElementById("cloze-explanation");
        exp.style.display = "block";
        exp.innerHTML = `
            <div style="font-weight:bold; color:${isCorrect ? 'var(--success)' : 'var(--error)'}; margin-bottom:5px;">
                ${isCorrect ? '<i class="fa-solid fa-circle-check"></i> Đúng rồi!' : '<i class="fa-solid fa-circle-xmark"></i> Chưa chính xác!'}
            </div>
            <div style="font-size:16px; font-family:var(--font-zh); margin-bottom:5px; color:var(--primary)">${this.targetWord.example}</div>
            <div style="font-size:12px; color:var(--text-muted)">${this.targetWord.example_pinyin} — ${this.targetWord.example_meaning}</div>
        `;

        const nextBtn = document.getElementById("cloze-next-btn");
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
                <i class="fa-solid fa-square-minus animate-fire" style="font-size:64px; color:var(--primary); margin-bottom:20px;"></i>
                <h2>Hoàn thành Điền từ vào câu!</h2>
                <p style="color:var(--text-muted); margin-bottom:25px;">
                    Bạn đã giải chính xác <strong>${this.score} / ${this.totalRounds}</strong> ô trống trong câu!
                </p>
                <div style="background:var(--secondary); border:1px solid var(--border-color); padding: 15px; border-radius:var(--radius-md); max-width: 250px; margin: 0 auto 25px auto;">
                    <div style="font-size:14px; color:var(--text-muted)">Tổng điểm thưởng</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--success)">${this.score * 4} XP</div>
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

window.ClozeGame = ClozeGame;
