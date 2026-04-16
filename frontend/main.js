import { Background3D } from './background.js';

// UI Selectors
const form = document.getElementById('rl-agent-form');
const submitBtn = document.getElementById('submit-btn');
const output = document.getElementById('output');
const subtasksContainer = document.getElementById('subtasks');
const resultContainer = document.getElementById('result');
const statusBadge = document.getElementById('connection-status');
const finalCard = document.getElementById('final-card');
const settingsTrigger = document.getElementById('settings-trigger');
const settingsPanel = document.getElementById('settings-panel');

// Initialize Lucide Icons
lucide.createIcons();

// Scroll Reveal Logic
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal, .stagger-reveal').forEach(el => observer.observe(el));

// Initialize 3D Background
new Background3D();

// Settings Toggle Logic
settingsTrigger.addEventListener('click', () => {
    const isOpen = settingsPanel.style.maxHeight !== '0px' && settingsPanel.style.maxHeight !== '';
    settingsPanel.style.maxHeight = isOpen ? '0px' : '200px';
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const goal = document.getElementById('goal').value;
    let backendUrl = document.getElementById('backend-url').value;
    if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);

    // UI State Transformation
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width: 18px;"></i> SYNCHRONIZING...';
    lucide.createIcons();
    
    output.innerHTML = '<div style="color:var(--text-dim)">Initializing neural link...</div>';
    subtasksContainer.innerHTML = '';
    resultContainer.textContent = 'Processing...';
    finalCard.style.display = 'none';
    statusBadge.style.display = 'block';
    statusBadge.textContent = 'Linking with Brain...';
    statusBadge.style.color = 'hsla(var(--primary), 1)';

    try {
        const response = await fetch(`${backendUrl}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal: goal }),
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const data = await response.json();
        statusBadge.textContent = 'Link Established';
        statusBadge.style.color = '#3fb950';

        // Clear placeholder
        output.innerHTML = '';

        // Render Subtasks with Staggered Animation
        if (data.subtasks) {
            data.subtasks.forEach((subtask, index) => {
                setTimeout(() => {
                    const div = document.createElement('div');
                    div.className = 'subtask-card';
                    div.innerHTML = `<strong>${index + 1}</strong> &nbsp; ${subtask}`;
                    subtasksContainer.appendChild(div);
                }, index * 100);
            });
        }

        // Render Execution Logs
        if (data.agent_output && data.agent_output.length > 0) {
            data.agent_output.forEach((item, index) => {
                setTimeout(() => {
                    const log = document.createElement('div');
                    log.style.marginBottom = '0.75rem';
                    log.style.padding = '0.5rem';
                    log.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    log.innerHTML = `<span style="color:hsla(var(--accent), 1)">[STEP ${item.step}]</span> ${item.action} &rarr; <span style="color:#3fb950; font-weight:bold">${item.status}</span>`;
                    output.appendChild(log);
                    output.scrollTop = output.scrollHeight;

                    // Show final card after last log
                    if (index === data.agent_output.length - 1) {
                        setTimeout(() => {
                            finalCard.style.display = 'block';
                            finalCard.style.animation = 'fadeIn 0.5s ease-out';
                            resultContainer.textContent = data.result || 'Goal Achieved Successfully.';
                        }, 500);
                    }
                }, index * 200 + 500);
            });
        } else {
            // If no logs but result exists
            finalCard.style.display = 'block';
            resultContainer.textContent = data.result || 'Task completed.';
        }

    } catch (error) {
        statusBadge.textContent = 'Neural Link Error';
        statusBadge.style.color = '#f85149';
        finalCard.style.display = 'block';
        finalCard.style.borderColor = '#f85149';
        resultContainer.textContent = `Termination: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="power" style="width: 18px;"></i> INITIATE AGENT';
        lucide.createIcons();
    }
});

// Spin animation and Global Overrides
const setupUX = () => {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
}
setupUX();
