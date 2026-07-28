class ListeningGame {
    constructor(container, words) {
        this.container = container;
        this.allWords = words;
        this.currentRound = 0;
        this.totalRounds = 5;
        this.score = 0;
        
        this.targetWord = null;
        this.options = [];
        this.hasAnswered = false;
        
        this.timer = null;
        this.timerDuration = 6000; // 6 seconds
        this.timeLeft = 6000;
        
        this.xpEarnedThisSession = 0;
    }

    start() {
        this.currentRound = 0;
        this.score = 0;
        this.xpEarnedThisSession = 0;
        this.nextQuestion();
    }

    nextQuestion() {
        this.hasAnswered = false;
        this.timeLeft = this.timerDuration;
        
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

        this.renderSprint();
        this.startTimer();
    }

    renderSprint() {
        this.container.innerHTML = `
            <div class="listen-wrapper">
                <div style="font-size:12px; color:var(--text-muted); text-align:center; width:100%">
                    Màn chơi ${this.currentRound + 1} / ${this.totalRounds}
                </div>
                
                <div class="timer-sprint-container">
                    <div class="timer-sprint-fill" id="sprint-timer-bar"></div>
                </div>

                <div style="text-align:center;">
                    <button class="listen-audio-btn pulse-wave" id="sprint-audio-btn">
                        <i class="fa-solid fa-volume-high"></i>
                    </button>
                    <p style="color:var(--text-muted); font-size:13px; margin-top:10px;">Nghe kỹ và chọn chữ Hán đúng</p>
                </div>

                <div class="quiz-options-list" id="sprint-options" style="width:100%">
                    <!-- Injected options -->
                </div>

                <div id="sprint-explanation" class="quiz-explanation" style="display:none; width:100%"></div>

                <div style="display:flex; justify-content:flex-end; width:100%">
                    <button id="sprint-next-btn" class="btn btn-primary" style="display:none;">Tiếp tục <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>
        `;

        const optionsBox = document.getElementById("sprint-options");
        const letters = ["A", "B", "C", "D"];
        
        this.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.className = "quiz-option";
            btn.innerHTML = `
                <span class="quiz-option-index">${letters[idx]}</span>
                <span class="chinese" style="font-size:24px; font-family:var(--font-zh)">${opt.hanzi}</span>
            `;
            btn.addEventListener("click", () => this.handleAnswer(opt, btn));
            optionsBox.appendChild(btn);
        });

        // Play audio
        app.playAudio(this.targetWord);
        document.getElementById("sprint-audio-btn").addEventListener("click", () => {
            app.playAudio(this.targetWord);
        });
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        
        const timerBar = document.getElementById("sprint-timer-bar");
        const interval = 50; // Update every 50ms
        
        this.timer = setInterval(() => {
            this.timeLeft -= interval;
            const percentage = Math.max(0, (this.timeLeft / this.timerDuration) * 100);
            if (timerBar) timerBar.style.width = `${percentage}%`;
            
            // Adjust bar colors dynamically as time runs out
            if (percentage < 35 && timerBar) {
                timerBar.style.background = "var(--error)";
            }
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.handleTimeout();
            }
        }, interval);
    }

    handleAnswer(selectedOpt, btnEl) {
        if (this.hasAnswered) return;
        this.hasAnswered = true;
        clearInterval(this.timer);

        const isCorrect = selectedOpt.id === this.targetWord.id;

        // Disable options
        document.querySelectorAll("#sprint-options .quiz-option").forEach(el => {
            el.style.pointerEvents = "none";
        });

        if (isCorrect) {
            btnEl.classList.add("correct");
            this.score++;
            
            // Calculate rapid response score bonus
            // max 10 XP: base 5 XP + up to 5 XP time bonus
            const timeBonus = Math.round((this.timeLeft / this.timerDuration) * 5);
            const totalXp = 5 + timeBonus;
            
            this.xpEarnedThisSession += totalXp;
            app.addXP(totalXp);
            
            // Check listening sprint achievements
            let accumulatedListeningXp = parseInt(localStorage.getItem("longlong_listening_xp") || "0");
            accumulatedListeningXp += totalXp;
            localStorage.setItem("longlong_listening_xp", accumulatedListeningXp.toString());
            if (accumulatedListeningXp >= 50) {
                app.unlockAchievement("a4"); // Unlock "Chiến thần Listening" achievement
            }

            this.showExplanation(true, `Chính xác! Trả lời thần tốc được thưởng +${totalXp} XP`);
        } else {
            btnEl.classList.add("incorrect");
            
            // Find correct one
            const correctIdx = this.options.findIndex(opt => opt.id === this.targetWord.id);
            if (correctIdx !== -1) {
                const optionsBox = document.getElementById("sprint-options");
                optionsBox.children[correctIdx].classList.add("correct");
            }

            this.showExplanation(false, `Sai rồi! Từ vừa phát âm là "${this.targetWord.hanzi}"`);
        }
    }

    handleTimeout() {
        this.hasAnswered = true;
        
        // Highlight correct option
        const correctIdx = this.options.findIndex(opt => opt.id === this.targetWord.id);
        if (correctIdx !== -1) {
            const optionsBox = document.getElementById("sprint-options");
            optionsBox.children[correctIdx].classList.add("correct");
        }

        this.showExplanation(false, "Hết giờ! Bạn đã không kịp đưa ra lựa chọn.");
    }

    showExplanation(isCorrect, heading) {
        const expBox = document.getElementById("sprint-explanation");
        expBox.style.display = "block";
        expBox.innerHTML = `
            <div style="font-weight:bold; color:${isCorrect ? 'var(--success)' : 'var(--error)'}; margin-bottom:5px;">
                ${isCorrect ? '<i class="fa-solid fa-bolt"></i> ' : '<i class="fa-solid fa-clock"></i> '} ${heading}
            </div>
            <div><strong>Phát âm:</strong> ${this.targetWord.hanzi} [${this.targetWord.pinyin}] — ${this.targetWord.meaning}</div>
            <div style="font-size:12px; margin-top:4px;"><strong>Ví dụ:</strong> ${this.targetWord.example}</div>
        `;

        const nextBtn = document.getElementById("sprint-next-btn");
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
                <i class="fa-solid fa-music animate-fire" style="font-size:64px; color:var(--primary-light); margin-bottom:20px;"></i>
                <h2>Hoàn thành Luyện Nghe Phản Xạ</h2>
                <p style="color:var(--text-muted); margin-bottom:25px;">
                    Bạn đã trả lời đúng <strong>${this.score} / ${this.totalRounds}</strong> câu!
                </p>
                <div style="background:var(--secondary); border:1px solid var(--border-color); padding: 15px; border-radius:var(--radius-md); max-width: 250px; margin: 0 auto 25px auto;">
                    <div style="font-size:14px; color:var(--text-muted)">Tổng XP nhận được</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--success)">${this.xpEarnedThisSession} XP</div>
                </div>
                <button class="btn btn-primary" onclick="app.exitGame()" style="margin: 0 auto">Quay lại Bảng điều khiển</button>
            </div>
        `;
    }

    destroy() {
        if (this.timer) clearInterval(this.timer);
    }
}

window.ListeningGame = ListeningGame;
