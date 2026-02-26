// 中期目标模块

const MidTermGoals = {
    // 获取所有中期目标
    getAll() {
        return storage.get('midTermGoals', []);
    },

    // 根据ID获取目标
    getById(id) {
        const goals = this.getAll();
        return goals.find(g => g.id === id);
    },

    // 创建中期目标
    create(data) {
        const goals = this.getAll();
        const goal = {
            id: generateId(),
            title: data.title || '未命名目标',
            deadline: data.deadline || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        goals.push(goal);
        storage.set('midTermGoals', goals);
        return goal;
    },

    // 更新中期目标
    update(id, updates) {
        const goals = this.getAll();
        const index = goals.findIndex(g => g.id === id);
        if (index > -1) {
            goals[index] = {
                ...goals[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            storage.set('midTermGoals', goals);
            return goals[index];
        }
        return null;
    },

    // 删除中期目标
    delete(id) {
        const goals = this.getAll();
        const filtered = goals.filter(g => g.id !== id);
        storage.set('midTermGoals', filtered);
        return filtered;
    }
};




