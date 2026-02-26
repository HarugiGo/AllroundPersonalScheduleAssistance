// 应用初始化

// 更新导航栏日期时间
function updateNavDateTime() {
    const datetimeEl = document.getElementById('nav-datetime');
    if (!datetimeEl) {
        // 如果元素不存在，延迟重试
        setTimeout(updateNavDateTime, 100);
        return;
    }

    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[now.getDay()];
        
        const datetimeText = `${year}-${month}-${day} 星期${weekday} ${hours}:${minutes}:${seconds}`;
        datetimeEl.textContent = datetimeText;
        datetimeEl.innerHTML = datetimeText;
    } catch (error) {
        console.error('更新日期时间失败:', error);
    }
}

// 初始化日期时间显示
function initDateTime() {
    // 延迟一点确保DOM完全加载
    setTimeout(() => {
        updateNavDateTime();
        // 每秒更新一次
        setInterval(updateNavDateTime, 1000);
    }, 100);
}

// 初始化应用
async function initApp() {
    // 如果使用文件系统存储，先加载数据
    const savedMode = storage.getStorageMode();
    if (savedMode === 'filesystem') {
        // 注意：需要用户重新选择文件夹才能加载
        // 这里暂时跳过，用户可以在设置中切换
    }
    
    // 检查并重置日常任务（每天0点刷新）
    checkAndResetDailyTasks();

    // 初始化路由
    Router.register('/', renderDashboard);
    Router.register('/tasks', renderTasks);
    Router.register('/reports', renderReports);
    
    Router.init();

    // 初始化统计显示
    Stats.updateUI();

    // 初始化日期时间显示
    initDateTime();

    // 初始化默认数据
    initDefaultData();
}

// 检查并重置日常任务
function checkAndResetDailyTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);

    const lastResetDate = storage.get('lastDailyReset', null);

    // 如果上次重置日期不是今天，则重置日常任务
    if (lastResetDate !== todayStr) {
        const resetCount = TaskTree.resetDailyTasks();
        if (resetCount > 0) {
            storage.set('lastDailyReset', todayStr);
        }
    }
}

// 初始化默认数据
function initDefaultData() {
    // 默认数据初始化（如果需要的话）
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 确保日期时间在页面加载后立即更新（备用方案）
window.addEventListener('load', () => {
    setTimeout(() => {
        updateNavDateTime();
        if (!window.datetimeInterval) {
            window.datetimeInterval = setInterval(updateNavDateTime, 1000);
        }
    }, 200);
});

