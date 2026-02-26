// 系统设置页面

function renderSettingsPage() {
    const container = document.getElementById('settings-tab');
    if (!container) return;

    container.innerHTML = `
        <div class="settings-page">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">数据管理</h2>
                </div>
                <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="exportData()">导出数据 (JSON)</button>
                    <button class="btn btn-secondary" onclick="importData()">导入数据 (JSON)</button>
                    <button class="btn btn-warning" onclick="migrateOldData()">迁移旧数据</button>
                    <button class="btn btn-danger" onclick="clearAllData()">清空所有数据</button>
                </div>
            </div>

        </div>
    `;
}

// 导出数据
function exportData() {
    const data = {
        taskTrees: TaskTree.getAll(),
        schedules: Schedule.getAll(),
        events: UpcomingEvents.getAll(),
        history: History.getAll(),
        stats: Stats.getStats(),
        exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apsa-backup-${formatDate(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showNotification('数据导出成功', 'success');
}

// 导入数据
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!confirm('导入数据将覆盖现有数据，确定要继续吗？')) return;

                if (data.taskTrees) storage.set('taskTrees', data.taskTrees);
                if (data.schedules) storage.set('schedules', data.schedules);
                if (data.events) storage.set('events', data.events);
                if (data.history) storage.set('history', data.history);
                if (data.stats) storage.set('userStats', data.stats);

                Stats.updateUI();
                showNotification('数据导入成功', 'success');
                
                // 刷新当前页面
                if (window.location.hash.includes('reports')) {
                    renderReports();
                }
            } catch (error) {
                showNotification('数据格式错误，导入失败', 'error');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 清空所有数据
function clearAllData() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;
    if (!confirm('再次确认：真的要清空所有数据吗？')) return;

    storage.remove('taskTrees');
    storage.remove('schedules');
    storage.remove('events');
    storage.remove('history');
    storage.remove('userStats');

    Stats.reset();
    showNotification('所有数据已清空', 'success');
    
    // 刷新页面
    if (window.location.hash.includes('reports')) {
        renderReports();
    }
}

// 迁移旧数据
function migrateOldData() {
    // 检查是否有旧数据格式
    const oldTasks = storage.get('tasks', []);
    const oldDailyTasks = storage.get('dailyTasks', []);
    const oldMainTasks = storage.get('mainTasks', []);
    const oldSideTasks = storage.get('sideTasks', []);

    if (oldTasks.length === 0 && oldDailyTasks.length === 0 && 
        oldMainTasks.length === 0 && oldSideTasks.length === 0) {
        showNotification('未找到可迁移的旧数据', 'info');
        return;
    }

    if (!confirm('检测到旧数据，是否要迁移到任务树系统？')) return;

    let migratedCount = 0;

    // 迁移日常任务
    if (oldDailyTasks.length > 0) {
        const dailyTree = TaskTree.create({
            title: '迁移的日常任务',
            description: '从旧系统迁移的日常任务'
        });

        oldDailyTasks.forEach(task => {
            TaskTree.addSubtask(dailyTree.id, {
                title: task.title || '未命名任务',
                description: task.description || '',
                type: 'daily',
                link: task.link || '',
                repeatType: task.repeatType || 'daily',
                repeatDays: task.repeatDays || []
            });
        });

        migratedCount += oldDailyTasks.length;
    }

    // 迁移主线任务
    if (oldMainTasks.length > 0) {
        const mainTree = TaskTree.create({
            title: '迁移的主线任务',
            description: '从旧系统迁移的主线任务'
        });

        oldMainTasks.forEach(task => {
            TaskTree.addSubtask(mainTree.id, {
                title: task.title || '未命名任务',
                description: task.description || '',
                type: 'normal',
                link: task.link || '',
                deadline: task.deadline || null,
                progress: task.progress || 0
            });
        });

        migratedCount += oldMainTasks.length;
    }

    // 迁移支线任务
    if (oldSideTasks.length > 0) {
        const sideTree = TaskTree.create({
            title: '迁移的支线任务',
            description: '从旧系统迁移的支线任务'
        });

        oldSideTasks.forEach(task => {
            TaskTree.addSubtask(sideTree.id, {
                title: task.title || '未命名任务',
                description: task.description || '',
                type: 'normal',
                link: task.link || '',
                deadline: task.deadline || null,
                progress: task.progress || 0
            });
        });

        migratedCount += oldSideTasks.length;
    }

    // 迁移普通任务
    if (oldTasks.length > 0) {
        const tasksTree = TaskTree.create({
            title: '迁移的任务',
            description: '从旧系统迁移的任务'
        });

        oldTasks.forEach(task => {
            TaskTree.addSubtask(tasksTree.id, {
                title: task.title || '未命名任务',
                description: task.description || '',
                type: task.type || 'normal',
                link: task.link || '',
                deadline: task.deadline || null,
                progress: task.progress || 0
            });
        });

        migratedCount += oldTasks.length;
    }

    showNotification(`成功迁移 ${migratedCount} 个任务到任务树系统`, 'success');
    
    // 可选：删除旧数据
    if (confirm('迁移完成！是否删除旧数据？')) {
        storage.remove('tasks');
        storage.remove('dailyTasks');
        storage.remove('mainTasks');
        storage.remove('sideTasks');
        showNotification('旧数据已删除', 'success');
    }
}

