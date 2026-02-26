// 看板页面

// 普通任务展开/收起状态（默认收起，只显示5天内截止的）
let pendingTasksExpanded = false;

// 倒计时相关变量
let countdownInterval = null;
let countdownChart = null;

function renderDashboard() {
    const container = document.getElementById('page-container');
    if (!container) return;
    
    // 停止旧的倒计时定时器（如果存在）
    stopCountdownTimer();

    container.innerHTML = `
        <div class="dashboard">
            <!-- 左侧：任务区域 -->
            <div class="dashboard-left">
                <!-- 日常任务模块 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">日常任务</h2>
                    </div>
                    <div id="daily-tasks"></div>
                </div>

                <!-- 普通任务模块 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">普通任务</h2>
                        <button class="btn btn-sm btn-secondary" onclick="togglePendingTasks()" id="toggle-pending-tasks-btn">展开/收起</button>
                    </div>
                    <div id="pending-tasks"></div>
                </div>

                <!-- 已完成任务模块 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">今日已完成</h2>
                        <button class="btn btn-sm btn-secondary" onclick="toggleCompletedTasks()">展开/收起</button>
                    </div>
                    <div id="completed-tasks" style="display:none;"></div>
                </div>
            </div>

            <!-- 右侧：日程和事件区域 -->
            <div class="dashboard-right">
                <!-- 今日日程模块 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">今日日程</h2>
                        <input type="date" id="schedule-date" class="form-control" style="width:auto;" onchange="renderSchedule()">
                    </div>
                    <div id="today-schedule"></div>
                </div>

                <!-- 近期事件模块 -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">近期事件</h2>
                        <button class="btn btn-sm btn-primary" onclick="toggleAllEvents()" id="toggle-events-btn">查看全部</button>
                    </div>
                    <div id="upcoming-events"></div>
                </div>

                <!-- 剩余时间模块（合并倒计时和需求最少时间） -->
                <div class="card" style="margin-top:1.5rem;">
                    <div class="card-header">
                        <h2 class="card-title">剩余时间</h2>
                    </div>
                    <div id="remaining-time">
                        <div id="countdown"></div>
                        <div id="today-time-statistics" style="margin-top:1.5rem; padding-top:1.5rem; border-top:1px solid var(--border-color);"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 设置默认日期为今天
    const dateInput = document.getElementById('schedule-date');
    if (dateInput) {
        dateInput.value = formatDate(new Date());
    }

    renderDailyTasks();
    renderPendingTasks();
    renderCompletedTasks();
    renderSchedule();
    renderUpcomingEvents();
    
    // 渲染剩余时间模块（包含倒计时和需求最少时间）
    renderCountdown();
    renderTodayTimeStatistics();
    
    // 启动倒计时定时器（会自动调用renderCountdown）
    startCountdownTimer();
}

// 渲染日常任务
function renderDailyTasks() {
    const container = document.getElementById('daily-tasks');
    if (!container) return;

    const trees = TaskTree.getAll();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    
    // 获取所有日常任务（包括已完成的任务树，因为日常任务是每天重复的）
    const dailyTasks = [];
    trees.forEach(tree => {
        // 日常任务不受任务树状态影响，即使任务树已完成也应该显示
        // if (tree.status !== 'in-progress') return;
        
        tree.subtasks.forEach(subtask => {
            if (subtask.type === 'daily') {
                // 检查是否应该显示（考虑截止日期）
                if (!TaskTree.shouldShowDailySubtask(subtask, today)) {
                    return;
                }
                
                // 检查今天是否已完成
                const todayHistory = History.getByDate(today);
                const todayCompleted = todayHistory.some(record => 
                    record.taskId === subtask.id && record.taskType === 'subtask'
                );
                
                // 如果今天已完成且状态是completed，不显示今天的任务
                // 但可能还有逾期的任务需要显示
                
                // 检查历史记录，找出所有未完成的日期
                const allHistory = History.getAll();
                const taskHistory = allHistory.filter(record => 
                    record.taskId === subtask.id && record.taskType === 'subtask'
                );
                
                // 获取所有应该完成的日期（从任务创建日期到今天，或到截止日期）
                let startDate;
                if (subtask.createdAt) {
                    startDate = new Date(subtask.createdAt);
                    if (isNaN(startDate.getTime())) {
                        // 如果createdAt无效，使用今天作为开始日期
                        startDate = new Date(today);
                    }
                } else {
                    // 如果createdAt不存在，使用今天作为开始日期
                    startDate = new Date(today);
                }
                startDate.setHours(0, 0, 0, 0);
                const endDate = subtask.deadline ? new Date(subtask.deadline) : today;
                endDate.setHours(0, 0, 0, 0);
                
                // 确保startDate不超过endDate和today
                if (startDate > endDate) {
                    startDate = new Date(endDate);
                }
                if (startDate > today) {
                    startDate = new Date(today);
                }
                
                const completedDates = new Set(
                    taskHistory.map(record => formatDate(new Date(record.completedAt)))
                );
                
                // 找出所有未完成的日期
                const currentDate = new Date(startDate);
                let maxIterations = 1000; // 防止无限循环
                let iterations = 0;
                
                while (currentDate <= endDate && currentDate <= today && iterations < maxIterations) {
                    iterations++;
                    const dateStr = formatDate(currentDate);
                    
                    // 对于weekly类型的任务，需要检查今天是否在repeatDays中
                    if (subtask.repeatType === 'weekly' && subtask.repeatDays && subtask.repeatDays.length > 0) {
                        const dayOfWeek = currentDate.getDay();
                        if (!subtask.repeatDays.includes(dayOfWeek)) {
                            // 今天不在重复日期列表中，跳过
                            currentDate.setDate(currentDate.getDate() + 1);
                            continue;
                        }
                    }
                    
                    if (!completedDates.has(dateStr)) {
                        // 这是一个未完成的日期
                        const isOverdue = dateStr < todayStr;
                        const isToday = dateStr === todayStr;
                        
                        // 如果是今天的任务，检查当前状态
                        if (isToday && subtask.status === 'completed' && todayCompleted) {
                            // 今天已完成，跳过
                            currentDate.setDate(currentDate.getDate() + 1);
                            continue;
                        }
                        
                        dailyTasks.push({
                            ...subtask,
                            treeId: tree.id,
                            treeTitle: tree.title,
                            targetDate: dateStr,
                            isOverdue: isOverdue,
                            isToday: isToday
                        });
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        });
    });
    
    // 排序：逾期任务在前（按日期倒序），今天的任务在后
    dailyTasks.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.isOverdue && b.isOverdue) {
            // 逾期任务按日期倒序（最新的逾期任务在最上）
            return b.targetDate.localeCompare(a.targetDate);
        }
        // 今天的任务按创建时间排序
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    if (dailyTasks.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无日常任务</div>';
        return;
    }
    
    container.innerHTML = dailyTasks.map(task => {
        // 逾期任务显示红色警告
        const overdueBadge = task.isOverdue ? 
            '<div style="font-size:0.75rem; color:#d32f2f; font-weight:bold; text-align:right; margin-bottom:0.25rem;">逾期任务</div>' : 
            '<div style="font-size:0.85rem; color:var(--text-secondary); text-align:right; font-weight:bold; margin-bottom:0.25rem;">日常任务</div>';
        
        return `
            <div class="task-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.375rem;">
                            <div class="task-title" style="font-weight:bold; font-size:1rem;">
                                ${task.link ? `<a href="${task.link}" target="_blank" style="text-decoration:none; color:inherit;">${task.title}</a>` : task.title}
                            </div>
                            ${task.link ? '<span style="font-size:0.85rem; color:var(--text-secondary); cursor:pointer;" onclick="event.stopPropagation(); window.open(\'' + task.link + '\', \'_blank\');">🔗</span>' : ''}
                            <span style="font-weight:bold; font-size:0.85rem; color:var(--text-secondary);">[${task.treeTitle}${task.estimatedTime ? ` | ${task.estimatedTime}小时` : ''}]</span>
                        </div>
                        ${task.description ? `
                            <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4; margin-bottom:0.25rem;">
                                ${task.description}
                            </div>
                        ` : ''}
                        ${task.progress !== undefined ? `
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-top:${task.description ? '0' : '0.25rem'};">
                                <div class="progress-bar" style="width:90%; height:6px; flex-shrink:0;">
                                    <div class="progress-fill" style="width: ${task.progress}%"></div>
                                </div>
                                <span style="font-size:0.85rem; color: var(--text-secondary); flex-shrink:0; min-width:2.5rem; text-align:right;">${task.progress}%</span>
                            </div>
                        ` : ''}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; flex-shrink:0; width:150px;">
                        ${overdueBadge}
                        <button class="btn btn-primary" onclick="startTask('${task.treeId}', '${task.id}')" style="display:flex; align-items:center; gap:0.4rem; padding:0.4rem 0.9rem; font-size:0.9rem;">
                            <span style="color:var(--text-secondary); font-size:0.85rem;">▶</span>
                            <span>开始任务</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染普通任务（排除日常任务）
function renderPendingTasks() {
    const container = document.getElementById('pending-tasks');
    if (!container) return;

    const availableTasks = TaskTree.getAvailableSubtasks();
    const today = new Date();

    // 过滤：排除事件类型和日常任务
    const filteredTasks = availableTasks.filter(task => {
        // 排除事件类型（事件只在"近期事件"中显示）
        if (task.type === 'event') {
            return false;
        }
        // 完全排除日常任务（日常任务在单独的板块显示）
        if (task.type === 'daily') {
            return false;
        }
        return true;
    });

    // 如果收起状态，显示已过期的任务和最近5天截止的任务
    let displayTasks = filteredTasks;
    if (!pendingTasksExpanded) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fiveDaysLater = new Date(today);
        fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
        
        displayTasks = filteredTasks.filter(task => {
            // 没有截止日期的任务不显示在收起状态
            if (!task.deadline) {
                return false;
            }
            const deadline = new Date(task.deadline);
            deadline.setHours(0, 0, 0, 0);
            // 显示已过期的任务或今天到5天后之间的任务（包括今天和5天后）
            return deadline < today || (deadline >= today && deadline <= fiveDaysLater);
        });
    }
    
    // 排序：已过期的在前（按过期时间倒序，最新的过期任务在最上），然后按截止时间
    displayTasks.sort((a, b) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (a.deadline && b.deadline) {
            const deadlineA = new Date(a.deadline);
            deadlineA.setHours(0, 0, 0, 0);
            const deadlineB = new Date(b.deadline);
            deadlineB.setHours(0, 0, 0, 0);
            
            const isOverdueA = deadlineA < today;
            const isOverdueB = deadlineB < today;
            
            // 已过期的在前
            if (isOverdueA && !isOverdueB) return -1;
            if (!isOverdueA && isOverdueB) return 1;
            
            // 如果都过期，按过期时间倒序（最新的过期任务在最上）
            if (isOverdueA && isOverdueB) {
                return deadlineB - deadlineA;
            }
            
            // 如果都没过期，按截止时间升序
            return deadlineA - deadlineB;
        }
        if (a.deadline) {
            const deadlineA = new Date(a.deadline);
            deadlineA.setHours(0, 0, 0, 0);
            return deadlineA < today ? -1 : 1;
        }
        if (b.deadline) {
            const deadlineB = new Date(b.deadline);
            deadlineB.setHours(0, 0, 0, 0);
            return deadlineB < today ? 1 : -1;
        }
        
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    if (displayTasks.length === 0) {
        const message = !pendingTasksExpanded && filteredTasks.length > 0 
            ? '<div class="empty-state">最近5天内暂无普通任务，点击"展开/收起"查看全部</div>'
            : '<div class="empty-state">暂无普通任务</div>';
        container.innerHTML = message;
        return;
    }

    container.innerHTML = displayTasks.map(task => {
        // 格式化截止时间显示
        let deadlineDisplay = '';
        if (task.deadline) {
            // 普通任务：显示日期和倒计时
            const daysUntil = getDaysUntil(task.deadline);
            const deadlineDate = formatDate(task.deadline);
            let daysText = '';
            if (daysUntil === 0) {
                daysText = '今日截止';
            } else if (daysUntil === 1) {
                daysText = '明日截止';
            } else if (daysUntil > 1) {
                daysText = `还剩${daysUntil}天`;
            } else {
                daysText = '已过期';
            }
            const deadlineClass = getDeadlineClass(task.deadline);
            // 如果是今天、明天截止或已过期，使用红色，否则使用默认颜色
            const textColor = (daysUntil === 0 || daysUntil === 1 || daysUntil < 0) ? '#d32f2f' : 'var(--text-secondary)';
            deadlineDisplay = `<div class="task-deadline-right ${deadlineClass}" style="text-align:right; font-size:0.85rem; color:${textColor}; font-weight:bold; white-space:nowrap;">
                ${deadlineDate} ${daysText}
            </div>`;
        }
        
        return `
            <div class="task-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.375rem;">
                            <div class="task-title" style="font-weight:bold; font-size:1rem;">
                                ${task.link ? `<a href="${task.link}" target="_blank" style="text-decoration:none; color:inherit;">${task.title}</a>` : task.title}
                            </div>
                            ${task.link ? '<span style="font-size:0.85rem; color:var(--text-secondary); cursor:pointer;" onclick="event.stopPropagation(); window.open(\'' + task.link + '\', \'_blank\');">🔗</span>' : ''}
                            <span style="font-weight:bold; font-size:0.85rem; color:var(--text-secondary);">[${task.treeTitle}${task.estimatedTime ? ` | ${task.estimatedTime}小时` : ''}]</span>
                        </div>
                        ${task.description ? `
                            <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4; margin-bottom:0.25rem;">
                                ${task.description}
                            </div>
                        ` : ''}
                        ${(task.type === 'normal' || task.type === 'daily') && task.progress !== undefined ? `
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-top:${task.description ? '0' : '0.25rem'};">
                                <div class="progress-bar" style="width:90%; height:6px; flex-shrink:0;">
                                    <div class="progress-fill" style="width: ${task.progress}%"></div>
                                </div>
                                <span style="font-size:0.85rem; color: var(--text-secondary); flex-shrink:0; min-width:2.5rem; text-align:right;">${task.progress}%</span>
                            </div>
                        ` : ''}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; flex-shrink:0; width:150px;">
                        ${deadlineDisplay ? deadlineDisplay : ''}
                        <button class="btn btn-primary" onclick="startTask('${task.treeId}', '${task.id}')" style="display:flex; align-items:center; gap:0.4rem; padding:0.4rem 0.9rem; font-size:0.9rem;">
                            <span style="color:var(--text-secondary); font-size:0.85rem;">▶</span>
                            <span>开始任务</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染已完成任务
function renderCompletedTasks() {
    const container = document.getElementById('completed-tasks');
    if (!container) return;

    const today = new Date();
    const todayRecords = History.getByDate(today);

    if (todayRecords.length === 0) {
        container.innerHTML = '<div class="empty-state">今日尚未完成任务</div>';
        return;
    }

    // 获取所有任务树，用于验证任务实时状态
    const allTrees = TaskTree.getAll();
    
    // 过滤：只显示那些在任务树中仍然是"已完成"状态的记录
    const validRecords = todayRecords.filter(record => {
        // 只验证子任务类型的记录
        if (record.taskType !== 'subtask') return true;
        
        // 在所有任务树中查找对应的子任务
        for (const tree of allTrees) {
            const subtask = tree.subtasks.find(st => st.id === record.taskId);
            if (subtask) {
                // 找到对应的子任务，检查其实时状态
                // 只有当状态为 'completed' 时才显示
                return subtask.status === 'completed';
            }
        }
        
        // 如果找不到对应的子任务（可能已被删除），不显示
        return false;
    });

    if (validRecords.length === 0) {
        container.innerHTML = '<div class="empty-state">今日尚未完成任务</div>';
        return;
    }

    container.innerHTML = validRecords.map(record => {
        return `
            <div class="task-card completed">
                <div class="task-header">
                    <div>
                        <div class="task-title">${record.title}</div>
                        <div style="font-size:0.85rem; color: var(--text-secondary); margin-top:0.5rem;">
                            完成时间: ${formatDate(record.completedAt)} | 
                            花费时间: ${formatTime(record.timeSpent)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染日程
function renderSchedule() {
    const container = document.getElementById('today-schedule');
    if (!container) return;

    const dateInput = document.getElementById('schedule-date');
    const selectedDate = dateInput ? new Date(dateInput.value) : new Date();
    const schedules = Schedule.getByDate(selectedDate);

    if (schedules.length === 0) {
        container.innerHTML = '<div class="empty-state">该日期暂无日程安排</div>';
        return;
    }

    container.innerHTML = schedules.map(schedule => {
        const timeDisplay = schedule.startTime || schedule.endTime 
            ? `${schedule.startTime || ''}${schedule.startTime && schedule.endTime ? ' - ' : ''}${schedule.endTime || ''}`
            : '';
        return `
            <div class="task-card">
                <div class="task-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="flex:1; min-width:0;">
                        <div class="task-title" style="display:flex; align-items:center; gap:0.5rem;">
                            ${schedule.link ? `<a href="${schedule.link}" target="_blank">${schedule.title}</a>` : schedule.title}
                            ${schedule.link ? '<span style="font-size:0.85rem; color:var(--text-secondary);">🔗</span>' : ''}
                        </div>
                        <div style="font-size:0.85rem; color: var(--text-secondary); margin-top:0.5rem;">
                            ${schedule.description ? `<div>${schedule.description}</div>` : ''}
                        </div>
                    </div>
                    ${timeDisplay ? `<div style="flex-shrink:0; margin-left:1rem; text-align:right;">
                        <span style="font-size:0.85rem; color:var(--text-secondary); font-weight:bold;">${timeDisplay}</span>
                    </div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// 近期事件展开状态
let showAllEvents = false;

// 渲染近期事件（从任务树和独立事件中获取）
function renderUpcomingEvents() {
    const container = document.getElementById('upcoming-events');
    if (!container) return;

    const allEvents = [];
    
    // 从独立事件中获取
    const standaloneEvents = UpcomingEvents.getAll();
    standaloneEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        
        // 只显示未来或今天的事件
        if (eventDate >= today) {
            const daysUntil = getDaysUntil(event.date);
            allEvents.push({
                id: event.id,
                title: event.title,
                description: event.description,
                deadline: event.date,
                link: event.link,
                daysUntil: daysUntil !== null ? daysUntil : 0,
                source: 'standalone'
            });
        }
    });

    // 按日期排序
    allEvents.sort((a, b) => {
        const dateA = new Date(a.deadline || a.date);
        const dateB = new Date(b.deadline || b.date);
        return dateA - dateB;
    });

    // 根据展开状态决定显示数量
    const events = showAllEvents ? allEvents : allEvents.slice(0, 5);

    // 更新按钮文本
    const toggleBtn = document.getElementById('toggle-events-btn');
    if (toggleBtn && allEvents.length > 5) {
        toggleBtn.textContent = showAllEvents ? '收起' : '查看全部';
    } else if (toggleBtn) {
        toggleBtn.style.display = 'none';
    }

    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无即将到来的事件</div>';
        return;
    }

    container.innerHTML = events.map(event => {
        const daysUntil = event.daysUntil !== null && event.daysUntil !== undefined ? event.daysUntil : 0;
        const dateStr = formatDateMonthDay(event.deadline || event.date);
        const daysText = daysUntil === 0 ? '今日' : daysUntil === 1 ? '明日' : `还剩${daysUntil}天`;
        const dateDisplay = `${dateStr}[${daysText}]`;
        // 两天以内（包括今天和明天）标红
        const dateColor = daysUntil <= 1 ? '#d32f2f' : 'var(--text-secondary)';
        
        return `
            <div class="task-card">
                <div class="task-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="flex:1; min-width:0;">
                        <div class="task-title" style="display:flex; align-items:center; gap:0.5rem;">
                            ${event.link ? `<a href="${event.link}" target="_blank" style="text-decoration:none; color:inherit; font-weight:inherit;">${event.title}</a>` : event.title}
                            ${event.link ? '<span style="font-size:0.85rem; color:var(--text-secondary);">🔗</span>' : ''}
                        </div>
                        ${event.description ? `
                            <div style="font-size:0.85rem; color: var(--text-secondary); margin-top:0.5rem;">
                                ${event.description}
                            </div>
                        ` : ''}
                    </div>
                    <div style="flex-shrink:0; margin-left:1rem; text-align:right;">
                        <span style="font-size:0.85rem; color:${dateColor}; font-weight:bold;">${dateDisplay}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 开始任务
function startTask(treeId, subtaskId) {
    const tree = TaskTree.getById(treeId);
    if (!tree) return;

    const subtask = tree.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;

    const task = {
        ...subtask,
        treeId: tree.id,
        treeTitle: tree.title
    };

    // 普通任务和日常任务都使用计时器
    if (task.type === 'normal' || task.type === 'daily') {
        openTimerModal(task);
    } else {
        // 其他类型：打开进度模态框（如果有的话）
        openProgressModal(task);
    }
}

// 打开计时器模态框
function openTimerModal(task) {
    const modal = document.getElementById('timer-modal');
    const titleEl = document.getElementById('timer-task-title');
    
    if (!modal || !titleEl) return;

    // 先重置计时器状态
    Timer.reset();
    // 然后设置当前任务
    Timer.currentTask = task;
    titleEl.textContent = task.title;
    
    // 显示计时器阶段，隐藏进度设置阶段
    const timerStage = document.getElementById('timer-stage');
    const progressStage = document.getElementById('progress-stage');
    
    if (timerStage) timerStage.style.display = 'block';
    if (progressStage) progressStage.style.display = 'none';

    modal.classList.add('show');
}

// 打开进度模态框
function openProgressModal(task) {
    const modal = document.getElementById('progress-modal');
    const titleEl = document.getElementById('progress-task-title');
    
    if (!modal || !titleEl) return;

    titleEl.textContent = task.title;
    Timer.currentTask = task;
    
    const timeInput = document.getElementById('progress-time-spent');
    const focusInput = document.getElementById('progress-focus');
    if (timeInput) timeInput.value = 0;
    if (focusInput) focusInput.value = 1.0;

    modal.classList.add('show');
}

// 完成进度任务
function completeProgressTask() {
    const task = Timer.currentTask;
    if (!task) return;

    const timeInput = document.getElementById('progress-time-spent');
    const timeSpent = (parseFloat(timeInput.value) || 0) * 60 * 1000; // 转换为毫秒

    Rewards.completeTask(task, timeSpent);
    closeProgressModal();
    
    // 刷新页面
    renderDashboard();
}

// 切换已完成任务显示
function toggleCompletedTasks() {
    const container = document.getElementById('completed-tasks');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
}

// 渲染倒计时
function renderCountdown() {
    const container = document.getElementById('countdown');
    if (!container) return;

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 今天的开始时间：早上8点
    const dayStart = new Date(today);
    dayStart.setHours(8, 0, 0, 0);
    
    // 今天的结束时间：晚上12点（24:00，即明天的0:00）
    const dayEnd = new Date(today);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(0, 0, 0, 0);
    
    // 总时长（小时）
    const totalHours = 16; // 8:00-24:00 = 16小时
    
    // 计算剩余时间
    let remainingMs = 0;
    let elapsedMs = 0;
    let remainingHours = 0;
    let elapsedHours = 0;
    let percentage = 0;
    
    if (now < dayStart) {
        // 当前时间早于8点，剩余时间为完整的16小时
        remainingMs = dayEnd.getTime() - dayStart.getTime();
        elapsedMs = 0;
    } else if (now >= dayEnd) {
        // 当前时间晚于24点，剩余时间为0
        remainingMs = 0;
        elapsedMs = dayEnd.getTime() - dayStart.getTime();
    } else {
        // 当前时间在8:00-24:00之间
        remainingMs = dayEnd.getTime() - now.getTime();
        elapsedMs = now.getTime() - dayStart.getTime();
    }
    
    remainingHours = remainingMs / (1000 * 60 * 60);
    elapsedHours = elapsedMs / (1000 * 60 * 60);
    percentage = (remainingHours / totalHours) * 100;
    
    // 格式化剩余时间显示
    const remainingHoursInt = Math.floor(remainingHours);
    const remainingMinutes = Math.floor((remainingHours - remainingHoursInt) * 60);
    const remainingSeconds = Math.floor((remainingHours - remainingHoursInt - remainingMinutes / 60) * 3600) % 60;
    
    const timeDisplay = remainingHours > 0 
        ? `${remainingHoursInt}小时${remainingMinutes}分钟${remainingSeconds}秒`
        : '今天已结束';
    
    // 检查是否已经创建了HTML结构
    let timeDisplayEl = document.getElementById('countdown-time-display');
    let percentageEl = document.getElementById('countdown-percentage');
    
    if (!timeDisplayEl || !percentageEl) {
        // 首次创建HTML结构
        container.innerHTML = `
            <div style="padding:1rem;">
                <div style="text-align:center; margin-bottom:1rem;">
                    <div id="countdown-time-display" style="font-size:1.2rem; font-weight:bold; color:var(--primary-color); margin-bottom:0.5rem;">
                        ${timeDisplay}
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary);">
                        距离今天结束还剩
                    </div>
                </div>
                <div style="position:relative; width:100%; max-width:250px; margin:0 auto;">
                    <canvas id="countdown-chart" style="max-height:250px;"></canvas>
                </div>
                <div style="text-align:center; margin-top:1rem;">
                    <div style="font-size:0.9rem; color:var(--text-secondary);">
                        剩余时间：<strong id="countdown-percentage" style="color:var(--primary-color);">${percentage.toFixed(1)}%</strong>
                    </div>
                </div>
            </div>
        `;
        
        // 首次创建图表
        const ctx = document.getElementById('countdown-chart');
        if (ctx && typeof Chart !== 'undefined') {
            countdownChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['已过时间', '剩余时间'],
                    datasets: [{
                        data: [elapsedHours, remainingHours],
                        backgroundColor: [
                            'rgba(200, 200, 200, 0.5)',
                            'rgba(74, 144, 226, 0.8)'
                        ],
                        borderColor: [
                            'rgba(200, 200, 200, 1)',
                            'rgba(74, 144, 226, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    animation: false, // 禁用所有动画
                    transitions: {
                        active: {
                            animation: {
                                duration: 0 // 禁用过渡动画
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 10,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: ${value.toFixed(1)}小时 (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    } else {
        // 只更新文本内容，不重新创建HTML
        timeDisplayEl.textContent = timeDisplay;
        percentageEl.textContent = `${percentage.toFixed(1)}%`;
        
        // 更新图表数据
        if (countdownChart) {
            countdownChart.data.datasets[0].data = [elapsedHours, remainingHours];
            countdownChart.update('none'); // 'none' 模式禁用动画
        }
    }
}

// 启动倒计时定时器
function startCountdownTimer() {
    // 清除旧的定时器
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // 立即渲染一次
    renderCountdown();
    
    // 每秒更新一次
    countdownInterval = setInterval(() => {
        renderCountdown();
    }, 1000);
}

// 停止倒计时定时器
function stopCountdownTimer() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    if (countdownChart) {
        countdownChart.destroy();
        countdownChart = null;
    }
}

// 切换普通任务显示（展开/收起）
function togglePendingTasks() {
    pendingTasksExpanded = !pendingTasksExpanded;
    renderPendingTasks();
    // 更新按钮文本（如果按钮存在）
    const btn = document.getElementById('toggle-pending-tasks-btn');
    if (btn) {
        btn.textContent = pendingTasksExpanded ? '收起' : '展开';
    }
}

// 切换显示所有事件
function toggleAllEvents() {
    showAllEvents = !showAllEvents;
    renderUpcomingEvents();
}

// 渲染今日时间统计
function renderTodayTimeStatistics() {
    const container = document.getElementById('today-time-statistics');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);
    let totalHours = 0;

    // 1. 计算今日日程时间（有完整开始和结束时间的，且未结束的）
    const todaySchedules = Schedule.getByDate(today);
    const now = new Date();
    let scheduleHours = 0;
    todaySchedules.forEach(schedule => {
        if (schedule.startTime && schedule.endTime) {
            // 解析结束时间
            const endParts = schedule.endTime.split(':');
            if (endParts.length === 2) {
                const scheduleEndTime = new Date(today);
                scheduleEndTime.setHours(parseInt(endParts[0]), parseInt(endParts[1]), 0, 0);
                
                // 检查日程是否已经结束（当前时间是否已经超过结束时间）
                if (now >= scheduleEndTime) {
                    return; // 已经结束的日程，不计入统计
                }
                
                // 计算时间差（小时）
                const startParts = schedule.startTime.split(':');
                if (startParts.length === 2) {
                    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
                    const diffMinutes = endMinutes - startMinutes;
                    if (diffMinutes > 0) {
                        scheduleHours += diffMinutes / 60;
                    }
                }
            }
        }
    });
    totalHours += scheduleHours;

    // 2. 计算日常任务时间（今天应完成但未完成的，有estimatedTime的）
    const trees = TaskTree.getAll();
    const todayHistory = History.getByDate(today);
    const completedTaskIds = new Set(
        todayHistory
            .filter(record => record.taskType === 'subtask')
            .map(record => record.taskId)
    );

    let dailyTaskHours = 0;
    trees.forEach(tree => {
        // 日常任务不受任务树状态影响，即使任务树已完成也应该计入统计
        // if (tree.status !== 'in-progress') return;
        
        tree.subtasks.forEach(subtask => {
            if (subtask.type === 'daily' && subtask.estimatedTime) {
                // 检查是否应该显示（考虑截止日期）
                if (!TaskTree.shouldShowDailySubtask(subtask, today)) {
                    return;
                }
                
                // 检查今天是否已完成
                const todayCompleted = completedTaskIds.has(subtask.id);
                if (todayCompleted) {
                    return; // 今天已完成，不计入
                }
                
                // 检查历史记录，找出所有未完成的日期
                const allHistory = History.getAll();
                const taskHistory = allHistory.filter(record => 
                    record.taskId === subtask.id && record.taskType === 'subtask'
                );
                
                // 获取所有应该完成的日期（从任务创建日期到今天，或到截止日期）
                const startDate = new Date(subtask.createdAt);
                startDate.setHours(0, 0, 0, 0);
                const endDate = subtask.deadline ? new Date(subtask.deadline) : today;
                endDate.setHours(0, 0, 0, 0);
                
                const completedDates = new Set(
                    taskHistory.map(record => formatDate(new Date(record.completedAt)))
                );
                
                // 检查今天是否在未完成列表中
                if (!completedDates.has(todayStr)) {
                    // 今天未完成，计入统计
                    dailyTaskHours += subtask.estimatedTime;
                }
            }
        });
    });
    totalHours += dailyTaskHours;

    // 3. 计算普通任务时间（今天截止或已过期但未完成的，有estimatedTime的）
    const allTrees = TaskTree.getAll();
    let normalTaskHours = 0;
    allTrees.forEach(tree => {
        if (tree.status !== 'in-progress') return; // 只统计进行中的任务树
        
        tree.subtasks.forEach(subtask => {
            if (subtask.type === 'normal' && subtask.estimatedTime && subtask.deadline) {
                const deadline = new Date(subtask.deadline);
                deadline.setHours(0, 0, 0, 0);
                
                // 检查是否是今天截止或已过期
                if (deadline.getTime() <= today.getTime()) {
                    // 检查今天是否已完成
                    const todayCompleted = completedTaskIds.has(subtask.id);
                    if (!todayCompleted) {
                        // 今天截止或已过期但未完成，计入统计
                        normalTaskHours += subtask.estimatedTime;
                    }
                }
            }
        });
    });
    totalHours += normalTaskHours;

    // 显示今日总时间
    const todayTotalDisplay = totalHours > 0 
        ? `${totalHours.toFixed(1)}小时` 
        : '0小时';

    // 计算明日预计时间
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);
    let tomorrowTotalHours = 0;

    // 1. 计算明日日程时间（有完整开始和结束时间的）
    const tomorrowSchedules = Schedule.getByDate(tomorrow);
    let tomorrowScheduleHours = 0;
    const scheduleDetails = [];
    tomorrowSchedules.forEach(schedule => {
        if (schedule.startTime && schedule.endTime) {
            // 计算时间差（小时）
            const startParts = schedule.startTime.split(':');
            const endParts = schedule.endTime.split(':');
            if (startParts.length === 2 && endParts.length === 2) {
                const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
                const diffMinutes = endMinutes - startMinutes;
                if (diffMinutes > 0) {
                    const hours = diffMinutes / 60;
                    tomorrowScheduleHours += hours;
                    scheduleDetails.push({
                        title: schedule.title || '未命名日程',
                        time: `${schedule.startTime}-${schedule.endTime}`,
                        hours: hours.toFixed(1)
                    });
                }
            }
        }
    });
    tomorrowTotalHours += tomorrowScheduleHours;

    // 2. 计算明日日常任务时间（明天应完成的，有estimatedTime的）
    let tomorrowDailyTaskHours = 0;
    const dailyTaskDetails = [];
    trees.forEach(tree => {
        tree.subtasks.forEach(subtask => {
            if (subtask.type === 'daily' && subtask.estimatedTime) {
                // 检查是否应该明天显示（考虑截止日期）
                if (!TaskTree.shouldShowDailySubtask(subtask, tomorrow)) {
                    return;
                }
                // 明天应该完成的日常任务，计入统计
                tomorrowDailyTaskHours += subtask.estimatedTime;
                dailyTaskDetails.push({
                    treeTitle: tree.title || '未命名任务树',
                    taskTitle: subtask.title || '未命名任务',
                    hours: subtask.estimatedTime
                });
            }
        });
    });
    tomorrowTotalHours += tomorrowDailyTaskHours;

    // 3. 计算截止于明天的普通任务时间（有estimatedTime的）
    let tomorrowNormalTaskHours = 0;
    const normalTaskDetails = [];
    allTrees.forEach(tree => {
        if (tree.status !== 'in-progress') return; // 只统计进行中的任务树
        
        tree.subtasks.forEach(subtask => {
            if (subtask.type === 'normal' && subtask.estimatedTime && subtask.deadline) {
                const deadline = new Date(subtask.deadline);
                deadline.setHours(0, 0, 0, 0);
                
                // 检查是否是明天截止
                if (deadline.getTime() === tomorrow.getTime()) {
                    // 明天截止的普通任务，计入统计
                    tomorrowNormalTaskHours += subtask.estimatedTime;
                    normalTaskDetails.push({
                        treeTitle: tree.title || '未命名任务树',
                        taskTitle: subtask.title || '未命名任务',
                        hours: subtask.estimatedTime
                    });
                }
            }
        });
    });
    tomorrowTotalHours += tomorrowNormalTaskHours;

    // 调试信息：在控制台输出详细计算过程
    console.log('=== 明日预计时间计算详情 ===');
    console.log('明日日期:', tomorrowStr);
    console.log('\n1. 明日日程时间:', tomorrowScheduleHours.toFixed(1), '小时');
    if (scheduleDetails.length > 0) {
        scheduleDetails.forEach(detail => {
            console.log(`   - ${detail.title}: ${detail.time} (${detail.hours}小时)`);
        });
    } else {
        console.log('   (无明日日程)');
    }
    console.log('\n2. 明日日常任务时间:', tomorrowDailyTaskHours.toFixed(1), '小时');
    if (dailyTaskDetails.length > 0) {
        dailyTaskDetails.forEach(detail => {
            console.log(`   - [${detail.treeTitle}] ${detail.taskTitle}: ${detail.hours}小时`);
        });
    } else {
        console.log('   (无明日日常任务)');
    }
    console.log('\n3. 截止于明天的普通任务时间:', tomorrowNormalTaskHours.toFixed(1), '小时');
    if (normalTaskDetails.length > 0) {
        normalTaskDetails.forEach(detail => {
            console.log(`   - [${detail.treeTitle}] ${detail.taskTitle}: ${detail.hours}小时`);
        });
    } else {
        console.log('   (无明日截止的普通任务)');
    }
    console.log('\n总计:', tomorrowTotalHours.toFixed(1), '小时');
    console.log('==========================');

    // 显示明日总时间
    const tomorrowTotalDisplay = tomorrowTotalHours > 0 
        ? `${tomorrowTotalHours.toFixed(1)}小时` 
        : '0小时';
    
    container.innerHTML = `
        <div style="padding:1rem;">
            <div style="text-align:center; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border-color);">
                <div style="font-size:1.5rem; font-weight:bold; color:var(--primary-color); margin-bottom:0.5rem;">
                    ${todayTotalDisplay}
                </div>
                <div style="font-size:0.85rem; color:var(--text-secondary);">
                    今日待完成任务预计时间
                </div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:1.5rem; font-weight:bold; color:var(--primary-color); margin-bottom:0.5rem;">
                    ${tomorrowTotalDisplay}
                </div>
                <div style="font-size:0.85rem; color:var(--text-secondary);">
                    明日待完成任务预计时间
                </div>
            </div>
        </div>
    `;
}

// 工具函数
function getTypeLabel(type) {
    const labels = {
        daily: '日常任务',
        normal: '普通任务',
        event: '事件'
    };
    return labels[type] || type;
}


function getDeadlineClass(deadline) {
    if (!deadline) return '';
    const days = getDaysUntil(deadline);
    if (days === null) return '';
    if (days < 0) return 'urgent';
    if (days <= 1) return 'urgent';
    if (days <= 3) return 'warning';
    return '';
}

function getRepeatLabel(repeatType) {
    const labels = {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
        yearly: '每年'
    };
    return labels[repeatType] || repeatType;
}

// 修改stopTimer函数以支持完成任务（在timer.js中定义）

