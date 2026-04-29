/**
 * @file main.js
 * @description Core application controller for the Personal Goal Assistant.
 * Orchestrates UI interactions, mission synchronization, and state management.
 * @version 2.1.0
 */

import { Background3D } from './background.js';
import { ZenithLab } from './lab.js';
import { QuantumForge } from './forge.js';
import { AuraNexus } from './aura.js';
import { NeuralArchive } from './archive.js';
import { ChronosEngine } from './chronos.js';
import { MomentumMatrix } from './momentum.js';
import { OracleFeed } from './oracle.js';
import { GauntletProtocol } from './gauntlet.js';

/**
 * AppController manages the main lifecycle of the Personal Goal Assistant frontend.
 */
class AppController {
    constructor() {
        this.api = new ApiClient('http://localhost:5000');
        
        /** @type {Object} UI Selectors */
        this.dom = {
            form: document.getElementById('rl-agent-form'),
            submitBtn: document.getElementById('submit-btn'),
            output: document.getElementById('output'),
            subtasksContainer: document.getElementById('subtasks'),
            resultContainer: document.getElementById('result'),
            statusBadge: document.getElementById('connection-status'),
            finalCard: document.getElementById('final-card'),
            settingsTrigger: document.getElementById('settings-trigger'),
            settingsPanel: document.getElementById('settings-panel'),
            reportSection: document.getElementById('mission-report-section'),
            reportContent: document.getElementById('report-content'),
            copyBtn: document.getElementById('copy-report-btn'),
            downloadBtn: document.getElementById('download-report-btn'),
            processingView: document.getElementById('processing-view'),
            historySection: document.getElementById('history-section'),
            historyList: document.getElementById('mission-history-list'),
            goalInput: document.getElementById('goal'),
            backendUrlInput: document.getElementById('backend-url'),
            userRank: document.getElementById('user-rank'),
            userLevel: document.getElementById('user-level'),
            userXp: document.getElementById('user-xp'),
            xpBarFill: document.getElementById('xp-bar-fill'),
            progressBarFill: document.getElementById('progress-bar-fill'),
            mainNav: document.getElementById('main-nav'),
            mobileMenuBtn: document.getElementById('mobile-menu-btn'),
            sideDrawer: document.getElementById('side-drawer'),
            drawerOverlay: document.getElementById('drawer-overlay'),
            closeDrawerBtn: document.getElementById('close-drawer'),
            progressBar: document.getElementById('progress-bar-fill')?.parentElement,
            progressLabel: document.getElementById('processing-view')?.querySelector('h3')
        };

        this.init();
    }

    /**
     * Initializes the application components and event listeners.
     */
    init() {
        lucide.createIcons();
        this.setupObservers();
        this.setupEventListeners();
        this.setupZenith();
        this.loadMissions();
        this.loadUserStats();
        this.setupRouter();
        
        // Initialize supporting modules with error boundaries
        try { new Background3D(); } catch(e) { console.error("Background3D init failed:", e); }
        try { window.zenithLab = new ZenithLab(); } catch(e) { console.error("ZenithLab init failed:", e); }
        try { window.quantumForge = new QuantumForge(); } catch(e) { console.error("QuantumForge init failed:", e); }
        try { window.auraNexus = new AuraNexus(); } catch(e) { console.error("AuraNexus init failed:", e); }
        try { window.neuralArchive = new NeuralArchive(); } catch(e) { console.error("NeuralArchive init failed:", e); }
        try { window.chronosEngine = new ChronosEngine(); } catch(e) { console.error("ChronosEngine init failed:", e); }
        try { window.momentumMatrix = new MomentumMatrix(); } catch(e) { console.error("MomentumMatrix init failed:", e); }
        try { window.oracleFeed = new OracleFeed(); } catch(e) { console.error("OracleFeed init failed:", e); }
        try { window.gauntletProtocol = new GauntletProtocol(); } catch(e) { console.error("GauntletProtocol init failed:", e); }

        console.log("[*] Personal Goal Assistant successfully initialized.");
    }

    /**
     * Set up IntersectionObservers for scroll animations.
     */
    setupObservers() {
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
    }

