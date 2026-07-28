const SRS = {
    // Get default progress structure for a word
    getDefaultProgress(wordId) {
        return {
            word_id: wordId,
            ease_factor: 2.5,
            interval: 0,
            repetitions: 0,
            next_review: Date.now(), // Due immediately
            last_review: null,
            correct_streak: 0
        };
    },

    // Get progress dictionary from LocalStorage
    getProgressMap() {
        const activeUser = localStorage.getItem("longlong_active_user") || "default";
        const data = localStorage.getItem("longlong_srs_progress_" + activeUser);
        return data ? JSON.parse(data) : {};
    },

    // Save progress dictionary to LocalStorage
    saveProgressMap(map) {
        const activeUser = localStorage.getItem("longlong_active_user") || "default";
        localStorage.setItem("longlong_srs_progress_" + activeUser, JSON.stringify(map));
    },

    // Get progress for a single word
    getWordProgress(wordId) {
        const map = this.getProgressMap();
        if (!map[wordId]) {
            map[wordId] = this.getDefaultProgress(wordId);
            this.saveProgressMap(map);
        }
        return map[wordId];
    },

    // Update SRS progress for a word after a review
    // quality: rating 0-5 (0 = completely forgot, 5 = perfect memory)
    reviewWord(wordId, quality) {
        const map = this.getProgressMap();
        const progress = map[wordId] || this.getDefaultProgress(wordId);
        
        let nextRepetitions = progress.repetitions;
        let nextInterval = progress.interval;
        let nextEaseFactor = progress.ease_factor;
        
        // SM-2 Algorithm implementation
        if (quality >= 3) {
            if (nextRepetitions === 0) {
                nextInterval = 1; // 1 day
                nextRepetitions = 1;
            } else if (nextRepetitions === 1) {
                nextInterval = 3; // 3 days (tuned down slightly from 6 for faster active engagement)
                nextRepetitions = 2;
            } else {
                nextInterval = Math.round(nextInterval * nextEaseFactor);
                nextRepetitions = nextRepetitions + 1;
            }
            
            // Adjust ease factor
            nextEaseFactor = nextEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
            progress.correct_streak++;
        } else {
            // Forgotten word
            nextRepetitions = 0;
            nextInterval = 1; // Review tomorrow
            progress.correct_streak = 0;
        }

        // Cap ease factor at minimum 1.3
        if (nextEaseFactor < 1.3) {
            nextEaseFactor = 1.3;
        }

        const now = Date.now();
        progress.repetitions = nextRepetitions;
        progress.interval = nextInterval;
        progress.ease_factor = nextEaseFactor;
        progress.last_review = now;
        
        // Calculate next review timestamp: interval in days
        const oneDayMs = 24 * 60 * 60 * 1000;
        progress.next_review = now + (nextInterval * oneDayMs);

        map[wordId] = progress;
        this.saveProgressMap(map);
        
        return progress;
    },

    // Filter a list of words to find those that are due for review
    getDueWords(allWords) {
        const map = this.getProgressMap();
        const now = Date.now();
        
        return allWords.filter(word => {
            const progress = map[word.id];
            if (!progress) return true; // Brand new words are due immediately
            return progress.next_review <= now;
        });
    },

    // Get count of due words
    getDueCount(allWords) {
        return this.getDueWords(allWords).length;
    },

    // Reset all progress data (for debugging/fresh start)
    resetProgress() {
        const activeUser = localStorage.getItem("longlong_active_user") || "default";
        localStorage.removeItem("longlong_srs_progress_" + activeUser);
    }
};

window.SRS = SRS;
