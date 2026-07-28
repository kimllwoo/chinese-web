class QuizGame {
    constructor(container, words) {
        this.container = container;
        this.allWords = words;
        this.currentRound = 0;
        this.totalRounds = 5;
        this.score = 0;
        
        this.targetWord = null;
        this.options = [];
        this.questionType = 0;
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
        
        // Randomize question type (0: Hanzi->Meaning, 1: Hanzi->Pinyin, 2: Meaning->Hanzi, 3: Audio->Hanzi)
        this.questionType = Math.floor(Math.random() * 4);
        
        // Build options
        this.options = [this.targetWord, ...distractors];
        this.options.sort(() => Math.random() - 0.5);

        this.renderQuestion();
    }

    renderQuestion() {
        let questionHTML = "";
        let instructionsText = "";
        
        if (this.questionType === 0) {
            instructionsText = "Chọn nghĩa chính xác của chữ Hán sau:";
            questionHTML = `<div class="quiz-question-text chinese">${this.targetWord.hanzi}</div>`;
        } else if (this.questionType === 1) {
            instructionsText = "Chọn Pinyin chính xác của chữ Hán sau:";
            questionHTML = `<div class="quiz-question-text chinese">${this.targetWord.hanzi}</div>`;
        } else if (this.questionType === 2) {
            instructionsText = "Chọn chữ Hán tương ứng với nghĩa sau:";
            questionHTML = `
                <div class="quiz-question-text" style="font-size:24px; color:var(--success);">
                    ${this.targetWord.meaning}
                </div>
                <div style="color:var(--text-muted); font-size:14px; margin-top:8px;">Pinyin: ${this.targetWord.pinyin}</div>
            `;
        } else if (this.questionType === 3) {
            instructionsText = "Nghe âm thanh và chọn chữ Hán chính xác:";
            questionHTML = `
                <button class="listen-audio-btn pulse-wave" id="quiz-audio-play" style="margin: 0 auto; width:80px; height:80px; font-size:28px;">
                    <i class="fa-solid fa-volume-high"></i>
                </button>
            `;
        }

        this.container.innerHTML = `
            <div class="quiz-wrapper">
                <div style="font-size:12px; color:var(--text-muted); text-align:center;">
                    Câu hỏi ${this.currentRound + 1} / ${this.totalRounds}
                </div>
                <div class="quiz-question-box">
                    <div class="quiz-question-label">${instructionsText}</div>
                    ${questionHTML}
                </div>
                <div class="quiz-options-list" id="options-list"></div>
                <div id="quiz-explanation-box" style="display:none"></div>
                <div style="display:flex; justify-content:flex-end;">
                    <button id="quiz-next-btn" class="btn btn-primary" style="display:none;">Tiếp tục <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>
        `;

        // Render options
        const optionsList = document.getElementById("options-list");
        this.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.className = "quiz-option";
            
            const letters = ["A", "B", "C", "D"];
            let optionText = "";
            if (this.questionType === 0) {
                optionText = opt.meaning;
            } else if (this.questionType === 1) {
                optionText = opt.pinyin;
            } else {
                optionText = opt.hanzi;
            }

            btn.innerHTML = `
                <span class="quiz-option-index">${letters[idx]}</span>
                <span class="${this.questionType >= 2 ? 'chinese' : ''}" style="${this.questionType >= 2 ? 'font-size:20px; font-family:var(--font-zh)' : ''}">${optionText}</span>
            `;
            
            btn.addEventListener("click", () => this.handleOptionClick(opt, btn));
            optionsList.appendChild(btn);
        });

        // TTS trigger for type 3
        if (this.questionType === 3) {
            app.playAudio(this.targetWord);
            document.getElementById("quiz-audio-play").addEventListener("click", () => {
                app.playAudio(this.targetWord);
            });
        }
    }

    handleOptionClick(selectedOpt, btnEl) {
        if (this.hasAnswered) return;
        this.hasAnswered = true;

        const isCorrect = selectedOpt.id === this.targetWord.id;
        
        // Disable option hovers and clicks
        document.querySelectorAll(".quiz-option").forEach(el => {
            el.style.pointerEvents = "none";
        });

        // Streak tracking
        let streak = parseInt(localStorage.getItem("longlong_quiz_streak") || "0");

        if (isCorrect) {
            btnEl.classList.add("correct");
            this.score++;
            app.addXP(4);
            
            streak++;
            localStorage.setItem("longlong_quiz_streak", streak.toString());
            if (streak >= 10) {
                app.unlockAchievement("a2"); // Unlock "Chúa tể Pinyin" achievement
            }
        } else {
            btnEl.classList.add("incorrect");
            streak = 0; // Reset streak
            localStorage.setItem("longlong_quiz_streak", "0");

            // Find and highlight correct option
            const optionsList = document.getElementById("options-list");
            const index = this.options.findIndex(opt => opt.id === this.targetWord.id);
            if (index !== -1) {
                optionsList.children[index].classList.add("correct");
            }
        }

        // Play audio pronunciation of word anyway for reinforcement
        app.playAudio(this.targetWord);

        // Render explanation box
        const expBox = document.getElementById("quiz-explanation-box");
        expBox.className = "quiz-explanation";
        expBox.style.display = "block";
        expBox.innerHTML = `
            <div style="font-weight:bold; color:${isCorrect ? 'var(--success)' : 'var(--error)'}; margin-bottom:5px;">
                ${isCorrect ? '<i class="fa-solid fa-circle-check"></i> Trả lời đúng!' : '<i class="fa-solid fa-circle-xmark"></i> Sai rồi!'}
            </div>
            <div><strong>Chữ Hán:</strong> ${this.targetWord.hanzi} [${this.targetWord.pinyin}] — ${this.targetWord.meaning}</div>
            <div style="margin-top:5px; font-size:12px;"><strong>Ví dụ:</strong> ${this.targetWord.example}</div>
            <div style="font-size:11px; opacity:0.8;">${this.targetWord.example_pinyin} — ${this.targetWord.example_meaning}</div>
        `;

        // Show Next button
        const nextBtn = document.getElementById("quiz-next-btn");
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
                <i class="fa-solid fa-square-poll-vertical animate-fire" style="font-size:64px; color:var(--primary-light); margin-bottom:20px;"></i>
                <h2>Kết quả Trắc Nghiệm</h2>
                <p style="color:var(--text-muted); margin-bottom:25px;">
                    Bạn đã trả lời đúng <strong>${this.score} / ${this.totalRounds}</strong> câu hỏi!
                </p>
                <div style="background:var(--secondary); border:1px solid var(--border-color); padding: 15px; border-radius:var(--radius-md); max-width: 250px; margin: 0 auto 25px auto;">
                    <div style="font-size:14px; color:var(--text-muted)">Điểm số của bạn</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--success)">${this.score * 4} XP</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:5px;">+5 XP thưởng hoàn thành</div>
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

window.QuizGame = QuizGame;
