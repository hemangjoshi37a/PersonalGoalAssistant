/**
 * onboarding.js
 * Manages the multi-step onboarding experience for new operatives.
 */

class Onboarding {
    constructor() {
        this.container = document.getElementById('onboarding-container');
        this.currentStep = 1;
        this.data = {
            goal: '',
            persona: 'strategist'
        };
    }

    init() {
        this.currentStep = 1;
        this.renderStep(1);
        this.attachListeners();
    }

    renderStep(step) {
        if (!this.container) return;
        
        let html = '';
        switch(step) {
            case 1:
                html = `
                    <div class="onboarding-step active">
                        <div class="onboarding-visual">
                            <div class="orbit"></div>
                            <div class="core" style="background: hsla(var(--primary), 1); box-shadow: 0 0 30px hsla(var(--primary), 0.5);"></div>
                        </div>
                        <h2 style="font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem;">Welcome, Operative.</h2>
                        <p style="color: var(--text-dim); font-size: 1.1rem; line-height: 1.6; margin-bottom: 2.5rem;">
                            The Personal Goal Assistant is an autonomous executive designed to decompose complexity and orchestrate your growth through reinforcement learning.
                        </p>
                        <button class="btn btn-primary btn-large ob-next-btn" data-next="2">INITIALIZE SYSTEM</button>
                    </div>
                `;
                break;
            case 2:
                html = `
                    <div class="onboarding-step active">
                        <div class="panel-header" style="justify-content: center; margin-bottom: 2rem;">
                            <span class="step-badge">STEP 02</span>
                        </div>
                        <h3 style="font-size: 1.8rem; margin-bottom: 1rem;">Define Your Primary Mission</h3>
                        <p style="color: var(--text-dim); margin-bottom: 2rem;">What is the single most important objective you wish to achieve with our assistance?</p>
                        
                        <div class="input-group">
                            <input type="text" id="ob-goal" placeholder="e.g. Master Full-Stack Development in 6 months" value="${this.data.goal}" style="width: 100%; font-size: 1.1rem; padding: 1.2rem;">
                        </div>

                        <div style="display: flex; gap: 1rem; margin-top: 2.5rem;">
                            <button class="btn btn-secondary ob-back-btn" data-prev="1">BACK</button>
                            <button class="btn btn-primary ob-next-btn" data-next="3" style="flex: 1; justify-content: center;">CONTINUE</button>
                        </div>
                    </div>
                `;
                break;
            case 3:
                html = `
                    <div class="onboarding-step active">
                        <div class="panel-header" style="justify-content: center; margin-bottom: 2rem;">
                            <span class="step-badge">STEP 03</span>
                        </div>
                        <h3 style="font-size: 1.8rem; margin-bottom: 1rem;">Select Agent Persona</h3>
                        <p style="color: var(--text-dim); margin-bottom: 2rem;">Choose how your AI strategist should communicate and plan.</p>
                        
                        <div class="persona-selection-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="persona-option ${this.data.persona === 'strategist' ? 'active' : ''}" data-persona="strategist">
                                <i data-lucide="brain"></i>
                                <strong>Strategist</strong>
                                <span>Analytical & long-term</span>
                            </div>
                            <div class="persona-option ${this.data.persona === 'sergeant' ? 'active' : ''}" data-persona="sergeant">
                                <i data-lucide="shield"></i>
                                <strong>Sergeant</strong>
                                <span>Direct & disciplined</span>
                            </div>
                            <div class="persona-option ${this.data.persona === 'zen' ? 'active' : ''}" data-persona="zen">
                                <i data-lucide="wind"></i>
                                <strong>Zen</strong>
                                <span>Balanced & mindful</span>
                            </div>
                            <div class="persona-option ${this.data.persona === 'optimizer' ? 'active' : ''}" data-persona="optimizer">
                                <i data-lucide="zap"></i>
                                <strong>Optimizer</strong>
                                <span>Efficiency-focused</span>
                            </div>
                        </div>

                        <div style="display: flex; gap: 1rem; margin-top: 2.5rem;">
                            <button class="btn btn-secondary ob-back-btn" data-prev="2">BACK</button>
                            <button class="btn btn-primary ob-finish-btn" style="flex: 1; justify-content: center;">LAUNCH PLATFORM</button>
                        </div>
                    </div>
                `;
                break;
            case 4:
                html = `
                    <div class="onboarding-step active" style="text-align: center; padding: 3rem 1rem;">
                        <div class="loader-visual">
                            <div class="orbit"></div>
                        </div>
                        <h3 style="margin-top: 2rem;">Finalizing Strategic Link...</h3>
                        <p style="color: var(--text-dim);">Configuring your neural profile and preparing the Zenith Lab.</p>
                    </div>
                `;
                break;
        }

        this.container.innerHTML = html;
        lucide.createIcons();
        this.attachListeners();
    }

    attachListeners() {
        const nextBtns = this.container.querySelectorAll('.ob-next-btn');
        nextBtns.forEach(btn => {
            btn.onclick = () => {
                const step = parseInt(btn.getAttribute('data-next'));
                if (this.currentStep === 2) {
                    this.data.goal = document.getElementById('ob-goal').value.trim();
                    if (!this.data.goal) {
                        alert("Objective required for mission initialization.");
                        return;
                    }
                }
                this.currentStep = step;
                this.renderStep(step);
            };
        });

        const prevBtns = this.container.querySelectorAll('.ob-back-btn');
        prevBtns.forEach(btn => {
            btn.onclick = () => {
                const step = parseInt(btn.getAttribute('data-prev'));
                this.currentStep = step;
                this.renderStep(step);
            };
        });

        const personaOptions = this.container.querySelectorAll('.persona-option');
        personaOptions.forEach(opt => {
            opt.onclick = () => {
                personaOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.data.persona = opt.getAttribute('data-persona');
            };
        });

        const finishBtn = this.container.querySelector('.ob-finish-btn');
        if (finishBtn) {
            finishBtn.onclick = () => this.handleFinish();
        }
    }

    async handleFinish() {
        this.renderStep(4);
        
        try {
            // 1. Mark onboarding as complete
            await window.app.api.post('/user/onboarding/complete');
            
            // 2. Launch initial mission if goal provided
            if (this.data.goal) {
                // We'll set the goal in the console input and navigate there
                document.getElementById('goal').value = this.data.goal;
                const personaRadio = document.querySelector(`input[name="persona"][value="${this.data.persona}"]`);
                if (personaRadio) personaRadio.checked = true;
            }

            // 3. Update app user state locally
            window.app.user.has_completed_onboarding = true;
            window.notifications.show('Neural profile synchronized. Welcome aboard.', 'success');
            
            // 4. Redirect to console
            setTimeout(() => {
                window.location.hash = '#/console';
            }, 1500);

        } catch (err) {
            alert("Strategic link failure: " + err.message);
            this.renderStep(3);
        }
    }
}

window.onboarding = new Onboarding();
