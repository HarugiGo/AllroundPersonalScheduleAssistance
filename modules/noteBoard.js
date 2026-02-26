// 留言板模块

const NoteBoard = {
    // 获取留言板内容
    get() {
        return storage.get('noteBoard', { content: '', updatedAt: null });
    },

    // 更新留言板内容
    update(content) {
        const data = {
            content: content || '',
            updatedAt: new Date().toISOString()
        };
        storage.set('noteBoard', data);
        return data;
    },

    // 清空留言板
    clear() {
        storage.set('noteBoard', { content: '', updatedAt: null });
    }
};



