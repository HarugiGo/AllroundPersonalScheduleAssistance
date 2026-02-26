// 任务树核心逻辑模块
//
// 本模块提供了任务树（TaskTree）和子任务（Subtask）的完整管理功能。
// 主要功能包括：任务树的创建、更新、删除和查询；子任务的增删改查、完成状态管理、
// 依赖关系处理；支持普通任务和日常任务两种类型；日常任务支持每日自动重置和重复规则
// （每日/每周指定日期）；任务类型标签分类和预计时间管理；自动检查任务树完成状态。
// 模块还提供了获取可执行子任务（依赖已满足）、获取所有待办子任务等查询方法，以及
// 判断日常任务是否应在指定日期显示的逻辑。所有数据通过统一的存储接口进行持久化，
// 确保任务数据的可靠保存和恢复。该模块是任务管理系统的核心数据层，为上层界面提供
// 了完整的任务管理能力。

const TaskTree = {
    // 获取所有任务树
    getAll() {
        return storage.get('taskTrees', []);
    },

    // 根据ID获取任务树
    getById(id) {
        const trees = this.getAll();
        return trees.find(tree => tree.id === id);
    },

    // 创建任务树
    create(data) {
        const trees = this.getAll();
        const tree = {
            id: generateId(),
            title: data.title || '未命名任务树',
            description: data.description || '',
            link: data.link || '',
            status: 'in-progress',
            createdAt: new Date().toISOString(),
            completedAt: null,
            review: null,
            rating: null,
            subtasks: []
        };
        trees.push(tree);
        storage.set('taskTrees', trees);
        return tree;
    },

    // 更新任务树
    update(id, updates) {
        const trees = this.getAll();
        const index = trees.findIndex(tree => tree.id === id);
        if (index > -1) {
            trees[index] = { ...trees[index], ...updates };
            storage.set('taskTrees', trees);
            return trees[index];
        }
        return null;
    },

    // 删除任务树
    delete(id) {
        const trees = this.getAll();
        const filtered = trees.filter(tree => tree.id !== id);
        storage.set('taskTrees', filtered);
        return filtered;
    },

    // 添加子任务
    addSubtask(treeId, subtaskData) {
        const tree = this.getById(treeId);
        if (!tree) return null;

        const subtask = {
            id: generateId(),
            title: subtaskData.title || '未命名子任务',
            description: subtaskData.description || '',
            type: subtaskData.type || 'normal',
            status: 'pending',
            deadline: subtaskData.deadline || null,
            link: subtaskData.link || '',
            progress: (subtaskData.type === 'normal' || subtaskData.type === 'daily') ? (subtaskData.progress || 0) : 0,
            dependencies: subtaskData.dependencies || [],
            tag: subtaskData.tag || null,
            estimatedTime: subtaskData.estimatedTime || null,
            order: tree.subtasks.length,
            repeatType: subtaskData.repeatType || null,
            repeatDays: subtaskData.repeatDays || [],
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        tree.subtasks.push(subtask);
        this.update(treeId, { subtasks: tree.subtasks });
        return subtask;
    },

    // 更新子任务
    updateSubtask(treeId, subtaskId, updates) {
        const tree = this.getById(treeId);
        if (!tree) return null;

        const subtaskIndex = tree.subtasks.findIndex(st => st.id === subtaskId);
        if (subtaskIndex > -1) {
            tree.subtasks[subtaskIndex] = { ...tree.subtasks[subtaskIndex], ...updates };
            this.update(treeId, { subtasks: tree.subtasks });
            return tree.subtasks[subtaskIndex];
        }
        return null;
    },

    // 删除子任务
    deleteSubtask(treeId, subtaskId) {
        const tree = this.getById(treeId);
        if (!tree) return null;

        // 删除依赖关系
        tree.subtasks.forEach(subtask => {
            const depIndex = subtask.dependencies.indexOf(subtaskId);
            if (depIndex > -1) {
                subtask.dependencies.splice(depIndex, 1);
            }
        });

        tree.subtasks = tree.subtasks.filter(st => st.id !== subtaskId);
        this.update(treeId, { subtasks: tree.subtasks });
        return tree;
    },

    // 完成子任务
    completeSubtask(treeId, subtaskId, timeSpent) {
        const subtask = this.updateSubtask(treeId, subtaskId, {
            status: 'completed',
            completedAt: new Date().toISOString()
        });

        if (subtask) {
            // 检查任务树是否完成
            const tree = this.getById(treeId);
            const allCompleted = tree.subtasks.every(st => st.status === 'completed');
            if (allCompleted && tree.status === 'in-progress') {
                this.update(treeId, { status: 'completed', completedAt: new Date().toISOString() });
            }
        }

        return subtask;
    },

    // 获取可执行的子任务（依赖已满足）
    getAvailableSubtasks(treeId = null) {
        const trees = treeId ? [this.getById(treeId)] : this.getAll();
        const available = [];

        trees.forEach(tree => {
            if (!tree || tree.status !== 'in-progress') return;

            tree.subtasks.forEach(subtask => {
                if (subtask.status === 'completed') return;

                // 检查依赖
                const dependenciesMet = subtask.dependencies.every(depId => {
                    const dep = tree.subtasks.find(st => st.id === depId);
                    return dep && dep.status === 'completed';
                });

                if (dependenciesMet) {
                    available.push({
                        ...subtask,
                        treeId: tree.id,
                        treeTitle: tree.title
                    });
                }
            });
        });

        return available;
    },

    // 获取所有未完成的子任务
    getAllPendingSubtasks() {
        const trees = this.getAll();
        const pending = [];

        trees.forEach(tree => {
            if (tree.status !== 'in-progress') return;
            tree.subtasks.forEach(subtask => {
                if (subtask.status !== 'completed') {
                    pending.push({
                        ...subtask,
                        treeId: tree.id,
                        treeTitle: tree.title
                    });
                }
            });
        });

        return pending;
    },

    // 检查日常任务是否应该显示
    shouldShowDailySubtask(subtask, date = new Date()) {
        if (subtask.type !== 'daily') return false;
        
        // 检查截止日期：如果设置了截止日期且已过期，不显示
        if (subtask.deadline) {
            const deadlineDate = new Date(subtask.deadline);
            deadlineDate.setHours(0, 0, 0, 0);
            const today = new Date(date);
            today.setHours(0, 0, 0, 0);
            if (deadlineDate < today) {
                return false; // 已过截止日期，不显示
            }
        }
        
        // 检查重复规则
        if (!subtask.repeatType) return true;

        if (subtask.repeatType === 'daily') {
            return true;
        } else if (subtask.repeatType === 'weekly') {
            // 如果repeatDays为空，当作没有设置重复规则，每天显示
            if (!subtask.repeatDays || subtask.repeatDays.length === 0) {
                return true;
            }
            const dayOfWeek = date.getDay();
            return subtask.repeatDays.includes(dayOfWeek);
        }

        return false;
    },

    // 重置日常任务（每天0点刷新）
    resetDailyTasks() {
        const trees = this.getAll();
        let resetCount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        trees.forEach(tree => {
            if (tree.status !== 'in-progress') return;

            tree.subtasks.forEach(subtask => {
                if (subtask.type === 'daily') {
                    // 检查截止日期：如果已过截止日期，不重置
                    if (subtask.deadline) {
                        const deadlineDate = new Date(subtask.deadline);
                        deadlineDate.setHours(0, 0, 0, 0);
                        if (deadlineDate < today) {
                            return; // 已过截止日期，不重置
                        }
                    }

                    // 重置日常任务的状态和进度（每天的新任务都从0%开始）
                    // 无论昨天的进度是多少，今天都无条件重置为0%
                    // 这样可以确保每天的日常任务都从0%开始
                    this.updateSubtask(tree.id, subtask.id, {
                        status: 'pending',
                        progress: 0,
                        completedAt: null
                    });
                    resetCount++;
                }
            });
        });

        return resetCount;
    }
};

