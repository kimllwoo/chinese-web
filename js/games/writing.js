class WritingGame {
    constructor(container, words) {
        this.container = container;
        this.allWords = words;
        this.currentRound = 0;
        this.totalRounds = 3; // Practice writing 3 characters
        
        this.targetWord = null;
        this.writerInstance = null;
    }

    start() {
        this.currentRound = 0;
        this.nextRound();
    }

    nextRound() {
        // Pick target word based on current round index
        this.targetWord = this.allWords[this.currentRound % this.allWords.length];
        
        this.renderWritingArena();
        this.initHanziWriter();
    }

    renderWritingArena() {
        this.container.innerHTML = `
            <div class="writing-layout">
                <div style="font-size:12px; color:var(--text-muted); text-align:center; width:100%">
                    Chữ thứ ${this.currentRound + 1} / ${this.totalRounds}
                </div>
                
                <div class="writing-instructions">
                    <h3>Hãy tập viết chữ: <span class="chinese" style="color:var(--primary-light); font-size:28px;">${this.targetWord.hanzi}</span></h3>
                    <p style="font-size:16px;"><strong>Pinyin:</strong> ${this.targetWord.pinyin} | <strong>Nghĩa:</strong> ${this.targetWord.meaning}</p>
                </div>

                <div class="writing-box">
                    <div id="writing-canvas" class="writing-canvas-container"></div>
                </div>

                <div class="writing-controls">
                    <button class="btn btn-secondary" id="writing-animate-btn"><i class="fa-solid fa-play"></i> Xem nét mẫu</button>
                    <button class="btn btn-secondary" id="writing-clear-btn"><i class="fa-solid fa-eraser"></i> Xóa bảng</button>
                </div>

                <div class="word-details-box" style="width:100%; max-width:400px;">
                    <strong>Ví dụ:</strong> ${this.targetWord.example}<br>
                    <span style="font-size:11px; opacity:0.8;">${this.targetWord.example_pinyin} — ${this.targetWord.example_meaning}</span>
                </div>

                <div id="writing-success-msg" style="display:none; color:var(--success); font-weight:bold; font-size:18px;">
                    <i class="fa-solid fa-circle-check animate-bounce"></i> Rất tốt! +5 XP
                </div>
                
                <div style="display:flex; justify-content:flex-end; width:100%; max-width:400px;">
                    <button id="writing-next-btn" class="btn btn-primary" style="display:none;">Tiếp tục <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>
        `;

        // Bind control buttons
        document.getElementById("writing-animate-btn").addEventListener("click", () => {
            if (this.writerInstance) this.writerInstance.animateCharacter();
        });

        document.getElementById("writing-clear-btn").addEventListener("click", () => {
            if (this.writerInstance) {
                this.writerInstance.cancelQuiz();
                this.writerInstance.quiz();
            }
        });
    }

    initHanziWriter() {
        const canvasDiv = document.getElementById("writing-canvas");
        canvasDiv.innerHTML = "";
        
        this.writerInstance = HanziWriter.create('writing-canvas', this.targetWord.hanzi, {
            width: 240,
            height: 240,
            showOutline: true,
            showCharacter: false, // User has to write it
            strokeColor: '#7c5dfa',
            outlineColor: '#f1f1f1',
            drawingColor: '#10b981',
            highlightColor: '#9277ff',
            padding: 10
        });

        // Trigger quiz mode
        this.writerInstance.quiz({
            onQuizComplete: () => {
                this.handleWritingSuccess();
            }
        });
    }

    handleWritingSuccess() {
        // Show success message
        document.getElementById("writing-success-msg").style.display = "block";
        document.getElementById("writing-next-btn").style.display = "inline-flex";
        
        app.addXP(5);
        app.playAudio(this.targetWord); // Pronounce on success
        
        // Track writing count for achievements
        let count = parseInt(localStorage.getItem("longlong_writing_count") || "0");
        count++;
        localStorage.setItem("longlong_writing_count", count.toString());
        if (count >= 5) {
            app.unlockAchievement("a3"); // Unlock achievement 3
        }

        document.getElementById("writing-next-btn").addEventListener("click", () => {
            this.currentRound++;
            if (this.currentRound < this.totalRounds) {
                this.nextRound();
            } else {
                this.showSummary();
            }
        });
    }

    showSummary() {
        this.container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <i class="fa-solid fa-file-signature animate-fire" style="font-size:64px; color:var(--primary-light); margin-bottom:20px;"></i>
                <h2>Hoàn thành Luyện Tập Viết</h2>
                <p style="color:var(--text-muted); margin-bottom:25px;">
                    Bạn đã viết thành công ${this.totalRounds} Hán tự chính xác!
                </p>
                <div style="background:var(--secondary); border:1px solid var(--border-color); padding: 15px; border-radius:var(--radius-md); max-width: 250px; margin: 0 auto 25px auto;">
                    <div style="font-size:14px; color:var(--text-muted)">Điểm thưởng thêm</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--warning)">+15 XP</div>
                </div>
                <button class="btn btn-primary" onclick="app.exitGame()" style="margin: 0 auto">Quay lại Bảng điều khiển</button>
            </div>
        `;
        app.addXP(15);
    }

    destroy() {
        this.writerInstance = null;
    }
}

window.WritingGame = WritingGame;
