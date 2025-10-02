// Smart Study Planner - Advanced Features Implementation
class SmartStudyPlanner {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.goals = JSON.parse(localStorage.getItem('goals')) || {
            dailyStudyTime: 4,
            dailyTasks: 5,
            weeklyStudyTime: 28
        };
        this.settings = JSON.parse(localStorage.getItem('settings')) || {
            darkMode: false,
            themeColor: 'blue',
            taskReminders: true,
            breakReminders: true,
            streakReminders: true
        };
        this.analytics = JSON.parse(localStorage.getItem('analytics')) || {
            studyTime: {},
            completedTasks: {},
            streaks: { current: 0, best: 0, lastStudyDate: null },
            sessions: { today: 0, total: 0 },
            points: 0,
            level: 1,
            xp: 0
        };
        this.timer = {
            isRunning: false,
            timeLeft: 25 * 60, // 25 minutes in seconds
            phase: 'focus', // 'focus', 'shortBreak', 'longBreak'
            sessions: 0,
            interval: null
        };
        this.studyGroups = JSON.parse(localStorage.getItem('studyGroups')) || [];
        this.notes = JSON.parse(localStorage.getItem('notes')) || [];
        this.habits = JSON.parse(localStorage.getItem('habits')) || [];
        this.focusStats = JSON.parse(localStorage.getItem('focusStats')) || {
            sessionsToday: 0,
            totalFocusTime: 0,
            averageSession: 0,
            focusStreak: 0
        };
        this.currentView = 'dashboard';
        this.currentNote = null;
        this.isFullScreen = false;
        this.activeSounds = new Map();
        this.quotes = [
            { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
            { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
            { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
            { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
            { text: "Study while others are sleeping; work while others are loafing.", author: "William A. Ward" },
            { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
            { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
            { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" }
        ];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.updateUI();
        this.checkStreaks();
        this.setupNotifications();
        this.initCharts();
        this.showRandomQuote();
        this.updateCalendar();
    }

    // Feature 1: Daily/Weekly Goals
    setupGoals() {
        const setGoalsBtn = document.getElementById('setGoalsBtn');
        const goalsForm = document.getElementById('goalsForm');

        setGoalsBtn?.addEventListener('click', () => {
            this.showModal('goalsModal');
            this.populateGoalsForm();
        });

        goalsForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGoals();
            this.hideModal('goalsModal');
            this.updateGoalsDisplay();
        });
    }

    populateGoalsForm() {
        document.getElementById('dailyStudyTime').value = this.goals.dailyStudyTime;
        document.getElementById('dailyTasks').value = this.goals.dailyTasks;
        document.getElementById('weeklyStudyTime').value = this.goals.weeklyStudyTime;
    }

    saveGoals() {
        this.goals = {
            dailyStudyTime: parseFloat(document.getElementById('dailyStudyTime').value),
            dailyTasks: parseInt(document.getElementById('dailyTasks').value),
            weeklyStudyTime: parseFloat(document.getElementById('weeklyStudyTime').value)
        };
        localStorage.setItem('goals', JSON.stringify(this.goals));
    }

    updateGoalsDisplay() {
        const today = new Date().toDateString();
        const todayTasks = this.tasks.filter(task => 
            task.completed && new Date(task.completedAt).toDateString() === today
        ).length;
        
        const todayTime = this.analytics.studyTime[today] || 0;
        
        document.getElementById('studyTimeGoal').textContent = 
            `${(todayTime / 60).toFixed(1)}h / ${this.goals.dailyStudyTime}h`;
        document.getElementById('tasksGoal').textContent = 
            `${todayTasks} / ${this.goals.dailyTasks}`;
    }

    // Feature 2: Task Deadlines & Reminders
    setupReminders() {
        if (this.settings.taskReminders) {
            this.checkTaskDeadlines();
            setInterval(() => this.checkTaskDeadlines(), 60000); // Check every minute
        }
    }

    checkTaskDeadlines() {
        const now = new Date();
        const upcomingTasks = this.tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            const dueDate = new Date(task.dueDate);
            const timeDiff = dueDate - now;
            return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // 24 hours
        });

        upcomingTasks.forEach(task => {
            const dueDate = new Date(task.dueDate);
            const hours = Math.floor((dueDate - now) / (1000 * 60 * 60));
            
            if (hours <= 1 && !task.reminderSent) {
                this.showNotification(`Task "${task.title}" is due in ${hours} hour(s)!`, 'warning');
                task.reminderSent = true;
                this.saveTasks();
            }
        });
    }

    // Feature 3: Pomodoro Timer
    setupPomodoroTimer() {
        const startBtn = document.getElementById('startTimer');
        const pauseBtn = document.getElementById('pauseTimer');
        const resetBtn = document.getElementById('resetTimer');
        const focusTimeInput = document.getElementById('focusTime');

        startBtn?.addEventListener('click', () => this.startTimer());
        pauseBtn?.addEventListener('click', () => this.pauseTimer());
        resetBtn?.addEventListener('click', () => this.resetTimer());

        focusTimeInput?.addEventListener('change', () => {
            if (!this.timer.isRunning) {
                this.timer.timeLeft = focusTimeInput.value * 60;
                this.updateTimerDisplay();
            }
        });
    }

    startTimer() {
        if (!this.timer.isRunning) {
            this.timer.isRunning = true;
            this.timer.interval = setInterval(() => this.updateTimer(), 1000);
            
            document.getElementById('startTimer').disabled = true;
            document.getElementById('pauseTimer').disabled = false;
            
            // Track study session start
            this.trackStudySession();
        }
    }

    pauseTimer() {
        this.timer.isRunning = false;
        clearInterval(this.timer.interval);
        
        document.getElementById('startTimer').disabled = false;
        document.getElementById('pauseTimer').disabled = true;
    }

    resetTimer() {
        this.pauseTimer();
        const focusTime = document.getElementById('focusTime').value;
        this.timer.timeLeft = focusTime * 60;
        this.timer.phase = 'focus';
        this.updateTimerDisplay();
        this.updateTimerProgress();
    }

    updateTimer() {
        this.timer.timeLeft--;
        
        if (this.timer.timeLeft <= 0) {
            this.completeTimerPhase();
        }
        
        this.updateTimerDisplay();
        this.updateTimerProgress();
    }

    completeTimerPhase() {
        this.pauseTimer();
        
        if (this.timer.phase === 'focus') {
            this.timer.sessions++;
            this.analytics.sessions.today++;
            this.analytics.sessions.total++;
            
            // Add XP and points for completing focus session
            this.addXP(25);
            this.analytics.points += 10;
            
            // Determine next phase
            if (this.timer.sessions % 4 === 0) {
                this.timer.phase = 'longBreak';
                this.timer.timeLeft = document.getElementById('longBreak').value * 60;
            } else {
                this.timer.phase = 'shortBreak';
                this.timer.timeLeft = document.getElementById('shortBreak').value * 60;
            }
            
            this.showNotification('Focus session completed! Time for a break.', 'success');
            this.trackStudyTime(document.getElementById('focusTime').value);
        } else {
            this.timer.phase = 'focus';
            this.timer.timeLeft = document.getElementById('focusTime').value * 60;
            this.showNotification('Break time over! Ready for another focus session?', 'info');
        }
        
        this.updateTimerDisplay();
        this.updateSessionsDisplay();
        this.saveAnalytics();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timer.timeLeft / 60);
        const seconds = this.timer.timeLeft % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        let phaseText;
        if (this.timer.phase === 'focus') {
            phaseText = 'Focus Time';
        } else if (this.timer.phase === 'shortBreak') {
            phaseText = 'Short Break';
        } else {
            phaseText = 'Long Break';
        }
        
        document.getElementById('timerDisplay').textContent = display;
        document.getElementById('timerPhase').textContent = phaseText;
    }

    updateTimerProgress() {
        let totalTime;
        if (this.timer.phase === 'focus') {
            totalTime = document.getElementById('focusTime').value * 60;
        } else if (this.timer.phase === 'shortBreak') {
            totalTime = document.getElementById('shortBreak').value * 60;
        } else {
            totalTime = document.getElementById('longBreak').value * 60;
        }
        
        const progress = ((totalTime - this.timer.timeLeft) / totalTime) * 100;
        const circumference = 502; // 2 * PI * 80 (radius)
        const offset = circumference - (progress / 100) * circumference;
        
        const progressCircle = document.getElementById('timerProgress');
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = offset;
        }
    }

