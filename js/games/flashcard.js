class FlashcardGame {
    constructor(container, words, srsMode = false) {
        this.container = container;
        this.words = [...words];
        this.srsMode = srsMode;
        this.currentIndex = 0;
        this.isFlipped = false;
        
        // Limit practice session to max 10 words
        if (this.words.length > 10) {
            this.words = this.words.slice(0, 10);
        }
    }

    start() {
        if (this.words.length === 0) {
            this.container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <i class="fa-solid fa-face-smile" style="font-size:48px; color:var(--primary-light); margin-bottom:15px;"></i>
                    <h3>Không có từ vựng nào!</h3>
                    <p style="color:var(--text-muted); margin-bottom:20px;">Bạn chưa có từ vựng nào cần ôn tập hôm nay.</p>
                    <button class="btn btn-primary" onclick="app.exitGame()" style="margin: 0 auto;">Quay lại</button>
                </div>
            `;
            return;
        }
        this.renderCard();
    }

    renderCard() {
        const word = this.words[this.currentIndex];
        this.isFlipped = false;
        
        this.container.innerHTML = `
            <div class="flashcard-wrapper">
                <div class="flashcard-scene" id="card-scene">
                    <div class="flashcard-inner">
                        <!-- Front Face -->
                        <div class="flashcard-face flashcard-front">
                            <span class="flashcard-hint"><i class="fa-solid fa-eye"></i> Nhấp để lật thẻ</span>
                            <div class="flashcard-zh">${word.hanzi}</div>
                            <button class="flashcard-btn-audio" id="audio-btn"><i class="fa-solid fa-volume-high"></i></button>
                        </div>
                        <!-- Back Face -->
                        <div class="flashcard-face flashcard-back">
                            <span class="flashcard-hint"><i class="fa-solid fa-eye"></i> Nhấp để lật lại</span>
                            ${word.image_url ? `<div class="word-image-container"><img src="${word.image_url}" class="word-image" alt="${word.hanzi}"></div>` : ''}
                            <div class="flashcard-pinyin">${word.pinyin}</div>
                            <div class="flashcard-meaning">${word.meaning}</div>
                            <div class="flashcard-example">
                                <div>Ví dụ: ${word.example}</div>
                                <div style="font-size:11px; opacity:0.8; margin-top:2px;">
                                    ${word.example_pinyin} — ${word.example_meaning}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Card Control / Rating buttons -->
                <div class="srs-buttons" id="srs-actions" style="opacity: 0.3; pointer-events: none;">
                    <button class="srs-btn hard" data-score="1">Khó (Lặp lại)</button>
                    <button class="srs-btn good" data-score="4">Nhớ (Tốt)</button>
                    <button class="srs-btn easy" data-score="5">Dễ (Quá nhớ)</button>
                </div>

                <div style="font-size:13px; color:var(--text-muted)">
                    Từ thứ ${this.currentIndex + 1} / ${this.words.length}
                </div>
            </div>
        `;

        // TTS Pronunciation on load
        app.playAudio(word);

        // Bind flip handler
        const scene = document.getElementById("card-scene");
        scene.addEventListener("click", () => {
            this.isFlipped = !this.isFlipped;
            if (this.isFlipped) {
                scene.classList.add("is-flipped");
                document.getElementById("srs-actions").style.opacity = "1";
                document.getElementById("srs-actions").style.pointerEvents = "auto";
                
                // Track achievement: easy review increment helper (we can track correct reviews)
            } else {
                scene.classList.remove("is-flipped");
            }
        });

        // Audio play handler on front
        const audioBtn = document.getElementById("audio-btn");
        audioBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Don't flip card
            app.playAudio(word);
        });

        // Bind review buttons
        const buttons = document.querySelectorAll(".srs-btn");
        buttons.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const score = parseInt(btn.getAttribute("data-score"));
                this.handleReview(score);
            });
        });
    }

    handleReview(quality) {
        const word = this.words[this.currentIndex];
        
        // Update SRS progress
        window.SRS.reviewWord(word.id, quality);
        
        // Award XP
        let xpReward = 1;
        if (quality === 4) xpReward = 3;
        if (quality === 5) {
            xpReward = 5;
            // Track flashcard count for achievements
            let easyCount = parseInt(localStorage.getItem("longlong_achievement_easy_count") || "0");
            easyCount++;
            localStorage.setItem("longlong_achievement_easy_count", easyCount.toString());
            if (easyCount >= 10) {
                app.unlockAchievement("a5"); // Unlock achievement 5
            }
        }
        
        app.addXP(xpReward);

        this.currentIndex++;
        if (this.currentIndex < this.words.length) {
            this.renderCard();
        } else {
            this.showSessionComplete();
        }
    }

    showSessionComplete() {
        this.container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <i class="fa-solid fa-circle-check animate-bounce" style="font-size:64px; color:var(--success); margin-bottom:20px;"></i>
                <h2>Hoàn thành học Flashcard!</h2>
                <p style="color:var(--text-muted); margin-bottom:25px;">
                    Bạn đã xuất sắc ôn tập qua ${this.words.length} thẻ từ vựng.
                </p>
                <div style="background:var(--secondary); border:1px solid var(--border-color); padding: 15px; border-radius:var(--radius-md); max-width: 250px; margin: 0 auto 25px auto;">
                    <div style="font-size:14px; color:var(--text-muted)">Thưởng hoàn thành</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--warning)">+15 XP</div>
                </div>
                <button class="btn btn-primary" onclick="app.exitGame()" style="margin:0 auto">Quay lại Bảng điều khiển</button>
            </div>
        `;
        app.addXP(15);
        app.checkDueSRS();
    }

    destroy() {
        // Cleanup if necessary
    }
}

window.FlashcardGame = FlashcardGame;
