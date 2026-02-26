// 复盘页面（包含系统设置）

function renderReports() {
    const container = document.getElementById('page-container');
    if (!container) return;

    // 检查URL参数
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1]);
    const defaultTab = params.get('tab') || 'documents';

    container.innerHTML = `
        <div class="reports-page">
            <div class="tabs">
                <button class="tab ${defaultTab === 'documents' ? 'active' : ''}" onclick="switchReportsTab('documents')">核心文档</button>
                <button class="tab ${defaultTab === 'review' ? 'active' : ''}" onclick="switchReportsTab('review')">每日复盘</button>
                <button class="tab ${defaultTab === 'goals' ? 'active' : ''}" onclick="switchReportsTab('goals')">中期目标</button>
                <button class="tab ${defaultTab === 'notes' ? 'active' : ''}" onclick="switchReportsTab('notes')">留言板</button>
                <button class="tab ${defaultTab === 'settings' ? 'active' : ''}" onclick="switchReportsTab('settings')">系统设置</button>
            </div>

            <div id="documents-tab" class="tab-content ${defaultTab === 'documents' ? 'active' : ''}">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">核心文档</h2>
                    </div>
                    <div id="core-documents"></div>
                </div>
            </div>

            <div id="review-tab" class="tab-content ${defaultTab === 'review' ? 'active' : ''}">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">每日复盘</h2>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <select id="review-year-select" class="form-control" style="width:auto;" onchange="renderDailyReviewCalendar()">
                                ${(() => {
                                    const currentYear = new Date().getFullYear();
                                    let options = '';
                                    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
                                        options += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`;
                                    }
                                    return options;
                                })()}
                            </select>
                        </div>
                    </div>
                    <div id="daily-review-calendar"></div>
                </div>
            </div>

            <div id="goals-tab" class="tab-content ${defaultTab === 'goals' ? 'active' : ''}">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">中期目标</h2>
                        <button class="btn btn-primary" onclick="showCreateGoalModal()">添加目标</button>
                    </div>
                    <div id="mid-term-goals"></div>
                </div>
            </div>

            <div id="notes-tab" class="tab-content ${defaultTab === 'notes' ? 'active' : ''}">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">留言板</h2>
                        <button class="btn btn-primary" onclick="saveNoteBoard()">保存</button>
                    </div>
                    <div id="note-board">
                        <textarea id="note-board-content" class="form-control" placeholder="在这里记录你的临时想法和待办事项，比如：继续、找工作、港校申请、国际关系投稿、健身、日语英语学习、意大利语入门等..." style="min-height:200px; font-family:inherit; resize:vertical;"></textarea>
                        <div style="margin-top:0.5rem; font-size:0.85rem; color:var(--text-secondary);">
                            <span id="note-board-updated"></span>
                        </div>
                    </div>
                </div>
            </div>

            <div id="settings-tab" class="tab-content ${defaultTab === 'settings' ? 'active' : ''}">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">系统设置</h2>
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <div style="margin-bottom:1rem;">
                            <div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:0.5rem;">
                                当前存储方式: <strong id="current-storage-mode">${storage.getStorageMode() === 'filesystem' ? '文件系统' : 'LocalStorage'}</strong>
                            </div>
                            <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                                <button class="btn btn-primary" onclick="switchToFileSystem()" id="switch-fs-btn">切换到文件系统存储</button>
                                <button class="btn btn-secondary" onclick="switchToLocalStorage()" id="switch-ls-btn">切换到 LocalStorage</button>
                            </div>
                            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.5rem;">
                                <strong>文件系统存储</strong>：数据保存在您选择的文件夹中，更安全可靠<br>
                                <strong>LocalStorage</strong>：数据保存在浏览器中，可能被清除<br><br>
                                <strong>建议选择：</strong><br>
                                • 项目文件夹：<code style="background:#f0f0f0; padding:2px 4px; border-radius:2px;">D:\Data\Projects\Evolution2.0</code><br>
                                • 或在该文件夹内创建 <code style="background:#f0f0f0; padding:2px 4px; border-radius:2px;">data</code> 子文件夹<br>
                                • 数据会以 JSON 文件形式保存在该文件夹中
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="exportData()">导出数据 (JSON)</button>
                        <button class="btn btn-secondary" onclick="importData()">导入数据 (JSON)</button>
                        <button class="btn btn-warning" onclick="migrateOldData()">迁移旧数据</button>
                        <button class="btn btn-danger" onclick="clearAllData()">清空所有数据</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 渲染对应标签页
    switchReportsTab(defaultTab);
}

