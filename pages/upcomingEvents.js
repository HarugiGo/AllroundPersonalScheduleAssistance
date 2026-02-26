// 事件管理页面

function renderUpcomingEventsPage() {
    const container = document.getElementById('events-tab');
    if (!container) return;

    container.innerHTML = `
        <div class="events-page">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">事件管理</h2>
                    <button class="btn btn-primary" onclick="showCreateEventModal()">创建事件</button>
                </div>
                <div id="events-list"></div>
            </div>
        </div>
    `;

    renderEventsList();
}

// 渲染事件列表（卡片视图）
function renderEventsList() {
    const container = document.getElementById('events-list');
    if (!container) return;

    const events = UpcomingEvents.getAll().sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });

    if (events.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无事件，点击"创建事件"开始</div>';
        return;
    }

    container.innerHTML = events.map(event => {
        const daysUntil = getDaysUntil(event.date);
        let daysText = '';
        if (daysUntil !== null) {
            if (daysUntil < 0) {
                daysText = `已过期 ${Math.abs(daysUntil)} 天`;
            } else if (daysUntil === 0) {
                daysText = '今日';
            } else if (daysUntil === 1) {
                daysText = '明日';
            } else {
                daysText = `还剩 ${daysUntil} 天`;
            }
        }

        return `
            <div class="task-card" style="margin-bottom:1rem;">
                <div class="task-header" style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
                    <div style="flex:1; min-width:0;">
                        <div class="task-title" style="display:flex; align-items:center; gap:0.5rem;">
                            ${event.link ? `<a href="${event.link}" target="_blank" style="text-decoration:none; color:inherit; font-weight:inherit;">${event.title}</a>` : event.title}
                            ${event.link ? '<span style="font-size:0.9rem; color:var(--text-secondary);">🔗</span>' : ''}
                        </div>
                        ${event.description ? `
                            <div style="font-size:0.9rem; color: var(--text-secondary); margin-top:0.5rem;">
                                ${event.description}
                            </div>
                        ` : ''}
                        <div style="font-size:0.85rem; color: var(--text-secondary); margin-top:0.5rem;">
                            <div>日期: ${formatDate(event.date)}</div>
                            ${daysText ? `<div>${daysText}</div>` : ''}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editEvent('${event.id}')">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEvent('${event.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 创建事件
function showCreateEventModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.setAttribute('data-create-event-modal', 'true');
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px; display:flex; flex-direction:column; max-height:90vh;">
            <div class="modal-header" style="flex-shrink:0; position:sticky; top:0; background:var(--card-bg); z-index:10;">
                <h2>创建事件</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y:auto; flex:1;">
                <div class="form-group">
                    <label>标题:</label>
                    <input type="text" id="event-title" class="form-control" placeholder="输入事件标题">
                </div>
                <div class="form-group">
                    <label>描述:</label>
                    <textarea id="event-description" class="form-control" placeholder="输入事件描述"></textarea>
                </div>
                <div class="form-group">
                    <label>日期:</label>
                    <input type="date" id="event-date" class="form-control" value="${formatDate(new Date())}">
                </div>
                <div class="form-group">
                    <label>链接 (可选):</label>
                    <input type="url" id="event-link" class="form-control" placeholder="https://...">
                </div>
                <button class="btn btn-primary" id="create-event-btn">创建</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 绑定创建按钮事件
    const createBtn = document.getElementById('create-event-btn');
    if (createBtn) {
        createBtn.addEventListener('click', createEvent);
    }
}

function createEvent() {
    const title = document.getElementById('event-title').value;
    const description = document.getElementById('event-description').value;
    const date = document.getElementById('event-date').value;
    const link = document.getElementById('event-link').value;

    if (!title.trim()) {
        showNotification('请输入事件标题', 'error');
        return;
    }

    UpcomingEvents.create({
        title,
        description,
        date,
        link
    });

    showNotification('事件创建成功', 'success');
    
    // 关闭创建事件的模态框
    const createModal = document.querySelector('.modal[data-create-event-modal="true"]');
    if (createModal) {
        createModal.remove();
    }
    
    renderEventsList();
    
    // 如果当前在看板页面，刷新事件列表
    if (Router.currentRoute === '/' && typeof renderUpcomingEvents === 'function') {
        renderUpcomingEvents();
    }
}

// 编辑事件
function editEvent(eventId) {
    const event = UpcomingEvents.getById(eventId);
    if (!event) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.setAttribute('data-edit-event-modal', 'true');
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px; display:flex; flex-direction:column; max-height:90vh;">
            <div class="modal-header" style="flex-shrink:0; position:sticky; top:0; background:var(--card-bg); z-index:10;">
                <h2>编辑事件</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y:auto; flex:1;">
                <div class="form-group">
                    <label>标题:</label>
                    <input type="text" id="edit-event-title" class="form-control" value="${event.title}">
                </div>
                <div class="form-group">
                    <label>描述:</label>
                    <textarea id="edit-event-description" class="form-control">${event.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>日期:</label>
                    <input type="date" id="edit-event-date" class="form-control" value="${event.date}">
                </div>
                <div class="form-group">
                    <label>链接:</label>
                    <input type="url" id="edit-event-link" class="form-control" value="${event.link || ''}">
                </div>
                <button class="btn btn-primary" id="update-event-btn-${eventId}">保存</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 绑定保存按钮事件
    const updateBtn = document.getElementById(`update-event-btn-${eventId}`);
    if (updateBtn) {
        updateBtn.addEventListener('click', () => updateEvent(eventId));
    }
}

function updateEvent(eventId) {
    const title = document.getElementById('edit-event-title').value;
    const description = document.getElementById('edit-event-description').value;
    const date = document.getElementById('edit-event-date').value;
    const link = document.getElementById('edit-event-link').value;

    if (!title.trim()) {
        showNotification('请输入事件标题', 'error');
        return;
    }

    UpcomingEvents.update(eventId, {
        title,
        description,
        date,
        link
    });

    showNotification('事件更新成功', 'success');
    
    // 关闭编辑事件的模态框
    const editModal = document.querySelector('.modal[data-edit-event-modal="true"]');
    if (editModal) {
        editModal.remove();
    }
    
    renderEventsList();
    
    // 如果当前在看板页面，刷新事件列表
    if (Router.currentRoute === '/' && typeof renderUpcomingEvents === 'function') {
        renderUpcomingEvents();
    }
}

// 删除事件
function deleteEvent(eventId) {
    if (!confirm('确定要删除这个事件吗？')) return;

    UpcomingEvents.delete(eventId);
    showNotification('事件已删除', 'success');
    renderEventsList();
    
    // 如果当前在看板页面，刷新事件列表
    if (Router.currentRoute === '/' && typeof renderUpcomingEvents === 'function') {
        renderUpcomingEvents();
    }
}