    /**
     * Attaches global event listeners to DOM elements.
     */
    setupEventListeners() {
        // Settings Toggle — use a CSS class flag to avoid empty-string false positives
        this.dom.settingsTrigger.addEventListener('click', () => {
            const isOpen = this.dom.settingsPanel.classList.contains('open');
            if (isOpen) {
                this.dom.settingsPanel.classList.remove('open');
                this.dom.settingsPanel.style.maxHeight = '0px';
            } else {
                this.dom.settingsPanel.classList.add('open');
                this.dom.settingsPanel.style.maxHeight = '200px';
            }
        });

        // Form Submission
        this.dom.form.addEventListener('submit', (e) => this.handleMissionSubmission(e));

        // Report Actions
        this.dom.copyBtn.addEventListener('click', () => this.copyReportToClipboard());
        this.dom.downloadBtn.addEventListener('click', () => this.downloadReport());

        // Dynamic Elements Delegation (Blueprint Pills)
        document.querySelectorAll('.blueprint-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                this.dom.goalInput.value = pill.innerText;
                this.dom.goalInput.focus();
                this.dom.goalInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });

        // Mobile Drawer Toggles — bound to class method for consistent access
        this.dom.mobileMenuBtn.addEventListener('click', () => this.toggleDrawer(true));
        this.dom.closeDrawerBtn.addEventListener('click', () => this.toggleDrawer(false));
        this.dom.drawerOverlay.addEventListener('click', () => this.toggleDrawer(false));

