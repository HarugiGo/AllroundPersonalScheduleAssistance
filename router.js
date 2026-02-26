// 路由系统

const Router = {
    routes: {},
    currentRoute: null,

    // 注册路由
    register(path, handler) {
        this.routes[path] = handler;
    },

    // 初始化路由
    init() {
        // 监听hash变化
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });

        // 监听导航链接点击
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                window.location.hash = route;
            }
        });

        // 初始路由处理
        this.handleRoute();
    },

    // 处理路由
    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const route = this.routes[hash] || this.routes['/'];
        
        if (route) {
            this.currentRoute = hash;
            this.updateNav();
            route();
        }
    },

    // 更新导航高亮
    updateNav() {
        document.querySelectorAll('.nav-link').forEach(link => {
            const route = link.getAttribute('data-route');
            if (this.currentRoute === route || 
                (this.currentRoute && this.currentRoute.startsWith(route) && route !== '/')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    // 导航到指定路由
    navigate(path) {
        window.location.hash = path;
    }
};




