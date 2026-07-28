/**
 * Core Application Manager - LongLong Chinese
 */
class AppManager {
    constructor() {
        this.userState = {
            xp: 0,
            level: 1,
            streak: 0,
            lastActiveDate: null,
            achievements: [],
            dailyXpGoal: 50,
            dailyXpEarned: 0,
            username: ""
        };
        
        this.currentView = "dashboard";
        this.activeGame = null;
        this.srsSessionWords = null; // Active list of words for an SRS review session
        
        // Modal writing writer instance
        this.modalWriter = null;
        this.modalWord = null;

        // Settings and Filters (HSK 1-9 & Study Ratio)
        this.selectedHskLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.studyRatio = { new: 30, reviewing: 50, mastered: 20 };

        // Authentication state
        this.activeUser = null;
        this.authMode = "login"; // 'login' or 'register'
    }

    init() {
        this.activeUser = localStorage.getItem("longlong_active_user") || null;
        
        if (this.activeUser) {
            document.getElementById("auth-screen").style.display = "none";
            document.getElementById("app-container").style.display = "grid";
            
            // Set user profile details
            document.getElementById("profile-name").innerText = this.activeUser;
            
            this.loadState();
            this.setupNavigation();
            this.updateStreak();
            this.updateUI();
            this.renderDictionary();
            this.renderLeaderboard();
            this.renderAchievements();
            this.checkDueSRS();
        } else {
            document.getElementById("auth-screen").style.display = "flex";
            document.getElementById("app-container").style.display = "none";
            this.authMode = "login";
            this.renderAuth();
        }

        // Register Web Speech API voice loading listener
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = () => {
                // Preload voices
            };
        }
    }

    // Load user progress and stats from LocalStorage
    loadState() {
        const stored = localStorage.getItem(`longlong_user_state_${this.activeUser}`);
        if (stored) {
            this.userState = { ...this.userState, ...JSON.parse(stored) };
        } else {
            // First time setup - give them some default state
            this.userState = {
                xp: 0,
                level: 1,
                streak: 0,
                lastActiveDate: new Date().toDateString(),
                achievements: [],
                dailyXpGoal: 50,
                dailyXpEarned: 0,
                username: this.activeUser
            };
            this.saveState();
        }

        // Load ratios
        const storedRatio = localStorage.getItem(`longlong_study_ratio_${this.activeUser}`);
        if (storedRatio) {
            this.studyRatio = JSON.parse(storedRatio);
        } else {
            this.studyRatio = { new: 30, reviewing: 50, mastered: 20 };
        }
    }

    // Save user state to LocalStorage
    saveState() {
        localStorage.setItem(`longlong_user_state_${this.activeUser}`, JSON.stringify(this.userState));
    }

    // Handle view routing
    setupNavigation() {
        const navItems = document.querySelectorAll(".nav-item");
        navItems.forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const target = item.getAttribute("data-target");
                this.switchView(target);
                
                navItems.forEach(n => n.classList.remove("active"));
                item.classList.add("active");
            });
        });

        // Handle initial hash if any
        const hash = window.location.hash.replace("#", "");
        if (hash && ["dashboard", "dictionary", "leaderboard", "achievements", "settings"].includes(hash)) {
            this.switchView(hash);
            const activeNav = document.querySelector(`.nav-item[data-target="${hash}"]`);
            if (activeNav) {
                navItems.forEach(n => n.classList.remove("active"));
                activeNav.classList.add("active");
            }
        }
    }

    switchView(viewName) {
        this.currentView = viewName;
        document.querySelectorAll(".app-view").forEach(v => v.classList.remove("active"));
        
        const titleElement = document.getElementById("current-page-title");
        
        if (viewName === "dashboard") {
            document.getElementById("view-dashboard").classList.add("active");
            titleElement.innerText = `Chào mừng trở lại, ${this.userState.username}!`;
            this.checkDueSRS();
            this.updateUI();
        } else if (viewName === "dictionary") {
            document.getElementById("view-dictionary").classList.add("active");
            titleElement.innerText = "Từ điển & Luyện Tập Viết";
            this.renderDictionary();
        } else if (viewName === "leaderboard") {
            document.getElementById("view-leaderboard").classList.add("active");
            titleElement.innerText = "Đường Đua Thành Tích";
            this.renderLeaderboard();
        } else if (viewName === "achievements") {
            document.getElementById("view-view-achievements" ? "view-achievements" : "view-achievements").classList.add("active");
            titleElement.innerText = "Huy Chương Danh Dự";
            this.renderAchievements();
        } else if (viewName === "settings") {
            document.getElementById("view-settings").classList.add("active");
            titleElement.innerText = "Cấu Hình Học Tập";
            this.renderSettings();
        } else if (viewName === "game") {
            document.getElementById("view-game").classList.add("active");
        }
        
        window.location.hash = viewName;
    }

    // Add Experience Points (XP)
    addXP(amount) {
        this.userState.xp += amount;
        this.userState.dailyXpEarned += amount;
        
        // Calculate level: level = floor(sqrt(xp / 100)) + 1
        const newLevel = Math.floor(Math.sqrt(this.userState.xp / 100)) + 1;
        if (newLevel > this.userState.level) {
            this.userState.level = newLevel;
            this.showLevelUpModal(newLevel);
        }

        // Update streak if this is first activity today
        const today = new Date().toDateString();
        if (this.userState.lastActiveDate !== today) {
            this.userState.streak += 1;
            this.userState.lastActiveDate = today;
            this.userState.dailyXpEarned = amount; // Reset daily count on new day
        }

        this.saveState();
        this.updateUI();
        this.checkAchievements();
    }

    // Check streak decay
    updateStreak() {
        if (!this.userState.lastActiveDate) return;
        
        const lastActive = new Date(this.userState.lastActiveDate);
        const today = new Date();
        
        // Reset times to midnight for accurate day comparison
        lastActive.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        
        const diffTime = Math.abs(today - lastActive);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 1) {
            // Streak broken!
            this.userState.streak = 0;
            this.saveState();
        }
    }

    // UI Updates
    updateUI() {
        document.getElementById("stat-streak").innerText = this.userState.streak;
        document.getElementById("stat-xp").innerText = this.userState.xp;
        document.getElementById("stat-level").innerText = this.userState.level;
        document.getElementById("profile-level").innerText = `Cấp độ ${this.userState.level}`;

        // Daily Progress
        const percent = Math.min(100, (this.userState.dailyXpEarned / this.userState.dailyXpGoal) * 100);
        document.getElementById("daily-progress-fill").style.width = `${percent}%`;
        document.getElementById("daily-progress-text").innerText = `${this.userState.dailyXpEarned} / ${this.userState.dailyXpGoal} XP`;
    }

    // Spaced Repetition checking
    checkDueSRS() {
        const dueCount = window.SRS.getDueCount(window.WORDS_DB);
        document.getElementById("srs-due-count").innerText = dueCount;
        
        // Update circular progress border (conic gradient)
        const totalWords = window.WORDS_DB.length;
        const duePercent = totalWords > 0 ? (dueCount / totalWords) * 100 : 0;
        const circle = document.getElementById("srs-circle");
        
        // Color changes from primary purple to warning orange if there are many cards due
        const activeColor = dueCount > 0 ? "var(--warning)" : "var(--success)";
        circle.style.background = `conic-gradient(${activeColor} ${duePercent}%, var(--secondary) ${duePercent}%)`;

        const srsMsg = document.getElementById("srs-status-msg");
        const srsBtn = document.getElementById("srs-start-btn");

        if (dueCount > 0) {
            srsMsg.innerHTML = `Bạn có <strong style="color:var(--warning)">${dueCount} từ vựng</strong> đã đến hạn ôn tập hàng ngày!`;
            srsBtn.style.display = "inline-flex";
        } else {
            srsMsg.innerHTML = "Tuyệt vời! Bạn không có từ vựng nào đến hạn ôn tập hôm nay.";
            srsBtn.style.display = "none";
        }
    }

    // Start a dedicated SRS Session
    startSRS() {
        const dueWords = window.SRS.getDueWords(window.WORDS_DB);
        if (dueWords.length === 0) return;
        
        this.srsSessionWords = dueWords;
        this.startGame("flashcard", true); // Run Flashcard game in SRS Mode
    }

    // Play Chinese Pronunciation
    speakChinese(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.85; // Slightly slower for language learners
            
            // Try to find a high quality Chinese voice
            const voices = window.speechSynthesis.getVoices();
            const zhVoice = voices.find(voice => voice.lang.includes('zh') || voice.lang.includes('ZH'));
            if (zhVoice) {
                utterance.voice = zhVoice;
            }
            window.speechSynthesis.speak(utterance);
        }
    }

    // Smart dual-audio play: Try custom MP3 from Chat TTS first, fallback to browser speech synthesis
    playAudio(word) {
        if (word.audio_url) {
            const audio = new Audio(word.audio_url);
            audio.play().catch(err => {
                console.log(`File âm thanh ${word.audio_url} chưa sẵn sàng (Chat TTS), chuyển sang Web Speech API.`);
                this.speakChinese(word.hanzi);
            });
        } else {
            this.speakChinese(word.hanzi);
        }
    }

    // Start Game Arena
    startGame(gameType, srsMode = false) {
        this.switchView("game");
        
        // Clean up previous game
        if (this.activeGame && typeof this.activeGame.destroy === "function") {
            this.activeGame.destroy();
        }

        const playground = document.getElementById("game-playground");
        playground.innerHTML = "";
        
        const titleEl = document.getElementById("game-title");
        
        // Initialize game instances based on type
        if (gameType === "flashcard") {
            titleEl.innerText = srsMode ? "Smart Flashcards (SRS Mode)" : "Smart Flashcards";
            const targetWords = srsMode ? this.srsSessionWords : this.getPracticeWordSession(10);
            this.activeGame = new FlashcardGame(playground, targetWords, srsMode);
        } else if (gameType === "matching") {
            titleEl.innerText = "Matching Game";
            this.activeGame = new MatchingGame(playground, this.getPracticeWordSession(6));
        } else if (gameType === "quiz") {
            titleEl.innerText = "Multiple Choice Quiz";
            this.activeGame = new QuizGame(playground, this.getPracticeWordSession(5));
        } else if (gameType === "listening") {
            titleEl.innerText = "Listening Sprint";
            this.activeGame = new ListeningGame(playground, this.getPracticeWordSession(5));
        } else if (gameType === "writing") {
            titleEl.innerText = "Character Writing";
            this.activeGame = new WritingGame(playground, this.getPracticeWordSession(3, w => w.hanzi.length === 1));
        } else if (gameType === "sentence") {
            titleEl.innerText = "Sentence Builder";
            this.activeGame = new SentenceGame(playground, this.getPracticeWordSession(3));
        } else if (gameType === "cloze") {
            titleEl.innerText = "Điền từ vào câu";
            this.activeGame = new ClozeGame(playground, this.getPracticeWordSession(5));
        } else if (gameType === "pinyintyper") {
            titleEl.innerText = "Luyện gõ Pinyin";
            this.activeGame = new PinyinTyperGame(playground, this.getPracticeWordSession(5));
        }
        
        this.activeGame.start();
    }

    exitGame() {
        if (this.activeGame && typeof this.activeGame.destroy === "function") {
            this.activeGame.destroy();
        }
        this.activeGame = null;
        this.switchView("dashboard");
    }

    // Dictionary Render
    renderDictionary() {
        const searchVal = document.getElementById("dict-search").value.toLowerCase();
        const levelVal = document.getElementById("dict-hsk-filter").value;
        const tbody = document.getElementById("dict-table-body");
        
        tbody.innerHTML = "";
        
        const filtered = window.WORDS_DB.filter(word => {
            const matchesSearch = word.hanzi.includes(searchVal) || 
                                  word.pinyin.toLowerCase().includes(searchVal) || 
                                  word.meaning.toLowerCase().includes(searchVal);
            
            const matchesLevel = levelVal === "all" || word.hsk.toString() === levelVal;
            
            return matchesSearch && matchesLevel;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted)">Không tìm thấy từ vựng phù hợp.</td></tr>`;
            return;
        }

        filtered.forEach(word => {
            const tr = document.createElement("tr");
            
            const components = word.components || [];
            const compTags = components.map(c => `<span class="component-tag">${c}</span>`).join("");
            
            tr.innerHTML = `
                <td class="dict-hanzi">${word.hanzi}</td>
                <td class="dict-pinyin">${word.pinyin}</td>
                <td>${word.meaning}</td>
                <td><span class="dict-hsk-badge level-${word.hsk}">HSK ${word.hsk}</span></td>
                <td><div class="dict-components">${compTags}</div></td>
                <td>
                    <button class="btn btn-secondary btn-audio-dict" data-id="${word.id}">
                        <i class="fa-solid fa-volume-high"></i> Nghe
                    </button>
                </td>
                <td>
                    <button class="btn btn-primary btn-write-dict" data-id="${word.id}">
                        <i class="fa-solid fa-pen-nib"></i> Tập viết
                    </button>
                </td>
            `;

            // Pronounce button handler
            tr.querySelector(".btn-audio-dict").addEventListener("click", () => {
                this.playAudio(word);
            });

            // Write button handler
            tr.querySelector(".btn-write-dict").addEventListener("click", () => {
                this.openWritingModal(word);
            });

            tbody.appendChild(tr);
        });
    }

    searchDict() {
        this.renderDictionary();
    }

    // Modal writing triggers
    openWritingModal(word) {
        this.modalWord = word;
        const modal = document.getElementById("writing-modal");
        modal.style.display = "block";
        
        document.getElementById("writing-modal-title").innerText = `Tập viết: ${word.hanzi}`;
        
        const details = document.getElementById("modal-word-details");
        details.innerHTML = `
            ${word.image_url ? `<div class="word-image-container" style="width:80px; height:80px; margin: 0 0 10px 0;"><img src="${word.image_url}" class="word-image" alt="${word.hanzi}"></div>` : ''}
            <h4>${word.hanzi} [${word.pinyin}]</h4>
            <p><strong>Nghĩa:</strong> ${word.meaning}</p>
            <p><strong>Cấu thành (bộ thủ):</strong> ${(word.components || []).join(" + ") || "Đang cập nhật"}</p>
            ${word.example ? `
                <p><strong>Ví dụ:</strong> ${word.example}</p>
                <p style="font-size:12px; color:var(--primary-light)">${word.example_pinyin || ""} — ${word.example_meaning || ""}</p>
            ` : ""}
        `;

        // Load Hanzi Writer canvas in modal
        const canvasContainer = document.getElementById("modal-writing-canvas");
        canvasContainer.innerHTML = "";
        
        this.modalWriter = HanziWriter.create('modal-writing-canvas', word.hanzi, {
            width: 200,
            height: 200,
            showOutline: true,
            showCharacter: false, // Start hidden to let user quiz/write
            strokeColor: '#7c5dfa',
            outlineColor: '#e0e0e0',
            drawingColor: '#10b981',
            highlightColor: '#9277ff'
        });

        // Start handwriting quiz mode
        this.modalWriter.quiz({
            onCorrectStroke: function(strokeData) {
                console.log('Correct stroke!');
            },
            onQuizComplete: (summary) => {
                this.addXP(5);
                details.innerHTML += `<p style="color:var(--success); font-weight:bold; margin-top:10px;"><i class="fa-solid fa-medal"></i> Hoàn thành! +5 XP</p>`;
            }
        });
    }

    animateModalWriting() {
        if (this.modalWriter) {
            this.modalWriter.animateCharacter();
        }
    }

    clearModalWriting() {
        if (this.modalWriter) {
            this.modalWriter.cancelQuiz();
            this.modalWriter.quiz(); // Restart quiz
        }
    }

    closeWritingModal() {
        document.getElementById("writing-modal").style.display = "none";
        this.modalWriter = null;
        this.modalWord = null;
    }

    // Achievements system
    renderAchievements() {
        const grid = document.getElementById("achievements-grid-body");
        grid.innerHTML = "";

        const badges = [
            { id: "a1", name: "Bước Đầu Hán Ngữ", desc: "Tích lũy được 20 XP đầu tiên", icon: "fa-solid fa-rocket" },
            { id: "a2", name: "Chúa Tể Pinyin", desc: "Đạt chuỗi 10 câu trắc nghiệm đúng liên tiếp", icon: "fa-solid fa-wand-magic-sparkles" },
            { id: "a3", name: "Nghệ Sĩ Thư Pháp", desc: "Tập viết đúng 5 chữ Hán trên bảng viết", icon: "fa-solid fa-brush" },
            { id: "a4", name: "Chiến Thần Listening", desc: "Đạt 50 XP trong game Listening Sprint", icon: "fa-solid fa-headphones" },
            { id: "a5", name: "Kẻ Hủy Diệt Flashcard", desc: "Tự đánh giá 'Dễ' 10 lần ôn tập", icon: "fa-solid fa-bolt" },
            { id: "a6", name: "Vua Xếp Câu", desc: "Ghép thành công 5 câu văn hoàn chỉnh", icon: "fa-solid fa-shapes" }
        ];

        badges.forEach(badge => {
            const isUnlocked = this.userState.achievements.includes(badge.id);
            const card = document.createElement("div");
            card.className = `badge-card ${isUnlocked ? '' : 'locked'}`;
            card.innerHTML = `
                <div class="badge-icon">
                    <i class="${badge.icon}"></i>
                </div>
                <div class="badge-title">${badge.name}</div>
                <div class="badge-desc">${badge.desc}</div>
                ${isUnlocked ? '<div style="color:var(--success); font-size:11px; margin-top:8px; font-weight:bold"><i class="fa-solid fa-circle-check"></i> Đã mở khóa</div>' : '<div style="color:var(--text-muted); font-size:11px; margin-top:8px;"><i class="fa-solid fa-lock"></i> Chưa mở khóa</div>'}
            `;
            grid.appendChild(card);
        });
    }

    unlockAchievement(id) {
        if (!this.userState.achievements.includes(id)) {
            this.userState.achievements.push(id);
            this.saveState();
            // Show toast or highlight achievement
            console.log(`Unlocked achievement: ${id}`);
            
            // Small visual notification on screen
            const container = document.querySelector(".main-content");
            const toast = document.createElement("div");
            toast.className = "stat-badge xp animate-fade-in";
            toast.style.position = "fixed";
            toast.style.bottom = "20px";
            toast.style.right = "20px";
            toast.style.zIndex = "1001";
            toast.style.borderColor = "var(--warning)";
            toast.innerHTML = `<i class="fa-solid fa-medal" style="color:var(--warning)"></i> Huy chương Mới! Mở khóa thành tựu.`;
            container.appendChild(toast);
            
            setTimeout(() => toast.remove(), 4000);
            
            this.renderAchievements();
        }
    }

    checkAchievements() {
        // Achievement 1: First 20 XP
        if (this.userState.xp >= 20) {
            this.unlockAchievement("a1");
        }
    }

    // Leaderboard rendering (with mock profiles to create a live gamified feel)
    renderLeaderboard() {
        const body = document.getElementById("leaderboard-list-body");
        body.innerHTML = "";

        const mockUsers = [
            { name: "Tiểu Long Nữ", xp: 1250, avatar: "fa-solid fa-user-astronaut", rank: 1 },
            { name: "Lão Ngoan Đồng", xp: 980, avatar: "fa-solid fa-ghost", rank: 2 },
            { name: "Dương Quá", xp: 850, avatar: "fa-solid fa-user-shield", rank: 3 },
            { name: this.userState.username, xp: this.userState.xp, avatar: "fa-solid fa-user-ninja", isMe: true },
            { name: "Quách Tĩnh", xp: 450, avatar: "fa-solid fa-user-tie", rank: 4 },
            { name: "Hoàng Dung", xp: 390, avatar: "fa-solid fa-user-graduate", rank: 5 }
        ];

        // Sort users by XP
        mockUsers.sort((a, b) => b.xp - a.xp);

        mockUsers.forEach((user, idx) => {
            const rank = idx + 1;
            const item = document.createElement("div");
            item.className = `leader-item ${user.isMe ? 'top-user' : ''}`;
            
            let rankClass = `rank-${rank}`;
            let rankDisplay = rank;
            if (rank === 1) rankDisplay = "🥇";
            else if (rank === 2) rankDisplay = "🥈";
            else if (rank === 3) rankDisplay = "🥉";

            item.innerHTML = `
                <div class="leader-rank ${rank <= 3 ? rankClass : ''}">${rankDisplay}</div>
                <div class="leader-avatar"><i class="${user.avatar}"></i></div>
                <div class="leader-name">${user.name} ${user.isMe ? '<span style="font-size:10px; padding:2px 6px; background:var(--primary); border-radius:10px; margin-left:5px">BẠN</span>' : ''}</div>
                <div class="leader-xp">${user.xp} XP</div>
            `;
            body.appendChild(item);
        });
    }

    // HSK Checkbox Selection update
    updateSelectedHsk() {
        const checkedBoxes = document.querySelectorAll(".hsk-cb:checked");
        const selected = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
        
        if (selected.length > 0) {
            this.selectedHskLevels = selected;
        } else {
            // Default fallback if all unchecked
            this.selectedHskLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        }
    }

    // Ratio-based vocabulary session fetcher
    getPracticeWordSession(count = 10, filterFn = null) {
        // 1. Filter words by chosen HSK levels
        let available = window.WORDS_DB.filter(w => this.selectedHskLevels.includes(w.hsk));
        if (filterFn) {
            available = available.filter(filterFn);
        }
        if (available.length === 0) {
            available = window.WORDS_DB;
            if (filterFn) {
                available = available.filter(filterFn);
            }
        }

        // 2. Classify words into 3 buckets:
        const newWords = [];
        const reviewingWords = [];
        const masteredWords = [];

        available.forEach(word => {
            const prog = window.SRS.getWordProgress(word.id);
            if (prog.repetitions === 0) {
                newWords.push(word);
            } else if (prog.repetitions < 4) {
                reviewingWords.push(word);
            } else {
                masteredWords.push(word);
            }
        });

        // Sort each bucket by HSK level (ascending) so easier HSK levels are picked first
        const sortByHsk = (list) => [...list].sort((a, b) => a.hsk - b.hsk || Math.random() - 0.5);
        const sortedNew = sortByHsk(newWords);
        const sortedRev = sortByHsk(reviewingWords);
        const sortedMast = sortByHsk(masteredWords);

        // 3. Allocate based on studyRatio percentages
        const targetNewCount = Math.round(count * (this.studyRatio.new / 100));
        const targetRevCount = Math.round(count * (this.studyRatio.reviewing / 100));
        const targetMastCount = count - targetNewCount - targetRevCount;

        const session = [];

        // Fetch from buckets
        session.push(...sortedNew.slice(0, targetNewCount));
        session.push(...sortedRev.slice(0, targetRevCount));
        session.push(...sortedMast.slice(0, targetMastCount));

        // 4. Fallback refill if any bucket was depleted
        let remainingSlots = count - session.length;
        if (remainingSlots > 0) {
            const extraNew = sortedNew.slice(session.filter(w => newWords.includes(w)).length);
            session.push(...extraNew.slice(0, remainingSlots));
            remainingSlots = count - session.length;
        }
        if (remainingSlots > 0) {
            const extraRev = sortedRev.slice(session.filter(w => reviewingWords.includes(w)).length);
            session.push(...extraRev.slice(0, remainingSlots));
            remainingSlots = count - session.length;
        }
        if (remainingSlots > 0) {
            const extraMast = sortedMast.slice(session.filter(w => masteredWords.includes(w)).length);
            session.push(...extraMast.slice(0, remainingSlots));
        }

        // 5. Final Sort: easy to hard (hsk level ascending)
        return session.sort((a, b) => a.hsk - b.hsk);
    }

    // Settings View Management
    renderSettings() {
        document.getElementById("ratio-new").value = this.studyRatio.new;
        document.getElementById("ratio-reviewing").value = this.studyRatio.reviewing;
        document.getElementById("ratio-mastered").value = this.studyRatio.mastered;
        this.validateRatioSum();
    }

    validateRatioSum() {
        const valNew = parseInt(document.getElementById("ratio-new").value) || 0;
        const valRev = parseInt(document.getElementById("ratio-reviewing").value) || 0;
        const valMast = parseInt(document.getElementById("ratio-mastered").value) || 0;
        
        const sum = valNew + valRev + valMast;
        const feedback = document.getElementById("ratio-sum-feedback");
        const saveBtn = document.getElementById("settings-save-btn");
        
        if (sum === 100) {
            feedback.innerText = `Tổng cộng: ${sum}% (Hợp lệ)`;
            feedback.style.color = "var(--success)";
            saveBtn.disabled = false;
        } else {
            feedback.innerText = `Tổng cộng: ${sum}% (Không hợp lệ - Tổng phải bằng 100%)`;
            feedback.style.color = "var(--error)";
            saveBtn.disabled = true;
        }
    }

    saveSettings(event) {
        event.preventDefault();
        
        const valNew = parseInt(document.getElementById("ratio-new").value) || 0;
        const valRev = parseInt(document.getElementById("ratio-reviewing").value) || 0;
        const valMast = parseInt(document.getElementById("ratio-mastered").value) || 0;
        
        if (valNew + valRev + valMast !== 100) {
            this.validateRatioSum();
            return;
        }
        
        this.studyRatio = {
            new: valNew,
            reviewing: valRev,
            mastered: valMast
        };
        
        localStorage.setItem(`longlong_study_ratio_${this.activeUser}`, JSON.stringify(this.studyRatio));
        
        // Show success notification
        const container = document.querySelector(".main-content");
        const toast = document.createElement("div");
        toast.className = "stat-badge xp animate-fade-in";
        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.right = "20px";
        toast.style.zIndex = "1001";
        toast.style.borderColor = "var(--success)";
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i> Cấu hình học tập đã được lưu!`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // Auth switching & form handlers
    switchAuthTab(mode) {
        this.authMode = mode;
        this.renderAuth();
    }

    renderAuth() {
        const tabLogin = document.getElementById("tab-login");
        const tabRegister = document.getElementById("tab-register");
        const submitBtn = document.getElementById("auth-submit-btn");
        const feedback = document.getElementById("auth-feedback");
        
        feedback.style.display = "none";
        document.getElementById("auth-form").reset();

        if (this.authMode === "login") {
            tabLogin.classList.add("active");
            tabRegister.classList.remove("active");
            submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập`;
        } else {
            tabLogin.classList.remove("active");
            tabRegister.classList.add("active");
            submitBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Đăng ký tài khoản`;
        }
    }

    handleAuth(event) {
        event.preventDefault();
        
        const usernameInput = document.getElementById("auth-username").value.trim();
        const passwordInput = document.getElementById("auth-password").value.trim();
        const feedback = document.getElementById("auth-feedback");
        
        if (usernameInput.length < 3) {
            feedback.innerText = "Tên đăng nhập phải có ít nhất 3 ký tự!";
            feedback.style.display = "block";
            return;
        }
        if (passwordInput.length < 4) {
            feedback.innerText = "Mật khẩu phải có ít nhất 4 ký tự!";
            feedback.style.display = "block";
            return;
        }

        // Normalize username to lowercase for storage lookup
        const username = usernameInput.toLowerCase();
        
        const storedUsers = localStorage.getItem("longlong_users");
        const users = storedUsers ? JSON.parse(storedUsers) : [];

        if (this.authMode === "register") {
            // Check duplicate
            const exists = users.some(u => u.username === username);
            if (exists) {
                feedback.innerText = "Tên đăng nhập đã tồn tại!";
                feedback.style.display = "block";
                return;
            }
            
            // Add user
            users.push({ username, password: passwordInput, rawName: usernameInput });
            localStorage.setItem("longlong_users", JSON.stringify(users));
            
            // Log in immediately
            localStorage.setItem("longlong_active_user", usernameInput);
            this.init();
        } else {
            // Login check
            const user = users.find(u => u.username === username && u.password === passwordInput);
            if (user) {
                localStorage.setItem("longlong_active_user", user.rawName || usernameInput);
                this.init();
            } else {
                feedback.innerText = "Tên đăng nhập hoặc mật khẩu không chính xác!";
                feedback.style.display = "block";
            }
        }
    }

    logout(event) {
        if (event) event.preventDefault();
        
        localStorage.removeItem("longlong_active_user");
        this.activeUser = null;
        
        // Reset app state variables
        this.userState = {
            xp: 0,
            level: 1,
            streak: 0,
            lastActiveDate: null,
            achievements: [],
            dailyXpGoal: 50,
            dailyXpEarned: 0,
            username: ""
        };
        
        this.init();
    }

    // Custom Word Modal Controls
    openAddWordModal() {
        document.getElementById("add-word-modal").style.display = "block";
    }

    closeAddWordModal() {
        document.getElementById("add-word-modal").style.display = "none";
        document.getElementById("add-word-form").reset();
    }

    saveCustomWord(event) {
        event.preventDefault();
        
        const hanzi = document.getElementById("new-hanzi").value.trim();
        const pinyin = document.getElementById("new-pinyin").value.trim();
        const meaning = document.getElementById("new-meaning").value.trim();
        const hsk = parseInt(document.getElementById("new-hsk").value);
        const example = document.getElementById("new-example").value.trim();
        const examplePinyin = document.getElementById("new-example-pinyin").value.trim();
        const exampleMeaning = document.getElementById("new-example-meaning").value.trim();
        
        const rawComp = document.getElementById("new-components").value;
        const components = rawComp ? rawComp.split(",").map(c => c.trim()).filter(c => c.length > 0) : [];

        const newWord = {
            id: "custom_" + Date.now(),
            hanzi,
            pinyin,
            meaning,
            hsk,
            components,
            audio_url: "",
            example,
            example_pinyin: examplePinyin,
            example_meaning: exampleMeaning
        };

        // Load existing custom words
        const stored = localStorage.getItem(`longlong_custom_words_${this.activeUser}`);
        const customList = stored ? JSON.parse(stored) : [];
        customList.push(newWord);
        localStorage.setItem(`longlong_custom_words_${this.activeUser}`, JSON.stringify(customList));

        // Reload database and re-render
        window.reloadWordsDB();
        this.renderDictionary();
        this.closeAddWordModal();

        // Reward 10 XP for adding new custom words!
        this.addXP(10);
        
        // Notify user via a small floating notification
        const container = document.querySelector(".main-content");
        const toast = document.createElement("div");
        toast.className = "stat-badge xp animate-fade-in";
        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.right = "20px";
        toast.style.zIndex = "1001";
        toast.style.borderColor = "var(--success)";
        toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i> Đã lưu từ vựng mới! +10 XP`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // Level up system modals
    showLevelUpModal(level) {
        document.getElementById("levelup-level-num").innerText = level;
        document.getElementById("levelup-modal").style.display = "block";
        
        // Add special level up XP sound
        this.speakChinese("恭喜升级! (Gōngxǐ shēngjí - Chúc mừng tăng cấp!)");
    }

    closeLevelUpModal() {
        document.getElementById("levelup-modal").style.display = "none";
    }
}

// Global App Instance
const app = new AppManager();
window.app = app;

window.addEventListener("DOMContentLoaded", () => {
    app.init();
});

// Close modal when user clicks outside modal
window.addEventListener("click", (event) => {
    const wModal = document.getElementById("writing-modal");
    const lModal = document.getElementById("levelup-modal");
    const aModal = document.getElementById("add-word-modal");
    if (event.target === wModal) {
        app.closeWritingModal();
    }
    if (event.target === lModal) {
        app.closeLevelUpModal();
    }
    if (event.target === aModal) {
        app.closeAddWordModal();
    }
});