        // Scroll Effects
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                this.dom.mainNav.classList.add('scrolled');
            } else {
                this.dom.mainNav.classList.remove('scrolled');
            }
            this.updateActiveNavLink();
        });

        // Global Navigation Delegation
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button');
            if (!target) return;

            // Section link handling: smooth-scroll to in-page anchors
            const href = target.getAttribute('href') || '';
            if (href.startsWith('#') && !href.startsWith('#/')) {
                const targetId = href.substring(1);
                const currentHash = window.location.hash;
                const isOnHome = currentHash === '' || currentHash === '#' || currentHash === '#/';

                if (!isOnHome) {
                    // Navigate home first, then scroll to the section
                    e.preventDefault();
                    window.location.hash = '#/';
                    setTimeout(() => {
                        const el = document.getElementById(targetId);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 350);
                }
                // Close mobile drawer if open
                this.toggleDrawer(false);
            }
        });
    }

    /**
     * Toggles the mobile side drawer open or closed.
     * @param {boolean} active
     */
    toggleDrawer(active) {
        this.dom.sideDrawer.classList.toggle('active', active);
        this.dom.drawerOverlay.classList.toggle('active', active);
        document.body.style.overflow = active ? 'hidden' : '';
    }

    /**
     * Updates the active state of navigation links based on current scroll position.
     */
    updateActiveNavLink() {
        const sections = ['how-it-works', 'modules', 'use-cases', 'app-section'];
        let current = '';

        sections.forEach(section => {
            const el = document.getElementById(section);
            if (el) {
                const rect = el.getBoundingClientRect();
                if (rect.top <= 150) {
                    current = section;
                }
            }
        });

        document.querySelectorAll('.nav-links a').forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === `#${current}`) {
                a.classList.add('active');
            }
        });
    }

    /**
     * Initializes the hash-based router.
     */
    setupRouter() {
        window.addEventListener('hashchange', () => this.handleRouting());
        this.handleRouting(); // Initial load
    }

    /**
     * Orchestrates page transitions based on current hash.
     * Disposes previous page resources before switching.
     */
    handleRouting() {
        const hash = window.location.hash || '#/';
        const prevHash = this._activeHash || '';
        this._activeHash = hash;

        // Dispose the module that was previously active (free Three.js GPU resources)
        this._disposeModule(prevHash);

        // Hide all pages, scroll to top
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        window.scrollTo(0, 0);

        // Route mapping
        if (hash === '#/' || hash === '') {
            document.getElementById('page-home').classList.add('active');
        } else if (hash === '#/console') {
            document.getElementById('page-console').classList.add('active');
        } else if (hash === '#/lab') {
            document.getElementById('page-lab').classList.add('active');
            if (window.zenithLab) window.zenithLab.open();
        } else if (hash === '#/forge') {
            document.getElementById('page-forge').classList.add('active');
            if (window.quantumForge) window.quantumForge.open();
        } else if (hash === '#/aura') {
            document.getElementById('page-aura').classList.add('active');
            if (window.auraNexus) window.auraNexus.open();
        } else if (hash === '#/archive') {
            document.getElementById('page-archive').classList.add('active');
            if (window.neuralArchive) window.neuralArchive.open();
        } else if (hash === '#/chronos') {
            document.getElementById('page-chronos').classList.add('active');
            if (window.chronosEngine) window.chronosEngine.open();
        } else if (hash === '#/momentum') {
            document.getElementById('page-momentum').classList.add('active');
            if (window.momentumMatrix) window.momentumMatrix.open();
        } else if (hash === '#/oracle') {
            document.getElementById('page-oracle').classList.add('active');
            if (window.oracleFeed) window.oracleFeed.open();
        } else if (hash === '#/gauntlet') {
            document.getElementById('page-gauntlet').classList.add('active');
            if (window.gauntletProtocol) window.gauntletProtocol.open();
        }

        lucide.createIcons();
    }

    /**
     * Disposes GPU/animation resources for a given route's module.
     * Called before switching away from a page.
     * @param {string} hash - The hash route being left.
     */
    _disposeModule(hash) {
        if (hash === '#/lab'      && window.zenithLab)       window.zenithLab.dispose();
        if (hash === '#/forge'    && window.quantumForge)    window.quantumForge.dispose();
        if (hash === '#/aura'     && window.auraNexus)       window.auraNexus.dispose();
        if (hash === '#/archive'  && window.neuralArchive)   window.neuralArchive.dispose();
        if (hash === '#/chronos'  && window.chronosEngine)   window.chronosEngine.dispose();
        if (hash === '#/momentum' && window.momentumMatrix)  window.momentumMatrix.dispose();
        if (hash === '#/oracle'   && window.oracleFeed)      window.oracleFeed.dispose();
        if (hash === '#/gauntlet' && window.gauntletProtocol) window.gauntletProtocol.dispose();
    }

    /**
     * Navigates home.
     */
    closeAllOverlays() {
        window.location.hash = '#/';
    }

    /**
     * Navigates to a specific module page.
     * @param {string} type
     */
    switchOverlay(type) {
        window.location.hash = `#/${type}`;
    }

    /**
     * Handles the mission planning submission flow.
     * @param {Event} e 
     */
    async handleMissionSubmission(e) {
        e.preventDefault();
        
        const goal = this.dom.goalInput.value.trim();
        if (!goal) return;

        // Collect parameters
        let intensity = 'balanced';
        let persona = 'strategist';
        
        const intensityInput = document.querySelector('input[name="intensity"]:checked');
        if (intensityInput) intensity = intensityInput.value;
        
        const personaInput = document.querySelector('input[name="persona"]:checked');
        if (personaInput) persona = personaInput.value;

        // Transition UI to Active State
        this.transitionToActiveMission();

        try {
            // Initiate Reasoning Stream UI
            if (window.zenithLab) {
                window.zenithLab.clearStream();
            }

            this.updateProgress(10, 'Establishing Neural Link...');
            
            await this.api.stream('/run/stream', { goal, intensity, persona }, (chunk) => {
                if (window.zenithLab) {
                    if (chunk.subtask) {
                        window.zenithLab.appendStreamLog(chunk.subtask, true);
                    }
                    if (chunk.status) {
                        window.zenithLab.appendStreamLog(chunk.status, false);
                        // Update the progress bar based on status keywords
                        if (chunk.status.includes('Generating')) this.updateProgress(40, chunk.status);
                        else if (chunk.status.includes('crystallized')) this.updateProgress(100, chunk.status);
                        else this.updateProgress(null, chunk.status); // Keep width, update text
                    }
                    if (chunk.final_subtasks) {
                        this.currentMissionData = { mission: { goal }, subtasks: chunk.final_subtasks };
                    }
                }
            });

            // The stream is fully complete
            setTimeout(() => {
                this.renderFinalReport();
            }, 1000);

            // Reload history to show new mission
            await this.loadMissions();

        } catch (error) {
            console.error("Neural Link Failure:", error);
            this.updateProgress(0, `Mission Aborted: ${error.message}`);
            if (window.zenithLab) {
                window.zenithLab.appendStreamLog(`CRITICAL ERROR: ${error.message}`, false);
            }
        }
    }

    /**
     * Updates the UI state based on application status.
     * @param {'loading' | 'idle'} state 
     */
    setUIState(state) {
        if (state === 'loading') {
            this.dom.submitBtn.disabled = true;
            this.dom.submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width: 18px;"></i> SYNCHRONIZING...';
            this.dom.output.innerHTML = '';
            this.dom.subtasksContainer.innerHTML = '';
            this.dom.reportContent.innerHTML = '';
            this.dom.reportSection.style.display = 'none';
            this.dom.processingView.style.display = 'block';
            this.dom.finalCard.style.display = 'none';
            this.dom.statusBadge.style.display = 'block';
            this.dom.statusBadge.textContent = 'Synchronizing with Life Engine...';
            this.dom.statusBadge.style.color = 'hsla(var(--primary), 1)';
        } else {
            this.dom.submitBtn.disabled = false;
            this.dom.submitBtn.innerHTML = '<i data-lucide="play" style="width: 18px;"></i> INITIATE MISSION';
        }
        lucide.createIcons();
    }

    /**
     * Renders success data and begins staggered logging.
     * @param {Object} data - API response data.
     * @param {string} goal - Original goal string.
     * @param {string} backendUrl - Active backend endpoint.
     */
    handleMissionSuccess(data, goal, backendUrl) {
        this.dom.statusBadge.textContent = 'Mission Ready';
        this.dom.statusBadge.style.color = '#3fb950';
        this.dom.output.innerHTML = '';

        // Render Subtasks
        if (data.subtasks) {
            data.subtasks.forEach((st, index) => {
                setTimeout(() => {
                    const div = document.createElement('div');
                    div.className = 'subtask-card';
                    div.innerHTML = `<strong>${index + 1}</strong> &nbsp; ${st.text}`;
                    this.dom.subtasksContainer.appendChild(div);
                }, index * 100);
            });
        }

        // Render Execution Logs
        if (data.agent_output && data.agent_output.length > 0) {
            data.agent_output.forEach((item, index) => {
                setTimeout(() => {
                    const log = document.createElement('div');
                    log.className = 'log-entry';
                    log.style.marginBottom = '0.75rem';
                    log.style.padding = '0.5rem';
                    log.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    log.innerHTML = `<span style="color:hsla(var(--accent), 1)">[STEP ${item.step}]</span> ${item.action} &rarr; <span style="color:#3fb950; font-weight:bold">${item.status}</span>`;
                    this.dom.output.appendChild(log);
                    this.dom.output.scrollTop = this.dom.output.scrollHeight;

                    if (index === data.agent_output.length - 1) {
                        this.finalizeMission(goal, data, backendUrl);
                    }
                }, index * 200 + 1000);
            });
        } else if (data.subtasks) {
            this.finalizeMission(goal, data, backendUrl);
        }
    }

    /**
     * Displays final reports and status cards.
     */
    finalizeMission(goal, data, backendUrl) {
        setTimeout(() => {
            this.renderMissionReport(goal, data.subtasks, backendUrl);
            this.dom.finalCard.style.display = 'block';
            this.dom.finalCard.style.animation = 'fadeIn 0.5s ease-out';
            this.dom.resultContainer.textContent = data.result || 'Mission Objectives Materialized Successfully.';
            this.appendNewMissionButton();
        }, 500);
    }

    /**
     * Injects a "New Mission" reset button into the final card after a mission completes.
     */
    appendNewMissionButton() {
        if (document.getElementById('new-mission-btn')) return; // Already exists
        const btn = document.createElement('button');
        btn.id = 'new-mission-btn';
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'margin-top: 1.5rem; width: 100%; justify-content: center;';
        btn.innerHTML = '<i data-lucide="refresh-cw" style="width:16px;"></i> &nbsp; NEW MISSION';
        btn.addEventListener('click', () => this.resetToNewMission());
        this.dom.finalCard.appendChild(btn);
        lucide.createIcons();
    }

    /**
     * Resets the console UI for a fresh mission input.
     */
    resetToNewMission() {
        this.dom.goalInput.value = '';
        this.dom.output.innerHTML = '';
        this.dom.subtasksContainer.innerHTML = '';
        this.dom.reportContent.innerHTML = '';
        this.dom.reportSection.style.display = 'none';
        this.dom.processingView.style.display = 'none';
        this.dom.finalCard.style.display = 'none';
        this.dom.statusBadge.style.display = 'none';
        const existingBtn = document.getElementById('new-mission-btn');
        if (existingBtn) existingBtn.remove();
        this.dom.goalInput.focus();
        this.dom.goalInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Handles link errors and termination.
     */
    handleMissionFailure(error) {
        this.dom.statusBadge.textContent = 'Neural Link Error';
        this.dom.statusBadge.style.color = '#f85149';
        this.dom.finalCard.style.display = 'block';
        this.dom.finalCard.style.borderColor = '#f85149';
        this.dom.resultContainer.textContent = `Termination: ${error.message}`;
    }

    /**
     * Renders the interactive mission report.
     */
    renderMissionReport(goal, subtasks, backendUrl) {
        this.dom.processingView.style.display = 'none';
        this.dom.reportSection.style.display = 'block';
        this.dom.reportSection.classList.add('active');
        
        let html = `<h2>Mission Outcome: ${goal}</h2>`;
        html += `<p>Interactive Checklist: Track your execution progress below.</p>`;
        html += `<div class="checklist">`;
        
        subtasks.forEach((st) => {
            const isChecked = st.is_completed ? 'checked' : '';
            const completedClass = st.is_completed ? 'completed' : '';
            html += `
                <div class="task-item ${completedClass}" data-id="${st.id}">
                    <input type="checkbox" class="task-checkbox" ${isChecked}>
                    <span>${st.text}</span>
                </div>`;
        });
        
        html += `</div>`;
        html += `<p style="margin-top: 2rem; color: var(--text-dim); font-size: 0.8rem;"><i>&copy; Generated by Goal.Personal Autonomous Executive</i></p>`;
        
        this.dom.reportContent.innerHTML = html;
        this.updateProgress();
        this.setupChecklistListeners(backendUrl);
        
        this.dom.reportSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Attaches listeners to checklist items for backend synchronization.
     */
    setupChecklistListeners(backendUrl) {
        const checkboxes = this.dom.reportContent.querySelectorAll('.task-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const item = e.target.closest('.task-item');
                const subtask_id = item.getAttribute('data-id');
                const isChecked = e.target.checked;
                
                // Optimistic UI Update
                item.classList.toggle('completed', isChecked);
                this.updateProgress();
                
                try {
                    const patchResponse = await fetch(`${backendUrl}/subtasks/${subtask_id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_completed: isChecked })
                    });
                    
                    if (!patchResponse.ok) throw new Error("Sync failed");

                    const data = await patchResponse.json();
                    if (data.userStats) {
                        this.updateMasteryUI(data.userStats);
                    }
                } catch (err) {
                    console.error("Failed to sync subtask state:", err);
                    // ROLLBACK: Revert UI state on failure
                    e.target.checked = !isChecked;
                    item.classList.toggle('completed', !isChecked);
                    this.updateProgress();
                    alert("⚠️ Strategic Sync Failed: Could not update mission state. Check connection.");
                }
            });
        });
    }

    /**
     * Fetches current mastery statistics from the backend.
     */
    async loadUserStats() {
        let backendUrl = this.dom.backendUrlInput.value;
        if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);
        
        try {
            const response = await fetch(`${backendUrl}/user/stats`);
            if (!response.ok) return;
            const stats = await response.json();
            this.updateMasteryUI(stats);
        } catch (err) {
            console.warn("Mastery synchronization bypassed.");
        }
    }

    /**
     * Updates the mastery widget with new stats.
     * @param {Object} stats 
     */
    updateMasteryUI(stats) {
        if (this.dom.userRank) this.dom.userRank.textContent = stats.rank;
        if (this.dom.userLevel) this.dom.userLevel.textContent = stats.level;
        if (this.dom.userXp) this.dom.userXp.textContent = stats.xp.toLocaleString();
        
        // Calculate progress to next level
        if (this.dom.xpBarFill && stats.nextLevelXp) {
            const currentLevelXp = ((stats.level - 1) ** 2) * 100;
            const nextLevelXp = stats.nextLevelXp;
            const progressInLevel = stats.xp - currentLevelXp;
            const totalInLevel = nextLevelXp - currentLevelXp;
            const percentage = Math.min(Math.max((progressInLevel / totalInLevel) * 100, 0), 100);
            this.dom.xpBarFill.style.width = `${percentage}%`;
        }

        // Rank-based color updates
        if (this.dom.userRank) {
            const rankColors = {
                "Novice Explorer": "hsla(var(--primary), 1)",
                "Strategic Architect": "hsla(var(--accent), 1)",
                "Mission Commander": "#ffcc00",
                "Silicon Overlord": "#ff3366"
            };
            this.dom.userRank.style.color = rankColors[stats.rank] || "white";
        }
    }

    /**
     * Updates the mission progress bar based on completed items or manual overrides.
     * @param {number|null} manualPct - Manual percentage (0-100)
     * @param {string|null} statusText - Text to display in the processing view
     */
    updateProgress(manualPct = null, statusText = null) {
        if (statusText && this.dom.progressLabel) {
            this.dom.progressLabel.textContent = statusText;
        }

        let percentage = 0;
        if (manualPct !== null) {
            percentage = manualPct;
        } else {
            const items = document.querySelectorAll('.task-item');
            if (items.length === 0) return;
            const completedItems = document.querySelectorAll('.task-item.completed');
            percentage = (completedItems.length / items.length) * 100;
        }
        
        if (this.dom.progressBarFill) {
            this.dom.progressBarFill.style.width = `${percentage}%`;
            this.dom.progressBarFill.style.background = percentage === 100 
                ? 'linear-gradient(to right, #3fb950, #2ea043)' 
                : 'linear-gradient(to right, hsla(var(--primary), 1), hsla(var(--accent), 1))';
        }
    }

    /**
     * Transitions the UI from the mission form to the active execution/planning state.
     */
    transitionToActiveMission() {
        this.dom.processingView.style.display = 'block';
        this.dom.reportSection.style.display = 'none';
        this.dom.finalCard.style.display = 'none';
        this.dom.statusBadge.style.display = 'block';
        this.dom.statusBadge.textContent = 'NEURAL LINK ACTIVE';
        this.dom.statusBadge.style.color = 'hsla(var(--primary), 1)';
        
        this.dom.submitBtn.disabled = true;
        this.dom.submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px"></i> TRANSMITTING...';
        lucide.createIcons();
    }

    /**
     * Utility: Copy report text to clipboard.
     */
    copyReportToClipboard() {
        const text = this.dom.reportContent.innerText;
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = this.dom.copyBtn.innerHTML;
            this.dom.copyBtn.innerHTML = '<i data-lucide="check" style="width: 16px;"></i>';
            lucide.createIcons();
            setTimeout(() => {
                this.dom.copyBtn.innerHTML = originalIcon;
                lucide.createIcons();
            }, 2000);
        });
    }

    /**
     * Utility: Download report as a text file.
     */
    downloadReport() {
        const text = this.dom.reportContent.innerText;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Mission_Report_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Set up Zenith-specific interactive elements (counters).
     */
    setupZenith() {
        const counters = document.querySelectorAll('.stat-value[data-target]');
        const dashboard = document.querySelector('.success-dashboard');

        if (!dashboard) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounters(counters);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(dashboard);
    }

    /**
     * Animates numerical labels from 0 to target value.
     * @param {NodeList} counters 
     */
    animateCounters(counters) {
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
    }

    /**
     * Loads past mission history from the backend.
     */
    async loadMissions() {
        let backendUrl = this.dom.backendUrlInput.value;
        if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);
        
        try {
            const response = await fetch(`${backendUrl}/missions`);
            if (!response.ok) return;
            const missions = await response.json();
            
            if (missions.length > 0) {
                this.dom.historySection.style.display = 'block';
                this.dom.historyList.innerHTML = '';
                
                missions.slice(0, 5).forEach(m => {
                    const item = this.createHistoryItem(m, backendUrl);
                    this.dom.historyList.appendChild(item);
                });
                lucide.createIcons();
            }
        } catch (err) {
            console.warn("Mission history synchronization bypassed.");
        }
    }

    /**
     * Creates a history list item element.
     */
    createHistoryItem(m, backendUrl) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.style.padding = '0.75rem';
        item.style.background = 'rgba(255,255,255,0.02)';
        item.style.border = '1px solid var(--border)';
        item.style.borderRadius = '8px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.transition = 'all 0.2s ease';
        
        const date = new Date(m.timestamp).toLocaleDateString();
        item.innerHTML = `
            <div>
                <div style="font-weight: 600; font-size: 0.9rem; color: white;">${m.goal}</div>
                <div style="font-size: 0.7rem; color: var(--text-dim);">${date} • ${m.intensity.toUpperCase()}</div>
            </div>
            <i data-lucide="chevron-right" style="width: 14px; color: var(--text-dim);"></i>
        `;
        
        item.addEventListener('click', () => {
            this.dom.goalInput.value = m.goal;
            this.renderMissionReport(m.goal, m.subtasks, backendUrl);
        });
        
        return item;
    }
}

// Global Application Bootstrapping
window.addEventListener('load', () => {
    window.app = new AppController();
});
