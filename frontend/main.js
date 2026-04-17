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
const reportSection = document.getElementById('mission-report-section');
const reportContent = document.getElementById('report-content');
const copyBtn = document.getElementById('copy-report-btn');
const downloadBtn = document.getElementById('download-report-btn');
const processingView = document.getElementById('processing-view');
const processingText = document.getElementById('processing-text');
const progressBarParent = document.getElementById('mission-progress-parent');
const progressBarFill = document.getElementById('mission-progress-fill');

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
    
    output.innerHTML = '';
    subtasksContainer.innerHTML = '';
    reportContent.innerHTML = '';
    reportSection.style.display = 'none';
    processingView.style.display = 'block';
    finalCard.style.display = 'none';
    statusBadge.style.display = 'block';
    statusBadge.textContent = 'Synchronizing with Life Engine...';
    statusBadge.style.color = 'hsla(var(--primary), 1)';

    try {
        const response = await fetch(`${backendUrl}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal: goal }),
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const data = await response.json();
        statusBadge.textContent = 'Mission Ready';
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

                    // Show final outcomes after last log
                    if (index === data.agent_output.length - 1) {
                        setTimeout(() => {
                            // Render Final Mission Report
                            renderMissionReport(goal, data.subtasks);
                            
                            finalCard.style.display = 'block';
                            finalCard.style.animation = 'fadeIn 0.5s ease-out';
                            resultContainer.textContent = data.result || 'Mission Objectives Materialized Successfully.';
                        }, 500);
                    }
                }, index * 200 + 1000);
            });
        } else {
            // If no logs but result exists, still try to render report if subtasks exist
            if (data.subtasks && data.subtasks.length > 0) {
                renderMissionReport(goal, data.subtasks);
            }
            finalCard.style.display = 'block';
            resultContainer.textContent = data.result || 'Mission completed.';
        }

    } catch (error) {
        statusBadge.textContent = 'Neural Link Error';
        statusBadge.style.color = '#f85149';
        finalCard.style.display = 'block';
        finalCard.style.borderColor = '#f85149';
        resultContainer.textContent = `Termination: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="play" style="width: 18px;"></i> INITIATE MISSION';
        lucide.createIcons();
    }
});

// Report Logic
const renderMissionReport = (goal, subtasks) => {
    processingView.style.display = 'none';
    progressBarParent.style.display = 'block';
    reportSection.style.display = 'block';
    reportSection.classList.add('active');
    
    // Check for saved progress for this goal
    const savedState = JSON.parse(localStorage.getItem(`goal_${goal}`)) || {};
    
    let html = `<h2>Mission Outcome: ${goal}</h2>`;
    html += `<p>Interactive Checklist: Track your execution progress below.</p>`;
    html += `<div class="checklist">`;
    
    subtasks.forEach((task, index) => {
        if (task.trim()) {
            const isChecked = savedState[index] ? 'checked' : '';
            const completedClass = savedState[index] ? 'completed' : '';
            html += `
                <div class="task-item ${completedClass}" data-index="${index}">
                    <input type="checkbox" class="task-checkbox" ${isChecked}>
                    <span>${task}</span>
                </div>`;
        }
    });
    
    html += `</div>`;
    html += `<p style="margin-top: 2rem; color: var(--text-dim); font-size: 0.8rem;"><i>&copy; Generated by Goal.Personal Autonomous Executive</i></p>`;
    
    reportContent.innerHTML = html;
    updateProgress(goal);
    
    // Add Event Listeners for checkboxes
    const checkboxes = reportContent.querySelectorAll('.task-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const item = e.target.closest('.task-item');
            const index = item.getAttribute('data-index');
            
            if (e.target.checked) {
                item.classList.add('completed');
            } else {
                item.classList.remove('completed');
            }
            
            saveGoalProgress(goal, index, e.target.checked);
            updateProgress(goal);
        });
    });
    
    reportSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const saveGoalProgress = (goal, index, isChecked) => {
    const key = `goal_${goal}`;
    const state = JSON.parse(localStorage.getItem(key)) || {};
    state[index] = isChecked;
    localStorage.setItem(key, JSON.stringify(state));
};

const updateProgress = (goal) => {
    const key = `goal_${goal}`;
    const state = JSON.parse(localStorage.getItem(key)) || {};
    const items = document.querySelectorAll('.task-item');
    
    if (items.length === 0) return;
    
    const completedCount = Object.values(state).filter(val => val === true).length;
    const percentage = (completedCount / items.length) * 100;
    
    progressBarFill.style.width = `${percentage}%`;
    
    if (percentage === 100) {
        progressBarFill.style.background = 'linear-gradient(to right, #3fb950, #2ea043)';
    } else {
        progressBarFill.style.background = 'linear-gradient(to right, hsla(var(--primary), 1), hsla(var(--accent), 1))';
    }
};

copyBtn.addEventListener('click', () => {
    const text = reportContent.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i data-lucide="check" style="width: 16px;"></i>';
        lucide.createIcons();
        setTimeout(() => {
            copyBtn.innerHTML = originalIcon;
            lucide.createIcons();
        }, 2000);
    });
});

downloadBtn.addEventListener('click', () => {
    const text = reportContent.innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mission_Report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

// Zenith Animations & Interactivity
const setupZenith = () => {
    // 1. Counter Animations
    const counters = document.querySelectorAll('.stat-value[data-target]');
    const animateCounters = () => {
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            let count = 0;
            const increment = target / 100;
            const updateCount = () => {
                if (count < target) {
                    count += increment;
                    counter.innerText = Math.ceil(count).toLocaleString() + (target > 500 ? '+' : '');
                    setTimeout(updateCount, 20);
                } else {
                    counter.innerText = target.toLocaleString() + (target > 500 ? '+' : '');
                }
            };
            updateCount();
        });
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const dashboard = document.querySelector('.success-dashboard');
    if (dashboard) observer.observe(dashboard);

    // 2. Blueprint Interaction
    const blueprints = document.querySelectorAll('.blueprint-pill');
    blueprints.forEach(pill => {
        pill.addEventListener('click', () => {
            const goalInput = document.getElementById('goal');
            goalInput.value = pill.innerText;
            goalInput.focus();
            goalInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
};

// Global Overrides & Initialization
const setupUX = () => {
    setupZenith();
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
}
setupUX();
