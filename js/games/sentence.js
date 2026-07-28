// Dynamic Chinese sentence splitter for Sentence Builder game
function splitSentence(sentence, targetWordHanzi) {
    // Common words in HSK 1-3 to keep together as single tiles
    const commonTokens = [
        "喜欢", "谢谢", "再见", "今天", "天气", "医生", "医院", "电脑", "电视", "电影",
        "学校", "学生", "老师", "我们", "你们", "他们", "她们", "中国", "北京", "咖啡",
        "跑步", "便宜", "旅游", "生病", "觉得", "准备", "什么", "名字", "认识", "高兴",
        "飞机", "出租车", "打电话", "饭馆", "分钟", "汉语", "漂亮", "商店", "上午", "下午",
        "中午", "水果", "睡觉", "说话", "同学", "衣服", "椅子", "桌子", "昨天", "明天",
        "帮助", "报纸", "大家", "房间", "very", "非常", "服务员", "火车站", "机场", "鸡蛋", 
        "教室", "姐姐", "哥哥", "弟弟", "妹妹", "爸爸", "妈妈", "介绍", "开始", "考试", 
        "可能", "可以", "快乐", "牛奶", "旁边", "起床", "身体", "生日", "时间", "事情", 
        "手表", "手机", "所以", "因为", "运动", "早上", "丈夫", "正在", "知道", "准备", 
        "阿姨", "安静", "办法", "办公室", "帮忙", "笔记本", "必须", "变化", "别人", "冰箱", 
        "不但", "而且", "菜单", "参加", "超市", "衬衫", "成绩", "城市", "迟到", "出现", 
        "除了", "春", "词典", "聪明", "打扫", "打算", "担心", "蛋糕", "当然", "地方", 
        "地铁", "地图", "电梯", "电子邮件", "动物", "锻炼", "耳朵", "发烧", "发现", 
        "方便", "方法", "方向", "放心", "复习", "附近", "干净", "感冒", "刚才", "根据", 
        "公园", "故事", "刮风", "关系", "关心", "关于", "国家", "过去", "还是", "害怕", 
        "航班", "黑板", "后来", "护照", "环境", "会议", "或者", "几乎", "机会", "季节", 
        "检查", "简单", "健康", "见面", "街道", "节目", "节日", "结婚", "结束", "解决", 
        "解释", "经常", "经过", "经理", "举行", "句子", "决定", "可爱", "客人", "空调", 
        "裤子", "筷子", "离开", "历史", "练习", "聊天", "了解", "邻居", "留学", "马上", 
        "满意", "帽子", "面包", "面条", "明白", "奶奶", "难过", "年级", "年轻", "努力", 
        "爬山", "盘子", "皮鞋", "啤酒", "普通话", "其实", "其他", "奇怪", "起飞", "起来", 
        "清楚", "请假", "裙子", "然后", "热情", "认为", "认真", "容易", "如果", "上网", 
        "生气", "声音", "世界", "舒服", "叔叔", "数学", "刷牙", "水平", "司机", "太阳", 
        "特别", "提高", "体育", "同事", "同意", "头发", "突然", "图书馆", "完成", "忘记", 
        "为了", "文化", "习惯", "洗手间", "洗澡", "相信", "香蕉", "小心", "校长", "新闻", 
        "新鲜", "信用卡", "行李箱", "兴趣", "熊猫", "需要", "选择", "眼镜", "要求", "爷爷", 
        "一般", "一边", "一定", "一共", "一会儿", "一样", "一直", "以前", "音乐", "银行", 
        "饮料", "影响", "游戏", "有名", "遇到", "愿意", "月亮", "照顾", "照片", "照相机", 
        "中间", "中文", "终于", "重要", "周末", "主要", "注意", "自己", "自行车", "总是", 
        "最后", "最近", "作业"
    ];
    
    // Sort descending by length to match longer words first
    commonTokens.sort((a, b) => b.length - a.length);

    let temp = sentence;
    const targetPlaceholder = "__TARGET_WORD__";
    if (targetWordHanzi && temp.includes(targetWordHanzi)) {
        temp = temp.replace(new RegExp(targetWordHanzi, 'g'), targetPlaceholder);
    }

    const placeholders = [];
    commonTokens.forEach((tok, idx) => {
        if (temp.includes(tok)) {
            const p = `__TOKEN_${idx}__`;
            placeholders.push({ placeholder: p, original: tok });
            temp = temp.replace(new RegExp(tok, 'g'), p);
        }
    });

    const tokens = [];
    let i = 0;
    while (i < temp.length) {
        if (temp.startsWith(targetPlaceholder, i)) {
            tokens.push(targetWordHanzi);
            i += targetPlaceholder.length;
        } else {
            let matched = false;
            for (const item of placeholders) {
                if (temp.startsWith(item.placeholder, i)) {
                    tokens.push(item.original);
                    i += item.placeholder.length;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                tokens.push(temp[i]);
                i++;
            }
        }
    }
    return tokens.filter(t => t.trim() !== "");
}

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
        
        // Pick target word based on current round index from words that have examples
        const validWords = this.allWords.filter(w => w.example && w.example.trim() !== "");
        if (validWords.length === 0) {
            app.exitGame();
            return;
        }
        this.targetWord = validWords[this.currentRound % validWords.length];
        
        this.correctSentence = this.targetWord.example;
        this.correctTokens = splitSentence(this.correctSentence, this.targetWord.hanzi);
        
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
            let count = parseInt(localStorage.getItem(`longlong_sentence_count_${app.activeUser}`) || "0");
            count++;
            localStorage.setItem(`longlong_sentence_count_${app.activeUser}`, count.toString());
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