// 切换复盘页面标签
function switchReportsTab(tab) {
    // 更新标签样式
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const tabButton = Array.from(document.querySelectorAll('.tab')).find(t => 
        t.textContent.includes(getReportsTabLabel(tab))
    );
    if (tabButton) tabButton.classList.add('active');

    const tabContent = document.getElementById(`${tab}-tab`);
    if (tabContent) tabContent.classList.add('active');

    // 渲染对应内容
    switch (tab) {
        case 'documents':
            renderCoreDocuments();
            break;
        case 'review':
            renderDailyReviewCalendar();
            break;
        case 'goals':
            renderMidTermGoals();
            break;
        case 'notes':
            renderNoteBoard();
            break;
        case 'settings':
            updateStorageModeDisplay();
            break;
    }
}

// 获取复盘页面标签页标签文本
function getReportsTabLabel(tab) {
    const labels = {
        documents: '核心文档',
        review: '每日复盘',
        goals: '中期目标',
        notes: '留言板',
        settings: '系统设置'
    };
    return labels[tab] || tab;
}

// 更新存储模式显示
function updateStorageModeDisplay() {
    const modeEl = document.getElementById('current-storage-mode');
    const fsBtn = document.getElementById('switch-fs-btn');
    const lsBtn = document.getElementById('switch-ls-btn');
    
    if (modeEl) {
        const mode = storage.getStorageMode();
        modeEl.textContent = mode === 'filesystem' ? '文件系统' : 'LocalStorage';
    }
    
    if (fsBtn && lsBtn) {
        const mode = storage.getStorageMode();
        fsBtn.style.display = mode === 'filesystem' ? 'none' : 'inline-block';
        lsBtn.style.display = mode === 'localStorage' ? 'none' : 'inline-block';
    }
}

