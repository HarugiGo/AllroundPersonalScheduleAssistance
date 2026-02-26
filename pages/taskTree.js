// 任务树管理页面

let currentView = 'list'; // 'list' 或 'relation'

function renderTaskTreePage() {
    const container = document.getElementById('taskTree-tab');
    if (!container) return;

    container.innerHTML = `
        <div class="task-tree-page">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">任务树管理</h2>
                    <div>
                        <button class="btn btn-secondary" onclick="toggleTaskTreeView()">切换视图</button>
                        <button class="btn btn-primary" onclick="showCreateTaskTreeModal()">创建任务树</button>
                    </div>
                </div>
                <div id="task-tree-list"></div>
            </div>
        </div>
    `;

    renderTaskTreeList();
}

// 渲染任务树列表
function renderTaskTreeList() {
    const container = document.getElementById('task-tree-list');
    if (!container) return;

    const trees = TaskTree.getAll();

    if (trees.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无任务树，点击"创建任务树"开始</div>';
        return;
    }

    if (currentView === 'list') {
        container.innerHTML = trees.map(tree => {
            const completedCount = tree.subtasks.filter(st => st.status === 'completed').length;
            const totalCount = tree.subtasks.length;
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return `
                <div class="task-tree-card" style="margin-bottom:1rem;">
                    <div class="task-tree-header">
                        <div style="flex:1;">
                            <div class="task-tree-title" style="display:flex; align-items:center; gap:0.5rem;">
                                ${tree.link ? `<a href="${tree.link}" target="_blank" style="text-decoration:none; color:inherit; font-weight:inherit;">${tree.title}</a>` : tree.title}
                                ${tree.link ? '<span style="font-size:0.9rem; color:var(--text-secondary);">🔗</span>' : ''}
                            </div>
                            ${tree.description ? `<div style="font-size:0.9rem; color: var(--text-secondary); margin-top:0.5rem;">${tree.description}</div>` : ''}
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-sm btn-primary" onclick="manageTaskTree('${tree.id}')">管理</button>
                            ${tree.status === 'completed' ? `
                                <button class="btn btn-sm btn-warning" onclick="reviewTaskTree('${tree.id}')">复盘</button>
                            ` : ''}
                            <button class="btn btn-sm btn-danger" onclick="deleteTaskTree('${tree.id}')">删除</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        // 关系视图
        renderTaskTreeRelationView(trees);
    }
}

// 渲染关系视图
function renderTaskTreeRelationView(trees) {
    const container = document.getElementById('task-tree-list');
    if (!container) return;

    container.innerHTML = trees.map(tree => {
        const availableSubtasks = TaskTree.getAvailableSubtasks(tree.id);
        
        // 按tag分组
        const groupedSubtasks = {};
        tree.subtasks.forEach(subtask => {
            const tag = subtask.tag || '未分类';
            if (!groupedSubtasks[tag]) {
                groupedSubtasks[tag] = [];
            }
            groupedSubtasks[tag].push(subtask);
        });

        // 生成HTML
        let subtasksHtml = '';
        const sortedTags = Object.keys(groupedSubtasks).sort((a, b) => {
            // 未分类放在最后
            if (a === '未分类') return 1;
            if (b === '未分类') return -1;
            return a.localeCompare(b);
        });

        sortedTags.forEach(tag => {
            // 在每个tag分组内按截止时间排序
            groupedSubtasks[tag].sort((a, b) => {
                // 没有截止时间的放在最后
                if (!a.deadline && !b.deadline) return 0;
                if (!a.deadline) return 1;
                if (!b.deadline) return -1;
                // 有截止时间的按时间升序排序（早的在前）
                return new Date(a.deadline) - new Date(b.deadline);
            });

            subtasksHtml += `
                <div style="margin-bottom:1.5rem;">
                    <div style="font-size:1rem; font-weight:bold; color:var(--primary-color); margin-bottom:0.75rem; padding-bottom:0.5rem; border-bottom:2px solid var(--border-color);">
                        任务类型: ${tag}
                    </div>
                    <div class="task-tree-view">
                        ${groupedSubtasks[tag].map(subtask => {
                            const isAvailable = availableSubtasks.some(st => st.id === subtask.id);
                            const isCompleted = subtask.status === 'completed';
                            const dependencies = tree.subtasks.filter(st => subtask.dependencies.includes(st.id));

                            return `
                                <div class="task-card" style="opacity: ${isAvailable ? '1' : '0.5'};">
                                    <div class="task-header">
                                        <div>
                                            <div class="task-title">${subtask.title}</div>
                                            <div class="task-meta">
                                                <span class="task-tag tag-${subtask.type}">${getTypeLabel(subtask.type)}</span>
                                            </div>
                                            ${dependencies.length > 0 ? `
                                                <div style="font-size:0.85rem; color: var(--text-secondary); margin-top:0.5rem;">
                                                    依赖: ${dependencies.map(d => d.title).join(', ')}
                                                </div>
                                            ` : ''}
                                            ${subtask.status === 'completed' ? '<div style="color: var(--success-color); margin-top:0.5rem;">✓ 已完成</div>' : ''}
                                        </div>
                                    </div>
                                    <div class="task-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="editSubtask('${tree.id}', '${subtask.id}')">编辑</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteSubtask('${tree.id}', '${subtask.id}')">删除</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        return `
            <div class="task-tree-card" style="margin-bottom:2rem;">
                <h3>${tree.title}</h3>
                ${subtasksHtml}
            </div>
        `;
    }).join('');
}

// 切换视图
function toggleTaskTreeView() {
    currentView = currentView === 'list' ? 'relation' : 'list';
    renderTaskTreeList();
}

// 管理任务树（合并查看和编辑功能）
function manageTaskTree(treeId) {
    const tree = TaskTree.getById(treeId);
    if (!tree) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.setAttribute('data-manage-task-tree-modal', 'true');
    modal.innerHTML = `
        <div class="modal-content" style="max-width:900px; display:flex; flex-direction:column; max-height:90vh;">
            <div class="modal-header" style="flex-shrink:0;">
                <h2>管理任务树</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <!-- 标签页固定在顶部 -->
            <div class="tabs" style="margin:0 1.5rem 0 1.5rem; padding-bottom:1.5rem; flex-shrink:0; border-bottom:1px solid var(--border-color); position:sticky; top:0; background:var(--card-bg); z-index:10;">
                <button class="tab active" onclick="switchTaskTreeTab('subtasks', '${treeId}')">子任务管理</button>
                <button class="tab" onclick="switchTaskTreeTab('basic', '${treeId}')">基本信息</button>
            </div>
            <div class="modal-body" style="overflow-y:auto; flex:1; padding-top:0;">

                <!-- 子任务管理标签页 -->
                <div id="task-tree-subtasks-tab-${treeId}" class="tab-content active">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <div style="padding:0.75rem; background:#f5f5f5; border-radius:4px; flex:1;">
                            <strong>进度统计:</strong> 
                            ${tree.subtasks.filter(st => st.status === 'completed').length}/${tree.subtasks.length} 
                            (${tree.subtasks.length > 0 ? Math.round((tree.subtasks.filter(st => st.status === 'completed').length / tree.subtasks.length) * 100) : 0}%)
                        </div>
                        <button class="btn btn-primary" onclick="addSubtaskToTree('${treeId}')" style="margin-left:1rem;">添加子任务</button>
                    </div>
                    <div id="manage-subtask-list-${treeId}"></div>
                </div>

                <!-- 基本信息标签页 -->
                <div id="task-tree-basic-tab-${treeId}" class="tab-content" style="display:none;">
                    <div class="form-group">
                        <label>标题:</label>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <input type="text" id="manage-tree-title-${treeId}" class="form-control" value="${tree.title}" style="flex:1;">
                            ${tree.link ? '<span style="font-size:0.9rem; color:var(--text-secondary); cursor:pointer;" onclick="window.open(\'' + tree.link + '\', \'_blank\')" title="点击打开链接">🔗</span>' : ''}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>链接 (可选):</label>
                        <input type="url" id="manage-tree-link-${treeId}" class="form-control" value="${tree.link || ''}" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label>描述:</label>
                        <textarea id="manage-tree-description-${treeId}" class="form-control" rows="4">${tree.description || ''}</textarea>
                    </div>
                    <div style="margin-bottom:1rem; padding:0.75rem; background:#f5f5f5; border-radius:4px;">
                        <div style="margin-bottom:0.5rem;"><strong>状态:</strong> ${tree.status === 'completed' ? '已完成' : '进行中'}</div>
                        <div style="margin-bottom:0.5rem;"><strong>创建时间:</strong> ${formatDate(tree.createdAt)}</div>
                        ${tree.completedAt ? `<div><strong>完成时间:</strong> ${formatDate(tree.completedAt)}</div>` : ''}
                    </div>
                    <button class="btn btn-primary" onclick="saveTaskTreeInfo('${treeId}')">保存</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 渲染子任务列表
    renderManageSubtaskList(treeId);
}

// 切换任务树管理标签页
function switchTaskTreeTab(tab, treeId) {
    // 更新标签样式
    const modal = document.querySelector(`[data-manage-task-tree-modal="true"]`);
    if (!modal) return;

    modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    modal.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });

    // 激活选中的标签
    const tabButtons = modal.querySelectorAll('.tab');
    const tabContents = modal.querySelectorAll('.tab-content');
    
    if (tab === 'subtasks') {
        // 子任务管理是第一个标签（索引0）
        tabButtons[0].classList.add('active');
        tabContents[0].classList.add('active');
        tabContents[0].style.display = 'block';
        // 刷新子任务列表
        renderManageSubtaskList(treeId);
    } else if (tab === 'basic') {
        // 基本信息是第二个标签（索引1）
        tabButtons[1].classList.add('active');
        tabContents[1].classList.add('active');
        tabContents[1].style.display = 'block';
    }
}

// 渲染管理界面的子任务列表
function renderManageSubtaskList(treeId) {
    const container = document.getElementById(`manage-subtask-list-${treeId}`);
    if (!container) return;

    const tree = TaskTree.getById(treeId);
    if (!tree) return;

    if (tree.subtasks.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无子任务</div>';
        return;
    }

    // 按tag分组
    const groupedSubtasks = {};
    tree.subtasks.forEach(subtask => {
        const tag = subtask.tag || '未分类';
        if (!groupedSubtasks[tag]) {
            groupedSubtasks[tag] = [];
        }
        groupedSubtasks[tag].push(subtask);
    });

    // 生成HTML
    let html = '';
    const sortedTags = Object.keys(groupedSubtasks).sort((a, b) => {
        // 未分类放在最后
        if (a === '未分类') return 1;
        if (b === '未分类') return -1;
        return a.localeCompare(b);
    });

    sortedTags.forEach(tag => {
        // 在每个tag分组内按截止时间排序
        groupedSubtasks[tag].sort((a, b) => {
            // 没有截止时间的放在最后
            if (!a.deadline && !b.deadline) return 0;
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            // 有截止时间的按时间升序排序（早的在前）
            return new Date(a.deadline) - new Date(b.deadline);
        });

        html += `
            <div style="margin-bottom:1.5rem;">
                <div style="font-size:1rem; font-weight:bold; color:var(--primary-color); margin-bottom:0.75rem; padding-bottom:0.5rem; border-bottom:2px solid var(--border-color);">
                    任务类型: ${tag}
                </div>
                ${groupedSubtasks[tag].map(subtask => {
                    return `
                        <div class="task-card" style="margin-bottom:0.5rem;">
                            <div class="task-header">
                                <div>
                                    <div class="task-title" style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                                        <span>${subtask.title}</span>
                                        <span class="task-tag tag-${subtask.type}">${getTypeLabel(subtask.type)}</span>
                                    </div>
                                    <div style="font-size:0.9rem; color: var(--text-secondary); margin-top:0.5rem;">
                                        状态: ${getStatusLabel(subtask.status)} | 
                                        ${subtask.deadline ? `截止: ${formatDate(subtask.deadline)}` : '无截止时间'}
                                        ${(subtask.type === 'normal' || subtask.type === 'daily') ? ` | 进度: ${subtask.progress || 0}%` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="task-actions">
                                <button class="btn btn-sm btn-secondary" onclick="editSubtask('${treeId}', '${subtask.id}')">编辑</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteSubtaskAndRefresh('${treeId}', '${subtask.id}')">删除</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    });

    container.innerHTML = html;
}

// 保存任务树基本信息
function saveTaskTreeInfo(treeId) {
    const modal = document.querySelector(`[data-manage-task-tree-modal="true"]`);
    if (!modal) return;

    const title = document.getElementById(`manage-tree-title-${treeId}`).value;
    const description = document.getElementById(`manage-tree-description-${treeId}`).value;
    const link = document.getElementById(`manage-tree-link-${treeId}`).value;

    if (!title.trim()) {
        showNotification('请输入任务树标题', 'error');
        return;
    }

    TaskTree.update(treeId, { title, description, link });
    showNotification('任务树更新成功', 'success');
    
    // 关闭模态框
    modal.remove();
    
    // 刷新任务树列表
    renderTaskTreeList();
}

// 删除子任务并刷新管理界面
function deleteSubtaskAndRefresh(treeId, subtaskId) {
    if (!confirm('确定要删除这个子任务吗？')) return;

    TaskTree.deleteSubtask(treeId, subtaskId);
    showNotification('子任务已删除', 'success');
    
    // 刷新管理界面的子任务列表
    renderManageSubtaskList(treeId);
    
    // 刷新主列表（如果管理界面打开着）
    renderTaskTreeList();
}

// 创建任务树
function showCreateTaskTreeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>创建任务树</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>标题:</label>
                    <input type="text" id="tree-title" class="form-control" placeholder="输入任务树标题">
                </div>
                <div class="form-group">
                    <label>链接 (可选):</label>
                    <input type="url" id="tree-link" class="form-control" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label>描述:</label>
                    <textarea id="tree-description" class="form-control" placeholder="输入任务树描述"></textarea>
                </div>
                <button class="btn btn-primary" onclick="createTaskTree()">创建</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function createTaskTree() {
    const title = document.getElementById('tree-title').value;
    const description = document.getElementById('tree-description').value;
    const link = document.getElementById('tree-link').value;

    if (!title.trim()) {
        showNotification('请输入任务树标题', 'error');
        return;
    }

    TaskTree.create({ title, description, link });
    showNotification('任务树创建成功', 'success');
    document.querySelector('.modal.show').remove();
    renderTaskTreeList();
}

// 编辑任务树（已合并到 manageTaskTree，保留此函数以防其他地方调用）
function editTaskTree(treeId) {
    manageTaskTree(treeId);
}

// 删除任务树
function deleteTaskTree(treeId) {
    if (!confirm('确定要删除这个任务树吗？')) return;

    TaskTree.delete(treeId);
    showNotification('任务树已删除', 'success');
    renderTaskTreeList();
}

// 添加子任务
function addSubtaskToTree(treeId) {
    const tree = TaskTree.getById(treeId);
    if (!tree) return;

    const subtasks = tree.subtasks;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.setAttribute('data-add-subtask-modal', 'true');
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px; display:flex; flex-direction:column; max-height:90vh;">
            <div class="modal-header" style="flex-shrink:0; position:sticky; top:0; background:var(--card-bg); z-index:10;">
                <h2>添加子任务</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y:auto; flex:1;">
                <div class="form-group">
                    <label>标题:</label>
                    <input type="text" id="subtask-title" class="form-control" placeholder="输入子任务标题">
                </div>
                <div class="form-group">
                    <label>描述:</label>
                    <textarea id="subtask-description" class="form-control" placeholder="输入子任务描述"></textarea>
                </div>
                <div class="form-group">
                    <label>类型:</label>
                    <select id="subtask-type" class="form-control" onchange="toggleSubtaskOptions()">
                        <option value="normal">普通任务</option>
                        <option value="daily">日常任务</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>截止时间:</label>
                    <input type="date" id="subtask-deadline" class="form-control">
                </div>
                <div class="form-group">
                    <label>链接 (可选):</label>
                    <input type="url" id="subtask-link" class="form-control" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label>任务类型 (可选):</label>
                    <input type="text" id="subtask-tag" class="form-control" placeholder="输入自定义任务类型标签，如：期中、期末、作业等">
                    <small style="color: var(--text-secondary);">相同标签的任务会分组显示</small>
                </div>
                <div class="form-group">
                    <label>预期时间 (可选):</label>
                    <select id="subtask-estimated-time" class="form-control">
                        <option value="">不设置</option>
                        ${Array.from({ length: 40 }, (_, i) => {
                            const hours = (i + 1) * 0.5;
                            const displayText = hours % 1 === 0 ? `${hours}小时` : `${hours}小时`;
                            return `<option value="${hours}">${displayText}</option>`;
                        }).join('')}
                    </select>
                    <small style="color: var(--text-secondary);">完成任务预期需要的时间</small>
                </div>
                <div id="subtask-repeat-options" style="display:none;">
                    <div class="form-group">
                        <label>重复类型:</label>
                        <select id="subtask-repeat-type" class="form-control">
                            <option value="daily">每日</option>
                            <option value="weekly">每周</option>
                        </select>
                    </div>
                    <div id="subtask-weekly-options" style="display:none;">
                        <label>重复周几:</label>
                        <div>
                            ${[0,1,2,3,4,5,6].map(day => `
                                <label style="display:inline-block; margin-right:1rem;">
                                    <input type="checkbox" value="${day}" class="repeat-day"> ${['日','一','二','三','四','五','六'][day]}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>依赖任务:</label>
                    <div id="subtask-dependencies" style="max-height:200px; overflow-y:auto; border:1px solid var(--border-color); border-radius:4px; padding:0.5rem;">
                        ${subtasks.length > 0 ? subtasks.map(st => `
                            <label style="display:block; padding:0.5rem; cursor:pointer; border-radius:4px; transition:background 0.2s;" 
                                   onmouseover="this.style.background='var(--hover-bg)'" 
                                   onmouseout="this.style.background='transparent'">
                                <input type="checkbox" value="${st.id}" class="dependency-checkbox" style="margin-right:0.5rem;">
                                ${st.title}
                            </label>
                        `).join('') : '<div style="padding:0.5rem; color:var(--text-secondary);">暂无其他子任务</div>'}
                    </div>
                </div>
                <button class="btn btn-primary" onclick="saveSubtask('${treeId}')">保存</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleSubtaskOptions() {
    const type = document.getElementById('subtask-type').value;
    const repeatOptions = document.getElementById('subtask-repeat-options');
    const weeklyOptions = document.getElementById('subtask-weekly-options');
    const repeatType = document.getElementById('subtask-repeat-type');

    if (type === 'daily') {
        repeatOptions.style.display = 'block';
        if (repeatType.value === 'weekly') {
            weeklyOptions.style.display = 'block';
        } else {
            weeklyOptions.style.display = 'none';
        }
    } else {
        repeatOptions.style.display = 'none';
    }

    // 监听重复类型变化
    if (repeatType) {
        repeatType.onchange = function() {
            if (this.value === 'weekly') {
                weeklyOptions.style.display = 'block';
            } else {
                weeklyOptions.style.display = 'none';
            }
        };
    }
}

function saveSubtask(treeId) {
    const title = document.getElementById('subtask-title').value;
    const description = document.getElementById('subtask-description').value;
    const type = document.getElementById('subtask-type').value;
    const deadlineInput = document.getElementById('subtask-deadline').value;
    const deadline = deadlineInput ? new Date(deadlineInput + 'T00:00:00').toISOString() : null;
    const link = document.getElementById('subtask-link').value;
    const tag = document.getElementById('subtask-tag').value.trim() || null;
    const estimatedTimeInput = document.getElementById('subtask-estimated-time').value;
    const estimatedTime = estimatedTimeInput ? parseFloat(estimatedTimeInput) : null;
    const dependencies = Array.from(document.querySelectorAll('#subtask-dependencies .dependency-checkbox:checked')).map(cb => cb.value);

    if (!title.trim()) {
        showNotification('请输入子任务标题', 'error');
        return;
    }

    let repeatType = null;
    let repeatDays = [];

    if (type === 'daily') {
        repeatType = document.getElementById('subtask-repeat-type').value;
        if (repeatType === 'weekly') {
            repeatDays = Array.from(document.querySelectorAll('.repeat-day:checked')).map(cb => parseInt(cb.value));
        }
    }

    TaskTree.addSubtask(treeId, {
        title,
        description,
        type,
        deadline: deadline,
        link,
        tag,
        estimatedTime,
        dependencies,
        repeatType,
        repeatDays
    });

    showNotification('子任务添加成功', 'success');
    
    // 关闭添加子任务的模态框
    const addModal = document.querySelector('.modal[data-add-subtask-modal="true"]');
    if (addModal) {
        addModal.remove();
    }
    
    // 如果管理界面打开着，刷新子任务列表
    const manageModal = document.querySelector(`[data-manage-task-tree-modal="true"]`);
    if (manageModal) {
        renderManageSubtaskList(treeId);
    }
    
    // 刷新主列表
    renderTaskTreeList();
}

// 编辑子任务
function editSubtask(treeId, subtaskId) {
    const tree = TaskTree.getById(treeId);
    if (!tree) return;

    const subtask = tree.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;

    const otherSubtasks = tree.subtasks.filter(st => st.id !== subtaskId);

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.setAttribute('data-edit-subtask-modal', 'true');
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px; display:flex; flex-direction:column; max-height:90vh;">
            <div class="modal-header" style="flex-shrink:0; position:sticky; top:0; background:var(--card-bg); z-index:10;">
                <h2>编辑子任务</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y:auto; flex:1;">
                <div class="form-group">
                    <label>标题:</label>
                    <input type="text" id="edit-subtask-title" class="form-control" value="${subtask.title}">
                </div>
                <div class="form-group">
                    <label>描述:</label>
                    <textarea id="edit-subtask-description" class="form-control">${subtask.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>类型:</label>
                    <select id="edit-subtask-type" class="form-control" onchange="toggleEditSubtaskOptions()">
                        <option value="normal" ${subtask.type === 'normal' ? 'selected' : ''}>普通任务</option>
                        <option value="daily" ${subtask.type === 'daily' ? 'selected' : ''}>日常任务</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>截止时间:</label>
                    <input type="date" id="edit-subtask-deadline" class="form-control" value="${subtask.deadline ? new Date(subtask.deadline).toISOString().slice(0, 10) : ''}">
                </div>
                <div class="form-group">
                    <label>链接:</label>
                    <input type="url" id="edit-subtask-link" class="form-control" value="${subtask.link || ''}">
                </div>
                <div class="form-group">
                    <label>任务类型 (可选):</label>
                    <input type="text" id="edit-subtask-tag" class="form-control" value="${subtask.tag || ''}" placeholder="输入自定义任务类型标签，如：期中、期末、作业等">
                    <small style="color: var(--text-secondary);">相同标签的任务会分组显示</small>
                </div>
                <div class="form-group">
                    <label>预期时间 (可选):</label>
                    <select id="edit-subtask-estimated-time" class="form-control">
                        <option value="">不设置</option>
                        ${Array.from({ length: 40 }, (_, i) => {
                            const hours = (i + 1) * 0.5;
                            const displayText = hours % 1 === 0 ? `${hours}小时` : `${hours}小时`;
                            const selected = subtask.estimatedTime === hours ? 'selected' : '';
                            return `<option value="${hours}" ${selected}>${displayText}</option>`;
                        }).join('')}
                    </select>
                    <small style="color: var(--text-secondary);">完成任务预期需要的时间</small>
                </div>
                <div id="edit-subtask-repeat-options" style="display:${subtask.type === 'daily' ? 'block' : 'none'};">
                    <div class="form-group">
                        <label>重复类型:</label>
                        <select id="edit-subtask-repeat-type" class="form-control">
                            <option value="daily" ${subtask.repeatType === 'daily' ? 'selected' : ''}>每日</option>
                            <option value="weekly" ${subtask.repeatType === 'weekly' ? 'selected' : ''}>每周</option>
                        </select>
                    </div>
                    <div id="edit-subtask-weekly-options" style="display:${subtask.repeatType === 'weekly' ? 'block' : 'none'};">
                        <label>重复周几:</label>
                        <div>
                            ${[0,1,2,3,4,5,6].map(day => `
                                <label style="display:inline-block; margin-right:1rem;">
                                    <input type="checkbox" value="${day}" class="edit-repeat-day" ${subtask.repeatDays && subtask.repeatDays.includes(day) ? 'checked' : ''}> ${['日','一','二','三','四','五','六'][day]}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                ${(subtask.type === 'normal' || subtask.type === 'daily') ? `
                    <div class="form-group">
                        <label>进度 (%):</label>
                        <input type="number" id="edit-subtask-progress" class="form-control" min="0" max="100" value="${subtask.progress || 0}">
                    </div>
                ` : ''}
                <div class="form-group">
                    <label>依赖任务:</label>
                    <div id="edit-subtask-dependencies-container" style="max-height:200px; overflow-y:auto; border:1px solid var(--border-color); border-radius:4px; padding:0.5rem;">
                        ${otherSubtasks.length > 0 ? otherSubtasks.map(st => `
                            <label style="display:block; padding:0.5rem; cursor:pointer; border-radius:4px; transition:background 0.2s;" 
                                   onmouseover="this.style.background='var(--hover-bg)'" 
                                   onmouseout="this.style.background='transparent'">
                                <input type="checkbox" value="${st.id}" class="dependency-checkbox" ${subtask.dependencies.includes(st.id) ? 'checked' : ''} style="margin-right:0.5rem;">
                                ${st.title}
                            </label>
                        `).join('') : '<div style="padding:0.5rem; color:var(--text-secondary);">暂无其他子任务</div>'}
                    </div>
                </div>
                <button class="btn btn-primary" onclick="updateSubtask('${treeId}', '${subtaskId}')">保存</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 初始化重复选项的显示
    const repeatTypeSelect = document.getElementById('edit-subtask-repeat-type');
    if (repeatTypeSelect) {
        repeatTypeSelect.onchange = function() {
            const weeklyOptions = document.getElementById('edit-subtask-weekly-options');
            if (weeklyOptions) {
                weeklyOptions.style.display = this.value === 'weekly' ? 'block' : 'none';
            }
        };
    }
}

// 切换编辑子任务的选项显示
function toggleEditSubtaskOptions() {
    const type = document.getElementById('edit-subtask-type').value;
    const repeatOptions = document.getElementById('edit-subtask-repeat-options');
    const weeklyOptions = document.getElementById('edit-subtask-weekly-options');
    const repeatType = document.getElementById('edit-subtask-repeat-type');

    if (type === 'daily') {
        if (repeatOptions) repeatOptions.style.display = 'block';
        if (weeklyOptions && repeatType) {
            weeklyOptions.style.display = repeatType.value === 'weekly' ? 'block' : 'none';
        }
    } else {
        if (repeatOptions) repeatOptions.style.display = 'none';
    }
}

function updateSubtask(treeId, subtaskId) {
    const title = document.getElementById('edit-subtask-title').value;
    const description = document.getElementById('edit-subtask-description').value;
    const type = document.getElementById('edit-subtask-type').value;
    const deadlineInput = document.getElementById('edit-subtask-deadline').value;
    const deadline = deadlineInput ? new Date(deadlineInput + 'T00:00:00').toISOString() : null;
    const link = document.getElementById('edit-subtask-link').value;
    const tag = document.getElementById('edit-subtask-tag').value.trim() || null;
    const estimatedTimeInput = document.getElementById('edit-subtask-estimated-time').value;
    const estimatedTime = estimatedTimeInput ? parseFloat(estimatedTimeInput) : null;
    const dependencies = Array.from(document.querySelectorAll('#edit-subtask-dependencies-container .dependency-checkbox:checked')).map(cb => cb.value);

    // 处理重复选项（仅日常任务）
    let repeatType = null;
    let repeatDays = [];
    if (type === 'daily') {
        const repeatTypeSelect = document.getElementById('edit-subtask-repeat-type');
        if (repeatTypeSelect) {
            repeatType = repeatTypeSelect.value;
            if (repeatType === 'weekly') {
                repeatDays = Array.from(document.querySelectorAll('.edit-repeat-day:checked')).map(cb => parseInt(cb.value));
            }
        }
    }

    const updates = {
        title,
        description,
        type,
        deadline: deadline,
        link,
        tag,
        estimatedTime,
        repeatType,
        repeatDays,
        dependencies
    };

    const subtask = TaskTree.getById(treeId).subtasks.find(st => st.id === subtaskId);
    
    // 处理进度（普通任务和日常任务都支持）
    if (type === 'normal' || type === 'daily') {
        const progress = parseInt(document.getElementById('edit-subtask-progress').value) || 0;
        updates.progress = progress;
        
        // 如果类型从其他类型改为normal或daily，需要初始化progress
        if (subtask.type !== 'normal' && subtask.type !== 'daily') {
            updates.progress = progress;
        }
        
        if (progress >= 100 && subtask.status !== 'completed') {
            updates.status = 'completed';
        } else if (progress < 100 && subtask.status === 'completed') {
            updates.status = 'in-progress';
        }
    } else {
        // 如果类型改为非normal/daily，清除progress
        updates.progress = 0;
    }

    TaskTree.updateSubtask(treeId, subtaskId, updates);
    showNotification('子任务更新成功', 'success');
    
    // 关闭编辑子任务的模态框
    const editModal = document.querySelector('.modal[data-edit-subtask-modal="true"]');
    if (editModal) {
        editModal.remove();
    }
    
    // 如果管理界面打开着，刷新子任务列表
    const manageModal = document.querySelector(`[data-manage-task-tree-modal="true"]`);
    if (manageModal) {
        renderManageSubtaskList(treeId);
    }
    
    // 刷新主列表
    renderTaskTreeList();
    
    // 如果当前在看板页面，刷新看板（确保已完成任务列表同步更新）
    if (Router.currentRoute === '/' && typeof renderDashboard === 'function') {
        // 只刷新已完成任务部分，避免整个页面重新渲染
        if (typeof renderCompletedTasks === 'function') {
            renderCompletedTasks();
        }
        // 刷新待办任务部分
        if (typeof renderPendingTasks === 'function') {
            renderPendingTasks();
        }
    }
}

// 删除子任务
function deleteSubtask(treeId, subtaskId) {
    if (!confirm('确定要删除这个子任务吗？')) return;

    TaskTree.deleteSubtask(treeId, subtaskId);
    showNotification('子任务已删除', 'success');
    
    // 如果管理界面打开着，刷新子任务列表
    const manageModal = document.querySelector(`[data-manage-task-tree-modal="true"]`);
    if (manageModal) {
        renderManageSubtaskList(treeId);
    }
    
    // 刷新主列表
    renderTaskTreeList();
}

// 任务树复盘
function reviewTaskTree(treeId) {
    const tree = TaskTree.getById(treeId);
    if (!tree || tree.status !== 'completed') return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>任务树复盘 - ${tree.title}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>评分 (1-5):</label>
                    <input type="number" id="tree-rating" class="form-control" min="1" max="5" value="${tree.rating || 3}">
                </div>
                <div class="form-group">
                    <label>复盘内容:</label>
                    <textarea id="tree-review" class="form-control" rows="10" placeholder="记录完成这个任务树的感受、收获、不足等...">${tree.review || ''}</textarea>
                </div>
                <button class="btn btn-primary" onclick="saveTaskTreeReview('${treeId}')">保存复盘</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveTaskTreeReview(treeId) {
    const rating = parseInt(document.getElementById('tree-rating').value);
    const review = document.getElementById('tree-review').value;

    TaskTree.update(treeId, { rating, review });
    showNotification('复盘保存成功', 'success');
    document.querySelector('.modal.show').remove();
    renderTaskTreeList();
}

// 工具函数
function getTypeLabel(type) {
    const labels = {
        daily: '日常任务',
        normal: '普通任务'
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

