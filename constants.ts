export const APP_NAME = 'GESIT PORTAL';

export const MOCK_GROUPS = [
    {
        id: 'it_staff',
        name: 'IT Staff',
        description: 'Input & update data IT (ticketing, procurement, assets, planner)',
        allowedMenus: [
            'dashboard', 'it-operations', 'helpdesk', 'activity', 'weekly', 'network',
            'it-payment', 'purchase', 'purchase-record',
            'it-assets', 'assets', 'asset-loan', 'asset-handover',
            'extension-directory', 'office-layout', 'tv-meeting-rooms',
            'csl-requests',
            'attendance'
        ]
    },
    {
        id: 'it_management',
        name: 'IT Management',
        description: 'Lihat & approve data IT + admin data pendukung',
        allowedMenus: [
            'dashboard', 'it-operations', 'helpdesk', 'activity', 'weekly', 'network',
            'it-payment', 'purchase', 'purchase-record',
            'it-assets', 'assets', 'asset-loan', 'asset-handover',
            'extension-directory', 'office-layout', 'tv-meeting-rooms',
            'csl-requests',
            'attendance',
            'users', 'tracking-log', 'announcements',
            'master-company', 'master-department', 'master-category'
        ]
    },
    {
        id: 'hr',
        name: 'Human Resources',
        description: 'Kelola data employee, kalender, dan attendance HR',
        allowedMenus: [
            'dashboard', 'hr-dashboard', 'attendance', 'employee-data', 'calendar'
        ]
    },
    {
        id: 'general_user',
        name: 'General User',
        description: 'Lihat data umum; bisa buat request CSL & ticketing IT',
        allowedMenus: [
            'dashboard', 'assets', 'asset-loan', 'helpdesk',
            'csl-requests',
            'extension-directory', 'office-layout',
            'attendance'
        ]
    },
    {
        id: 'csl_admin',
        name: 'CSL Admin',
        description: 'Approve & kroscek dokumen, kelola request, rutinitas, budget, reports',
        allowedMenus: [
            'dashboard', 'csl-requests',
            'routine', 'routine-activity', 'routine-task',
            'budget', 'budget-expense', 'budget-report',
            'directory-external',
            'reports', 'reports-request', 'reports-task', 'reports-budget',
            'csl-settings', 'master-company', 'master-department',
            'helpdesk'
        ]
    },
    {
        id: 'csl_staff',
        name: 'CSL Staff',
        description: 'Input & urus request, rutinitas, budget, dan kontak',
        allowedMenus: [
            'dashboard', 'csl-requests',
            'routine', 'routine-activity', 'routine-task',
            'budget', 'budget-expense', 'budget-report',
            'directory-external',
            'reports', 'reports-request', 'reports-task', 'reports-budget',
            'helpdesk'
        ]
    },
    {
        id: 'csl_requester',
        name: 'CSL Requester',
        description: 'Membuat & melacak request CSL',
        allowedMenus: [
            'dashboard', 'csl-requests', 'extension-directory', 'office-layout'
        ]
    },
    {
        id: 'support',
        name: 'IT Support',
        description: 'Hanya menangani ticketing IT (agent helpdesk)',
        allowedMenus: [
            'dashboard', 'helpdesk', 'extension-directory', 'office-layout'
        ]
    }
];

