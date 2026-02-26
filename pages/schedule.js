// 日程管理页面

function renderSchedulePage() {
    const container = document.getElementById('schedule-tab');
    if (!container) return;

    container.innerHTML = `
        <div class="schedule-page">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">日程管理</h2>
                    <button class="btn btn-primary" onclick="showCreateScheduleModal()">创建日程</button>
                </div>
                <div id="schedule-list"></div>
            </div>
        </div>
    `;

    renderScheduleList();
}

// 渲染日程列表
function renderScheduleList() {
    const container = document.getElementById('schedule-list');
    if (!container) return;

    const schedules = Schedule.getAll().sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
    });

    if (schedules.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无日程安排</div>';
        return;
    }

    container.innerHTML = schedules.map(schedule => {
        return `
            <div class="task-card">
                <div class="task-header">
                    <div>
                        <div class="task-title">
                            ${schedule.link ? `<a href="${schedule.link}" target="_blank">${schedule.title}</a>` : schedule.title}
                        </div>
                        <div style="font-size:0.9rem; color: var(--text-secondary); margin-top:0.5rem;">
                            <div>日期: ${formatDate(schedule.date)}${schedule.startTime || schedule.endTime ? ` ${schedule.startTime || ''}${schedule.startTime && schedule.endTime ? ' - ' : ''}${schedule.endTime || ''}` : ''}</div>
                            ${schedule.description ? `<div>${schedule.description}</div>` : ''}
                            ${schedule.repeatType !== 'none' ? `<div>重复: ${getRepeatLabel(schedule.repeatType)}${schedule.repeatEndDate ? ` (截止: ${formatDate(schedule.repeatEndDate)})` : ''}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editSchedule('${schedule.id}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${schedule.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 创建日程
function showCreateScheduleModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>创建日程</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>标题:</label>
                    <input type="text" id="schedule-title" class="form-control" placeholder="输入日程标题">
                </div>
                <div class="form-group">
                    <label>描述:</label>
                    <textarea id="schedule-description" class="form-control" placeholder="输入日程描述"></textarea>
                </div>
                <div class="form-group">
                    <label>日期:</label>
                    <input type="date" id="schedule-date" class="form-control" value="${formatDate(new Date())}">
                </div>
                <div class="form-group">
                    <label>开始时间:</label>
                    <select id="schedule-start-time" class="form-control">
                        <option value="">-- 选择时间 --</option>
                        ${generateTimeOptions().map(time => `<option value="${time}">${time}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>结束时间:</label>
                    <select id="schedule-end-time" class="form-control">
                        <option value="">-- 选择时间 --</option>
                        ${generateTimeOptions().map(time => `<option value="${time}">${time}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>链接 (可选):</label>
                    <input type="url" id="schedule-link" class="form-control" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label>重复:</label>
                    <select id="schedule-repeat" class="form-control" onchange="toggleRepeatEndDate()">
                        <option value="none">不重复</option>
                        <option value="daily">每日</option>
                        <option value="weekly">每周</option>
                        <option value="biweekly">每两周</option>
                        <option value="monthly">每月</option>
                        <option value="yearly">每年</option>
                    </select>
                </div>
                <div class="form-group" id="repeat-end-date-group" style="display:none;">
                    <label>重复截止日期 (可选):</label>
                    <input type="date" id="schedule-repeat-end-date" class="form-control">
                </div>
                <button class="btn btn-primary" onclick="createSchedule()">创建</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function createSchedule() {
    const title = document.getElementById('schedule-title').value;
    const description = document.getElementById('schedule-description').value;
    const date = document.getElementById('schedule-date').value;
    const startTime = document.getElementById('schedule-start-time').value;
    const endTime = document.getElementById('schedule-end-time').value;
    const link = document.getElementById('schedule-link').value;
    const repeatType = document.getElementById('schedule-repeat').value;
    const repeatEndDate = document.getElementById('schedule-repeat-end-date').value;

    if (!title.trim()) {
        showNotification('请输入日程标题', 'error');
        return;
    }

    Schedule.create({
        title,
        description,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        link,
        repeatType,
        repeatEndDate: repeatEndDate || null
    });

    showNotification('日程创建成功', 'success');
    document.querySelector('.modal.show').remove();
    renderScheduleList();
}

// 编辑日程
function editSchedule(scheduleId) {
    const schedule = Schedule.getById(scheduleId);
    if (!schedule) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>编辑日程</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>标题:</label>
                    <input type="text" id="edit-schedule-title" class="form-control" value="${schedule.title}">
                </div>
                <div class="form-group">
                    <label>描述:</label>
                    <textarea id="edit-schedule-description" class="form-control">${schedule.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>日期:</label>
                    <input type="date" id="edit-schedule-date" class="form-control" value="${schedule.date}">
                </div>
                <div class="form-group">
                    <label>开始时间:</label>
                    <select id="edit-schedule-start-time" class="form-control">
                        <option value="">-- 选择时间 --</option>
                        ${generateTimeOptions().map(time => `<option value="${time}" ${schedule.startTime === time ? 'selected' : ''}>${time}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>结束时间:</label>
                    <select id="edit-schedule-end-time" class="form-control">
                        <option value="">-- 选择时间 --</option>
                        ${generateTimeOptions().map(time => `<option value="${time}" ${schedule.endTime === time ? 'selected' : ''}>${time}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>链接:</label>
                    <input type="url" id="edit-schedule-link" class="form-control" value="${schedule.link || ''}">
                </div>
                <div class="form-group">
                    <label>重复:</label>
                    <select id="edit-schedule-repeat" class="form-control" onchange="toggleEditRepeatEndDate()">
                        <option value="none" ${schedule.repeatType === 'none' ? 'selected' : ''}>不重复</option>
                        <option value="daily" ${schedule.repeatType === 'daily' ? 'selected' : ''}>每日</option>
                        <option value="weekly" ${schedule.repeatType === 'weekly' ? 'selected' : ''}>每周</option>
                        <option value="biweekly" ${schedule.repeatType === 'biweekly' ? 'selected' : ''}>每两周</option>
                        <option value="monthly" ${schedule.repeatType === 'monthly' ? 'selected' : ''}>每月</option>
                        <option value="yearly" ${schedule.repeatType === 'yearly' ? 'selected' : ''}>每年</option>
                    </select>
                </div>
                <div class="form-group" id="edit-repeat-end-date-group" style="display:${schedule.repeatType !== 'none' ? 'block' : 'none'};">
                    <label>重复截止日期 (可选):</label>
                    <input type="date" id="edit-schedule-repeat-end-date" class="form-control" value="${schedule.repeatEndDate || ''}">
                </div>
                <button class="btn btn-primary" onclick="updateSchedule('${scheduleId}')">保存</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updateSchedule(scheduleId) {
    const title = document.getElementById('edit-schedule-title').value;
    const description = document.getElementById('edit-schedule-description').value;
    const date = document.getElementById('edit-schedule-date').value;
    const startTime = document.getElementById('edit-schedule-start-time').value;
    const endTime = document.getElementById('edit-schedule-end-time').value;
    const link = document.getElementById('edit-schedule-link').value;
    const repeatType = document.getElementById('edit-schedule-repeat').value;
    const repeatEndDate = document.getElementById('edit-schedule-repeat-end-date').value;

    if (!title.trim()) {
        showNotification('请输入日程标题', 'error');
        return;
    }

    Schedule.update(scheduleId, {
        title,
        description,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        link,
        repeatType,
        repeatEndDate: repeatEndDate || null
    });

    showNotification('日程更新成功', 'success');
    document.querySelector('.modal.show').remove();
    renderScheduleList();
}

// 删除日程
function deleteSchedule(scheduleId) {
    if (!confirm('确定要删除这个日程吗？')) return;

    Schedule.delete(scheduleId);
    showNotification('日程已删除', 'success');
    renderScheduleList();
}

// 切换重复截止日期显示
function toggleRepeatEndDate() {
    const repeatSelect = document.getElementById('schedule-repeat');
    const endDateGroup = document.getElementById('repeat-end-date-group');
    if (repeatSelect && endDateGroup) {
        endDateGroup.style.display = repeatSelect.value !== 'none' ? 'block' : 'none';
    }
}

// 切换编辑重复截止日期显示
function toggleEditRepeatEndDate() {
    const repeatSelect = document.getElementById('edit-schedule-repeat');
    const endDateGroup = document.getElementById('edit-repeat-end-date-group');
    if (repeatSelect && endDateGroup) {
        endDateGroup.style.display = repeatSelect.value !== 'none' ? 'block' : 'none';
    }
}

// 工具函数
function getRepeatLabel(repeatType) {
    const labels = {
        daily: '每日',
        weekly: '每周',
        biweekly: '每两周',
        monthly: '每月',
        yearly: '每年'
    };
    return labels[repeatType] || repeatType;
}

