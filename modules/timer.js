// 计时器管理模块

const Timer = {
    currentTask: null,
    startTime: null,
    pausedTime: 0,
    interval: null,
    isRunning: false,
    isPaused: false,

    // 开始计时
    start(task) {
        if (this.isRunning && this.currentTask && this.currentTask.id !== task.id) {
            this.stop();
        }

        this.currentTask = task;
        this.startTime = Date.now();
        this.pausedTime = 0;
        this.isRunning = true;
        this.isPaused = false;

        this.interval = setInterval(() => {
            this.updateDisplay();
        }, 100);

        this.updateDisplay();
    },

    // 暂停计时
    pause() {
        if (!this.isRunning || this.isPaused) return;

        this.pausedTime += Date.now() - this.startTime;
        this.isRunning = false;
        this.isPaused = true;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    },

    // 继续计时
    resume() {
        if (!this.isPaused) return;

        this.startTime = Date.now();
        this.isRunning = true;
        this.isPaused = false;

        this.interval = setInterval(() => {
            this.updateDisplay();
        }, 100);
    },

    // 停止计时
    stop() {
        let timeSpent = 0;
        if (this.isRunning) {
            timeSpent = Date.now() - this.startTime;
        }
        timeSpent += this.pausedTime;

        this.isRunning = false;
        this.isPaused = false;
        this.currentTask = null;
        this.startTime = null;
        this.pausedTime = 0;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.updateDisplay();
        return timeSpent;
    },

    // 获取当前已用时间
    getElapsedTime() {
        if (!this.currentTask) return 0;
        if (this.isPaused) return this.pausedTime;
        if (this.isRunning) {
            return this.pausedTime + (Date.now() - this.startTime);
        }
        return this.pausedTime;
    },

    // 更新显示
    updateDisplay() {
        const display = document.getElementById('timer-display');
        if (display) {
            const elapsed = this.getElapsedTime();
            display.textContent = formatTime(elapsed);
        }

        // 更新按钮状态
        const startBtn = document.getElementById('timer-start');
        const pauseBtn = document.getElementById('timer-pause');
        const resumeBtn = document.getElementById('timer-resume');
        const stopBtn = document.getElementById('timer-stop');

        if (startBtn) startBtn.style.display = (!this.isRunning && !this.isPaused) ? 'inline-flex' : 'none';
        if (pauseBtn) pauseBtn.style.display = (this.isRunning && !this.isPaused) ? 'inline-flex' : 'none';
        if (resumeBtn) resumeBtn.style.display = this.isPaused ? 'inline-flex' : 'none';
        if (stopBtn) stopBtn.style.display = (this.isRunning || this.isPaused) ? 'inline-flex' : 'none';
    },

    // 重置（只重置计时状态，保留currentTask）
    reset() {
        // 停止计时但不清空currentTask（因为可能正在打开新的任务）
        let timeSpent = 0;
        if (this.isRunning) {
            timeSpent = Date.now() - this.startTime;
        }
        timeSpent += this.pausedTime;

        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pausedTime = 0;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.updateDisplay();
    }
};

// 全局函数（供HTML调用）
function startTimer() {
    Timer.start(Timer.currentTask);
}

function pauseTimer() {
    Timer.pause();
}

function resumeTimer() {
    Timer.resume();
}

// 保存停止计时时的时间和任务信息
let stoppedTimeSpent = 0;
let stoppedTask = null;

function stopTimer() {
    // 先保存任务信息（因为Timer.stop()会清空currentTask）
    const task = Timer.currentTask;
    
    if (!task) {
        closeTimerModal();
        return;
    }
    
    // 停止计时并获取时间
    const timeSpent = Timer.stop();
    
    // 保存停止时的时间和任务
    stoppedTimeSpent = timeSpent;
    stoppedTask = task;
    
    // 普通任务和日常任务：隐藏计时器，显示进度设置
    if (task.type === 'normal' || task.type === 'daily') {
        const timerStage = document.getElementById('timer-stage');
        const progressStage = document.getElementById('progress-stage');
        
        if (timerStage) timerStage.style.display = 'none';
        if (progressStage) {
            progressStage.style.display = 'block';
            // 如果有当前进度，初始化进度条
            const progressInput = document.getElementById('timer-progress');
            if (progressInput) {
                const currentProgress = task.progress || 0;
                progressInput.value = currentProgress;
                updateProgressDisplay(currentProgress);
            }
        }
    } else {
        // 其他类型：直接关闭
        closeTimerModal();
    }
}

