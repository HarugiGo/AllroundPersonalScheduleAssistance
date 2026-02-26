// 事件管理模块

const UpcomingEvents = {
    // 获取所有事件
    getAll() {
        return storage.get('events', []);
    },

    // 根据ID获取事件
    getById(id) {
        const events = this.getAll();
        return events.find(e => e.id === id);
    },

    // 创建事件
    create(data) {
        const events = this.getAll();
        const event = {
            id: generateId(),
            title: data.title || '未命名事件',
            description: data.description || '',
            date: data.date || formatDate(new Date()),
            link: data.link || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        events.push(event);
        storage.set('events', events);
        return event;
    },

    // 更新事件
    update(id, updates) {
        const events = this.getAll();
        const index = events.findIndex(e => e.id === id);
        if (index > -1) {
            events[index] = {
                ...events[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            storage.set('events', events);
            return events[index];
        }
        return null;
    },

    // 删除事件
    delete(id) {
        const events = this.getAll();
        const filtered = events.filter(e => e.id !== id);
        storage.set('events', filtered);
        return filtered;
    },

    // 获取即将到来的事件
    getUpcoming(limit = 10) {
        const events = this.getAll();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return events
            .filter(event => {
                const eventDate = new Date(event.date);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate >= today;
            })
            .sort((a, b) => {
                return new Date(a.date) - new Date(b.date);
            })
            .slice(0, limit)
            .map(event => {
                const daysUntil = getDaysUntil(event.date);
                return {
                    ...event,
                    daysUntil
                };
            });
    }
};




