/**
 * notifications.js
 * Toast notification system for providing executive feedback.
 */

class NotificationSystem {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Shows a toast notification.
     * @param {string} message - Content of the toast.
     * @param {'success' | 'error' | 'info' | 'warning'} type - Visual style.
     * @param {number} duration - ms to show.
     */
    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this._getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-content" style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; background: rgba(255,255,255,0.05); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; min-width: 250px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: auto;">
                <i data-lucide="${icon}" style="width: 18px; color: ${this._getColor(type)};"></i>
                <span style="font-size: 0.85rem; font-weight: 500;">${message}</span>
            </div>
        `;

        this.container.appendChild(toast);
        lucide.createIcons();

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    _getIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'alert-circle';
            case 'warning': return 'alert-triangle';
            default: return 'info';
        }
    }

    _getColor(type) {
        switch(type) {
            case 'success': return '#3fb950';
            case 'error': return '#f85149';
            case 'warning': return '#d29922';
            default: return 'hsla(var(--primary), 1)';
        }
    }
}

// Global CSS for toasts (injected if not in CSS file)
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
    }
    .toast {
        transition: all 0.4s ease;
    }
`;
document.head.appendChild(style);

window.notifications = new NotificationSystem();
