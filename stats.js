// 用户统计模块（简化版）

const Stats = {
    // 获取用户统计
    getStats() {
        return storage.get('userStats', {});
    },

    // 更新用户统计
    updateStats(updates) {
        const stats = this.getStats();
        Object.assign(stats, updates);
        storage.set('userStats', stats);
        return stats;
    },

    // 重置统计
    reset() {
        storage.set('userStats', {});
    }
};
