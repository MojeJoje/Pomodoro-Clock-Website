class PomodoroTimer {
    constructor() {
        // Configuration
        this.focusDuration = 25 * 60; // in seconds
        this.breakDuration = 5 * 60; // in seconds
        
        // State
        this.isRunning = false;
        this.isPaused = false;
        this.isBreak = false;
        this.timeRemaining = this.focusDuration;
        this.timerInterval = null;
        
        // DOM Elements
        this.timerDisplay = document.getElementById('timerDisplay');
        this.sessionType = document.getElementById('sessionType');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resumeBtn = document.getElementById('resumeBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.focusInput = document.getElementById('focusInput');
        this.breakInput = document.getElementById('breakInput');
        this.historyList = document.getElementById('historyList');
        
        // Initialize
        this.loadSettings();
        this.loadHistory();
        this.renderHistory();
        this.attachEventListeners();
        this.updateDisplay();
        this.updateGlow();
    }
    
    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resumeBtn.addEventListener('click', () => this.resume());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.focusInput.addEventListener('change', () => this.updateSettings());
        this.breakInput.addEventListener('change', () => this.updateSettings());
    }
    
    loadSettings() {
        const saved = localStorage.getItem('pomodoroSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.focusDuration = settings.focus * 60;
            this.breakDuration = settings.break * 60;
            this.focusInput.value = settings.focus;
            this.breakInput.value = settings.break;
            // Update timeRemaining to match the loaded focusDuration
            this.timeRemaining = this.focusDuration;
        }
    }
    
    updateSettings() {
        if (this.isRunning) {
            alert('Stop the timer before changing settings');
            this.loadSettings();
            return;
        }
        
        this.focusDuration = Math.max(1, parseInt(this.focusInput.value) || 25) * 60;
        this.breakDuration = Math.max(1, parseInt(this.breakInput.value) || 5) * 60;
        
        const settings = {
            focus: this.focusDuration / 60,
            break: this.breakDuration / 60
        };
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
        this.reset();
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.focusInput.disabled = true;
        this.breakInput.disabled = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.resetBtn.disabled = false;
        
        this.timerInterval = setInterval(() => this.tick(), 1000);
    }
    
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.pauseBtn.disabled = true;
        this.resumeBtn.disabled = false;
    }
    
    resume() {
        if (this.isRunning || !this.isPaused) return;
        
        this.isPaused = false;
        this.isRunning = true;
        this.pauseBtn.disabled = false;
        this.resumeBtn.disabled = true;
        this.timerInterval = setInterval(() => this.tick(), 1000);
    }
    
    reset() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.isPaused = false;
        this.isBreak = false;
        this.timeRemaining = this.focusDuration;
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.resumeBtn.disabled = true;
        this.focusInput.disabled = false;
        this.breakInput.disabled = false;
        
        this.updateDisplay();
        this.updateSessionIndicator();
    }
    
    tick() {
        this.timeRemaining--;
        this.updateDisplay();
        
        if (this.timeRemaining <= 0) {
            this.sessionComplete();
        }
    }
    
    sessionComplete() {
        // Play audio cue
        this.playAudio();
        
        // Add to history if it was a focus session
        if (!this.isBreak) {
            const durationMinutes = Math.floor(this.focusDuration / 60);
            const durationSeconds = this.focusDuration % 60;
            this.addToHistory(
                `${durationMinutes}:${String(durationSeconds).padStart(2, '0')} focus`,
                new Date()
            );
        }
        
        // Switch to break or focus
        this.isBreak = !this.isBreak;
        this.timeRemaining = this.isBreak ? this.breakDuration : this.focusDuration;
        this.updateSessionIndicator();
        this.updateDisplay();
        this.updateGlow();
    }
    
    playAudio() {
        // Create audio context and play a simple beep
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800; // Hz
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Fallback: use simple alert beep
            console.log('Session complete!');
        }
    }
    
    updateDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        this.timerDisplay.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    updateSessionIndicator() {
        if (this.isBreak) {
            this.sessionType.textContent = 'Break';
            this.sessionType.className = 'session-type break';
        } else {
            this.sessionType.textContent = 'Focus';
            this.sessionType.className = 'session-type focus';
        }
        this.updateGlow();
    }
    
    updateGlow() {
        const timerGlow = document.getElementById('timerGlow');
        if (this.isBreak) {
            timerGlow.className = 'timer-glow break-glow';
        } else {
            timerGlow.className = 'timer-glow focus-glow';
        }
    }
    
    addToHistory(duration, timestamp) {
        let history = this.loadHistory();
        
        history.push({
            duration: duration,
            time: timestamp.getTime(),
            date: this.getDateKey(timestamp)
        });
        
        localStorage.setItem('pomodoroHistory', JSON.stringify(history));
        this.renderHistory();
    }
    
    loadHistory() {
        const savedHistory = localStorage.getItem('pomodoroHistory');
        let history = savedHistory ? JSON.parse(savedHistory) : [];
        
        // Filter to only today's sessions
        const today = this.getDateKey(new Date());
        history = history.filter(item => item.date === today);
        
        // Update localStorage with filtered history
        localStorage.setItem('pomodoroHistory', JSON.stringify(history));
        
        return history;
    }
    
    getDateKey(date) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    renderHistory() {
        const history = this.loadHistory();
        
        if (history.length === 0) {
            this.historyList.innerHTML = '<p class="empty-history">No sessions completed yet</p>';
            return;
        }
        
        this.historyList.innerHTML = history.map(item => {
            const date = new Date(item.time);
            const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
            
            return `
                <div class="history-item">
                    <span class="checkmark">✓</span>
                    <span class="duration">${item.duration}</span>
                    <span class="type">—</span>
                    <span class="time">${timeStr}</span>
                </div>
            `;
        }).join('');
    }
}