// 确认进度
function confirmProgress() {
    const task = stoppedTask; // 使用保存的任务信息
    if (!task || (task.type !== 'normal' && task.type !== 'daily')) {
        closeTimerModal();
        return;
    }
    
    const progressInput = document.getElementById('timer-progress');
    const progress = progressInput ? parseInt(progressInput.value) || 0 : 0;
    
    // 根据进度更新任务状态（普通任务和日常任务都支持）
    if (task.treeId) {
        if (progress >= 100) {
            // 对于日常任务，检查是否有逾期的日期，如果有，记录为最早的逾期日期
            let completedDate = new Date();
            if (task.type === 'daily') {
                try {
                    const allHistory = History.getAll();
                    const taskHistory = allHistory.filter(record => 
                        record.taskId === task.id && record.taskType === 'subtask'
                    );
                    const completedDates = new Set(
                        taskHistory.map(record => formatDate(new Date(record.completedAt)))
                    );
                    
                    // 检查createdAt是否存在且有效
                    let startDate;
                    if (task.createdAt) {
                        startDate = new Date(task.createdAt);
                        if (isNaN(startDate.getTime())) {
                            // 如果createdAt无效，使用今天作为开始日期
                            startDate = new Date();
                        }
                    } else {
                        // 如果createdAt不存在，使用今天作为开始日期
                        startDate = new Date();
                    }
                    startDate.setHours(0, 0, 0, 0);
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const endDate = task.deadline ? new Date(task.deadline) : today;
                    endDate.setHours(0, 0, 0, 0);
                    
                    // 确保startDate不超过endDate和today
                    if (startDate > endDate) {
                        startDate = new Date(endDate);
                    }
                    if (startDate > today) {
                        startDate = new Date(today);
                    }
                    
                    // 找出最早的未完成日期
                    const currentDate = new Date(startDate);
                    let found = false;
                    let maxIterations = 1000; // 防止无限循环
                    let iterations = 0;
                    
                    while (currentDate <= endDate && currentDate <= today && iterations < maxIterations) {
                        iterations++;
                        const dateStr = formatDate(currentDate);
                        if (!completedDates.has(dateStr)) {
                            // 找到最早的未完成日期
                            completedDate = new Date(currentDate);
                            completedDate.setHours(12, 0, 0, 0); // 设置为中午，避免时区问题
                            found = true;
                            break;
                        }
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    
                    // 如果没有找到未完成的日期，使用今天
                    if (!found) {
                        completedDate = new Date();
                        completedDate.setHours(12, 0, 0, 0);
                    }
                } catch (error) {
                    // 如果出现任何错误，使用今天作为完成日期
                    console.error('处理日常任务完成日期时出错:', error);
                    completedDate = new Date();
                    completedDate.setHours(12, 0, 0, 0);
                }
            }
            
            // 进度100%：标记为已完成
            TaskTree.updateSubtask(task.treeId, task.id, { 
                progress: 100,
                status: 'completed',
                completedAt: completedDate.toISOString()
            });
            
            // 记录历史（使用计算出的完成日期）
            const historyTask = { ...task };
            Rewards.completeTaskWithDate(historyTask, stoppedTimeSpent, 100, completedDate);
            
            // 检查任务树是否完成
            const tree = TaskTree.getById(task.treeId);
            if (tree) {
                const allCompleted = tree.subtasks.every(st => st.status === 'completed');
                if (allCompleted && tree.status === 'in-progress') {
                    TaskTree.update(task.treeId, { 
                        status: 'completed', 
                        completedAt: new Date().toISOString() 
                    });
                }
            }
        } else {
            // 进度<100%：保持进行中状态
            TaskTree.updateSubtask(task.treeId, task.id, { 
                progress: progress,
                status: 'in-progress'
            });
        }
    }
    
    closeTimerModal();
    
    // 刷新看板（依赖关系会自动检查，因为getAvailableSubtasks会重新计算）
    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }
}

// 取消进度设置
function cancelProgress() {
    closeTimerModal();
}

function closeTimerModal() {
    const modal = document.getElementById('timer-modal');
    if (modal) {
        modal.classList.remove('show');
        Timer.reset();
        Timer.currentTask = null; // 关闭时清空任务
        
        // 重置阶段显示
        const timerStage = document.getElementById('timer-stage');
        const progressStage = document.getElementById('progress-stage');
        if (timerStage) timerStage.style.display = 'block';
        if (progressStage) progressStage.style.display = 'none';
        
        // 重置进度
        const progressInput = document.getElementById('timer-progress');
        if (progressInput) {
            progressInput.value = 0;
            updateProgressDisplay(0);
        }
        
        // 重置保存的数据
        stoppedTimeSpent = 0;
        stoppedTask = null;
    }
}

function closeProgressModal() {
    const modal = document.getElementById('progress-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 设置进度快捷按钮
function setProgress(value) {
    const progressInput = document.getElementById('timer-progress');
    if (progressInput) {
        progressInput.value = value;
        updateProgressDisplay(value);
    }
}

// 更新进度显示
function updateProgressDisplay(value) {
    const display = document.getElementById('progress-display');
    if (display) {
        display.textContent = value + '%';
    }
}

