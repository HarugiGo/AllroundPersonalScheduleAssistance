// 历史记录系统模块

const History = {
    maxRecords: 1000,

    // 获取所有历史记录
    getAll() {
        return storage.get('history', []);
    },

    // 添加历史记录
    add(record) {
        const history = this.getAll();
        const newRecord = {
            id: generateId(),
            ...record
        };
        history.unshift(newRecord);

        // 限制记录数量
        if (history.length > this.maxRecords) {
            history.splice(this.maxRecords);
        }

        storage.set('history', history);
        return newRecord;
    },

    // 根据日期筛选
    getByDate(date) {
        const history = this.getAll();
        const targetDate = formatDate(date);
        return history.filter(record => {
            const recordDate = formatDate(record.completedAt);
            return recordDate === targetDate;
        });
    },

    // 根据任务类型筛选
    getByTaskType(taskType) {
        const history = this.getAll();
        return history.filter(record => record.taskType === taskType);
    },


    // 获取时间范围内的记录
    getByTimeRange(timeRange = 'all') {
        const history = this.getAll();
        if (timeRange === 'all') return history;

        const now = new Date();
        return history.filter(record => {
            const recordDate = new Date(record.completedAt);
            switch (timeRange) {
                case 'week':
                    return isThisWeek(recordDate);
                case 'month':
                    return isThisMonth(recordDate);
                case 'year':
                    return isThisYear(recordDate);
                default:
                    return true;
            }
        });
    },

    // 获取今日完成数
    getTodayCount() {
        const today = new Date();
        return this.getByDate(today).length;
    },

    // 清空历史记录
    clear() {
        storage.set('history', []);
    }
};

