// 日程管理模块

const Schedule = {
    // 获取所有日程
    getAll() {
        return storage.get('schedules', []);
    },

    // 根据ID获取日程
    getById(id) {
        const schedules = this.getAll();
        return schedules.find(s => s.id === id);
    },

    // 创建日程
    create(data) {
        const schedules = this.getAll();
        const schedule = {
            id: generateId(),
            title: data.title || '未命名日程',
            description: data.description || '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            date: data.date || formatDate(new Date()),
            link: data.link || '',
            repeatType: data.repeatType || 'none',
            repeatEndDate: data.repeatEndDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        schedules.push(schedule);
        storage.set('schedules', schedules);
        return schedule;
    },

    // 更新日程
    update(id, updates) {
        const schedules = this.getAll();
        const index = schedules.findIndex(s => s.id === id);
        if (index > -1) {
            schedules[index] = {
                ...schedules[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            storage.set('schedules', schedules);
            return schedules[index];
        }
        return null;
    },

    // 删除日程
    delete(id) {
        const schedules = this.getAll();
        const filtered = schedules.filter(s => s.id !== id);
        storage.set('schedules', filtered);
        return filtered;
    },

    // 获取指定日期的日程
    getByDate(date) {
        const schedules = this.getAll();
        const targetDate = formatDate(date);
        
        return schedules.filter(schedule => {
            // 检查是否匹配日期
            if (schedule.date === targetDate) return true;

            // 检查重复日程
            if (schedule.repeatType === 'none') return false;

            // 检查重复截止日期
            if (schedule.repeatEndDate) {
                const endDate = new Date(schedule.repeatEndDate);
                endDate.setHours(23, 59, 59, 999);
                const target = new Date(targetDate);
                if (target > endDate) return false;
            }

            const scheduleDate = new Date(schedule.date);
            const target = new Date(targetDate);

            switch (schedule.repeatType) {
                case 'daily':
                    return true;
                case 'weekly':
                    return scheduleDate.getDay() === target.getDay();
                case 'biweekly':
                    // 每两周重复：需要是同一天，且周数差为偶数
                    if (scheduleDate.getDay() !== target.getDay()) return false;
                    // 计算周数差
                    const timeDiff = target.getTime() - scheduleDate.getTime();
                    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                    const weeksDiff = Math.floor(daysDiff / 7);
                    // 如果是同一天或偶数周，则匹配
                    return daysDiff >= 0 && weeksDiff % 2 === 0;
                case 'monthly':
                    return scheduleDate.getDate() === target.getDate();
                case 'yearly':
                    return scheduleDate.getMonth() === target.getMonth() &&
                           scheduleDate.getDate() === target.getDate();
                default:
                    return false;
            }
        }).sort((a, b) => {
            // 按开始时间排序
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });
    }
};

