// 奖励系统模块（简化版，仅记录完成）

const Rewards = {
    // 完成任务
    completeTask(task, timeSpent, progress = null) {
        // 记录历史
        History.add({
            taskId: task.id,
            taskType: 'subtask',
            title: task.title,
            completedAt: new Date().toISOString(),
            timeSpent: timeSpent
        });

        // 如果是任务树的子任务，更新任务树
        if (task.treeId) {
            TaskTree.completeSubtask(task.treeId, task.id, timeSpent);
        }
    },
    
    // 完成任务（指定完成日期）
    completeTaskWithDate(task, timeSpent, progress, completedDate) {
        // 记录历史（使用指定的完成日期）
        History.add({
            taskId: task.id,
            taskType: 'subtask',
            title: task.title,
            completedAt: completedDate.toISOString(),
            timeSpent: timeSpent
        });

        // 如果是任务树的子任务，更新任务树
        if (task.treeId) {
            TaskTree.completeSubtask(task.treeId, task.id, timeSpent);
        }
    }
};
