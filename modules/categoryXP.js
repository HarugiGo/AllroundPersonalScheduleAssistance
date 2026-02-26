// 类别时间统计模块（替代经验值模块）

const CategoryXP = {
    // 获取指定时间范围内的类别时间投入（小时）
    getCategoryTimeByTimeRange(category, timeRange = 'all') {
        const history = History.getAll();
        let filteredHistory = history;

        if (timeRange !== 'all') {
            filteredHistory = history.filter(record => {
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
        }

        return filteredHistory
            .filter(record => record.category === category)
            .reduce((total, record) => total + (record.timeSpent || 0), 0) / (1000 * 60 * 60);
    },

    // 获取所有类别在指定时间范围内的经验值（兼容旧代码，实际返回时间）
    getAllCategoryXPByTimeRange(timeRange = 'all') {
        const categories = Categories.getAll();
        const result = {};
        
        categories.forEach(category => {
            result[category] = this.getCategoryTimeByTimeRange(category, timeRange);
        });

        return result;
    }
};

