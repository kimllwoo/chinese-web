const SENTENCE_SPLITS = {
    "你叫什么名字？": ["你", "叫", "什么", "名字", "？"],
    "今天天气很好。": ["今天", "天气", "很", "好", "。"],
    "谢谢你的帮助！": ["谢谢", "你", "的", "帮助", "！"],
    "老师，再见！": ["老师", "，", "再见", "！"],
    "我是一个学生。": ["我", "是", "一个", "学生", "。"],
    "他是我的爸爸。": ["他", "是", "我", "的", "爸爸", "。"],
    "她喜欢看书。": ["她", "喜欢", "看", "书", "。"],
    "这不是我的电脑。": ["这", "不", "是", "我", "的", "电脑", "。"],
    "我有一只猫。": ["我", "有", "一只", "猫", "。"],
    "王老师很漂亮。": ["王", "老师", "很", "漂亮", "。"],
    "汉语不难学。": ["汉语", "不", "难", "学", "。"],
    "我想去中国旅游。": ["我", "想", "去", "中国", "旅游", "。"],
    "你喜欢吃什么？": ["你", "喜欢", "吃", "什么", "？"],
    "这个苹果很大。": ["这个", "苹果", "rất (很)", "大", "。"], // match database "这个苹果很大。" -> ["这个", "苹果", "很", "大", "。"]
    "这个苹果很大。": ["这个", "苹果", "很", "大", "。"],
    "请喝杯水吧。": ["请", "喝", "杯", "水", "吧", "。"],
    "我们去吃饭吧。": ["我们", "去", "吃饭", "吧", "。"],
    "认识你很高兴。": ["认识", "你", "很", "高兴", "。"],
    "我现在在机场。": ["我", "现在", "在", "机场", "。"],
    "我想买一個新电脑。": ["我", "想", "买", "一个", "新", "电脑", "。"],
    "我想买一个新电脑。": ["我", "想", "买", "一个", "新", "电脑", "。"],
    "我们明年去日本旅游。": ["我们", "明年", "去", "日本", "旅游", "。"],
    "大家玩得很高兴。": ["大家", "玩", "得", "很", "高兴", "。"]
};

class SentenceGame {
    constructor(container, words) {
        this.container = container;
        this.allWords = words;
        this.currentRound = 0;
        this.totalRounds = 3;
        
        this.targetWord = null;
        this.correctSentence = "";
        this.correctTokens = [];
        this.poolTokens = [];
        this.dockedTokens = []; // Items in builder zone: { id, text }
        
        this.hasChecked = false;
    }

    start() {
        this.currentRound = 0;
        this.nextSentence();
    }

    nextSentence() {
        this.hasChecked = false;
        this.dockedTokens = [];
        
        // Pick target word based on current round index from valid sentence words
        const validWords = this.allWords.filter(w => SENTENCE_SPLITS[w.example]);
        if (validWords.length === 0) {
            app.exitGame();
            return;
        }
        this.targetWord = validWords[this.currentRound % validWords.length];
        
        this.correctSentence = this.targetWord.example;
        this.correctTokens = SENTENCE_SPLITS[this.correctSentence];
        
        // Build pool tokens
        this.poolTokens = this.correctTokens.map((tok, idx) => ({
            id: `tok_${idx}`,
            text: tok
        }));
        
        // Add 2 distractors from other words
        const distractors = ["喝", "喜欢", "苹果", "中国", "再见", "老师", "高兴"]
            .filter(d => !this.correctTokens.includes(d))
            .slice(0, 2);
            
        distractors.forEach((dist, idx) => {
            this.poolTokens.push({
                id: `dist_${idx}`,
                text: dist
            });
        });

        // Shuffle pool
        this.poolTokens.sort(() => Math.random() - 0.5);

        this.renderSentenceBuilder();
    }

    renderSentenceBuilder() {
        this.container.innerHTML = `
            <div class="sentence-wrapper">
                <div style="font-size:12px; color:var(--text-muted); text-align:center; width:100%">
                    Câu thứ ${this.currentRound + 1} / ${this.totalRounds}
                </div>
                
                <div class="sentence-instruction-card">
                    <h3>Ghép các từ thành câu đúng nghĩa sau:</h3>
                    <div class="sentence-meaning-text">"${this.targetWord.example_meaning}"</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:8px;">Phiên âm hỗ trợ: ${this.targetWord.example_pinyin}</div>
                </div>

                <!-- Docking Zone -->
                <div class="sentence-builder-zone" id="builder-dock">
                    <span style="color:var(--text-muted); font-size:14px;" id="dock-placeholder">Nhấp chọn từ phía dưới...</span>
                </div>

                <!-- Pool Zone -->
                <div class="sentence-pool-zone" id="builder-pool"></div>

                <div id="sentence-feedback" class="quiz-explanation" style="display:none; width:100%"></div>

                <div style="display:flex; justify-content:space-between; width:100%; margin-top:10px;">
                    <button id="sentence-clear-btn" class="btn btn-secondary"><i class="fa-solid fa-rotate-left"></i> Làm lại</button>
                    <button id="sentence-check-btn" class="btn btn-primary"><i class="fa-solid fa-clipboard-check"></i> Kiểm tra</button>
                    <button id="sentence-next-btn" class="btn btn-primary" style="display:none;">Tiếp tục <i class="fa-solid fa-arrow-right"></i></button>
                </div>
            </div>
        `;

        this.renderPool();
        
        // Bind clear
        document.getElementById("sentence-clear-btn").addEventListener("click", () => this.clearDock());
        
        // Bind check
        document.getElementById("sentence-check-btn").addEventListener("click", () => this.checkSentence());
    }