export const APP_MENU_STRUCTURE = [
    // ── Overview & Dashboards ──
    { id: 'dashboard', label: 'Overview', iconName: 'LayoutDashboard' },

    // ── CSL Operations (Corporate Secretary & Legal) ──
    { id: 'csl-requests', label: 'CSL Requests', iconName: 'Kanban' },

    { id: 'routine', label: 'CSL Routines', iconName: 'Calendar' },
    { id: 'routine-activity', label: 'Activity Log', parentId: 'routine', iconName: 'Activity' },
    { id: 'routine-task', label: 'Task Manager', parentId: 'routine', iconName: 'CheckSquare' },

    { id: 'budget', label: 'CSL Budget & Expenses', iconName: 'Wallet' },
    { id: 'budget-expense', label: 'Expense Approval', parentId: 'budget', iconName: 'Receipt' },

    { id: 'directory-external', label: 'Directory External', iconName: 'Phone' },

    { id: 'reports', label: 'CSL Reports', iconName: 'PieChart' },
    { id: 'reports-request', label: 'Request Report', parentId: 'reports', iconName: 'FileBarChart' },
    { id: 'reports-task', label: 'Task Report', parentId: 'reports', iconName: 'CheckSquare' },
    { id: 'reports-budget', label: 'Budget Report', parentId: 'reports', iconName: 'Wallet' },

    // ── IT Operations & Services ──
    { id: 'it-operations', label: 'IT Operations', iconName: 'Briefcase' },
    { id: 'helpdesk', label: 'Ticketing / Support', parentId: 'it-operations', iconName: 'LifeBuoy' },
    { id: 'activity', label: 'Activities Log', parentId: 'it-operations', iconName: 'Activity' },
    { id: 'weekly', label: 'Weekly Planner', parentId: 'it-operations', iconName: 'Calendar' },
    { id: 'network', label: 'Infrastructure', parentId: 'it-operations', iconName: 'Network' },

    // ── IT Payment / Procurement & Finance ──
    { id: 'it-payment', label: 'IT Payment', iconName: 'CreditCard' },
    { id: 'purchase', label: 'Procurement / Requisition', parentId: 'it-payment', iconName: 'ShoppingCart' },
    { id: 'purchase-record', label: 'Purchase Record', parentId: 'it-payment', iconName: 'Receipt' },

    // ── Asset Management ──
    { id: 'it-assets', label: 'Asset Management', iconName: 'Cpu' },
    { id: 'assets', label: 'Asset Catalog', parentId: 'it-assets', iconName: 'Cpu' },
    { id: 'asset-loan', label: 'Asset Loan & Return', parentId: 'it-assets', iconName: 'ArrowLeftRight' },
    { id: 'asset-handover', label: 'Asset Handover (BAST)', parentId: 'it-assets', iconName: 'FileCheck' },

    // ── Human Resources ──
    { id: 'hr-dashboard', label: 'HR Dashboard', iconName: 'LayoutDashboard' },
    { id: 'attendance', label: 'Absensi', iconName: 'Clock' },
    { id: 'attendance-report', label: 'Report', parentId: 'attendance', iconName: 'BarChart3' },
    { id: 'calendar', label: 'Calendar', parentId: 'attendance', iconName: 'Calendar' },
    { id: 'attendance-request', label: 'Request', parentId: 'attendance', iconName: 'FileText' },
    { id: 'attendance-locations', label: 'Radius', parentId: 'attendance', iconName: 'MapPin' },

    // ── Other Shared Directories ──
    { id: 'extension-directory', label: 'Directory Internal', iconName: 'PhoneCall' },
    { id: 'office-layout', label: 'Office Layout', iconName: 'MapPin' },
    { id: 'tv-meeting-rooms', label: 'TV Meeting Room', iconName: 'MonitorCog' },

    // ── Administration & Master Data ──
    { id: 'admin', label: 'Administration', iconName: 'Shield' },
    { id: 'employee-data', label: 'Data Employee', iconName: 'Users' },
    { id: 'users', label: 'User Accounts', parentId: 'admin', iconName: 'Users' },
    { id: 'csl-settings', label: 'CSL Settings', parentId: 'admin', iconName: 'Settings' },
    { id: 'system-settings', label: 'System Settings', parentId: 'admin', iconName: 'Settings' },
    { id: 'tracking-log', label: 'Tracking Log', parentId: 'admin', iconName: 'History' },
    { id: 'announcements', label: 'Broadcasts', parentId: 'admin', iconName: 'Megaphone' },
    { id: 'master-company', label: 'Company Data', parentId: 'admin', iconName: 'Building2' },
    { id: 'master-department', label: 'Departments', parentId: 'admin', iconName: 'Briefcase' },
    { id: 'master-category', label: 'Asset Categories', parentId: 'admin', iconName: 'Layers' },
    { id: 'master-group', label: 'Groups & Access', parentId: 'admin', iconName: 'Fingerprint' },
    { id: 'maintenance', label: 'System Wipe', parentId: 'admin', iconName: 'Zap' },
];
