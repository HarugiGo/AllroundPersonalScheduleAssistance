// 任务管理页面

function renderTasks() {
    const container = document.getElementById('page-container');
    if (!container) return;

    // 检查URL参数
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1]);
    const defaultTab = params.get('tab') || 'taskTree';

    container.innerHTML = `
        <div class="tasks-page">
            <div class="tabs">
                <button class="tab ${defaultTab === 'taskTree' ? 'active' : ''}" onclick="switchTab('taskTree')">任务树</button>
                <button class="tab ${defaultTab === 'schedule' ? 'active' : ''}" onclick="switchTab('schedule')">日程管理</button>
                <button class="tab ${defaultTab === 'events' ? 'active' : ''}" onclick="switchTab('events')">事件管理</button>
                <button class="tab ${defaultTab === 'history' ? 'active' : ''}" onclick="switchTab('history')">历史记录</button>
            </div>

            <div id="taskTree-tab" class="tab-content ${defaultTab === 'taskTree' ? 'active' : ''}">
                <!-- 任务树内容由taskTree.js渲染 -->
            </div>

            <div id="schedule-tab" class="tab-content ${defaultTab === 'schedule' ? 'active' : ''}">
                <!-- 日程内容由schedule.js渲染 -->
            </div>

            <div id="events-tab" class="tab-content ${defaultTab === 'events' ? 'active' : ''}">
                <!-- 事件内容由upcomingEvents.js渲染 -->
            </div>

            <div id="history-tab" class="tab-content ${defaultTab === 'history' ? 'active' : ''}">
                <!-- 历史记录内容 -->
            </div>
        </div>
    `;

    // 渲染对应标签页
    switchTab(defaultTab);
}

// 切换标签页
function switchTab(tab) {
    // 更新标签样式
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const tabButton = Array.from(document.querySelectorAll('.tab')).find(t => 
        t.textContent.includes(getTabLabel(tab))
    );
    if (tabButton) tabButton.classList.add('active');

    const tabContent = document.getElementById(`${tab}-tab`);
    if (tabContent) tabContent.classList.add('active');

    // 渲染对应内容
    switch (tab) {
        case 'taskTree':
            renderTaskTreePage();
            break;
        case 'schedule':
            renderSchedulePage();
            break;
        case 'events':
            renderUpcomingEventsPage();
            break;
        case 'history':
            renderHistoryPage();
            break;
    }
}

// 获取标签页标签文本
function getTabLabel(tab) {
    const labels = {
        taskTree: '任务树',
        schedule: '日程管理',
        events: '事件管理',
        history: '历史记录'
    };
    return labels[tab] || tab;
}