    updateSessionsDisplay() {
        document.getElementById('sessionsToday').textContent = this.analytics.sessions.today;
        document.getElementById('totalSessions').textContent = this.analytics.sessions.total;
    }

    // Feature 4: Progress Analytics - Simple CSS Charts
    initCharts() {
        this.initWeeklyChart();
        this.initCategoryChart();
        this.initProductivityChart();
    }

    initWeeklyChart() {
        const container = document.getElementById('weeklyChart');
        if (!container) return;

        const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weekData = this.getWeeklyStudyData();
        const maxValue = Math.max(...weekData, 1);

        let html = '<div class="chart-bar">';
        weekDays.forEach((day, index) => {
            const height = (weekData[index] / maxValue) * 100;
            html += `
                <div class="chart-bar-item" style="height: ${height}%">
                    <div class="chart-bar-label">${day}</div>
                    <div class="chart-bar-value">${weekData[index].toFixed(1)}h</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    initCategoryChart() {
        const container = document.getElementById('categoryChart');
        if (!container) return;

        const categoryData = this.getCategoryData();
        const categories = Object.keys(categoryData);
        const total = Object.values(categoryData).reduce((sum, val) => sum + val, 0);

        if (total === 0) {
            container.innerHTML = '<div class="empty-state"><p>No completed tasks yet</p></div>';
            return;
        }

        let html = '<div class="chart-pie"></div><div class="chart-legend">';
        const colors = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0'];
        
        categories.forEach((category, index) => {
            const percentage = ((categoryData[category] / total) * 100).toFixed(1);
            html += `
                <div class="chart-legend-item">
                    <div class="chart-legend-color" style="background: ${colors[index % colors.length]}"></div>
                    <span>${this.getCategoryLabel(category)}: ${percentage}%</span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    initProductivityChart() {
        const container = document.getElementById('productivityChart');
        if (!container) return;
        
        let html = '<div class="chart-line"></div>';
        html += '<div class="chart-legend">';
        html += '<div class="chart-legend-item"><div class="chart-legend-color" style="background: var(--primary-color)"></div><span>Study Hours</span></div>';
        html += '<div class="chart-legend-item"><div class="chart-legend-color" style="background: var(--success-color)"></div><span>Tasks Completed</span></div>';
        html += '</div>';
        
        container.innerHTML = html;
    }

    getWeeklyStudyData() {
        const weekData = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            weekData.push((this.analytics.studyTime[dateString] || 0) / 60); // Convert to hours
        }
        
        return weekData;
    }

    getCategoryData() {
        const categories = {};
        this.tasks.forEach(task => {
            if (task.completed) {
                categories[task.category] = (categories[task.category] || 0) + 1;
            }
        });
        return categories;
    }

    getProductivityData() {
        const last7Days = [];
        const taskData = [];
        const hourData = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            
            last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            const dayTasks = this.tasks.filter(task => 
                task.completed && new Date(task.completedAt).toDateString() === dateString
            ).length;
            
            taskData.push(dayTasks);
            hourData.push((this.analytics.studyTime[dateString] || 0) / 60);
        }
        
        return {
            labels: last7Days,
            tasks: taskData,
            hours: hourData
        };
    }

    // Feature 5: Streak Tracker
    checkStreaks() {
        const today = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();
        
        const studiedToday = this.analytics.studyTime[today] > 0;
        const studiedYesterday = this.analytics.studyTime[yesterdayString] > 0;
        
        if (studiedToday) {
            if (this.analytics.streaks.lastStudyDate !== today) {
                if (this.analytics.streaks.lastStudyDate === yesterdayString) {
                    this.analytics.streaks.current++;
                } else if (this.analytics.streaks.lastStudyDate !== today) {
                    this.analytics.streaks.current = 1;
                }
                
                this.analytics.streaks.lastStudyDate = today;
                
                if (this.analytics.streaks.current > this.analytics.streaks.best) {
                    this.analytics.streaks.best = this.analytics.streaks.current;
                    this.showNotification(`New best streak: ${this.analytics.streaks.best} days! 🔥`, 'success');
                }
                
                this.saveAnalytics();
            }
        } else if (!studiedYesterday && this.analytics.streaks.current > 0) {
            this.analytics.streaks.current = 0;
            this.saveAnalytics();
        }
        
        this.updateStreakDisplay();
    }

    updateStreakDisplay() {
        document.getElementById('streakCount').textContent = this.analytics.streaks.current;
    }

    // Feature 6: Categories/Subjects - Already implemented in task creation

    // Feature 7: Custom Priority Levels - Already implemented with 5 levels

    // Feature 8: Recurring Tasks
    checkRecurringTasks() {
        const today = new Date();
        
        this.tasks.forEach(task => {
            if (task.recurring && task.completed && task.completedAt) {
                const completedDate = new Date(task.completedAt);
                const shouldRecur = this.shouldTaskRecur(task, completedDate, today);
                
                if (shouldRecur) {
                    this.createRecurringTask(task);
                }
            }
        });
    }

    shouldTaskRecur(task, completedDate, today) {
        const daysDiff = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));
        