// 切换到文件系统存储
async function switchToFileSystem() {
    const success = await storage.switchToFileSystem();
    if (success) {
        updateStorageModeDisplay();
        // 刷新页面以重新加载数据
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// 切换到 LocalStorage
function switchToLocalStorage() {
    storage.switchToLocalStorage();
    updateStorageModeDisplay();
    // 刷新页面以重新加载数据
    setTimeout(() => {
        location.reload();
    }, 500);
}

// 渲染核心文档
function renderCoreDocuments() {
    const container = document.getElementById('core-documents');
    if (!container) return;

    const documents = [
        {
            title: '飞书主页',
            link: 'https://my.feishu.cn/drive/home/'
        },
        {
            title: '每日日记',
            link: 'https://my.feishu.cn/wiki/IPXkwO8R5iVZcYkumnwcMfltnPc'
        },
        {
            title: '更新记录',
            link: 'https://my.feishu.cn/wiki/FzFRwWon7ilTXVkDrzOcwAiunmh'
        },
        {
            title: '京东云',
            link: 'https://lavm-console.jdcloud.com/lavm/list?regionId=cn-north-1'
        }
    ];

    container.innerHTML = `
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            ${documents.map(doc => {
                return `
                    <div class="task-card" style="flex:1; min-width:200px; padding:0.5rem 0.875rem;">
                        <div class="task-header" style="display:flex; justify-content:center; align-items:center; margin-bottom:0;">
                            <div style="text-align:center;">
                                <div class="task-title" style="margin-bottom:0;">
                                    <a href="${doc.link}" target="_blank" style="text-decoration:none; color:inherit; font-weight:inherit;">${doc.title}</a>
                                </div>
                            </div>
                        </div>
                    </div>
        `;
    }).join('')}
        </div>
    `;
}

// 渲染中期目标
function renderMidTermGoals() {
    const container = document.getElementById('mid-term-goals');
    if (!container) return;

    const goals = MidTermGoals.getAll();

    if (goals.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:2rem;">暂无中期目标，点击"添加目标"创建</div>';
        return;
    }

    container.innerHTML = goals.map(goal => {
        const daysUntil = goal.deadline ? getDaysUntil(goal.deadline) : null;
        let daysText = '';
        let daysColor = 'var(--text-secondary)';
        
        if (daysUntil !== null) {
            if (daysUntil < 0) {
                daysText = '已过期';
                daysColor = '#d32f2f';
            } else if (daysUntil === 0) {
                daysText = '今日截止';
                daysColor = '#d32f2f';
            } else if (daysUntil === 1) {
                daysText = '明日截止';
                daysColor = '#d32f2f';
            } else {
                daysText = `还剩${daysUntil}天`;
                daysColor = daysUntil <= 7 ? '#d32f2f' : 'var(--text-secondary)';
            }
        }

        return `
            <div class="task-card">
                <div class="task-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1; min-width:0;">
                        <div class="task-title" style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                            <span style="font-weight:bold; font-size:1rem;">${goal.title}</span>
                            ${goal.deadline ? `<span style="font-size:0.85rem; color:${daysColor}; font-weight:bold;">${daysText}</span>` : ''}
                        </div>
                        ${goal.deadline ? `
                            <div style="font-size:0.85rem; color:var(--text-secondary);">
                                截止日期: ${formatDate(goal.deadline)}
                            </div>
                        ` : ''}
                    </div>
                    <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                        <button class="btn btn-sm btn-secondary" onclick="editGoal('${goal.id}')">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteGoal('${goal.id}')">删除</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 显示创建目标模态框
function showCreateGoalModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header" style="position:sticky; top:0; background:var(--card-bg); z-index:10; border-bottom:1px solid var(--border-color);">
                <h2>添加中期目标</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>目标名称:</label>
                    <input type="text" id="goal-title" class="form-control" placeholder="输入目标名称">
                </div>
                <div class="form-group">
                    <label>截止日期:</label>
                    <input type="date" id="goal-deadline" class="form-control">
                </div>
                <div style="margin-top:1.5rem;">
                    <button class="btn btn-primary" onclick="createGoal()">创建</button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="margin-left:0.5rem;">取消</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 设置默认日期为今天
    const deadlineInput = document.getElementById('goal-deadline');
    if (deadlineInput) {
        deadlineInput.value = formatDate(new Date());
    }
}

// 创建目标
function createGoal() {
    const title = document.getElementById('goal-title').value;
    const deadline = document.getElementById('goal-deadline').value;

    if (!title.trim()) {
        showNotification('请输入目标名称', 'error');
        return;
    }

    MidTermGoals.create({
        title: title.trim(),
        deadline: deadline || null
    });

    showNotification('目标创建成功', 'success');
    document.querySelector('.modal.show').remove();
    renderMidTermGoals();
}

// 编辑目标
function editGoal(goalId) {
    const goal = MidTermGoals.getById(goalId);
    if (!goal) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header" style="position:sticky; top:0; background:var(--card-bg); z-index:10; border-bottom:1px solid var(--border-color);">
                <h2>编辑中期目标</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>目标名称:</label>
                    <input type="text" id="edit-goal-title" class="form-control" value="${goal.title}">
                </div>
                <div class="form-group">
                    <label>截止日期:</label>
                    <input type="date" id="edit-goal-deadline" class="form-control" value="${goal.deadline || ''}">
                </div>
                <div style="margin-top:1.5rem;">
                    <button class="btn btn-primary" onclick="updateGoal('${goalId}')">保存</button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="margin-left:0.5rem;">取消</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 更新目标
function updateGoal(goalId) {
    const title = document.getElementById('edit-goal-title').value;
    const deadline = document.getElementById('edit-goal-deadline').value;

    if (!title.trim()) {
        showNotification('请输入目标名称', 'error');
        return;
    }

    MidTermGoals.update(goalId, {
        title: title.trim(),
        deadline: deadline || null
    });

    showNotification('目标更新成功', 'success');
    document.querySelector('.modal.show').remove();
    renderMidTermGoals();
}

// 删除目标
function deleteGoal(goalId) {
    if (!confirm('确定要删除这个目标吗？')) return;

    MidTermGoals.delete(goalId);
    showNotification('目标已删除', 'success');
    renderMidTermGoals();
}

// 渲染留言板
function renderNoteBoard() {
    const textarea = document.getElementById('note-board-content');
    const updatedEl = document.getElementById('note-board-updated');
    
    if (!textarea) return;
    
    const noteData = NoteBoard.get();
    textarea.value = noteData.content || '';
    
    if (updatedEl && noteData.updatedAt) {
        const updatedDate = new Date(noteData.updatedAt);
        updatedEl.textContent = `最后更新: ${formatDate(updatedDate)} ${updatedDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (updatedEl) {
        updatedEl.textContent = '';
    }
}

// 保存留言板
function saveNoteBoard() {
    const textarea = document.getElementById('note-board-content');
    if (!textarea) return;
    
    const content = textarea.value;
    NoteBoard.update(content);
    showNotification('留言板已保存', 'success');
    
    // 更新显示的最后更新时间
    const updatedEl = document.getElementById('note-board-updated');
    if (updatedEl) {
        const now = new Date();
        updatedEl.textContent = `最后更新: ${formatDate(now)} ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
}

// 渲染每日复盘日历
function renderDailyReviewCalendar() {
    const container = document.getElementById('daily-review-calendar');
    if (!container) return;

    const yearSelect = document.getElementById('review-year-select');
    const year = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();
    
    // 获取该年份的所有复盘记录
    const reviews = DailyReview.getByYear(year);
    const reviewMap = {};
    reviews.forEach(review => {
        reviewMap[review.date] = review;
    });

    // 计算总天数（考虑闰年）
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const totalDays = isLeapYear ? 366 : 365;
    
    // 生成所有日期的数组
    const days = [];
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(year, 0, 1);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);
        const review = reviewMap[dateStr] || null;
        days.push({
            date: date,
            dateStr: dateStr,
            dayOfYear: i + 1,
            review: review
        });
    }

    // 根据评分获取颜色
    const getColorByRating = (rating) => {
        switch (rating) {
            case 'excellent': return '#2e7d32'; // 深绿色
            case 'good': return '#4caf50'; // 绿色
            case 'limited': return '#ffc107'; // 黄色
            case 'poor': return '#f44336'; // 红色
            case 'rest': return '#9e9e9e'; // 灰色
            default: return '#e0e0e0'; // 默认浅灰色
        }
    };

    // 计算布局：每行显示的天数
    const daysPerRow = 40;
    const rows = Math.ceil(totalDays / daysPerRow);

    let calendarHTML = `
        <div style="padding:1rem;">
            <div style="margin-bottom:1rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <div style="width:12px; height:12px; background:#2e7d32; border-radius:2px;"></div>
                    <span style="font-size:0.85rem;">非常满意</span>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <div style="width:12px; height:12px; background:#4caf50; border-radius:2px;"></div>
                    <span style="font-size:0.85rem;">一般满意</span>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <div style="width:12px; height:12px; background:#ffc107; border-radius:2px;"></div>
                    <span style="font-size:0.85rem;">进展有限</span>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <div style="width:12px; height:12px; background:#f44336; border-radius:2px;"></div>
                    <span style="font-size:0.85rem;">偏离预料</span>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <div style="width:12px; height:12px; background:#9e9e9e; border-radius:2px;"></div>
                    <span style="font-size:0.85rem;">休假</span>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <div style="width:12px; height:12px; background:#e0e0e0; border-radius:2px; border:1px solid #ccc;"></div>
                    <span style="font-size:0.85rem;">未记录</span>
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:2px;">
    `;

    // 按行渲染
    for (let row = 0; row < rows; row++) {
        calendarHTML += '<div style="display:flex; gap:2px; flex-wrap:wrap;">';
        const startIdx = row * daysPerRow;
        const endIdx = Math.min(startIdx + daysPerRow, totalDays);
        
        for (let i = startIdx; i < endIdx; i++) {
            const day = days[i];
            const color = day.review ? getColorByRating(day.review.rating) : '#e0e0e0';
            const isToday = formatDate(new Date()) === day.dateStr;
            
            calendarHTML += `
                <div 
                    onclick="editDailyReview('${day.dateStr}')"
                    style="
                        width:12px; 
                        height:12px; 
                        background:${color}; 
                        border-radius:2px; 
                        cursor:pointer; 
                        border:${isToday ? '2px solid #000' : '1px solid rgba(0,0,0,0.1)'};
                        position:relative;
                        transition:transform 0.1s;
                    "
                    onmouseover="this.style.transform='scale(1.3)'; this.style.zIndex='10';"
                    onmouseout="this.style.transform='scale(1)'; this.style.zIndex='1';"
                    title="${day.dateStr}${day.review ? ' - ' + getRatingLabel(day.review.rating) : ''}"
                ></div>
            `;
        }
        calendarHTML += '</div>';
    }

    calendarHTML += `
            </div>
        </div>
    `;

    container.innerHTML = calendarHTML;
}

// 获取评分标签
function getRatingLabel(rating) {
    const labels = {
        excellent: '非常满意',
        good: '一般满意',
        limited: '进展有限',
        poor: '偏离预料',
        rest: '休假'
    };
    return labels[rating] || '';
}

// 编辑每日复盘
function editDailyReview(dateStr) {
    const date = new Date(dateStr);
    const review = DailyReview.getByDate(date) || { progress: '', rating: null };
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <h2>每日复盘 - ${formatDate(date)}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>主要进展:</label>
                    <textarea id="review-progress" class="form-control" rows="6" placeholder="记录今天取得的最主要进展...">${review.progress || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>今日评分:</label>
                    <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:0.5rem;">
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="radio" name="review-rating" value="excellent" ${review.rating === 'excellent' ? 'checked' : ''}>
                            <div style="width:20px; height:20px; background:#2e7d32; border-radius:4px;"></div>
                            <span>非常满意</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="radio" name="review-rating" value="good" ${review.rating === 'good' ? 'checked' : ''}>
                            <div style="width:20px; height:20px; background:#4caf50; border-radius:4px;"></div>
                            <span>一般满意</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="radio" name="review-rating" value="limited" ${review.rating === 'limited' ? 'checked' : ''}>
                            <div style="width:20px; height:20px; background:#ffc107; border-radius:4px;"></div>
                            <span>进展有限</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="radio" name="review-rating" value="poor" ${review.rating === 'poor' ? 'checked' : ''}>
                            <div style="width:20px; height:20px; background:#f44336; border-radius:4px;"></div>
                            <span>偏离预料</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="radio" name="review-rating" value="rest" ${review.rating === 'rest' ? 'checked' : ''}>
                            <div style="width:20px; height:20px; background:#9e9e9e; border-radius:4px;"></div>
                            <span>休假</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                            <input type="radio" name="review-rating" value="" ${!review.rating ? 'checked' : ''}>
                            <span>清除评分</span>
                        </label>
                    </div>
                </div>
                <div style="margin-top:1.5rem; display:flex; gap:0.5rem;">
                    <button class="btn btn-primary" onclick="saveDailyReview('${dateStr}')">保存</button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                    ${review.rating ? `<button class="btn btn-danger" onclick="deleteDailyReview('${dateStr}')">删除</button>` : ''}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 保存每日复盘
function saveDailyReview(dateStr) {
    const progress = document.getElementById('review-progress').value;
    const ratingInput = document.querySelector('input[name="review-rating"]:checked');
    const rating = ratingInput && ratingInput.value ? ratingInput.value : null;

    DailyReview.save(new Date(dateStr), {
        progress: progress.trim(),
        rating: rating
    });

    showNotification('每日复盘已保存', 'success');
    document.querySelector('.modal.show').remove();
    renderDailyReviewCalendar();
}

// 删除每日复盘
function deleteDailyReview(dateStr) {
    if (!confirm('确定要删除这天的复盘记录吗？')) return;
    
    DailyReview.delete(new Date(dateStr));
    showNotification('复盘记录已删除', 'success');
    document.querySelector('.modal.show').remove();
    renderDailyReviewCalendar();
}