// 渲染历史记录页面（合并任务树历史）
function renderHistoryPage() {
    const container = document.getElementById('history-tab');
    if (!container) return;

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">历史记录</h2>
                <div>
                    <input type="date" id="history-date-filter" class="form-control" style="width:auto; display:inline-block;" onchange="filterHistory()">
                    <select id="history-type-filter" class="form-control" style="width:auto; display:inline-block; margin-left:0.5rem;" onchange="filterHistory()">
                        <option value="">全部类型</option>
                        <option value="daily">日常任务</option>
                        <option value="main">主线任务</option>
                        <option value="side">支线任务</option>
                        <option value="subtask">任务树子任务</option>
                        <option value="taskTree">任务树</option>
                    </select>
                </div>
            </div>
            <div id="history-stats" style="margin-bottom:1rem; padding:1rem; background:#f5f5f5; border-radius:4px;">
                <div>今日完成: <strong>${History.getTodayCount()}</strong> 个任务</div>
            </div>
            <div id="history-list"></div>
        </div>
    `;

    filterHistory();
}

// 筛选历史记录（合并任务树历史）
function filterHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    const dateFilter = document.getElementById('history-date-filter');
    const typeFilter = document.getElementById('history-type-filter');
    const filterType = typeFilter ? typeFilter.value : '';

    let html = '';

    // 如果筛选类型是"任务树"或"全部"，显示任务树历史
    if (filterType === '' || filterType === 'taskTree') {
        const trees = TaskTree.getAll().filter(tree => {
            if (tree.status !== 'completed') return false;
            
            // 日期筛选
            if (dateFilter && dateFilter.value) {
                const targetDate = formatDate(dateFilter.value);
                const treeDate = tree.completedAt ? formatDate(tree.completedAt) : '';
                if (treeDate !== targetDate) return false;
            }
            
            return true;
        });

        if (trees.length > 0) {
            html += trees.map(tree => {
                const completedCount = tree.subtasks.filter(st => st.status === 'completed').length;
                const totalCount = tree.subtasks.length;
                const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                return `
                    <div class="task-tree-card" style="margin-bottom:1rem; border-left:4px solid #1a1a1a;">
                        <div class="task-tree-header">
                            <div style="flex:1;">
                                <div class="task-tree-title" style="font-size:1.1rem; font-weight:bold;">${tree.title}</div>
                                <div class="task-meta" style="margin-top:0.5rem;">
                                    <span class="task-tag" style="background:#e0e0e0; color:#1a1a1a;">任务树</span>
                                    <span class="task-tag">完成度: ${completedCount}/${totalCount} (${progress}%)</span>
                                </div>
                                ${tree.description ? `<div style="font-size:0.9rem; color: var(--text-secondary); margin-top:0.5rem;">${tree.description}</div>` : ''}
                                <div style="font-size:0.85rem; color: var(--text-secondary); margin-top:0.5rem;">
                                    完成时间: ${tree.completedAt ? formatDate(tree.completedAt) : '未知'} | 
                                    创建时间: ${formatDate(tree.createdAt)}
                                </div>
                                ${tree.rating ? `
                                    <div style="margin-top:0.5rem;">
                                        <strong>评分:</strong> ${'★'.repeat(tree.rating)}${'☆'.repeat(5 - tree.rating)} (${tree.rating}/5)
                                    </div>
                                ` : ''}
                                ${tree.review ? `
                                    <div style="margin-top:0.5rem; padding:0.75rem; background:#f5f5f5; border-radius:4px;">
                                        <strong>复盘:</strong>
                                        <div style="margin-top:0.5rem; white-space:pre-wrap; max-height:100px; overflow-y:auto;">${tree.review}</div>
                                    </div>
                                ` : ''}
                            </div>
                            <div style="display:flex; gap:0.5rem; flex-direction:column;">
                                <button class="btn btn-sm btn-secondary" onclick="viewTaskTreeHistory('${tree.id}')">查看详情</button>
                                ${!tree.review ? `
                                    <button class="btn btn-sm btn-warning" onclick="reviewTaskTree('${tree.id}')">复盘</button>
                                ` : `
                                    <button class="btn btn-sm btn-warning" onclick="reviewTaskTree('${tree.id}')">编辑复盘</button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 如果筛选类型不是"任务树"，显示普通历史记录
    if (filterType !== 'taskTree') {
        let records = History.getAll();

        // 日期筛选
        if (dateFilter && dateFilter.value) {
            records = History.getByDate(dateFilter.value);
        }

        // 类型筛选
        if (filterType) {
            records = records.filter(r => r.taskType === filterType);
        }

        if (records.length > 0) {
            html += records.map(record => {
                return `
                    <div class="task-card">
                        <div class="task-header">
                            <div>
                                <div class="task-title">${record.title}</div>
                        <div class="task-meta">
                            <span class="task-tag">${getTaskTypeLabel(record.taskType)}</span>
                        </div>
                                <div style="font-size:0.9rem; color: var(--text-secondary); margin-top:0.5rem;">
                                    完成时间: ${formatDate(record.completedAt)} | 
                                    花费时间: ${formatTime(record.timeSpent)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    if (html === '') {
        container.innerHTML = '<div class="empty-state">暂无历史记录</div>';
    } else {
        container.innerHTML = html;
    }
}

// 查看任务树历史详情
function viewTaskTreeHistory(treeId) {
    const tree = TaskTree.getById(treeId);
    if (!tree) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:800px;">
            <div class="modal-header">
                <h2>${tree.title}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom:1rem;">
                    <strong>描述:</strong> ${tree.description || '无'}
                </div>
                <div style="margin-bottom:1rem;">
                    <strong>完成时间:</strong> ${tree.completedAt ? formatDate(tree.completedAt) : '未知'}
                </div>
                ${tree.rating ? `
                    <div style="margin-bottom:1rem;">
                        <strong>评分:</strong> ${'★'.repeat(tree.rating)}${'☆'.repeat(5 - tree.rating)} (${tree.rating}/5)
                    </div>
                ` : ''}
                ${tree.review ? `
                    <div style="margin-bottom:1rem;">
                        <strong>复盘:</strong>
                        <div style="margin-top:0.5rem; padding:0.75rem; background:#f5f5f5; border-radius:4px; white-space:pre-wrap;">${tree.review}</div>
                    </div>
                ` : ''}
                <div style="margin-bottom:1rem;">
                    <strong>子任务列表:</strong>
                </div>
                <div id="history-subtask-list-${treeId}"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 渲染子任务列表
    const subtaskContainer = document.getElementById(`history-subtask-list-${treeId}`);
    if (subtaskContainer) {
        subtaskContainer.innerHTML = tree.subtasks.map(subtask => {
            return `
                <div class="task-card" style="margin-bottom:0.5rem;">
                    <div class="task-header">
                        <div>
                            <div class="task-title">${subtask.title}</div>
                            <div class="task-meta">
                                <span class="task-tag tag-${subtask.type}">${getTypeLabel(subtask.type)}</span>
                            </div>
                            <div style="font-size:0.9rem; color: var(--text-secondary); margin-top:0.5rem;">
                                状态: ${getStatusLabel(subtask.status)} | 
                                ${subtask.completedAt ? `完成时间: ${formatDate(subtask.completedAt)}` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 从taskTree.js导入的函数
function getTypeLabel(type) {
    const labels = {
        daily: '日常任务',
        normal: '普通任务',
        event: '事件'
    };
    return labels[type] || type;
}

function getStatusLabel(status) {
    const labels = {
        pending: '未开始',
        'in-progress': '进行中',
        completed: '已完成'
    };
    return labels[status] || status;
}

// 获取任务类型标签
function getTaskTypeLabel(type) {
    const labels = {
        daily: '日常任务',
        main: '主线任务',
        side: '支线任务',
        subtask: '任务树子任务'
    };
    return labels[type] || type;
}


