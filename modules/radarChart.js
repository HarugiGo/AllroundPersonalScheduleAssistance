// 雷达图模块

const RadarChart = {
    chart: null,

    // 创建雷达图
    create(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        // 销毁旧图表
        if (this.chart) {
            this.chart.destroy();
        }

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: options.showLegend !== false
                },
                tooltip: {
                    enabled: true
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        display: options.showLabels !== false
                    }
                }
            }
        };

        this.chart = new Chart(ctx, {
            type: 'radar',
            data: data,
            options: { ...defaultOptions, ...options }
        });

        return this.chart;
    },

    // 更新雷达图数据
    update(data) {
        if (this.chart) {
            this.chart.data = data;
            this.chart.update();
        }
    },

    // 销毁图表
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
};