// Sessions panel functionality
function initializeSessionsPanel() {
    const toggleBtn = document.getElementById('sessionsPanelToggle');
    const panel = document.getElementById('sessionsPanel');
    const overlay = document.getElementById('panelOverlay');
    const closeBtn = document.getElementById('closePanelBtn');
    let isPanelOpen = false;
    
    function openPanel() {
        panel.classList.add('active');
        overlay.classList.add('active');
        toggleBtn.classList.add('hidden');
        isPanelOpen = true;
    }
    
    function closePanel() {
        panel.classList.remove('active');
        overlay.classList.remove('active');
        toggleBtn.classList.remove('hidden');
        isPanelOpen = false;
    }
    
    // Toggle on button click
    toggleBtn.addEventListener('click', openPanel);
    
    // Close on X button
    closeBtn.addEventListener('click', closePanel);
    
    // Close on overlay click
    overlay.addEventListener('click', closePanel);
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPanelOpen) {
            closePanel();
        }
    });
}

// Initialize the timer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const timer = new PomodoroTimer();
    initializeSessionsPanel();
    initializeInputControls(timer);
});

// Custom input controls
function initializeInputControls(timer) {
    const focusIncrease = document.getElementById('focusIncrease');
    const focusDecrease = document.getElementById('focusDecrease');
    const breakIncrease = document.getElementById('breakIncrease');
    const breakDecrease = document.getElementById('breakDecrease');
    const focusInput = document.getElementById('focusInput');
    const breakInput = document.getElementById('breakInput');
    
    focusIncrease?.addEventListener('click', () => {
        focusInput.value = Math.min(60, parseInt(focusInput.value) + 1);
        focusInput.dispatchEvent(new Event('change'));
    });
    
    focusDecrease?.addEventListener('click', () => {
        focusInput.value = Math.max(1, parseInt(focusInput.value) - 1);
        focusInput.dispatchEvent(new Event('change'));
    });
    
    breakIncrease?.addEventListener('click', () => {
        breakInput.value = Math.min(30, parseInt(breakInput.value) + 1);
        breakInput.dispatchEvent(new Event('change'));
    });
    
    breakDecrease?.addEventListener('click', () => {
        breakInput.value = Math.max(1, parseInt(breakInput.value) - 1);
        breakInput.dispatchEvent(new Event('change'));
    });
}