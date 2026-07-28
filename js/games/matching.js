class MatchingGame {
    constructor(container, words) {
        this.container = container;
        this.allWords = words;
        this.gameSize = 6; // Match 6 pairs (12 cards)
        this.selectedCard = null;
        this.matchedPairs = 0;
        this.cards = [];
    }

    start() {
        // Take the first 6 words from the filtered and prioritized list
        const selectedWords = this.allWords.slice(0, Math.min(this.gameSize, this.allWords.length));

        // Create 12 cards
        this.cards = [];
        selectedWords.forEach(word => {
            // Hanzi card
            this.cards.push({
                uniqueId: `${word.id}_hanzi`,
                wordId: word.id,
                text: word.hanzi,
                type: "hanzi",
                wordObj: word
            });
            // Meaning & Pinyin card
            this.cards.push({
                uniqueId: `${word.id}_meaning`,
                wordId: word.id,
                text: `${word.pinyin} <br><span style="font-size:12px;opacity:0.8;font-weight:normal">${word.meaning}</span>`,
                type: "meaning",
                wordObj: word
            });
        });

        // Shuffle cards
        this.cards.sort(() => Math.random() - 0.5);

        this.renderGrid();
    }

    renderGrid() {
        this.container.innerHTML = `
            <div class="matching-container">
                <div style="text-align:center; margin-bottom: 15px;">
                    <h3>Ghép các cặp từ tương ứng</h3>
                    <p style="color:var(--text-muted); font-size:13px;">Hãy chọn một thẻ chữ Hán và thẻ phiên âm/nghĩa tương ứng của nó</p>
                </div>
                <div class="matching-grid" id="match-grid"></div>
            </div>
        `;

        const grid = document.getElementById("match-grid");
        
        this.cards.forEach(card => {
            const cardEl = document.createElement("div");
            cardEl.className = `match-card ${card.type === 'hanzi' ? 'chinese' : ''}`;
            cardEl.id = `card-${card.uniqueId}`;
            cardEl.innerHTML = card.text;
            
            cardEl.addEventListener("click", () => this.handleCardClick(card));
            grid.appendChild(cardEl);
        });
    }

    handleCardClick(clickedCard) {
        const cardEl = document.getElementById(`card-${clickedCard.uniqueId}`);
        
        // Ignore if already matched or already selected
        if (cardEl.classList.contains("correct") || cardEl.classList.contains("selected")) {
            return;
        }

        // Clean any leftovers from quick clicks
        document.querySelectorAll(".match-card.incorrect").forEach(el => {
            el.classList.remove("incorrect");
        });

        if (!this.selectedCard) {
            // First card selected
            this.selectedCard = clickedCard;
            cardEl.classList.add("selected");
        } else {
            const prevCardEl = document.getElementById(`card-${this.selectedCard.uniqueId}`);
            
            // If clicking another card of the same type, switch selection
            if (this.selectedCard.type === clickedCard.type) {
                prevCardEl.classList.remove("selected");
                this.selectedCard = clickedCard;
                cardEl.classList.add("selected");
                return;
            }

            // Check if match is correct
            if (this.selectedCard.wordId === clickedCard.wordId) {
                // Correct match!
                cardEl.classList.remove("selected");
                prevCardEl.classList.remove("selected");
                
                cardEl.classList.add("correct");
                prevCardEl.classList.add("correct");
                
                // Pronounce word as audio reward
                app.playAudio(clickedCard.wordObj);
                app.addXP(2); // +2 XP per pair

                this.matchedPairs++;
                this.selectedCard = null;

                if (this.matchedPairs === Math.min(this.gameSize, this.cards.length / 2)) {
                    setTimeout(() => this.showCompleteScreen(), 800);
                }
            } else {
                // Incorrect match!
                cardEl.classList.add("incorrect");
                prevCardEl.classList.add("incorrect");
                prevCardEl.classList.remove("selected");

                const tempCard = this.selectedCard;
                this.selectedCard = null;

                setTimeout(() => {
                    const el1 = document.getElementById(`card-${clickedCard.uniqueId}`);
                    const el2 = document.getElementById(`card-${tempCard.uniqueId}`);
                    if (el1) el1.classList.remove("incorrect");
                    if (el2) el2.classList.remove("incorrect");
                }, 600);
            }
        }
    }

    showCompleteScreen() {
        this.container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <i class="fa-solid fa-trophy animate-fire" style="font-size:64px; color:var(--warning); margin-bottom:20px;"></i>
                <h2>Tuyệt vời! Hoàn thành Ghép Cặp</h2>
                <p style="color:var(--text-muted); margin-bottom:25px;">
                    Bạn đã ghép chính xác tất cả các cặp từ trong thời gian ngắn!
                </p>
                <div style="background:var(--secondary); border:1px solid var(--border-color); padding: 15px; border-radius:var(--radius-md); max-width: 250px; margin: 0 auto 25px auto;">
                    <div style="font-size:14px; color:var(--text-muted)">Thưởng hoàn thành</div>
                    <div style="font-size:24px; font-weight:bold; color:var(--warning)">+10 XP</div>
                </div>
                <button class="btn btn-primary" onclick="app.exitGame()" style="margin: 0 auto">Quay lại Bảng điều khiển</button>
            </div>
        `;
        app.addXP(10);
    }

    destroy() {
        this.selectedCard = null;
    }
}

window.MatchingGame = MatchingGame;