        switch (task.recurrencePattern) {
            case 'daily':
                return daysDiff >= 1;
            case 'weekly':
                return daysDiff >= 7;
            case 'monthly':
                return daysDiff >= 30;
            default:
                return false;
        }
    }

    createRecurringTask(originalTask) {
        const newTask = {
            ...originalTask,
            id: Date.now(),
            completed: false,
            completedAt: null,
            reminderSent: false,
            createdAt: new Date().toISOString()
        };
        
        // Update due date if it exists
        if (newTask.dueDate) {
            const newDueDate = new Date(newTask.dueDate);
            switch (newTask.recurrencePattern) {
                case 'daily':
                    newDueDate.setDate(newDueDate.getDate() + 1);
                    break;
                case 'weekly':
                    newDueDate.setDate(newDueDate.getDate() + 7);
                    break;
                case 'monthly':
                    newDueDate.setMonth(newDueDate.getMonth() + 1);
                    break;
            }
            newTask.dueDate = newDueDate.toISOString().slice(0, 16);
        }
        
        this.tasks.push(newTask);
        this.saveTasks();
    }

    // Feature 9: Subtasks/Checklists - Already implemented in task creation

    // Feature 10: Notes/Attachments - Already implemented in task creation

    // Feature 11: Dark Mode
    setupDarkMode() {
        const themeToggle = document.getElementById('themeToggle');
        const darkModeToggle = document.getElementById('darkModeToggle');
        
        themeToggle?.addEventListener('click', () => this.toggleDarkMode());
        darkModeToggle?.addEventListener('change', (e) => {
            this.settings.darkMode = e.target.checked;
            this.applyTheme();
            this.saveSettings();
        });
    }

    toggleDarkMode() {
        this.settings.darkMode = !this.settings.darkMode;
        this.applyTheme();
        this.saveSettings();
    }

    applyTheme() {
        const body = document.body;
        const themeIcon = document.querySelector('#themeToggle i');
        
        if (this.settings.darkMode) {
            body.setAttribute('data-theme', 'dark');
            themeIcon.className = 'fas fa-sun';
        } else {
            body.removeAttribute('data-theme');
            themeIcon.className = 'fas fa-moon';
        }
        
        body.setAttribute('data-theme-color', this.settings.themeColor);
    }

    // Feature 12: Custom Themes/Colors
    setupCustomThemes() {
        const colorOptions = document.querySelectorAll('.color-option');
        
        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.setThemeColor(theme);
                
                colorOptions.forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    setThemeColor(color) {
        this.settings.themeColor = color;
        this.applyTheme();
        this.saveSettings();
    }

    // Feature 13: Motivational Quotes/Rewards
    showRandomQuote() {
        const randomQuote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
        document.getElementById('dailyQuote').textContent = `"${randomQuote.text}"`;
        document.getElementById('quoteAuthor').textContent = `- ${randomQuote.author}`;
    }

    setupQuotes() {
        const newQuoteBtn = document.getElementById('newQuoteBtn');
        newQuoteBtn?.addEventListener('click', () => this.showRandomQuote());
    }

    // Feature 14: Gamification
    addXP(amount) {
        this.analytics.xp += amount;
        
        const xpNeeded = this.analytics.level * 100;
        if (this.analytics.xp >= xpNeeded) {
            this.analytics.level++;
            this.analytics.xp -= xpNeeded;
            this.showNotification(`Level Up! You're now level ${this.analytics.level}! 🎉`, 'success');
            this.checkAchievements();
        }
        
        this.updateXPDisplay();
        this.saveAnalytics();
    }

    updateXPDisplay() {
        const xpNeeded = this.analytics.level * 100;
        const progress = (this.analytics.xp / xpNeeded) * 100;
        
        document.getElementById('userLevel').textContent = `Level ${this.analytics.level}`;
        document.getElementById('xpProgress').style.width = `${progress}%`;
        document.getElementById('xpText').textContent = `${this.analytics.xp}/${xpNeeded} XP`;
        document.getElementById('totalPoints').textContent = this.analytics.points;
    }

    checkAchievements() {
        const achievements = document.querySelectorAll('.achievement');
        
        // First Task Achievement
        if (this.tasks.some(task => task.completed)) {
            achievements[0]?.classList.remove('locked');
        }
        
        // 7-Day Streak Achievement
        if (this.analytics.streaks.best >= 7) {
            achievements[1]?.classList.remove('locked');
        }
        
        // 10 Hours Study Achievement
        const totalStudyTime = Object.values(this.analytics.studyTime).reduce((sum, time) => sum + time, 0);
        if (totalStudyTime >= 600) { // 10 hours in minutes
            achievements[2]?.classList.remove('locked');
        }
    }

    // Feature 15: Calendar Sync
    setupCalendarSync() {
        const syncBtn = document.getElementById('syncCalendarBtn');
        const exportBtn = document.getElementById('exportCalendarBtn');
        
        syncBtn?.addEventListener('click', () => this.syncWithGoogleCalendar());
        exportBtn?.addEventListener('click', () => this.exportCalendar());
    }

    syncWithGoogleCalendar() {
        // This would require Google Calendar API integration
        this.showNotification('Google Calendar sync feature requires API setup', 'info');
    }

    exportCalendar() {
        const calendarData = this.generateCalendarData();
        const blob = new Blob([calendarData], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'study_calendar.ics';
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Calendar exported successfully!', 'success');
    }

    generateCalendarData() {
        let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Smart Study Planner//EN\n';
        
        this.tasks.forEach(task => {
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                const dateStr = dueDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                
                icsContent += 'BEGIN:VEVENT\n';
                icsContent += `UID:${task.id}@smartstudyplanner.com\n`;
                icsContent += `DTSTART:${dateStr}\n`;
                icsContent += `SUMMARY:${task.title}\n`;
                icsContent += `DESCRIPTION:${task.description || ''}\n`;
                icsContent += 'END:VEVENT\n';
            }
        });
        
        icsContent += 'END:VCALENDAR';
        return icsContent;
    }

    // Feature 16: Export/Share Tasks
    setupDataExport() {
        const exportBtn = document.getElementById('exportDataBtn');
        const importBtn = document.getElementById('importDataBtn');
        const importFile = document.getElementById('importFile');
        
        exportBtn?.addEventListener('click', () => this.exportData());
        importBtn?.addEventListener('click', () => importFile?.click());
        importFile?.addEventListener('change', (e) => this.importData(e));
    }

    // Color Theme Management
    applyColorTheme(theme) {
        document.documentElement.setAttribute('data-theme-color', theme);
        this.settings.colorTheme = theme;
        this.saveSettings();
        
        // Update CSS variables based on theme
        const root = document.documentElement;
        switch (theme) {
            case 'blue':
                root.style.setProperty('--primary-color', '#2196F3');
                break;
            case 'green':
                root.style.setProperty('--primary-color', '#4CAF50');
                break;
            case 'purple':
                root.style.setProperty('--primary-color', '#9C27B0');
                break;
            case 'orange':
                root.style.setProperty('--primary-color', '#FF9800');
                break;
        }
        
        this.showNotification(`Applied ${theme} theme! 🎨`, 'success');
    }

    // Enhanced Dark Mode Toggle
    toggleDarkMode(enabled) {
        if (enabled) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.settings.darkMode = true;
            this.showNotification('Dark mode enabled! 🌙', 'success');
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.settings.darkMode = false;
            this.showNotification('Light mode enabled! ☀️', 'success');
        }
        this.saveSettings();
    }

    // Data Management Setup
    setupDataManagement() {
        document.getElementById('importDataBtn')?.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importData(e);
            }
        });
    }

    exportData() {
        const data = {
            tasks: this.tasks,
            goals: this.goals,
            settings: this.settings,
            analytics: this.analytics,
            studyGroups: this.studyGroups,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `study_planner_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('This will replace all your current data. Are you sure?')) {
                    this.tasks = data.tasks || [];
                    this.goals = data.goals || this.goals;
                    this.settings = data.settings || this.settings;
                    this.analytics = data.analytics || this.analytics;
                    this.studyGroups = data.studyGroups || [];
                    
                    this.saveAll();
                    this.updateUI();
                    this.showNotification('Data imported successfully!', 'success');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                this.showNotification(`Error importing data: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
    }

    // Feature 17: Collaboration Mode
    setupCollaboration() {
        const createGroupBtn = document.getElementById('createGroupBtn');
        const joinGroupBtn = document.getElementById('joinGroupBtn');
        
        createGroupBtn?.addEventListener('click', () => this.createStudyGroup());
        joinGroupBtn?.addEventListener('click', () => this.joinStudyGroup());
    }

    createStudyGroup() {
        const groupName = prompt('Enter study group name:');
        if (!groupName) return;
        
        const group = {
            id: Date.now(),
            name: groupName,
            members: [{ name: 'You', id: 'user' }],
            sharedTasks: [],
            createdAt: new Date().toISOString()
        };
        
        this.studyGroups.push(group);
        this.saveStudyGroups();
        this.updateCollaborationView();
        this.showNotification(`Study group "${groupName}" created!`, 'success');
    }

    joinStudyGroup() {
        const groupCode = prompt('Enter group code:');
        if (!groupCode) return;
        
        // Simulate joining a group
        const group = {
            id: Date.now(),
            name: `Group ${groupCode}`,
            members: [{ name: 'You', id: 'user' }, { name: 'Study Buddy', id: 'buddy' }],
            sharedTasks: [],
            joinedAt: new Date().toISOString()
        };
        
        this.studyGroups.push(group);
        this.saveStudyGroups();
        this.updateCollaborationView();
        this.showNotification(`Joined study group!`, 'success');
    }

    updateCollaborationView() {
        const groupsContainer = document.getElementById('studyGroups');
        if (!groupsContainer) return;
        
        if (this.studyGroups.length === 0) {
            groupsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No study groups yet. Create or join one!</p>
                </div>
            `;
            return;
        }
        
        groupsContainer.innerHTML = this.studyGroups.map(group => `
            <div class="group-item">
                <div class="group-info">
                    <h4>${group.name}</h4>
                    <small>${group.members.length} members</small>
                </div>
                <button class="btn btn-outline" onclick="app.viewGroup(${group.id})">
                    View
                </button>
            </div>
        `).join('');
    }

    // Task Management
    setupTaskManagement() {
        const addTaskBtn = document.getElementById('addTaskBtn');
        const taskForm = document.getElementById('taskForm');
        
        addTaskBtn?.addEventListener('click', () => {
            this.showModal('taskModal');
            this.resetTaskForm();
        });
        
        taskForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
            this.hideModal('taskModal');
            this.updateTasksView();
        });
        
        // Task filtering
        document.getElementById('categoryFilter')?.addEventListener('change', () => this.filterTasks());
        document.getElementById('priorityFilter')?.addEventListener('change', () => this.filterTasks());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.filterTasks());
        
        // Recurring task checkbox
        document.getElementById('taskRecurring')?.addEventListener('change', (e) => {
            document.getElementById('taskRecurrencePattern').disabled = !e.target.checked;
        });
    }

    resetTaskForm() {
        document.getElementById('taskForm').reset();
        document.getElementById('modalTitle').textContent = 'Add New Task';
        document.getElementById('taskRecurrencePattern').disabled = true;
        delete this.editingTaskId;
    }

    saveTask() {
        const subtasksText = document.getElementById('taskSubtasks').value;
        const subtasks = subtasksText ? subtasksText.split('\n').filter(s => s.trim()) : [];
        
        const task = {
            id: this.editingTaskId || Date.now(),
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            category: document.getElementById('taskCategory').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            estimatedTime: parseFloat(document.getElementById('taskEstimatedTime').value) || 0,
            recurring: document.getElementById('taskRecurring').checked,
            recurrencePattern: document.getElementById('taskRecurrencePattern').value,
            notes: document.getElementById('taskNotes').value,
            subtasks: subtasks.map(text => ({ text, completed: false })),
            completed: false,
            createdAt: this.editingTaskId ? 
                this.tasks.find(t => t.id === this.editingTaskId).createdAt : 
                new Date().toISOString()
        };
        
        if (this.editingTaskId) {
            const index = this.tasks.findIndex(t => t.id === this.editingTaskId);
            this.tasks[index] = task;
        } else {
            this.tasks.push(task);
            this.addXP(5); // XP for creating a task
        }
        
        this.saveTasks();
        this.updateDashboard();
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.editingTaskId = taskId;
        this.showModal('taskModal');
        
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskCategory').value = task.category;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('taskEstimatedTime').value = task.estimatedTime || '';
        document.getElementById('taskRecurring').checked = task.recurring || false;
        document.getElementById('taskRecurrencePattern').value = task.recurrencePattern || 'daily';
        document.getElementById('taskRecurrencePattern').disabled = !task.recurring;
        document.getElementById('taskNotes').value = task.notes || '';
        document.getElementById('taskSubtasks').value = 
            task.subtasks ? task.subtasks.map(s => s.text).join('\n') : '';
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        
        if (task.completed) {
            this.addXP(15); // XP for completing a task
            this.analytics.points += 5;
            this.showNotification(`Task "${task.title}" completed! 🎉`, 'success');
            
            // Track completion
            const today = new Date().toDateString();
            this.analytics.completedTasks[today] = (this.analytics.completedTasks[today] || 0) + 1;
        }
        
        this.saveTasks();
        this.saveAnalytics();
        this.updateTasksView();
        this.updateDashboard();
        this.checkStreaks();
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.updateTasksView();
            this.updateDashboard();
        }
    }

    filterTasks() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        const filteredTasks = this.tasks.filter(task => {
            const categoryMatch = !categoryFilter || task.category === categoryFilter;
            const priorityMatch = !priorityFilter || task.priority === priorityFilter;
            const statusMatch = !statusFilter || 
                (statusFilter === 'completed' && task.completed) ||
                (statusFilter === 'pending' && !task.completed && !task.inProgress) ||
                (statusFilter === 'in-progress' && task.inProgress);
            
            return categoryMatch && priorityMatch && statusMatch;
        });
        
        this.renderTasks(filteredTasks);
    }

    updateTasksView() {
        this.renderTasks(this.tasks);
    }

    renderTasks(tasks) {
        const container = document.getElementById('tasksContainer');
        if (!container) return;
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No tasks found. Add a task to get started!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tasks.map(task => this.renderTaskItem(task)).join('');
    }

    renderTaskItem(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && !task.completed;
        const subtasksCompleted = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;
        const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <div class="task-header">
                    <h3 class="task-title">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                               onchange="app.toggleTask(${task.id})">
                        ${task.title}
                    </h3>
                    <span class="task-priority priority-${task.priority}">
                        ${this.getPriorityLabel(task.priority)}
                    </span>
                </div>
                
                <div class="task-meta">
                    <span><i class="fas fa-tag"></i> ${this.getCategoryLabel(task.category)}</span>
                    ${dueDate ? `<span><i class="fas fa-calendar"></i> ${dueDate.toLocaleDateString()}</span>` : ''}
                    ${task.estimatedTime ? `<span><i class="fas fa-clock"></i> ${task.estimatedTime}h</span>` : ''}
                    ${task.recurring ? `<span><i class="fas fa-sync"></i> ${task.recurrencePattern}</span>` : ''}
                    ${totalSubtasks > 0 ? `<span><i class="fas fa-list"></i> ${subtasksCompleted}/${totalSubtasks}</span>` : ''}
                </div>
                
                ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
                
                ${task.subtasks && task.subtasks.length > 0 ? `
                    <div class="task-subtasks">
                        ${task.subtasks.map((subtask, index) => `
                            <div class="subtask-item">
                                <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                       onchange="app.toggleSubtask(${task.id}, ${index})">
                                <span>${subtask.text}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="task-actions">
                    <button class="btn btn-outline" onclick="app.editTask(${task.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-outline" onclick="app.deleteTask(${task.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    toggleSubtask(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task?.subtasks) return;
        
        task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
        this.saveTasks();
        this.updateTasksView();
    }

    getPriorityLabel(priority) {
        const labels = {
            urgent: '🚨 Urgent',
            high: '🔴 High',
            medium: '🟡 Medium',
            low: '🟢 Low',
            optional: '⚪ Optional'
        };
        return labels[priority] || priority;
    }

    getCategoryLabel(category) {
        const labels = {
            math: '📐 Math',
            science: '🔬 Science',
            history: '📚 History',
            language: '🗣️ Language',
            other: '📋 Other'
        };
        return labels[category] || category;
    }

    // Calendar Management
    updateCalendar() {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        document.getElementById('currentMonth').textContent = 
            currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        this.renderCalendarGrid(year, month);
    }

    renderCalendarGrid(year, month) {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        let html = '';
        
        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            html += `<div class="calendar-header-day">${day}</div>`;
        });
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const prevMonth = new Date(year, month - 1, 0);
            const prevDate = prevMonth.getDate() - startingDay + i + 1;
            html += `<div class="calendar-day other-month">${prevDate}</div>`;
        }
        
        // Add days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toDateString();
            const isToday = dateString === new Date().toDateString();
            const hasTasks = this.tasks.some(task => 
                task.dueDate && new Date(task.dueDate).toDateString() === dateString
            );
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasTasks ? 'has-tasks' : ''}"
                     onclick="app.selectCalendarDate('${dateString}')">
                    ${day}
                </div>
            `;
        }
        
        grid.innerHTML = html;
    }

    selectCalendarDate(dateString) {
        const tasksForDate = this.tasks.filter(task => 
            task.dueDate && new Date(task.dueDate).toDateString() === dateString
        );
        
        if (tasksForDate.length > 0) {
            const taskList = tasksForDate.map(task => `• ${task.title}`).join('\n');
            alert(`Tasks for ${dateString}:\n\n${taskList}`);
        } else {
            alert(`No tasks scheduled for ${dateString}`);
        }
    }

    // Navigation
    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.nav-btn').dataset.view;
                this.switchView(view);
                
                navBtns.forEach(b => b.classList.remove('active'));
                e.target.closest('.nav-btn').classList.add('active');
            });
        });
    }

    // Modal Management
    setupModals() {
        const modalCloses = document.querySelectorAll('.modal-close');
        const modals = document.querySelectorAll('.modal');
        
        modalCloses.forEach(close => {
            close.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal.id);
            });
        });
        
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal?.classList.add('active');
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal?.classList.remove('active');
    }

    // Utility Functions
    trackStudySession() {
        const today = new Date().toDateString();
        this.analytics.studyTime[today] = (this.analytics.studyTime[today] || 0);
        this.saveAnalytics();
    }

    trackStudyTime(minutes) {
        const today = new Date().toDateString();
        this.analytics.studyTime[today] = (this.analytics.studyTime[today] || 0) + minutes;
        this.saveAnalytics();
        this.updateDashboard();
        this.checkStreaks();
    }

    updateDashboard() {
        this.updateProgress();
        this.updateGoalsDisplay();
        this.updateQuickStats();
        this.updateRecentTasks();
    }

    updateProgress() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        document.getElementById('progressPercent').textContent = `${percentage}%`;
        document.getElementById('progressTasks').textContent = `${completedTasks} of ${totalTasks} tasks`;
        
        // Update progress circle
        const circumference = 314; // 2 * PI * 50 (radius)
        const offset = circumference - (percentage / 100) * circumference;
        document.getElementById('progressCircle').style.strokeDashoffset = offset;
        
        // Update welcome message
        const tasksLeft = totalTasks - completedTasks;
        let welcomeMessage;
        
        if (tasksLeft > 0) {
            const taskWord = tasksLeft !== 1 ? 'tasks' : 'task';
            welcomeMessage = `You have ${tasksLeft} ${taskWord} left. Keep going!`;
        } else if (totalTasks > 0) {
            welcomeMessage = "All tasks completed! Great job! 🎉";
        } else {
            welcomeMessage = "You have 0 tasks. Let's make today productive!";
        }
        
        document.getElementById('tasksOverview').textContent = welcomeMessage;
    }

    updateQuickStats() {
        const today = new Date().toDateString();
        const todayTime = this.analytics.studyTime[today] || 0;
        
        // Calculate week time
        const weekTime = this.getWeeklyStudyData().reduce((sum, time) => sum + time, 0);
        
        document.getElementById('todayTime').textContent = `${todayTime}m`;
        document.getElementById('weekTime').textContent = `${weekTime.toFixed(1)}h`;
    }

    updateRecentTasks() {
        const recentTasks = this.tasks
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        const container = document.getElementById('recentTasksList');
        if (!container) return;
        
        if (recentTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No tasks yet! Add your first study goal.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = recentTasks.map(task => `
            <div class="task-item-mini ${task.completed ? 'completed' : ''}">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       onchange="app.toggleTask(${task.id})">
                <span>${task.title}</span>
                <small>${this.getPriorityLabel(task.priority)}</small>
            </div>
        `).join('');
    }

    // Notification System
    setupNotifications() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    showNotification(message, type = 'info') {
        // In-app notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Browser notification for important messages
        if ('Notification' in window && Notification.permission === 'granted' && 
            (type === 'warning' || type === 'success')) {
            new Notification('Smart Study Planner', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    // Data Persistence
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    saveAnalytics() {
        localStorage.setItem('analytics', JSON.stringify(this.analytics));
    }

    saveSettings() {
        localStorage.setItem('settings', JSON.stringify(this.settings));
    }

    saveStudyGroups() {
        localStorage.setItem('studyGroups', JSON.stringify(this.studyGroups));
    }

    saveAll() {
        this.saveTasks();
        this.saveAnalytics();
        this.saveSettings();
        this.saveStudyGroups();
        this.saveNotes();
        this.saveHabits();
        this.saveFocusStats();
        localStorage.setItem('goals', JSON.stringify(this.goals));
    }

    saveNotes() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
    }

    saveHabits() {
        localStorage.setItem('habits', JSON.stringify(this.habits));
    }

    saveFocusStats() {
        localStorage.setItem('focusStats', JSON.stringify(this.focusStats));
    }

    // Focus Mode Features
    setupFocusMode() {
        const startFocusBtn = document.getElementById('startFocusSession');
        const fullScreenBtn = document.getElementById('fullScreenBtn');
        const stopSoundsBtn = document.getElementById('stopAllSounds');
        const soundBtns = document.querySelectorAll('.sound-btn');
        const volumeSliders = document.querySelectorAll('.volume-slider');

        startFocusBtn?.addEventListener('click', () => this.startFocusSession());
        fullScreenBtn?.addEventListener('click', () => this.toggleFullScreen());
        stopSoundsBtn?.addEventListener('click', () => this.stopAllSounds());

        soundBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sound = e.target.dataset.sound;
                this.toggleAmbientSound(sound, btn);
            });
        });

        volumeSliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const sound = e.target.dataset.sound;
                this.adjustSoundVolume(sound, e.target.value);
            });
        });

        this.updateFocusStats();
    }

    startFocusSession() {
        const goalMinutes = document.getElementById('focusGoal').value;
        const blockDistractions = document.getElementById('blockDistractions').checked;
        
        // Start timer with focus goal
        this.timer.timeLeft = goalMinutes * 60;
        this.timer.phase = 'focus';
        this.startTimer();
        
        // Track focus session
        this.focusStats.sessionsToday++;
        this.saveFocusStats();
        this.updateFocusStats();
        
        // Show focus overlay if blocking distractions
        if (blockDistractions) {
            this.showFocusOverlay();
        }
        
        this.showNotification(`Focus session started for ${goalMinutes} minutes! 🧠`, 'success');
    }

    toggleFullScreen() {
        if (!this.isFullScreen) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
            document.getElementById('fullScreenBtn').textContent = 'Exit Fullscreen';
            this.isFullScreen = true;
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            document.getElementById('fullScreenBtn').textContent = 'Enter Fullscreen';
            this.isFullScreen = false;
        }
    }

    toggleAmbientSound(soundType, btn) {
        if (this.activeSounds.has(soundType)) {
            // Stop sound
            this.activeSounds.delete(soundType);
            btn.classList.remove('active');
            this.showNotification(`${soundType} sound stopped`, 'info');
        } else {
            // Start sound (simulated - in real app would use Web Audio API)
            this.activeSounds.set(soundType, { volume: 50, playing: true });
            btn.classList.add('active');
            this.showNotification(`${soundType} sound started`, 'success');
        }
    }

    adjustSoundVolume(soundType, volume) {
        if (this.activeSounds.has(soundType)) {
            const sound = this.activeSounds.get(soundType);
            sound.volume = volume;
            this.activeSounds.set(soundType, sound);
        }
    }

    stopAllSounds() {
        this.activeSounds.clear();
        document.querySelectorAll('.sound-btn').forEach(btn => btn.classList.remove('active'));
        this.showNotification('All ambient sounds stopped', 'info');
    }

    updateFocusStats() {
        document.getElementById('focusSessionsToday').textContent = this.focusStats.sessionsToday;
        document.getElementById('totalFocusTime').textContent = `${(this.focusStats.totalFocusTime / 60).toFixed(1)}h`;
        document.getElementById('averageSession').textContent = `${this.focusStats.averageSession}m`;
        document.getElementById('focusStreak').textContent = this.focusStats.focusStreak;
    }

    // Notes Editor Features
    setupNotesEditor() {
        const addNoteBtn = document.getElementById('addNoteBtn');
        const noteForm = document.getElementById('noteForm');
        const notesSearch = document.getElementById('notesSearch');
        const notesFilter = document.getElementById('notesFilter');
        const editorBtns = document.querySelectorAll('.editor-btn');
        const noteContent = document.getElementById('noteContent');

        addNoteBtn?.addEventListener('click', () => {
            this.showModal('noteModal');
            this.resetNoteForm();
        });

        noteForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNote();
            this.hideModal('noteModal');
            this.updateNotesView();
        });

        notesSearch?.addEventListener('input', (e) => this.searchNotes(e.target.value));
        notesFilter?.addEventListener('change', (e) => this.filterNotes(e.target.value));

        editorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.executeEditorCommand(action);
            });
        });

        noteContent?.addEventListener('input', () => {
            this.updateWordCount();
            this.autoSaveNote();
        });

        this.updateNotesView();
    }

    resetNoteForm() {
        document.getElementById('noteForm').reset();
        document.getElementById('noteModalTitle').textContent = 'Add New Note';
        delete this.editingNoteId;
    }

    saveNote() {
        const note = {
            id: this.editingNoteId || Date.now(),
            title: document.getElementById('noteTitle').value,
            category: document.getElementById('noteCategory').value,
            tags: document.getElementById('noteTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            content: '',
            private: document.getElementById('notePrivate').checked,
            createdAt: this.editingNoteId ? 
                this.notes.find(n => n.id === this.editingNoteId).createdAt : 
                new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.editingNoteId) {
            const index = this.notes.findIndex(n => n.id === this.editingNoteId);
            this.notes[index] = { ...this.notes[index], ...note };
        } else {
            this.notes.push(note);
            this.addXP(10); // XP for creating a note
        }

        this.saveNotes();
        this.currentNote = note;
    }

    updateNotesView() {
        const notesList = document.getElementById('notesList');
        if (!notesList) return;

        if (this.notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <p>No notes yet. Create your first note!</p>
                </div>
            `;
            return;
        }

        notesList.innerHTML = this.notes.map(note => `
            <div class="note-item ${this.currentNote?.id === note.id ? 'active' : ''}" 
                 onclick="app.selectNote(${note.id})">
                <div class="note-title">${note.title}</div>
                <div class="note-preview">${this.getContentPreview(note.content)}</div>
                <div class="note-meta">
                    <span>${note.category}</span>
                    <span>${new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    selectNote(noteId) {
        this.currentNote = this.notes.find(n => n.id === noteId);
        if (this.currentNote) {
            document.getElementById('noteContent').innerHTML = this.currentNote.content || '';
            this.updateWordCount();
            this.updateNotesView();
        }
    }

    executeEditorCommand(command) {
        switch (command) {
            case 'bold':
                this.wrapSelectionWithTag('strong');
                break;
            case 'italic':
                this.wrapSelectionWithTag('em');
                break;
            case 'underline':
                this.wrapSelectionWithTag('u');
                break;
            case 'insertUnorderedList':
                this.insertList('ul');
                break;
            case 'insertOrderedList':
                this.insertList('ol');
                break;
            case 'justifyLeft':
                this.setTextAlignment('left');
                break;
            case 'justifyCenter':
                this.setTextAlignment('center');
                break;
            case 'justifyRight':
                this.setTextAlignment('right');
                break;
            default:
                // Fallback for other commands if needed
                break;
        }
        
        this.autoSaveNote();
    }

    wrapSelectionWithTag(tagName) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
            const element = document.createElement(tagName);
            element.textContent = selectedText;
            range.deleteContents();
            range.insertNode(element);
            
            // Clear selection
            selection.removeAllRanges();
        }
    }

    insertList(listType) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const list = document.createElement(listType);
        const listItem = document.createElement('li');
        listItem.textContent = range.toString() || 'List item';
        
        list.appendChild(listItem);
        range.deleteContents();
        range.insertNode(list);
        
        // Position cursor after the list
        range.setStartAfter(list);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    setTextAlignment(alignment) {
        const noteContent = document.getElementById('noteContent');
        if (noteContent) {
            noteContent.style.textAlign = alignment;
        }
    }

    updateWordCount() {
        const content = document.getElementById('noteContent').textContent || '';
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        document.getElementById('wordCount').textContent = `${wordCount} words`;
    }

    autoSaveNote() {
        if (this.currentNote) {
            this.currentNote.content = document.getElementById('noteContent').innerHTML;
            this.currentNote.updatedAt = new Date().toISOString();
            this.saveNotes();
            document.getElementById('lastSaved').textContent = `Saved at ${new Date().toLocaleTimeString()}`;
        }
    }

    getContentPreview(content) {
        const textContent = content.replace(/<[^>]*>/g, '');
        return textContent.length > 50 ? textContent.substring(0, 50) + '...' : textContent;
    }

    searchNotes(query) {
        const filteredNotes = this.notes.filter(note => 
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.content.toLowerCase().includes(query.toLowerCase()) ||
            note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        );
        this.renderFilteredNotes(filteredNotes);
    }

    filterNotes(category) {
        const filteredNotes = category ? 
            this.notes.filter(note => note.category === category) : 
            this.notes;
        this.renderFilteredNotes(filteredNotes);
    }

    renderFilteredNotes(notes) {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = notes.map(note => `
            <div class="note-item ${this.currentNote?.id === note.id ? 'active' : ''}" 
                 onclick="app.selectNote(${note.id})">
                <div class="note-title">${note.title}</div>
                <div class="note-preview">${this.getContentPreview(note.content)}</div>
                <div class="note-meta">
                    <span>${note.category}</span>
                    <span>${new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    // Habits Tracker Features
    setupHabitsTracker() {
        const addHabitBtn = document.getElementById('addHabitBtn');
        const habitForm = document.getElementById('habitForm');
        const habitIcons = document.querySelectorAll('.habit-icon-btn');

        addHabitBtn?.addEventListener('click', () => {
            this.showModal('habitModal');
            this.resetHabitForm();
        });

        habitForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHabit();
            this.hideModal('habitModal');
            this.updateHabitsView();
        });

        habitIcons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                habitIcons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById('habitIcon').value = e.target.dataset.icon;
            });
        });

        this.updateHabitsView();
        this.updateHabitsCalendar();
    }

    resetHabitForm() {
        document.getElementById('habitForm').reset();
        document.getElementById('habitModalTitle').textContent = 'Add New Habit';
        document.getElementById('habitIcon').value = '📚';
        document.querySelectorAll('.habit-icon-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.habit-icon-btn[data-icon="📚"]')?.classList.add('active');
        delete this.editingHabitId;
    }

    saveHabit() {
        const habit = {
            id: this.editingHabitId || Date.now(),
            name: document.getElementById('habitName').value,
            description: document.getElementById('habitDescription').value,
            frequency: document.getElementById('habitFrequency').value,
            bestTime: document.getElementById('habitTime').value,
            icon: document.getElementById('habitIcon').value,
            streak: 0,
            completedDates: [],
            createdAt: this.editingHabitId ? 
                this.habits.find(h => h.id === this.editingHabitId).createdAt : 
                new Date().toISOString()
        };

        if (this.editingHabitId) {
            const index = this.habits.findIndex(h => h.id === this.editingHabitId);
            this.habits[index] = { ...this.habits[index], ...habit };
        } else {
            this.habits.push(habit);
            this.addXP(15); // XP for creating a habit
        }

        this.saveHabits();
    }

    updateHabitsView() {
        this.updateHabitsStats();
        this.updateHabitsList();
    }

    updateHabitsStats() {
        const activeHabits = this.habits.length;
        const today = new Date().toDateString();
        const completedToday = this.habits.filter(habit => 
            habit.completedDates.includes(today)
        ).length;
        const completionRate = activeHabits > 0 ? Math.round((completedToday / activeHabits) * 100) : 0;
        const longestStreak = Math.max(...this.habits.map(h => h.streak), 0);

        document.getElementById('activeHabits').textContent = activeHabits;
        document.getElementById('habitCompletionRate').textContent = `${completionRate}%`;
        document.getElementById('longestStreak').textContent = longestStreak;
    }

    updateHabitsList() {
        const habitsList = document.getElementById('habitsList');
        if (!habitsList) return;

        if (this.habits.length === 0) {
            habitsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>No habits yet. Add your first habit to get started!</p>
                </div>
            `;
            return;
        }

        const today = new Date().toDateString();
        habitsList.innerHTML = this.habits.map(habit => {
            const completedToday = habit.completedDates.includes(today);
            return `
                <div class="habit-item">
                    <div class="habit-icon">${habit.icon}</div>
                    <div class="habit-details">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-description">${habit.description}</div>
                        <div class="habit-streak">🔥 ${habit.streak} day streak</div>
                    </div>
                    <div class="habit-actions">
                        <button class="habit-check ${completedToday ? 'completed' : ''}" 
                                onclick="app.toggleHabit(${habit.id})">
                            ${completedToday ? '✓' : ''}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleHabit(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const today = new Date().toDateString();
        const isCompleted = habit.completedDates.includes(today);

        if (isCompleted) {
            // Mark as incomplete
            habit.completedDates = habit.completedDates.filter(date => date !== today);
            habit.streak = Math.max(0, habit.streak - 1);
            this.showNotification(`Habit "${habit.name}" marked as incomplete`, 'info');
        } else {
            // Mark as complete
            habit.completedDates.push(today);
            habit.streak++;
            this.addXP(20); // XP for completing a habit
            this.analytics.points += 5;
            this.showNotification(`Habit "${habit.name}" completed! 🎉`, 'success');
            
            // Check for milestone achievements
            if (habit.streak === 7) {
                this.showNotification(`7-day streak for "${habit.name}"! Keep it up! 🔥`, 'success');
            } else if (habit.streak === 30) {
                this.showNotification(`30-day streak for "${habit.name}"! Amazing dedication! 🏆`, 'success');
            }
        }

        this.saveHabits();
        this.saveAnalytics();
        this.updateHabitsView();
        this.updateHabitsCalendar();
    }

    updateHabitsCalendar() {
        const calendarGrid = document.getElementById('habitsCalendarGrid');
        if (!calendarGrid) return;

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 13); // Show last 14 days

        let html = '';
        for (let i = 0; i < 14; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateString = date.toDateString();
            const isToday = dateString === today.toDateString();
            
            const completedHabits = this.habits.filter(habit => 
                habit.completedDates.includes(dateString)
            ).length;
            
            html += `
                <div class="habit-day ${isToday ? 'today' : ''} ${completedHabits > 0 ? 'completed' : ''}"
                     title="${dateString}: ${completedHabits} habits completed">
                    ${date.getDate()}
                </div>
            `;
        }
        
        calendarGrid.innerHTML = html;
    }

    // Enhanced view switching with animations
    switchView(viewName) {
        const views = document.querySelectorAll('.view');
        views.forEach(view => view.classList.remove('active'));
        
        const targetView = document.getElementById(viewName);
        targetView?.classList.add('active');
        
        // Add animation classes
        if (targetView) {
            targetView.classList.add('animate-slide-up');
            setTimeout(() => targetView.classList.remove('animate-slide-up'), 600);
        }
        
        this.currentView = viewName;
        
        // Update view-specific content
        switch (viewName) {
            case 'tasks':
                this.updateTasksView();
                break;
            case 'analytics':
                this.initCharts();
                break;
            case 'calendar':
                this.updateCalendar();
                break;
            case 'collaboration':
                this.updateCollaborationView();
                break;
            case 'focus':
                this.updateFocusStats();
                break;
            case 'notes':
                this.updateNotesView();
                break;
            case 'habits':
                this.updateHabitsView();
                this.updateHabitsCalendar();
                break;
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        this.setupNavigation();
        this.setupModals();
        this.setupTaskManagement();
        this.setupGoals();
        this.setupPomodoroTimer();
        this.setupDarkMode();
        this.setupCustomThemes();
        this.setupQuotes();
        this.setupCalendarSync();
        this.setupDataExport();
        this.setupCollaboration();
        this.setupReminders();
        this.setupFocusMode();
        this.setupNotesEditor();
        this.setupHabitsTracker();
        this.setupDataManagement();
        
        // Settings form
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showModal('settingsModal');
        });

        // Color theme selection
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.applyColorTheme(theme);
                
                // Update active state
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
            this.toggleDarkMode(e.target.checked);
        });
        
        // Calendar navigation
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            const currentMonth = new Date(document.getElementById('currentMonth').textContent);
            currentMonth.setMonth(currentMonth.getMonth() - 1);
            this.renderCalendarGrid(currentMonth.getFullYear(), currentMonth.getMonth());
            document.getElementById('currentMonth').textContent = 
                currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        });
        
        document.getElementById('nextMonth')?.addEventListener('click', () => {
            const currentMonth = new Date(document.getElementById('currentMonth').textContent);
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            this.renderCalendarGrid(currentMonth.getFullYear(), currentMonth.getMonth());
            document.getElementById('currentMonth').textContent = 
                currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        });
        
        // Auto-save settings
        document.getElementById('taskReminders')?.addEventListener('change', (e) => {
            this.settings.taskReminders = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('breakReminders')?.addEventListener('change', (e) => {
            this.settings.breakReminders = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('streakReminders')?.addEventListener('change', (e) => {
            this.settings.streakReminders = e.target.checked;
            this.saveSettings();
        });
    }
}

// Initialize the application
const app = new SmartStudyPlanner();