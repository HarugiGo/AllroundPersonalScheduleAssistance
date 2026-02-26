// 工具函数

// 格式化日期
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化日期（仅月日）
function formatDateMonthDay(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day}`;
}

// 格式化日期时间
function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 格式化时间（毫秒转时分秒）
function formatTime(ms) {
    if (!ms) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 格式化时间（分钟转时分）
function formatMinutes(minutes) {
    if (!minutes) return '0分钟';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
}

// 生成15分钟一档的时间选项（HH:MM格式）
function generateTimeOptions() {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            options.push(timeStr);
        }
    }
    return options;
}

// 格式化时间显示（HH:MM格式）
function formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    return timeStr;
}

// 计算剩余天数
function getDaysUntil(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = target - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 判断日期是否为今天
function isToday(date) {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    return today.getFullYear() === d.getFullYear() &&
           today.getMonth() === d.getMonth() &&
           today.getDate() === d.getDate();
}

// 判断日期是否为本周
function isThisWeek(date) {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return d >= weekStart && d <= weekEnd;
}

// 判断日期是否为本月
function isThisMonth(date) {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    return today.getFullYear() === d.getFullYear() &&
           today.getMonth() === d.getMonth();
}

// 判断日期是否为本年
function isThisYear(date) {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    return today.getFullYear() === d.getFullYear();
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 文件系统存储配置
let fileSystemHandle = null;
let dataDirectoryHandle = null;

// 请求文件夹访问权限
async function requestDataDirectory() {
    try {
        // 检查浏览器是否支持 File System Access API
        if (!('showDirectoryPicker' in window)) {
            console.warn('File System Access API 不支持，将使用 LocalStorage');
            return false;
        }

        // 请求用户选择文件夹
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        
        dataDirectoryHandle = handle;
        
        // 保存权限到 LocalStorage（用于下次自动访问）
        try {
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                // 保存文件夹名称（不能直接保存 handle，但可以保存名称用于提示）
                localStorage.setItem('dataDirectoryName', handle.name);
            }
        } catch (e) {
            console.warn('无法保存文件夹权限:', e);
        }
        
        return true;
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('请求文件夹访问失败:', e);
        }
        return false;
    }
}

// 从文件读取数据
async function readDataFromFile(key) {
    if (!dataDirectoryHandle) return null;
    
    try {
        const fileHandle = await dataDirectoryHandle.getFileHandle(`${key}.json`, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (e) {
        if (e.name === 'NotFoundError') {
            return null;
        }
        console.error(`读取文件 ${key}.json 失败:`, e);
        return null;
    }
}

// 写入数据到文件
async function writeDataToFile(key, value) {
    if (!dataDirectoryHandle) return false;
    
    try {
        const fileHandle = await dataDirectoryHandle.getFileHandle(`${key}.json`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(value, null, 2));
        await writable.close();
        return true;
    } catch (e) {
        console.error(`写入文件 ${key}.json 失败:`, e);
        return false;
    }
}

// 删除文件
async function removeDataFile(key) {
    if (!dataDirectoryHandle) return false;
    
    try {
        await dataDirectoryHandle.removeEntry(`${key}.json`);
        return true;
    } catch (e) {
        if (e.name === 'NotFoundError') {
            return true; // 文件不存在，视为删除成功
        }
        console.error(`删除文件 ${key}.json 失败:`, e);
        return false;
    }
}

// 存储操作（支持文件系统和 LocalStorage 双重存储）
const storage = {
    useFileSystem: false, // 是否使用文件系统
    
    // 初始化：尝试恢复之前的文件夹权限
    async init() {
        // 检查是否已有保存的文件夹名称
        const savedDirName = localStorage.getItem('dataDirectoryName');
        if (savedDirName && 'showDirectoryPicker' in window) {
            // 提示用户是否继续使用之前的文件夹
            // 这里暂时不自动恢复，需要用户重新选择
        }
    },
    
    // 切换到文件系统存储
    async switchToFileSystem() {
        const success = await requestDataDirectory();
        if (success) {
            this.useFileSystem = true;
            localStorage.setItem('storageMode', 'filesystem');
            showNotification('已切换到文件系统存储', 'success');
            
            // 迁移现有数据到文件系统
            await this.migrateToFileSystem();
            return true;
        }
        return false;
    },
    
    // 切换到 LocalStorage
    switchToLocalStorage() {
        this.useFileSystem = false;
        localStorage.setItem('storageMode', 'localStorage');
        showNotification('已切换到 LocalStorage 存储', 'success');
    },
    
    // 迁移数据到文件系统
    async migrateToFileSystem() {
        if (!this.useFileSystem) return;
        
        const keys = ['taskTrees', 'schedules', 'events', 'history', 'userStats', 'midTermGoals', 'lastDailyReset', 'categories'];
        let migrated = 0;
        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    const data = JSON.parse(value);
                    await writeDataToFile(key, data);
                    migrated++;
                } catch (e) {
                    console.error(`迁移 ${key} 失败:`, e);
                }
            }
        }
        if (migrated > 0) {
            showNotification(`已迁移 ${migrated} 个数据文件到文件夹`, 'success');
        }
    },
    
    // 从文件系统加载所有数据到 LocalStorage
    async loadFromFileSystem() {
        if (!this.useFileSystem || !dataDirectoryHandle) return;
        
        const keys = ['taskTrees', 'schedules', 'events', 'history', 'userStats', 'midTermGoals', 'lastDailyReset', 'categories'];
        let loaded = 0;
        for (const key of keys) {
            try {
                const data = await readDataFromFile(key);
                if (data !== null) {
                    localStorage.setItem(key, JSON.stringify(data));
                    loaded++;
                }
            } catch (e) {
                console.error(`从文件系统加载 ${key} 失败:`, e);
            }
        }
        if (loaded > 0) {
            console.log(`从文件系统加载了 ${loaded} 个数据文件`);
        }
    },
    
    get(key, defaultValue = null) {
        // 如果使用文件系统，从文件读取（异步操作需要特殊处理）
        if (this.useFileSystem && dataDirectoryHandle) {
            // 文件系统是异步的，但为了兼容现有同步代码，先尝试从 LocalStorage 读取
            // 实际应该改为异步，但需要大量重构
            // 暂时使用混合模式：文件系统 + LocalStorage 缓存
            const cached = localStorage.getItem(`fs_cache_${key}`);
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    // 忽略缓存解析错误
                }
            }
        }
        
        // 从 LocalStorage 读取
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },
    
    set(key, value) {
        // 同时保存到 LocalStorage（作为缓存和备份）
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('LocalStorage set error:', e);
        }
        
        // 如果使用文件系统，异步保存到文件（不阻塞）
        if (this.useFileSystem && dataDirectoryHandle) {
            writeDataToFile(key, value).catch(e => {
                console.error('File system set error:', e);
            });
        }
        
        return true;
    },
    
    remove(key) {
        // 从 LocalStorage 删除
        try {
            localStorage.removeItem(key);
            localStorage.removeItem(`fs_cache_${key}`);
        } catch (e) {
            console.error('LocalStorage remove error:', e);
        }
        
        // 如果使用文件系统，异步删除文件（不阻塞）
        if (this.useFileSystem && dataDirectoryHandle) {
            removeDataFile(key).catch(e => {
                console.error('File system remove error:', e);
            });
        }
        
        return true;
    },
    
    // 获取当前存储模式
    getStorageMode() {
        const mode = localStorage.getItem('storageMode');
        return mode || 'localStorage';
    }
};

// 初始化存储模式
(async function() {
    await storage.init();
    const savedMode = storage.getStorageMode();
    if (savedMode === 'filesystem') {
        // 如果之前使用文件系统，尝试恢复
        // 注意：File System Access API 需要用户重新授权
        // 这里暂时不自动恢复，需要用户手动切换
        storage.useFileSystem = false; // 重置，等待用户重新选择
    }
})();

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 深拷贝
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 简单的通知实现，可以后续增强
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : '#1890ff'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideInRight 0.3s;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 添加CSS动画
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

