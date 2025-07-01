// Modern Admin Dashboard Script with Analytics
// --- UTILITY FUNCTIONS (Global Scope) ---
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const growth = ((current - previous) / previous * 100).toFixed(1);
    return growth > 0 ? `+${growth}%` : `${growth}%`;
};

document.addEventListener('DOMContentLoaded', async () => {
    // Check admin authentication first
    try {
        const sessionResponse = await fetch('/api/session-check', {
            credentials: 'include'
        });
        
        if (!sessionResponse.ok) {
            window.location.href = '/admin/login';
            return;
        }
        
        const sessionData = await sessionResponse.json();
        if (sessionData.user.role !== 'admin') {
            window.location.href = '/admin/login';
            return;
        }
        
        // Update admin username in header
        const adminUsernameEl = document.getElementById('adminUsername');
        if (adminUsernameEl) {
            adminUsernameEl.textContent = sessionData.user.username;
        }
        
    } catch (error) {
        console.error('Session check failed:', error);
        window.location.href = '/admin/login';
        return;
    }

    // EMERGENCY MODAL CLOSE - Force hide modal on page load
    const emergencyCloseModal = () => {
        const modal = document.getElementById('userModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
        }
    };

    // Call it immediately and after delay
    emergencyCloseModal();
    setTimeout(emergencyCloseModal, 100);
    setTimeout(emergencyCloseModal, 500);

    // --- DOM Elements ---
    const navElements = {
        dashboard: document.getElementById('navDashboard'),
        analytics: document.getElementById('navAnalytics'),
        users: document.getElementById('navUsers'),
        friendships: document.getElementById('navFriendships'),
        meetups: document.getElementById('navMeetups'),
        messages: document.getElementById('navMessages'),
        newsFeed: document.getElementById('navNewsFeed'),
        reports: document.getElementById('navReports'),
        dbInfo: document.getElementById('navDBInfo'),
        logs: document.getElementById('navLogs'),
        settings: document.getElementById('navSettings')
    };

    const contentSections = {
        dashboard: document.getElementById('dashboardContent'),
        analytics: document.getElementById('analyticsContent'),
        users: document.getElementById('usersContent'),
        friendships: document.getElementById('friendshipsContent'),
        messages: document.getElementById('messagesContent'),
        meetups: document.getElementById('meetupsContent'),
        newsFeed: document.getElementById('newsFeedContent'),
        reports: document.getElementById('reportsContent'),
        dbInfo: document.getElementById('dbInfoContent'),
        logs: document.getElementById('logsContent'),
        settings: document.getElementById('settingsContent')
    };

    // Stats elements
    const statsElements = {
        totalUsers: document.getElementById('totalUsers'),
        userGrowth: document.getElementById('userGrowth'),
        totalFriendships: document.getElementById('totalFriendships'),
        friendshipGrowth: document.getElementById('friendshipGrowth'),
        totalMeetups: document.getElementById('totalMeetups'),
        meetupsToday: document.getElementById('meetupsToday'),
        totalMessages: document.getElementById('totalMessages'),
        messagesToday: document.getElementById('messagestoday')
    };

    // User management elements
    const userTableBody = document.getElementById('userTableBody');
    const addUserBtn = document.getElementById('addUserBtn');
    const userModal = document.getElementById('userModal');
    const userForm = document.getElementById('userForm');
    const formError = document.getElementById('formError');

    // Chart variables
    let charts = {};

    // --- Local Utility Functions ---
    const showContentSection = (sectionKey) => {
        // Hide all sections
        Object.values(contentSections).forEach(section => {
            if (section) section.classList.add('hidden');
        });
        
        // Show selected section
        if (contentSections[sectionKey]) {
            contentSections[sectionKey].classList.remove('hidden');
        }

        // Update navigation active states
        Object.values(navElements).forEach(nav => {
            if (nav) nav.classList.remove('active');
        });
        
        if (navElements[sectionKey]) {
            navElements[sectionKey].classList.add('active');
        }
    };

    // --- Dashboard Functions ---
    const loadDashboardStats = async () => {
        try {
            const response = await fetch('/api/analytics/dashboard-stats', {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');
            
            const data = await response.json();
            
            // Update stats cards
            if (statsElements.totalUsers) {
                statsElements.totalUsers.textContent = formatNumber(data.totalUsers);
                statsElements.userGrowth.textContent = calculateGrowth(data.totalUsers, data.previousUsers);
                statsElements.userGrowth.className = data.totalUsers >= data.previousUsers ? 'text-sm text-green-600' : 'text-sm text-red-600';
            }

            if (statsElements.totalFriendships) {
                statsElements.totalFriendships.textContent = formatNumber(data.totalFriendships);
                statsElements.friendshipGrowth.textContent = calculateGrowth(data.totalFriendships, data.previousFriendships);
            }

            if (statsElements.totalMeetups) {
                statsElements.totalMeetups.textContent = formatNumber(data.totalMeetups);
                statsElements.meetupsToday.textContent = `${data.meetupsToday} today`;
            }

            if (statsElements.totalMessages) {
                statsElements.totalMessages.textContent = formatNumber(data.totalMessages);
                statsElements.messagesToday.textContent = `${data.messagesToday} today`;
            }

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    };

    const initializeCharts = async () => {
        try {
            // DESTROY EXISTING CHARTS FIRST
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
            charts = {}; // Reset charts object

            // Load chart data
            const response = await fetch('/api/analytics/charts-data', {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch chart data');
            
            const data = await response.json();

            // User Growth Chart
            const userGrowthCtx = document.getElementById('userGrowthChart');
            if (userGrowthCtx) {
                charts.userGrowth = new Chart(userGrowthCtx, {
                    type: 'line',
                    data: {
                        labels: data.userGrowth.labels,
                        datasets: [{
                            label: 'New Users',
                            data: data.userGrowth.data,
                            borderColor: '#00bcd4',
                            backgroundColor: 'rgba(0, 188, 212, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: '#f3f4f6'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }

            // Demographics Chart
            const demographicsCtx = document.getElementById('demographicsChart');
            if (demographicsCtx) {
                charts.demographics = new Chart(demographicsCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Male', 'Female', 'Other', 'Not Specified'],
                        datasets: [{
                            data: data.demographics.data,
                            backgroundColor: [
                                '#3b82f6',
                                '#ec4899',
                                '#8b5cf6',
                                '#6b7280'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true
                                }
                            }
                        }
                    }
                });
            }

            // Daily Meetups Chart
            const meetupsCtx = document.getElementById('meetupsChart');
            if (meetupsCtx) {
                charts.meetups = new Chart(meetupsCtx, {
                    type: 'bar',
                    data: {
                        labels: data.meetups.labels,
                        datasets: [{
                            label: 'Meetups Created',
                            data: data.meetups.data,
                            backgroundColor: '#8b5cf6',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: '#f3f4f6'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }

            // User Locations Chart
            const locationsCtx = document.getElementById('locationsChart');
            if (locationsCtx) {
                charts.locations = new Chart(locationsCtx, {
                    type: 'bar',
                    data: {
                        labels: data.locations.labels,
                        datasets: [{
                            label: 'Users by Location',
                            data: data.locations.data,
                            backgroundColor: '#10b981',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: {
                                    color: '#f3f4f6'
                                }
                            },
                            y: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error initializing charts:', error);
            // Show error message to user
            const chartContainers = ['userGrowthChart', 'demographicsChart', 'meetupsChart', 'locationsChart'];
            chartContainers.forEach(containerId => {
                const container = document.getElementById(containerId);
                if (container) {
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.justifyContent = 'center';
                    container.style.color = '#ef4444';
                    container.textContent = 'Failed to load chart data';
                }
            });
        }
    };

    // --- User Management Functions ---
const renderUserTable = async () => {
    if (!userTableBody) return;
    
    userTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">Loading users...</td></tr>`;

    try {
        const response = await fetch('/api/users', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const data = await response.json();
        const users = data.users;

        userTableBody.innerHTML = '';

        if (users.length === 0) {
            userTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No users found</td></tr>`;
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            const lastLogin = user.logged_in 
                ? new Date(user.logged_in).toLocaleString()
                : 'Never';

            // *** DEBUG: More detailed activity checking ***
            const now = new Date();
            const loginDate = user.logged_in ? new Date(user.logged_in) : null;
            const daysSinceLogin = loginDate ? Math.floor((now - loginDate) / (24 * 60 * 60 * 1000)) : null;
            
            console.log(`👤 User ${user.username}:`, {
                logged_in: user.logged_in,
                loginDate: loginDate,
                daysSinceLogin: daysSinceLogin,
                isActive: daysSinceLogin !== null && daysSinceLogin < 30
            });

                const isActive = user.logged_in && 
                    (new Date() - new Date(user.logged_in)) < (30 * 24 * 60 * 60 * 1000); // 30 days

                row.innerHTML = `
                    <td class="px-4 py-4">
                        <div class="flex items-center">
                            <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-gray-500"></i>
                            </div>
                            <div class="ml-3">
                                <div class="font-medium text-gray-900">${user.username}</div>
                                <div class="text-sm text-gray-500">ID: ${user.id}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600">${user.email}</td>
                    <td class="px-4 py-4">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'moderator' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                        }">
                            ${user.role}
                        </span>
                    </td>
                    <td class="px-4 py-4">
                        <span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                            ${isActive ? 'Active' : 'Inactive'}
                    </span>
                    ${daysSinceLogin !== null ? `<div class="text-xs text-gray-400">${daysSinceLogin} days ago</div>` : ''}
                </td>
                <td class="px-4 py-4 text-sm text-gray-600">${lastLogin}</td>
                <td class="px-4 py-4">
                    <div class="flex space-x-2">
                        <button data-id="${user.id}" class="edit-btn btn-warning">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </button>
                        <button data-id="${user.id}" class="delete-btn btn-danger">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </td>
                `;
                userTableBody.appendChild(row);
            });

            // Add event listeners
            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const userId = e.currentTarget.dataset.id;
                    console.log('🔄 Edit button clicked for user ID:', userId);
                    await handleEditUser(e);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const userId = e.currentTarget.dataset.id;
                    console.log('🔄 Delete button clicked for user ID:', userId);
                    await handleDeleteUser(e);
                });
            });

            console.log('✅ User table rendered with', users.length, 'users');

        } catch (error) {
            console.error('Error loading users:', error);
            userTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-600">Failed to load users: ${error.message}</td></tr>`;
        }
    };

    const handleEditUser = async (e) => {
        const userId = e.currentTarget.dataset.id;
        try {
            const response = await fetch(`/api/users/${userId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch user data');
            
            const data = await response.json();
            if (data.status === 'success' && data.user) {
                showUserModal(data.user);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleDeleteUser = async (e) => {
        const userId = e.currentTarget.dataset.id;
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to delete user');
            
            const result = await response.json();
            alert(result.message || 'User deleted successfully');
            renderUserTable();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Replace the existing showUserModal function:
    const showUserModal = (user = null) => {
        console.log('🔄 Showing user modal', user ? `for user: ${user.username}` : 'for new user');
        
        const userModal = document.getElementById('userModal');
        if (!userModal) {
            console.error('❌ User modal not found!');
            alert('User modal not found! Please check the HTML.');
            return;
        }
        
        // Force show the modal with multiple methods
        console.log('🔄 Attempting to show modal...');
        
        // Method 1: Remove hidden class and set display
        userModal.classList.remove('hidden');
        userModal.style.display = 'flex';
        userModal.style.visibility = 'visible';
        userModal.style.opacity = '1';
        
        // Method 2: Set inline styles to override any CSS
        userModal.style.position = 'fixed';
        userModal.style.top = '0';
        userModal.style.left = '0';
        userModal.style.width = '100%';
        userModal.style.height = '100%';
        userModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        userModal.style.zIndex = '9999';
        userModal.style.alignItems = 'center';
        userModal.style.justifyContent = 'center';
        
        // Get form elements
        const modalTitle = document.getElementById('modalTitle');
        const userIdHidden = document.getElementById('userIdHidden');
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const roleInput = document.getElementById('role');
        const passwordInput = document.getElementById('password');
        const passwordField = document.getElementById('passwordField');
        const formError = document.getElementById('formError');
        const userForm = document.getElementById('userForm');

        // Clear any existing errors
        if (formError) formError.classList.add('hidden');
        
        // Reset form
        if (userForm) userForm.reset();

        if (user) {
            // Editing existing user
            console.log('📝 Setting up form for editing user:', user);
            if (modalTitle) modalTitle.textContent = 'Edit User';
            if (userIdHidden) userIdHidden.value = user.id;
            if (usernameInput) usernameInput.value = user.username;
            if (emailInput) emailInput.value = user.email;
            if (roleInput) roleInput.value = user.role;
            if (passwordInput) {
                passwordInput.removeAttribute('required');
                passwordInput.placeholder = 'Leave blank to keep current password';
                passwordInput.value = '';
            }
            if (passwordField) {
                const helpText = passwordField.querySelector('p');
                if (helpText) helpText.style.display = 'block';
            }
        } else {
            // Adding new user
            console.log('📝 Setting up form for new user');
            if (modalTitle) modalTitle.textContent = 'Add New User';
            if (userIdHidden) userIdHidden.value = '';
            if (passwordInput) {
                passwordInput.setAttribute('required', 'true');
                passwordInput.placeholder = 'Enter password';
                passwordInput.value = '';
            }
            if (passwordField) {
                const helpText = passwordField.querySelector('p');
                if (helpText) helpText.style.display = 'none';
            }
        }
        
        // Focus on username input with delay
        if (usernameInput) {
            setTimeout(() => {
                usernameInput.focus();
                usernameInput.select();
            }, 300);
        }
        
        // Debug: Check if modal is actually visible
        const modalRect = userModal.getBoundingClientRect();
        console.log('🔍 Modal position and size:', {
            display: window.getComputedStyle(userModal).display,
            visibility: window.getComputedStyle(userModal).visibility,
            opacity: window.getComputedStyle(userModal).opacity,
            zIndex: window.getComputedStyle(userModal).zIndex,
            position: modalRect
        });
        
        console.log('✅ User modal shown successfully');
    };

    const hideUserModal = () => {
        console.log('🔄 Hiding user modal');
        
        if (!userModal) {
            console.error('❌ User modal not found when trying to hide!');
            return;
        }
        
        // Hide the modal
        userModal.classList.add('hidden');
        userModal.style.display = 'none';
        
        // Reset form and errors
        if (userForm) {
            userForm.reset();
            console.log('📝 User form reset');
        }
        if (formError) {
            formError.classList.add('hidden');
            formError.textContent = '';
        }
        
        console.log('✅ User modal hidden successfully');
    };

    // --- Event Listeners ---
    
    // Navigation
    if (navElements.dashboard) {
        navElements.dashboard.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('dashboard');
            loadDashboardStats();
            // Add a small delay to ensure DOM is ready
            setTimeout(() => {
                initializeCharts();
            }, 200);
        });
    }

    if (navElements.newsFeed) {
    navElements.newsFeed.addEventListener('click', (e) => {
        e.preventDefault();
        showContentSection('newsFeed');
        loadNewsPostsData();
    });
}

    if (navElements.analytics) {
        navElements.analytics.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('analytics');
            // Load analytics charts with a small delay
            setTimeout(() => {
                loadAnalyticsCharts();
            }, 200);
        });
    }

    if (navElements.users) {
        navElements.users.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('users');
            renderUserTable();
        });
    }

    // Add navigation event listeners for all sections
    if (navElements.friendships) {
        navElements.friendships.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('friendships');
            loadFriendshipsData();
        });
    }

    if (navElements.messages) {
        navElements.messages.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('messages');
            loadMessagesData();
        });
    }

    if (navElements.meetups) {
        navElements.meetups.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('meetups');
            loadMeetupsData();
        });
    }

    if (navElements.reports) {
        navElements.reports.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('reports');
        });
    }

    if (navElements.dbInfo) {
        navElements.dbInfo.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('dbInfo');
            loadDatabaseInfo();
        });
    }

    if (navElements.logs) {
        navElements.logs.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('logs');
            loadSystemLogs();
        });
    }

    if (navElements.settings) {
        navElements.settings.addEventListener('click', (e) => {
            e.preventDefault();
            showContentSection('settings');
        });
    }

    // --- USER MANAGEMENT EVENT LISTENERS ---

    // Add User Button
    if (addUserBtn) {
        addUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Add User button clicked');
            showUserModal();  // Call without parameters for new user
        });
        console.log('✅ Add User button event listener attached');
    } else {
        console.error('❌ Add User button not found!');
        
        // Try to find it another way after DOM loads
        setTimeout(() => {
            const btn = document.querySelector('#addUserBtn, button[data-action="add-user"]');
            if (btn) {
                console.log('🔍 Found button using alternate selector:', btn);
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showUserModal();
                });
            } else {
                console.error('❌ Still cannot find Add User button');
            }
        }, 1000);
    }

    // Search Users functionality
    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        let searchTimeout;
        userSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = e.target.value.toLowerCase();
                console.log('🔍 Searching for:', searchTerm);
                filterUsersTable(searchTerm);
            }, 300);
        });
        console.log('✅ User search input event listener attached');
    } else {
        console.error('❌ User search input not found!');
    }

    // Modal close buttons
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Close modal button clicked');
            hideUserModal();
        });
        console.log('✅ Close modal button event listener attached');
    } else {
        console.error('❌ Close modal button not found!');
    }

    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔄 Cancel form button clicked');
            hideUserModal();
        });
        console.log('✅ Cancel form button event listener attached');
    } else {
        console.error('❌ Cancel form button not found!');
    }

    // User Form Submission
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('📝 User form submitted');
            
            if (formError) formError.classList.add('hidden');

            const formData = new FormData(userForm);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                role: formData.get('role')
            };

            const id = formData.get('id');
            const password = formData.get('password');

            // Only include password if it's not empty
            if (password && password.trim() !== '') {
                userData.password = password;
            }

            console.log('📋 Form data:', { ...userData, password: password ? '[HIDDEN]' : 'Not provided' });

            try {
                const url = id ? `/api/users/${id}` : '/api/users';
                const method = id ? 'PUT' : 'POST';

                console.log(`🌐 Making ${method} request to ${url}`);

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData),
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save user');
                }

                const result = await response.json();
                console.log('✅ User saved successfully:', result);
                
                alert(result.message || 'User saved successfully');
                hideUserModal();
                renderUserTable();  // Reload the table
            } catch (error) {
                console.error('❌ Error saving user:', error);
                if (formError) {
                    formError.textContent = error.message;
                    formError.classList.remove('hidden');
                } else {
                    alert(`Error: ${error.message}`);
                }
            }
        });
        console.log('✅ User form event listener attached');
    } else {
        console.error('❌ User form not found!');
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    window.location.href = '/admin/login';
                } else {
                    alert('Logout failed');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('Logout failed');
            }
        });
    }

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && userModal && !userModal.classList.contains('hidden')) {
            hideUserModal();
        }
    });

    // Click outside modal to close
    if (userModal) {
        userModal.addEventListener('click', (e) => {
            if (e.target === userModal) {
                hideUserModal();
            }
        });
    }

    // Analytics controls
    const timeRangeSelect = document.getElementById('timeRange');
    const refreshAnalyticsBtn = document.getElementById('refreshAnalytics');

    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', () => {
            if (document.getElementById('analyticsContent') && !document.getElementById('analyticsContent').classList.contains('hidden')) {
                loadAnalyticsCharts();
            }
        });
    }

    if (refreshAnalyticsBtn) {
        refreshAnalyticsBtn.addEventListener('click', () => {
            loadAnalyticsCharts();
        });
    }

    // System Logs controls
    const refreshLogsBtn = document.getElementById('refreshLogs');
    const clearLogsBtn = document.getElementById('clearLogs');
    const logFilterSelect = document.getElementById('logFilter');

    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', () => {
            console.log('🔄 Refreshing logs...');
            loadSystemLogs();
        });
    }

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to clear old logs? This action cannot be undone.')) {
                return;
            }
            
            try {
                console.log('🗑️ Clearing old logs...');
                const response = await fetch('/api/logs/clear', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (!response.ok) throw new Error('Failed to clear logs');
                
                const result = await response.json();
                alert(result.message || 'Old logs cleared successfully');
                loadSystemLogs(); // Reload the logs table
            } catch (error) {
                console.error('Error clearing logs:', error);
                alert(`Error clearing logs: ${error.message}`);
            }
        });
    }

    if (logFilterSelect) {
        logFilterSelect.addEventListener('change', () => {
            console.log('🔍 Filtering logs by:', logFilterSelect.value);
            loadSystemLogs();
        });
    }

    // --- Initialize Dashboard ---
    
    // FORCE HIDE MODAL ON PAGE LOAD
    emergencyCloseModal();
    
    // Initialize dashboard
    showContentSection('dashboard');
    loadDashboardStats();
    
    // Initialize charts with delay to prevent canvas conflicts
    setTimeout(() => {
        initializeCharts();
    }, 300);

    // Add window resize handler to prevent chart issues
    window.addEventListener('resize', () => {
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    });
}); // End of DOMContentLoaded

// --- SECTION LOADING FUNCTIONS (Global Scope) ---
const loadFriendshipsData = async () => {
    try {
        const response = await fetch('/api/admin/friendships', {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch friendships data');
        const data = await response.json();
        
        // Update friendship stats
        const totalFriendshipsEl = document.getElementById('totalFriendshipsDetail');
        const pendingRequestsEl = document.getElementById('pendingRequests');
        const friendshipsThisWeekEl = document.getElementById('friendshipsThisWeek');
        
        if (totalFriendshipsEl) totalFriendshipsEl.textContent = data.stats.total;
        if (pendingRequestsEl) pendingRequestsEl.textContent = data.stats.pending;
        if (friendshipsThisWeekEl) friendshipsThisWeekEl.textContent = data.stats.thisWeek;
        
        // Update friendships table
        const friendshipsTableBody = document.getElementById('friendshipsTableBody');
        if (friendshipsTableBody) {
            friendshipsTableBody.innerHTML = '';
            
            if (data.friendships.length === 0) {
                friendshipsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">No friendships found</td></tr>`;
                return;
            }
            
            data.friendships.forEach(friendship => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                
                const createdDate = new Date(friendship.created_at).toLocaleDateString();
                
                row.innerHTML = `
                    <td class="px-4 py-4">
                        <div class="text-sm font-medium text-gray-900">${friendship.requester_name}</div>
                        <div class="text-sm text-gray-500">↔️ ${friendship.addressee_name}</div>
                    </td>
                    <td class="px-4 py-4">
                        <span class="status-badge ${friendship.status === 'accepted' ? 'status-active' : 'status-pending'}">
                            ${friendship.status}
                        </span>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600">${createdDate}</td>
                    <td class="px-4 py-4">
                        <button class="btn-secondary text-xs" onclick="viewFriendshipDetails(${friendship.id})">
                            <i class="fas fa-eye mr-1"></i>Details
                        </button>
                    </td>
                `;
                friendshipsTableBody.appendChild(row);
            });
        }
        
        console.log('✅ Friendships data loaded:', data);
    } catch (error) {
        console.error('Error loading friendships:', error);
        const friendshipsTableBody = document.getElementById('friendshipsTableBody');
        if (friendshipsTableBody) {
            friendshipsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-red-600">Failed to load friendships: ${error.message}</td></tr>`;
        }
    }
};

const loadMessagesData = async () => {
    try {
        const response = await fetch('/api/admin/messages', {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch messages data');
        const data = await response.json();
        
        // Update message stats
        const totalMessagesEl = document.getElementById('totalMessagesDetail');
        const todayMessagesEl = document.getElementById('messagesTodayDetail');
        const activeChatsEl = document.getElementById('activeChats');
        const avgMessagesEl = document.getElementById('avgMessagesPerUser');
        
        if (totalMessagesEl) totalMessagesEl.textContent = formatNumber(data.stats.total);
        if (todayMessagesEl) todayMessagesEl.textContent = data.stats.today;
        if (activeChatsEl) activeChatsEl.textContent = data.stats.activeChats;
        if (avgMessagesEl) avgMessagesEl.textContent = data.stats.avgPerUser;
        
        // Create message activity chart
        const messageActivityCtx = document.getElementById('messageActivityChart');
        if (messageActivityCtx && data.activity) {
            // Access charts from window if needed
            if (window.charts && window.charts.messageActivity) {
                window.charts.messageActivity.destroy();
            }
            
            if (!window.charts) window.charts = {};
            
            window.charts.messageActivity = new Chart(messageActivityCtx, {
                type: 'line',
                data: {
                    labels: data.activity.labels,
                    datasets: [{
                        label: 'Messages Sent',
                        data: data.activity.data,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#f3f4f6'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
        
        console.log('✅ Messages data loaded:', data);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
};

const loadMeetupsData = async () => {
    try {
        const response = await fetch('/api/admin/meetups', {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch meetups data');
        const data = await response.json();
        
        // Update meetup stats
        const totalMeetupsEl = document.getElementById('totalMeetupsDetail');
        const completedMeetupsEl = document.getElementById('completedMeetups');
        const successRateEl = document.getElementById('meetupSuccessRate');
        const todayMeetupsEl = document.getElementById('meetupsTodayDetail');
        
        if (totalMeetupsEl) totalMeetupsEl.textContent = formatNumber(data.stats.total);
        if (completedMeetupsEl) completedMeetupsEl.textContent = formatNumber(data.stats.completed);
        if (successRateEl) successRateEl.textContent = `${data.stats.successRate}%`;
        if (todayMeetupsEl) todayMeetupsEl.textContent = data.stats.today;
        
        // Update meetups table
        const meetupsTableBody = document.getElementById('meetupsTableBody');
        if (meetupsTableBody) {
            meetupsTableBody.innerHTML = '';
            
            if (data.sessions.length === 0) {
                meetupsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">No meetup sessions found</td></tr>`;
                return;
            }
            
            data.sessions.forEach(session => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                
                const createdDate = new Date(session.created_at).toLocaleDateString();
                
                let statusClass = 'status-pending';
                if (session.status === 'completed') statusClass = 'status-active';
                else if (session.status === 'failed_proximity') statusClass = 'status-inactive';
                
                row.innerHTML = `
                    <td class="px-4 py-4">
                        <div class="text-sm font-medium text-gray-900">Session #${session.id}</div>
                    </td>
                    <td class="px-4 py-4">
                        <div class="text-sm text-gray-900">${session.requester_name}</div>
                        <div class="text-sm text-gray-500">& ${session.addressee_name}</div>
                    </td>
                    <td class="px-4 py-4">
                        <span class="status-badge ${statusClass}">
                            ${session.status.replace('_', ' ')}
                        </span>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600">${createdDate}</td>
                    <td class="px-4 py-4">
                        <button class="btn-secondary text-xs" onclick="viewSessionDetails(${session.id})">
                            <i class="fas fa-eye mr-1"></i>Details
                        </button>
                    </td>
                `;
                meetupsTableBody.appendChild(row);
            });
        }
        
        console.log('✅ Meetups data loaded:', data);
    } catch (error) {
        console.error('Error loading meetups:', error);
        const meetupsTableBody = document.getElementById('meetupsTableBody');
        if (meetupsTableBody) {
            meetupsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-600">Failed to load meetup sessions: ${error.message}</td></tr>`;
        }
    }
};

const loadDatabaseInfo = async () => {
    const dbInfoDisplay = document.getElementById('dbInfoDisplay');
    const dbInfoError = document.getElementById('dbInfoError');
    const dbTablesBody = document.getElementById('dbTablesBody');
    
    if (!dbInfoDisplay) return;
    
    dbInfoDisplay.innerHTML = `<p class="text-gray-500">Fetching database info...</p>`;
    if (dbInfoError) dbInfoError.classList.add('hidden');
    
    // Load database connection info
    try {
        const response = await fetch('/api/db-info', {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch database info');
        
        const data = await response.json();
        
        dbInfoDisplay.innerHTML = `
            <div class="space-y-4">
                <div class="flex justify-between">
                    <span class="font-medium">Database Name:</span>
                    <span>${data.dbName}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-medium">Server Version:</span>
                    <span>${data.dbServerVersion}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-medium">Connection Status:</span>
                    <span class="text-green-600">✅ ${data.connectionPingStatus}</span>
                </div>
                ${data.connectionErrorMessage ? `
                <div class="flex justify-between">
                    <span class="font-medium">Error:</span>
                    <span class="text-red-600">${data.connectionErrorMessage}</span>
                </div>
                ` : ''}
            </div>
        `;
        
        console.log('✅ Database info loaded:', data);
    } catch (error) {
        console.error('Error fetching DB info:', error);
        if (dbInfoError) {
            dbInfoError.textContent = `Error: ${error.message}`;
            dbInfoError.classList.remove('hidden');
        }
        dbInfoDisplay.innerHTML = `<p class="text-red-600">Could not fetch database information.</p>`;
    }
    
    // Load table information
    if (dbTablesBody) {
        dbTablesBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">Loading table information...</td></tr>`;
        
        try {
            const tablesResponse = await fetch('/api/db-tables', {
                credentials: 'include'
            });
            
            if (!tablesResponse.ok) throw new Error('Failed to fetch table information');
            
            const tablesData = await tablesResponse.json();
            const tables = tablesData.tables;
            
            dbTablesBody.innerHTML = '';
            
            if (tables.length === 0) {
                dbTablesBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No tables found</td></tr>`;
                return;
            }
            
            tables.forEach(table => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                
                const sizeDisplay = table.size_mb ? `${table.size_mb} MB` : 'N/A';
                const rowsDisplay = table.table_rows !== null ? formatNumber(table.table_rows) : 'N/A';
                const engineDisplay = table.engine || 'Unknown';
                
                row.innerHTML = `
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">${table.table_name}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${rowsDisplay}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${sizeDisplay}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${engineDisplay}</td>
                `;
                dbTablesBody.appendChild(row);
            });
            
            console.log('✅ Database tables loaded:', tables.length, 'tables');
        } catch (error) {
            console.error('Error fetching table info:', error);
            dbTablesBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-600">Failed to load table information: ${error.message}</td></tr>`;
        }
    }
};

const loadSystemLogs = async () => {
    const logsTableBody = document.getElementById('logsTableBody');
    if (!logsTableBody) return;

    logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">Loading logs...</td></tr>`;

    try {
        // Get filter value
        const logFilter = document.getElementById('logFilter')?.value || '';
        const url = logFilter ? `/api/logs?filter=${encodeURIComponent(logFilter)}` : '/api/logs';
        
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch logs');
        
        const data = await response.json();
        const logs = data.logs;

        logsTableBody.innerHTML = '';

        if (logs.length === 0) {
            logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-500">No logs found</td></tr>`;
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            const timestamp = new Date(log.timestamp).toLocaleString();

            row.innerHTML = `
                <td class="px-4 py-4 text-sm text-gray-600">${timestamp}</td>
                <td class="px-4 py-4 text-sm font-medium text-gray-900">${log.username}</td>
                <td class="px-4 py-4">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        ${log.action}
                    </span>
                </td>
                <td class="px-4 py-4 text-sm text-gray-600">${log.details || 'N/A'}</td>
            `;
            logsTableBody.appendChild(row);
        });

        console.log('✅ System logs loaded:', logs.length, 'entries');
    } catch (error) {
        console.error('Error loading logs:', error);
        logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-red-600">Failed to load logs: ${error.message}</td></tr>`;
    }
};

const loadAnalyticsCharts = async () => {
    try {
        console.log('🔄 Loading analytics charts...');
        
        // Get time range from selector
        const timeRange = document.getElementById('timeRange')?.value || '30';
        
        // Fetch analytics data
        const response = await fetch(`/api/analytics/detailed-data?days=${timeRange}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            // Fallback to existing charts data if detailed endpoint doesn't exist
            const fallbackResponse = await fetch('/api/analytics/charts-data', {
                credentials: 'include'
            });
            if (!fallbackResponse.ok) throw new Error('Failed to fetch analytics data');
            const data = await fallbackResponse.json();
            initializeAnalyticsCharts(data);
            return;
        }
        
        const data = await response.json();
        initializeAnalyticsCharts(data);
        
        console.log('✅ Analytics charts loaded successfully');
    } catch (error) {
        console.error('❌ Error loading analytics charts:', error);
        showAnalyticsError(error.message);
    }
};

const initializeAnalyticsCharts = (data) => {
    console.log('🎨 Initializing analytics charts...');
    
    // Destroy existing analytics charts more thoroughly
    const analyticsChartIds = ['activityHeatmap', 'messageFrequencyChart', 'friendRequestsChart', 'meetupSuccessChart'];
    
    analyticsChartIds.forEach(chartId => {
        // Check multiple chart storage locations
        if (window.charts && window.charts[chartId]) {
            console.log(`🗑️ Destroying existing chart: ${chartId}`);
            window.charts[chartId].destroy();
            delete window.charts[chartId];
        }
        
        // Also check Chart.js registry
        const existingChart = Chart.getChart(chartId);
        if (existingChart) {
            console.log(`🗑️ Destroying chart from registry: ${chartId}`);
            existingChart.destroy();
        }
    });
    
    if (!window.charts) window.charts = {};
    
    // Add a small delay to ensure canvas is ready
    setTimeout(() => {
        // User Activity Heatmap
        const activityHeatmapCtx = document.getElementById('activityHeatmap');
        if (activityHeatmapCtx) {
            try {
                window.charts.activityHeatmap = new Chart(activityHeatmapCtx, {
                    type: 'line',
                    data: {
                        labels: data.userGrowth?.labels || generateDateLabels(30),
                        datasets: [{
                            label: 'Daily Active Users',
                            data: data.dailyActiveUsers?.data || generateRandomData(30, 10, 100),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true
                        }, {
                            label: 'New Registrations',
                            data: data.userGrowth?.data || generateRandomData(30, 1, 20),
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4,
                            fill: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top'
                            },
                            title: {
                                display: true,
                                text: 'User Activity Over Time'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: '#f3f4f6'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
                console.log('✅ Activity heatmap chart created');
            } catch (error) {
                console.error('❌ Error creating activity heatmap:', error);
            }
        }
        
        // Message Frequency Chart
        const messageFrequencyCtx = document.getElementById('messageFrequencyChart');
        if (messageFrequencyCtx) {
            try {
                window.charts.messageFrequency = new Chart(messageFrequencyCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Morning (6-12)', 'Afternoon (12-18)', 'Evening (18-24)', 'Night (0-6)'],
                        datasets: [{
                            data: data.messageFrequency?.data || [35, 40, 20, 5],
                            backgroundColor: [
                                '#fbbf24',
                                '#f59e0b',
                                '#d97706',
                                '#92400e'
                            ],
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            title: {
                                display: true,
                                text: 'Message Frequency by Time'
                            }
                        }
                    }
                });
                console.log('✅ Message frequency chart created');
            } catch (error) {
                console.error('❌ Error creating message frequency chart:', error);
            }
        }
        
        // Friend Requests Chart
        const friendRequestsCtx = document.getElementById('friendRequestsChart');
        if (friendRequestsCtx) {
            try {
                window.charts.friendRequests = new Chart(friendRequestsCtx, {
                    type: 'bar',
                    data: {
                        labels: data.friendRequests?.labels || generateDateLabels(14),
                        datasets: [{
                            label: 'Sent',
                            data: data.friendRequests?.sent || generateRandomData(14, 5, 25),
                            backgroundColor: '#3b82f6',
                            borderRadius: 4
                        }, {
                            label: 'Accepted',
                            data: data.friendRequests?.accepted || generateRandomData(14, 3, 20),
                            backgroundColor: '#10b981',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top'
                            },
                            title: {
                                display: true,
                                text: 'Friend Requests Activity'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: '#f3f4f6'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
                console.log('✅ Friend requests chart created');
            } catch (error) {
                console.error('❌ Error creating friend requests chart:', error);
            }
        }
        
        // Meetup Success Chart
        const meetupSuccessCtx = document.getElementById('meetupSuccessChart');
        if (meetupSuccessCtx) {
            try {
                window.charts.meetupSuccess = new Chart(meetupSuccessCtx, {
                    type: 'pie',
                    data: {
                        labels: ['Completed', 'Failed Proximity', 'Denied', 'Pending'],
                        datasets: [{
                            data: data.meetupSuccess?.data || [45, 25, 15, 15],
                            backgroundColor: [
                                '#10b981',
                                '#ef4444',
                                '#f59e0b',
                                '#6b7280'
                            ],
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            },
                            title: {
                                display: true,
                                text: 'Meetup Success Rate'
                            }
                        }
                    }
                });
                console.log('✅ Meetup success chart created');
            } catch (error) {
                console.error('❌ Error creating meetup success chart:', error);
            }
        }
    }, 100); // Small delay to ensure canvas cleanup
};

const showAnalyticsError = (message) => {
    const chartContainers = ['activityHeatmap', 'messageFrequencyChart', 'friendRequestsChart', 'meetupSuccessChart'];
    chartContainers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.color = '#ef4444';
            container.style.minHeight = '200px';
            container.textContent = `Failed to load analytics: ${message}`;
        }
    });
};

// Utility functions for generating sample data
const generateDateLabels = (days) => {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString());
    }
    return labels;
};

const generateRandomData = (length, min, max) => {
    return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

// Add these missing window functions at the very end of the file:

// Utility functions for buttons and features
window.generateReport = (type) => {
    console.log(`Generating ${type} report...`);
    alert(`Generating ${type} report... (Feature coming soon)`);
};

window.saveSettings = () => {
    console.log('Saving settings...');
    alert('Settings saved successfully! (Feature coming soon)');
};

window.viewFriendshipDetails = (friendshipId) => {
    console.log(`🔍 Viewing friendship details for ID: ${friendshipId}`);
    
    // Show a detailed modal with friendship information
    showFriendshipDetailsModal(friendshipId);
};

// Add the friendship details modal function
const showFriendshipDetailsModal = async (friendshipId) => {
    try {
        console.log(`🔄 Loading friendship details for ID: ${friendshipId}`);
        
        // Fetch detailed friendship data
        const response = await fetch(`/api/admin/friendships/${friendshipId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch friendship details');
        }
        
        const friendship = await response.json();
        
        // Create and show modal
        const modal = createFriendshipDetailsModal(friendship);
        document.body.appendChild(modal);
        
        // Show the modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        console.log('✅ Friendship details modal shown');
    } catch (error) {
        console.error('❌ Error loading friendship details:', error);
        alert(`Error loading friendship details: ${error.message}`);
    }
};

// Create the friendship details modal
const createFriendshipDetailsModal = (friendship) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    modal.id = 'friendshipDetailsModal';
    
    const createdDate = new Date(friendship.created_at).toLocaleString();
    const statusClass = friendship.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    
    modal.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900">Friendship Details</h3>
                <button class="text-gray-400 hover:text-gray-600 close-modal-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-900 mb-2">Friendship ID: ${friendship.id}</h4>
                    
                    <div class="grid grid-cols-1 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Requester</label>
                            <p class="text-sm text-gray-900">${friendship.requester_name}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Addressee</label>
                            <p class="text-sm text-gray-900">${friendship.addressee_name}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Status</label>
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                                ${friendship.status}
                            </span>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Created</label>
                            <p class="text-sm text-gray-900">${createdDate}</p>
                        </div>
                        
                        ${friendship.accepted_at ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Accepted</label>
                            <p class="text-sm text-gray-900">${new Date(friendship.accepted_at).toLocaleString()}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="bg-blue-50 rounded-lg p-4">
                    <h5 class="font-medium text-blue-900 mb-2">Actions</h5>
                    <div class="space-y-2">
                        ${friendship.status === 'pending' ? `
                        <button class="w-full bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700" 
                                onclick="approveFriendship(${friendship.id})">
                            <i class="fas fa-check mr-2"></i>Approve Friendship
                        </button>
                        <button class="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700" 
                                onclick="rejectFriendship(${friendship.id})">
                            <i class="fas fa-times mr-2"></i>Reject Friendship
                        </button>
                        ` : ''}
                        
                        <button class="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700" 
                                onclick="deleteFriendship(${friendship.id})">
                            <i class="fas fa-trash mr-2"></i>Delete Friendship
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 flex justify-end">
                <button class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 close-modal-btn">
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners for closing the modal
    modal.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
        });
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
};

// Add friendship management functions
window.approveFriendship = async (friendshipId) => {
    if (!confirm('Are you sure you want to approve this friendship?')) return;
    
    try {
        const response = await fetch(`/api/admin/friendships/${friendshipId}/approve`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to approve friendship');
        
        alert('Friendship approved successfully!');
        document.getElementById('friendshipDetailsModal')?.remove();
        loadFriendshipsData(); // Reload the table
    } catch (error) {
        console.error('Error approving friendship:', error);
        alert(`Error: ${error.message}`);
    }
};

window.rejectFriendship = async (friendshipId) => {
    if (!confirm('Are you sure you want to reject this friendship?')) return;
    
    try {
        const response = await fetch(`/api/admin/friendships/${friendshipId}/reject`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to reject friendship');
        
        alert('Friendship rejected successfully!');
        document.getElementById('friendshipDetailsModal')?.remove();
        loadFriendshipsData(); // Reload the table
    } catch (error) {
        console.error('Error rejecting friendship:', error);
        alert(`Error: ${error.message}`);
    }
};

window.deleteFriendship = async (friendshipId) => {
    if (!confirm('Are you sure you want to permanently delete this friendship? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/admin/friendships/${friendshipId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to delete friendship');
        
        alert('Friendship deleted successfully!');
        document.getElementById('friendshipDetailsModal')?.remove();
        loadFriendshipsData(); // Reload the table
    } catch (error) {
        console.error('Error deleting friendship:', error);
        alert(`Error: ${error.message}`);
    }
};

window.viewSessionDetails = (sessionId) => {
    console.log(`🔍 Viewing session details for ID: ${sessionId}`);
    
    // Show a detailed modal with meetup session information
    showSessionDetailsModal(sessionId);
};

// Add the session details modal function
const showSessionDetailsModal = async (sessionId) => {
    try {
        console.log(`🔄 Loading session details for ID: ${sessionId}`);
        
        // Fetch detailed session data
        const response = await fetch(`/api/admin/meetups/${sessionId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch session details');
        }
        
        const session = await response.json();
        
        // Create and show modal
        const modal = createSessionDetailsModal(session);
        document.body.appendChild(modal);
        
        // Show the modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        console.log('✅ Session details modal shown');
    } catch (error) {
        console.error('❌ Error loading session details:', error);
        alert(`Error loading session details: ${error.message}`);
    }
};

// Create the session details modal
const createSessionDetailsModal = (session) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    modal.id = 'sessionDetailsModal';
    
                results.push({
                    endpoint: endpoint.name,
                    url: endpoint.url,
                    status: status,
                    success: false,
                    error: statusText
                });
                console.log(`❌ ${endpoint.name}: ${status} ${statusText}`);
            }
// Test all API endpoints (for debugging)
const testAllEndpoints = async () => {
    const results = [];
    const endpoints = [
        { name: 'Dashboard Stats', url: '/api/analytics/dashboard-stats' },
        { name: 'Charts Data', url: '/api/analytics/charts-data' },
        { name: 'Users List', url: '/api/users' },
        { name: 'Database Info', url: '/api/db-info' },
        { name: 'System Logs', url: '/api/logs' }
    ];
    
    console.log('🧪 Testing all API endpoints...');
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint.url, {
                credentials: 'include'
            });
            
            if (response.ok) {
                results.push({
                    endpoint: endpoint.name,
                    url: endpoint.url,
                    status: response.status,
                    success: true
                });
                console.log(`✅ ${endpoint.name}: ${response.status} OK`);
            } else {
                results.push({
                    endpoint: endpoint.name,
                    url: endpoint.url,
                    status: response.status,
                    success: false,
                    error: response.statusText
                });
                console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            results.push({
                endpoint: endpoint.name,
                url: endpoint.url,
                status: 'ERROR',
                success: false,
                error: error.message
            });
            console.log(`💥 ${endpoint.name}: ${error.message}`);
        }
    }
    
    console.table(results);
    return results;
};

// Auto-test endpoints when dashboard loads (for debugging)
console.log('🔧 Debug function available: testAllEndpoints()');

// Add this function after the existing renderUserTable function:

// Filter users table based on search term
const filterUsersTable = (searchTerm) => {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) return;
    
    const rows = userTableBody.querySelectorAll('tr');
    let visibleRows = 0;
    
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 0) return; // Skip if no cells found
            
            const username = cells[0]?.textContent?.toLowerCase() || '';
            const email = cells[1]?.textContent?.toLowerCase() || '';
            const role = cells[2]?.textContent?.toLowerCase() || '';
            
            const matchesSearch = username.includes(searchTerm) || 
                                 email.includes(searchTerm) || 
                                 role.includes(searchTerm);
            
            if (matchesSearch) {
                row.style.display = '';
                visibleRows++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Show "no results" message if no rows are visible
        if (visibleRows === 0 && searchTerm.trim() !== '') {
            const noResultsRow = document.createElement('tr');
            noResultsRow.innerHTML = `<td colspan="6" class="text-center py-8 text-gray-500">No users found matching "${searchTerm}"</td>`;
            noResultsRow.id = 'noResultsRow';
            
            // Remove existing no results row if it exists
            const existingNoResults = userTableBody.querySelector('#noResultsRow');
            if (existingNoResults) {
                existingNoResults.remove();
            }
            
            userTableBody.appendChild(noResultsRow);
        } else {
            // Remove no results row if it exists
            const existingNoResults = userTableBody.querySelector('#noResultsRow');
            if (existingNoResults) {
                existingNoResults.remove();
            }
        }
    };

    // Report generation functions
window.generateReport = async (reportType) => {
    console.log(`🔄 Generating ${reportType} report...`);
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('reportLoadingIndicator');
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    
    try {
        const response = await fetch(`/api/reports/${reportType}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to generate ${reportType} report`);
        }
        
        const reportData = await response.json();
        
        // Process and download the report
        downloadReport(reportData, reportType);
        
        // Add to recent reports
        addToRecentReports(reportType, reportData.summary);
        
        console.log(`✅ ${reportType} report generated successfully`);
        alert(`${reportType} report generated successfully!`);
        
    } catch (error) {
        console.error(`❌ Error generating ${reportType} report:`, error);
        alert(`Error generating ${reportType} report: ${error.message}`);
    } finally {
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }
};

// Download report as CSV
const downloadReport = (reportData, reportType) => {
    let csvContent = '';
    let filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    
    if (reportData.data && reportData.data.length > 0) {
        // Create CSV headers
        const headers = Object.keys(reportData.data[0]);
        csvContent = headers.join(',') + '\n';
        
        // Add data rows
        reportData.data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header];
                // Escape commas and quotes in values
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            });
            csvContent += values.join(',') + '\n';
        });
    } else {
        csvContent = 'No data available for this report\n';
    }
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Add report to recent reports list
const addToRecentReports = (reportType, summary) => {
    const recentReportsList = document.getElementById('recentReportsList');
    if (!recentReportsList) return;
    
    // Clear "No reports" message
    if (recentReportsList.innerHTML.includes('No reports generated yet')) {
        recentReportsList.innerHTML = '';
    }
    
    const timestamp = new Date().toLocaleString();
    const reportItem = document.createElement('div');
    reportItem.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-md';
    reportItem.innerHTML = `
        <div>
            <p class="font-medium text-gray-900">${reportType.replace('-', ' ').toUpperCase()} Report</p>
            <p class="text-sm text-gray-600">${timestamp}</p>
            ${summary ? `<p class="text-xs text-gray-500">${summary}</p>` : ''}
        </div>
        <div class="flex space-x-2">
            <button onclick="regenerateReport('${reportType}')" class="text-blue-600 hover:text-blue-800 text-sm">
                <i class="fas fa-redo mr-1"></i>Regenerate
            </button>
            <button onclick="removeReportFromHistory(this)" class="text-red-600 hover:text-red-800 text-sm">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to top of list
    recentReportsList.insertBefore(reportItem, recentReportsList.firstChild);
    
    // Keep only last 10 reports
    while (recentReportsList.children.length > 10) {
        recentReportsList.removeChild(recentReportsList.lastChild);
    }
};

// Regenerate a report
window.regenerateReport = (reportType) => {
    generateReport(reportType);
};

// Remove report from history
window.removeReportFromHistory = (button) => {
    const reportItem = button.closest('div.flex.justify-between');
    if (reportItem) {
        reportItem.remove();
    }
    
    // Check if list is empty and show message
    const recentReportsList = document.getElementById('recentReportsList');
    if (recentReportsList && recentReportsList.children.length === 0) {
        recentReportsList.innerHTML = '<p class="text-gray-500 text-sm">No reports generated yet.</p>';
    }
};

// Clear all report history
window.clearReportHistory = () => {
    if (!confirm('Are you sure you want to clear all report history?')) return;
    
    const recentReportsList = document.getElementById('recentReportsList');
    if (recentReportsList) {
        recentReportsList.innerHTML = '<p class="text-gray-500 text-sm">No reports generated yet.</p>';
    }
};

// Custom report modal functions
window.showCustomReportModal = () => {
    const modal = document.getElementById('customReportModal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('customReportEndDate').value = endDate.toISOString().split('T')[0];
        document.getElementById('customReportStartDate').value = startDate.toISOString().split('T')[0];
    }
};

window.hideCustomReportModal = () => {
    const modal = document.getElementById('customReportModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// Export all data
window.exportAllData = async () => {
    if (!confirm('This will export all application data. This may take a while. Continue?')) return;
    
    const loadingIndicator = document.getElementById('reportLoadingIndicator');
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    
    try {
        const response = await fetch('/api/reports/export-all', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to export all data');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `full_data_export_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        alert('Full data export completed successfully!');
    } catch (error) {
        console.error('Error exporting all data:', error);
        alert(`Error exporting data: ${error.message}`);
    } finally {
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }
};

// Handle custom report form submission
document.addEventListener('DOMContentLoaded', () => {
    const customReportForm = document.getElementById('customReportForm');
    if (customReportForm) {
        customReportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const reportType = document.getElementById('customReportType').value;
            const startDate = document.getElementById('customReportStartDate').value;
            const endDate = document.getElementById('customReportEndDate').value;
            const format = document.getElementById('customReportFormat').value;
            
            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                return;
            }
            
            hideCustomReportModal();
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('reportLoadingIndicator');
            if (loadingIndicator) loadingIndicator.classList.remove('hidden');
            
            try {
                const response = await fetch('/api/reports/custom', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        reportType,
                        startDate,
                        endDate,
                        format
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to generate custom report');
                }
                
                const reportData = await response.json();
                downloadReport(reportData, `custom_${reportType}_${startDate}_to_${endDate}`);
                addToRecentReports(`Custom ${reportType}`, `${startDate} to ${endDate}`);
                
                alert('Custom report generated successfully!');
            } catch (error) {
                console.error('Error generating custom report:', error);
                alert(`Error generating custom report: ${error.message}`);
            } finally {
                if (loadingIndicator) loadingIndicator.classList.add('hidden');
            }
        });
    }
});

// --- NOTIFICATION SYSTEM ---

// Notification management
// Replace the existing notification functions with these clean versions:

// Notification management
let notifications = [];
let notificationCount = 0;

// Initialize notifications on page load
const initializeNotifications = async () => {
    try {
        await loadNotifications();
        updateNotificationBadge();
        
        // Set up periodic notification checking (every 30 seconds)
        setInterval(loadNotifications, 30000);
        
        console.log('✅ Notification system initialized');
    } catch (error) {
        console.error('❌ Error initializing notifications:', error);
    }
};

// Load notifications from server (CLEAN VERSION - NO FAKE DATA)
const loadNotifications = async () => {
    try {
        const response = await fetch('/api/admin/notifications', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch notifications');
        }
        
        const data = await response.json();
        notifications = data.notifications || [];
        notificationCount = notifications.filter(n => !n.read).length;
        
        updateNotificationBadge();
        
        console.log(`🔔 Loaded ${notifications.length} notifications (${notificationCount} unread)`);
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
        
        // Start with empty notifications - NO FAKE DATA
        notifications = [];
        notificationCount = 0;
        updateNotificationBadge();
    }
};

// Update notification badge (CLEAN VERSION)
const updateNotificationBadge = () => {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        if (notificationCount > 0) {
            badge.textContent = notificationCount > 99 ? '99+' : notificationCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
};

// Show notification dropdown (CLEAN VERSION)
const showNotificationDropdown = () => {
    // Remove existing dropdown if it exists
    const existingDropdown = document.getElementById('notificationDropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return; // Toggle behavior
    }
    
    const dropdown = document.createElement('div');
    dropdown.id = 'notificationDropdown';
    dropdown.className = 'absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden';
    
    let dropdownContent = `
        <div class="p-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
                <h3 class="font-semibold text-gray-900">Notifications</h3>
                <div class="flex space-x-2">
                    ${notifications.length > 0 ? `
                        <button onclick="markAllAsRead()" class="text-xs text-blue-600 hover:text-blue-800">
                            Mark all read
                        </button>
                        <button onclick="clearAllNotifications()" class="text-xs text-red-600 hover:text-red-800">
                            Clear all
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
        <div class="max-h-64 overflow-y-auto">
    `;
    
    if (notifications.length === 0) {
        dropdownContent += `
            <div class="p-6 text-center text-gray-500">
                <i class="fas fa-bell-slash text-3xl mb-3 block text-gray-300"></i>
                <p class="text-sm">No notifications</p>
                <p class="text-xs text-gray-400 mt-1">You're all caught up!</p>
            </div>
        `;
    } else {
        notifications.forEach(notification => {
            const timeAgo = getTimeAgo(new Date(notification.created_at));
            const iconClass = getNotificationIcon(notification.type);
            const bgClass = notification.read ? 'bg-gray-50' : 'bg-blue-50';
            
            dropdownContent += `
                <div class="p-3 border-b border-gray-100 ${bgClass} hover:bg-gray-100 cursor-pointer" 
                     onclick="markAsRead(${notification.id})">
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0">
                            <i class="${iconClass} text-sm"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                            <p class="text-xs text-gray-600 mt-1">${notification.message}</p>
                            <p class="text-xs text-gray-400 mt-1">${timeAgo}</p>
                        </div>
                        ${!notification.read ? '<div class="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>' : ''}
                    </div>
                </div>
            `;
        });
    }
    
    dropdownContent += `
        </div>
        ${notifications.length > 0 ? `
            <div class="p-3 border-t border-gray-200 text-center">
                <button onclick="viewAllNotifications()" class="text-sm text-blue-600 hover:text-blue-800">
                    View all notifications
                </button>
            </div>
        ` : ''}
    `;
    
    dropdown.innerHTML = dropdownContent;
    
    // Add dropdown to notification button container
    const notificationButton = document.querySelector('.notification-button');
    if (notificationButton) {
        notificationButton.appendChild(dropdown);
    }
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!notificationButton.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 100);
};

// Get notification icon based on type
const getNotificationIcon = (type) => {
    const icons = {
        'info': 'fas fa-info-circle text-blue-600',
        'success': 'fas fa-check-circle text-green-600',
        'warning': 'fas fa-exclamation-triangle text-yellow-600',
        'error': 'fas fa-times-circle text-red-600',
        'user': 'fas fa-user text-purple-600',
        'system': 'fas fa-cog text-gray-600'
    };
    return icons[type] || icons['info'];
};

// Get time ago string
const getTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
};

// Mark notification as read
window.markAsRead = async (notificationId) => {
    try {
        const response = await fetch(`/api/admin/notifications/${notificationId}/read`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            // Update local notification
            const notification = notifications.find(n => n.id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                notificationCount = Math.max(0, notificationCount - 1);
                updateNotificationBadge();
            }
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        // Update locally anyway for demo
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            notificationCount = Math.max(0, notificationCount - 1);
            updateNotificationBadge();
        }
    }
    
    // Close dropdown
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.remove();
};

// Mark all notifications as read
window.markAllAsRead = async () => {
    try {
        const response = await fetch('/api/admin/notifications/mark-all-read', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            notifications.forEach(n => n.read = true);
            notificationCount = 0;
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        // Update locally anyway for demo
        notifications.forEach(n => n.read = true);
        notificationCount = 0;
        updateNotificationBadge();
    }
    
    // Close dropdown
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.remove();
};

// Clear all notifications
window.clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    
    try {
        const response = await fetch('/api/admin/notifications/clear', {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            notifications = [];
            notificationCount = 0;
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error clearing notifications:', error);
        // Update locally anyway for demo
        notifications = [];
        notificationCount = 0;
        updateNotificationBadge();
    }
    
    // Close dropdown
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.remove();
};

// View all notifications (placeholder)
window.viewAllNotifications = () => {
    alert('View all notifications feature coming soon!');
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.remove();
};

// Add notification (for testing/demo)
const addNotification = (type, title, message) => {
    const newNotification = {
        id: Date.now(),
        type: type,
        title: title,
        message: message,
        read: false,
        created_at: new Date().toISOString()
    };
    
    notifications.unshift(newNotification);
    notificationCount++;
    updateNotificationBadge();
    
    console.log(`🔔 New notification: ${title}`);
};

// Add to the existing DOMContentLoaded event listener
// Find the existing DOMContentLoaded and add this call
// Add this to the end of your existing DOMContentLoaded function:
    
// Initialize notifications
initializeNotifications();

const loadNewsPostsData = async () => {
    const newsPostsTableBody = document.getElementById('newsPostsTableBody');
    if (!newsPostsTableBody) return;

    newsPostsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">Loading news posts...</td></tr>`;

    try {
        // Load both posts and analytics
        const [postsResponse, analyticsResponse] = await Promise.all([
            fetch('/api/admin/news-posts', { credentials: 'include' }),
            fetch('/api/admin/news-posts/analytics', { credentials: 'include' })
        ]);
        
        if (!postsResponse.ok || !analyticsResponse.ok) throw new Error('Failed to fetch news data');
        
        const postsData = await postsResponse.json();
        const analyticsData = await analyticsResponse.json();
        
        const posts = postsData.posts;
        const analytics = analyticsData.analytics;
        
        // Create a map of analytics by post ID
        const analyticsMap = {};
        analytics.forEach(item => {
            analyticsMap[item.id] = item;
        });

        newsPostsTableBody.innerHTML = '';

        if (posts.length === 0) {
            newsPostsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-500">No news posts found</td></tr>`;
            return;
        }

        posts.forEach(post => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            const createdDate = new Date(post.created_at).toLocaleDateString();
            const analytics = analyticsMap[post.id] || { total_likes: 0, unique_users_liked: 0 };
            
            const typeInfo = getPostTypeDisplay(post.post_type);
            const priorityInfo = getPriorityDisplay(post.priority);
            const statusInfo = getStatusDisplay(post.is_active);

            row.innerHTML = `
                <td class="px-4 py-4">
                    <div class="text-sm font-medium text-gray-900">${post.title}</div>
                    <div class="text-sm text-gray-500">${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}</div>
                </td>
                <td class="px-4 py-4">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeInfo.class}">
                        ${typeInfo.label}
                    </span>
                </td>
                <td class="px-4 py-4">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityInfo.class}">
                        ${priorityInfo.label}
                    </span>
                </td>
                <td class="px-4 py-4">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}">
                        ${statusInfo.label}
                    </span>
                </td>
                <td class="px-4 py-4">
                    <div class="text-sm text-gray-900">${analytics.total_likes} likes</div>
                    <div class="text-xs text-gray-500">${analytics.unique_users_liked} users</div>
                </td>
                <td class="px-4 py-4 text-sm text-gray-600">${createdDate}</td>
                <td class="px-4 py-4">
                    <div class="flex space-x-2">
                        <button onclick="editNewsPost(${post.id})" class="text-indigo-600 hover:text-indigo-900 text-sm">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </button>
                        <button onclick="toggleNewsPost(${post.id})" class="text-blue-600 hover:text-blue-900 text-sm">
                            <i class="fas fa-toggle-${post.is_active ? 'on' : 'off'} mr-1"></i>
                            ${post.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onclick="deleteNewsPost(${post.id}, '${post.title}')" class="text-red-600 hover:text-red-900 text-sm">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </td>
            `;
            newsPostsTableBody.appendChild(row);
        });

        console.log('✅ News posts loaded with analytics:', posts.length);
    } catch (error) {
        console.error('Error loading news posts:', error);
        newsPostsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-red-600">Failed to load news posts: ${error.message}</td></tr>`;
    }
};

// Helper functions for display
const getPostTypeDisplay = (type) => {
    const types = {
        'announcement': { label: 'Announcement', class: 'bg-blue-100 text-blue-800' },
        'update': { label: 'Update', class: 'bg-green-100 text-green-800' },
        'maintenance': { label: 'Maintenance', class: 'bg-orange-100 text-orange-800' },
        'feature': { label: 'New Feature', class: 'bg-purple-100 text-purple-800' }
    };
    return types[type] || types['announcement'];
};

const getPriorityDisplay = (priority) => {
    const priorities = {
        'low': { label: 'Low', class: 'bg-gray-100 text-gray-800' },
        'normal': { label: 'Normal', class: 'bg-blue-100 text-blue-800' },
        'high': { label: 'High', class: 'bg-red-100 text-red-800' }
    };
    return priorities[priority] || priorities['normal'];
};

const getStatusDisplay = (isActive) => {
    return isActive 
        ? { label: 'Active', class: 'bg-green-100 text-green-800' }
        : { label: 'Inactive', class: 'bg-gray-100 text-gray-800' };
};

// News post management functions
window.editNewsPost = async (postId) => {
    try {
        // For now, we'll fetch the post data from the table
        // In a real app, you'd have a separate endpoint to get single post
        const response = await fetch('/api/admin/news-posts', {
            credentials: 'include'
        });
        const data = await response.json();
        const post = data.posts.find(p => p.id === postId);
        
        if (!post) {
            alert('Post not found');
            return;
        }
        
        showNewsPostModal(post);
    } catch (error) {
        console.error('Error fetching post for edit:', error);
        alert('Error loading post data');
    }
};

window.toggleNewsPost = async (postId) => {
    try {
        const response = await fetch(`/api/admin/news-posts/${postId}/toggle`, {
            method: 'PUT',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to toggle post status');
        
        const result = await response.json();
        alert(result.message);
        loadNewsPostsData(); // Reload the table
    } catch (error) {
        console.error('Error toggling post:', error);
        alert(`Error: ${error.message}`);
    }
};

window.deleteNewsPost = async (postId, title) => {
    if (!confirm(`Are you sure you want to delete the post "${title}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/news-posts/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to delete post');
        
        const result = await response.json();
        alert(result.message);
        loadNewsPostsData(); // Reload the table
    } catch (error) {
        console.error('Error deleting post:', error);
        alert(`Error: ${error.message}`);
    }
};

const showNewsPostModal = (post = null) => {
    const modal = document.getElementById('newsPostModal');
    const form = document.getElementById('newsPostForm');
    const title = document.getElementById('newsPostModalTitle');
    const error = document.getElementById('newsPostFormError');
    
    if (!modal || !form) return;
    
    // Clear form and errors
    form.reset();
    if (error) error.classList.add('hidden');
    
    if (post) {
        // Editing existing post
        title.textContent = 'Edit News Post';
        document.getElementById('newsPostIdHidden').value = post.id;
        document.getElementById('newsPostTitle').value = post.title;
        document.getElementById('newsPostContent').value = post.content;
        document.getElementById('newsPostType').value = post.post_type;
        document.getElementById('newsPostPriority').value = post.priority;
        document.getElementById('newsPostActive').checked = post.is_active;
    } else {
        // Creating new post
        title.textContent = 'Create News Post';
        document.getElementById('newsPostIdHidden').value = '';
        document.getElementById('newsPostActive').checked = true;
    }
    
    modal.classList.remove('hidden');
};

const hideNewsPostModal = () => {
    const modal = document.getElementById('newsPostModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// Add event listeners for news post modal
document.addEventListener('DOMContentLoaded', () => {
    // Add news post button
    const addNewsPostBtn = document.getElementById('addNewsPostBtn');
    if (addNewsPostBtn) {
        addNewsPostBtn.addEventListener('click', () => {
            showNewsPostModal();
        });
    }
    
    // Close modal buttons
    const closeModalBtn = document.getElementById('closeNewsPostModalBtn');
    const cancelBtn = document.getElementById('cancelNewsPostBtn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideNewsPostModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideNewsPostModal);
    }
    
    // Form submission
    const newsPostForm = document.getElementById('newsPostForm');
    if (newsPostForm) {
        newsPostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const postData = {
                title: formData.get('title'),
                content: formData.get('content'),
                post_type: formData.get('post_type'),
                priority: formData.get('priority'),
                is_active: formData.get('is_active') === 'on'
            };
            
            const postId = formData.get('id');
            const isEdit = postId && postId.trim() !== '';
            
            try {
                const url = isEdit ? `/api/admin/news-posts/${postId}` : '/api/admin/news-posts';
                const method = isEdit ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData),
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to save post');
                }
                
                const result = await response.json();
                alert(result.message || 'Post saved successfully');
                hideNewsPostModal();
                loadNewsPostsData(); // Reload the table
                
            } catch (error) {
                console.error('Error saving post:', error);
                const errorDiv = document.getElementById('newsPostFormError');
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('hidden');
                }
            }
        });
    }
});