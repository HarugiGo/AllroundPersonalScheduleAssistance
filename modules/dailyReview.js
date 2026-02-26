// 每日复盘模块

const DailyReview = {
    // 获取所有复盘记录
    getAll() {
        return storage.get('dailyReviews', []);
    },

    // 根据日期获取复盘记录
    getByDate(date) {
        const reviews = this.getAll();
        const dateStr = formatDate(date);
        return reviews.find(review => review.date === dateStr) || null;
    },

    // 创建或更新复盘记录
    save(date, data) {
        const reviews = this.getAll();
        const dateStr = formatDate(date);
        
        const existingIndex = reviews.findIndex(review => review.date === dateStr);
        const reviewData = {
            date: dateStr,
            progress: data.progress || '',
            rating: data.rating || null, // 'excellent', 'good', 'limited', 'poor', 'rest'
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            reviews[existingIndex] = { ...reviews[existingIndex], ...reviewData };
        } else {
            reviews.push(reviewData);
        }

        storage.set('dailyReviews', reviews);
        return reviewData;
    },

    // 删除复盘记录
    delete(date) {
        const reviews = this.getAll();
        const dateStr = formatDate(date);
        const filtered = reviews.filter(review => review.date !== dateStr);
        storage.set('dailyReviews', filtered);
        return filtered;
    },

    // 获取指定年份的所有复盘记录
    getByYear(year) {
        const reviews = this.getAll();
        return reviews.filter(review => {
            const reviewYear = new Date(review.date).getFullYear();
            return reviewYear === year;
        });
    }
};