    renderPool() {
        const poolEl = document.getElementById("builder-pool");
        poolEl.innerHTML = "";
        
        this.poolTokens.forEach(tok => {
            const isDocked = this.dockedTokens.some(d => d.id === tok.id);
            const tile = document.createElement("div");
            tile.className = `tile-word ${isDocked ? 'in-dock' : ''}`;
            tile.innerHTML = `<span class="tile-zh">${tok.text}</span>`;
            
            tile.addEventListener("click", () => this.dockToken(tok));
            poolEl.appendChild(tile);
        });
    }

    renderDock() {
        const dockEl = document.getElementById("builder-dock");
        const placeholder = document.getElementById("dock-placeholder");
        
        // Remove existing token tiles, keep placeholder if empty
        const tiles = dockEl.querySelectorAll(".tile-word");
        tiles.forEach(t => t.remove());

        if (this.dockedTokens.length === 0) {
            if (placeholder) placeholder.style.display = "inline";
            return;
        }

        if (placeholder) placeholder.style.display = "none";

        this.dockedTokens.forEach(tok => {
            const tile = document.createElement("div");
            tile.className = "tile-word";
            tile.innerHTML = `<span class="tile-zh">${tok.text}</span>`;
            
            tile.addEventListener("click", () => this.undockToken(tok));
            dockEl.appendChild(tile);
        });
    }

    dockToken(tok) {
        if (this.hasChecked) return;
        this.dockedTokens.push(tok);
        this.renderDock();
        this.renderPool();
    }

    undockToken(tok) {
        if (this.hasChecked) return;
        this.dockedTokens = this.dockedTokens.filter(d => d.id !== tok.id);
        this.renderDock();
        this.renderPool();
    }

    clearDock() {
        if (this.hasChecked) return;
        this.dockedTokens = [];
        this.renderDock();
        this.renderPool();
    }

    checkSentence() {
        if (this.hasChecked) return;
        
        const answer = this.dockedTokens.map(d => d.text).join("");
        
        // Standardize answer checking by stripping punctuation
        const cleanAnswer = answer.replace(/[，。？！.,?!]/g, "");
        const cleanTarget = this.correctSentence.replace(/[，。？！.,?!]/g, "");
        
        const isCorrect = cleanAnswer === cleanTarget;
        this.hasChecked = true;

        const dockEl = document.getElementById("builder-dock");
        const feedbackEl = document.getElementById("sentence-feedback");
        
        if (isCorrect) {
            dockEl.classList.add("correct");
            feedbackEl.className = "quiz-explanation correct";
            feedbackEl.style.display = "block";
            feedbackEl.innerHTML = `
                <div style="font-weight:bold; color:var(--success);"><i class="fa-solid fa-circle-check"></i> Ghép chính xác! +6 XP</div>
                <div style="margin-top:5px; font-size:18px; font-family:var(--font-zh);">${this.correctSentence}</div>
            `;
            
            app.addXP(6);
            app.speakChinese(this.correctSentence); // Pronounce complete sentence!

            // Track for achievements
            let count = parseInt(localStorage.getItem("longlong_sentence_count") || "0");
            count++;
            localStorage.setItem("longlong_sentence_count", count.toString());
            if (count >= 5) {
                app.unlockAchievement("a6"); // Unlock achievement 6
            }
        } else {
            dockEl.classList.add("incorrect");
            feedbackEl.className = "quiz-explanation";
            feedbackEl.style.display = "block";
            feedbackEl.innerHTML = `
                <div style="font-weight:bold; color:var(--error);"><i class="fa-solid fa-circle-xmark"></i> Chưa đúng rồi!</div>
                <div>Đáp án chính xác:</div>
                <div style="font-size:18px; font-family:var(--font-zh); margin-top:5px; color:var(--primary-light)">${this.correctSentence}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">${this.targetWord.example_pinyin}</div>
            `;
            
            // Highlight incorrect, but don't play sentence TTS (play target word audio instead)
            app.playAudio(this.targetWord);
        }

        // Toggle buttons
        document.getElementById("sentence-check-btn").style.display = "none";
        document.getElementById("sentence-clear-btn").style.display = "none";
        
        const nextBtn = document.getElementById("sentence-next-btn");
        nextBtn.style.display = "inline-flex";
        nextBtn.addEventListener("click", () => {
            this.currentRound++;
            if (this.currentRound < this.totalRounds) {
                this.nextSentence();
            } else {
                this.showSummary();
            }
        });
    }

    showSummary() {
        this.container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <i class="fa-solid fa-shapes animate-fire" style="font-size:64px; color:var(--success); margin-bottom:20px;"></i>
                <h2>Hoàn thành Xây Dựng Câu!</h2>
                <p style="color:var(--text-muted); margin-bottom:25px;">
                    Bạn đã rèn luyện thành công kỹ năng trật tự câu văn Trung Quốc.
                </p>
                <div style="background:var(--secondary); border:1px solid var(--border-color); padding: 15px; border-radius:var(--radius-md); max-width: 250px; margin: 0 auto 25px auto;">
                    <div style="font-size:14px; color:var(--text-muted)">Thưởng hoàn thành</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--warning)">+15 XP</div>
                </div>
                <button class="btn btn-primary" onclick="app.exitGame()" style="margin: 0 auto">Quay lại Bảng điều khiển</button>
            </div>
        `;
        app.addXP(15);
    }

    destroy() {
        this.dockedTokens = [];
    }
}

window.SentenceGame = SentenceGame;
