// 类别管理模块

const Categories = {
    // 默认类别
    defaultCategories: ['学习', '工作', '生活', '健康', '社交', '娱乐'],

    // 获取所有类别
    getAll() {
        return storage.get('categories', this.defaultCategories);
    },

    // 添加类别
    add(category) {
        const categories = this.getAll();
        if (!categories.includes(category)) {
            categories.push(category);
            storage.set('categories', categories);
        }
        return categories;
    },

    // 删除类别
    remove(category) {
        const categories = this.getAll();
        const index = categories.indexOf(category);
        if (index > -1) {
            categories.splice(index, 1);
            storage.set('categories', categories);
        }
        return categories;
    },

    // 重置为默认类别
    reset() {
        storage.set('categories', this.defaultCategories);
        return this.defaultCategories;
    }
};




