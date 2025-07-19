/**
 * Enhanced Keeper Stats Component with animations and better UX
 */
class KeeperStatsComponent extends BaseVNComponent {
    constructor(vnEngine, config = {}) {
        super(vnEngine, config);
        
        this.isExpanded = config.expanded === 'true' || config.expanded === true || false;
        this.position = config.position || 'top-right';
        this.theme = config.theme || 'dark';
        this.persistent = config.persistent === 'true' || config.persistent === true || false;
        
        // Animation and UX enhancements
        this.animationDuration = 300;
        this.lastUpdateTime = 0;
        this.pendingUpdates = new Set();
        this.notificationQueue = [];
    }

    onMount() {
        try {
            this.setupToggleFunction();
            this.setupVariableWatchers();
        } catch (error) {
            console.error('Failed to mount EnhancedKeeperStatsComponent:', error);
        }
    }

    onUpdate(){
        if (this.container) {
            this.detectChangesAndNotify();
            this.rerender();
        }
    }

    setupVariableWatchers() {
        // Watch for specific variable changes to show notifications
        const watchedVars = [
            'storiesCompleted', 'artifactsCollected', 
            'keeper_experience', 'reputationLevel'
        ];
        
        this.previousValues = {};
        watchedVars.forEach(varName => {
            this.previousValues[varName] = this.vnEngine.getVariable(varName);
        });
    }

    render() {
        const stats = this.getStatsFromEngine();
        const storyProgress = stats.totalStories > 0 ? (stats.storiesCompleted / stats.totalStories) * 100 : 0;
        const artifactProgress = stats.totalArtifacts > 0 ? (stats.artifactsCollected / stats.totalArtifacts) * 100 : 0;
        
        return `
            <div class="keeper-stats-widget enhanced ${this.theme} ${this.position} ${this.isExpanded ? 'expanded' : 'collapsed'}" 
                 data-component-id="${this.id}">
                
                <!-- Notification Container -->
                <div class="stats-notifications" id="stats-notifications-${this.id}">
                    ${this.renderNotifications()}
                </div>
                
                <!-- Enhanced Header with Status Indicator -->
                <div class="stats-header" onclick="window.keeperStatsToggle()">
                    <div class="stats-icon-container">
                        <div class="stats-icon">📊</div>
                        ${this.hasNewUpdates() ? '<div class="update-indicator pulse"></div>' : ''}
                    </div>
                    <div class="stats-title-container">
                        <div class="stats-title">Keeper Status</div>
                        <div class="stats-subtitle">${this.getStatusSubtitle(stats)}</div>
                    </div>
                    <div class="toggle-arrow ${this.isExpanded ? 'expanded' : ''}">▼</div>
                </div>
                
                <!-- Enhanced Collapsible Content -->
                <div class="stats-content ${this.isExpanded ? 'show' : 'hide'}">
                    
                    <!-- Quick Overview Bar -->
                    <div class="quick-overview">
                        <div class="overview-item">
                            <span class="overview-icon">📚</span>
                            <span class="overview-text">${stats.storiesCompleted}/${stats.totalStories}</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-icon">🏺</span>
                            <span class="overview-text">${stats.artifactsCollected}/${stats.totalArtifacts}</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-icon">⭐</span>
                            <span class="overview-text">${stats.experience}</span>
                        </div>
                    </div>
                    
                    <!-- Detailed Stats Grid -->
                    <div class="stats-grid">
                        <!-- Keeper Identity with Avatar -->
                        <div class="stat-item keeper-name enhanced">
                            <div class="stat-icon">👤</div>
                            <div class="stat-info">
                                <div class="stat-label">Keeper</div>
                                <div class="stat-value">${this.escapeHtml(stats.keeperName)}</div>
                                <div class="stat-meta">Since ${this.getSessionStartTime()}</div>
                            </div>
                            <div class="stat-badge">${this.getKeeperBadge(stats)}</div>
                        </div>
                        
                        <!-- Enhanced Reputation with Visual Level -->
                        <div class="stat-item reputation enhanced">
                            <div class="stat-icon">🏆</div>
                            <div class="stat-info">
                                <div class="stat-label">Reputation</div>
                                <div class="stat-value">${this.escapeHtml(stats.reputation)}</div>
                                <div class="reputation-stars">${this.renderReputationStars(stats.reputation)}</div>
                            </div>
                        </div>
                        
                        <!-- Experience with Next Level Preview -->
                        <div class="stat-item experience enhanced">
                            <div class="stat-icon">⭐</div>
                            <div class="stat-info">
                                <div class="stat-label">Experience</div>
                                <div class="stat-value">${stats.experience} XP</div>
                                <div class="xp-bar">
                                    <div class="xp-fill" style="width: ${this.getXPProgress(stats.experience)}%"></div>
                                </div>
                                <div class="stat-meta">Next: ${this.getNextXPThreshold(stats.experience)} XP</div>
                            </div>
                        </div>
                        
                        <!-- Current Location with Time Period Visual -->
                        <div class="stat-item location enhanced">
                            <div class="stat-icon">${this.getTimePeriodIcon(stats.timePeriod)}</div>
                            <div class="stat-info">
                                <div class="stat-label">Current Era</div>
                                <div class="stat-value">${this.escapeHtml(stats.timePeriod)}</div>
                                <div class="time-period-indicator ${this.getTimePeriodClass(stats.timePeriod)}"></div>
                            </div>
                        </div>
                        
                        <!-- Empathy with Heart Animation -->
                        <div class="stat-item empathy enhanced">
                            <div class="stat-icon animated-heart">❤️</div>
                            <div class="stat-info">
                                <div class="stat-label">Empathy</div>
                                <div class="stat-value">Level ${stats.empathy}</div>
                                <div class="empathy-hearts">${this.renderEmpathyHearts(stats.empathy)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Enhanced Progress Section -->
                    <div class="progress-section enhanced">
                        <div class="progress-item">
                            <div class="progress-header">
                                <div class="progress-label">Story Progress</div>
                                <div class="progress-percentage">${Math.round(storyProgress)}%</div>
                            </div>
                            <div class="progress-bar enhanced">
                                <div class="progress-fill story-progress" 
                                     style="width: ${storyProgress}%"
                                     data-progress="${storyProgress}"></div>
                            </div>
                            <div class="progress-detail">${stats.storiesCompleted} of ${stats.totalStories} chronicles completed</div>
                        </div>
                        
                        <div class="progress-item">
                            <div class="progress-header">
                                <div class="progress-label">Artifact Collection</div>
                                <div class="progress-percentage">${Math.round(artifactProgress)}%</div>
                            </div>
                            <div class="progress-bar enhanced">
                                <div class="progress-fill artifact-progress" 
                                     style="width: ${artifactProgress}%"
                                     data-progress="${artifactProgress}"></div>
                            </div>
                            <div class="progress-detail">${stats.artifactsCollected} of ${stats.totalArtifacts} artifacts discovered</div>
                        </div>
                        
                        <!-- Achievements Preview -->
                        <div class="achievements-preview">
                            <div class="achievements-label">Recent Achievements</div>
                            <div class="achievements-list">${this.renderRecentAchievements()}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Enhanced helper methods
    getStatusSubtitle(stats) {
        if (stats.storiesCompleted === 0) return "New Keeper";
        if (stats.storiesCompleted === stats.totalStories) return "Master Chronicler";
        return `${stats.storiesCompleted}/${stats.totalStories} Chronicles`;
    }

    hasNewUpdates() {
        return this.pendingUpdates.size > 0;
    }

    getKeeperBadge(stats) {
        if (stats.experience >= 50) return "🌟";
        if (stats.experience >= 25) return "⭐";
        if (stats.artifactsCollected >= 5) return "🏺";
        return "";
    }

    renderReputationStars(reputation) {
        const levels = {
            "Unknown Keeper": 1,
            "Trusted Keeper": 2,
            "Master Keeper": 3,
            "Legendary Keeper": 4
        };
        const level = levels[reputation] || 1;
        return "★".repeat(level) + "☆".repeat(4 - level);
    }

    getXPProgress(experience) {
        const thresholds = [0, 10, 25, 50, 100];
        for (let i = 0; i < thresholds.length - 1; i++) {
            if (experience < thresholds[i + 1]) {
                const current = experience - thresholds[i];
                const needed = thresholds[i + 1] - thresholds[i];
                return (current / needed) * 100;
            }
        }
        return 100;
    }

    getNextXPThreshold(experience) {
        const thresholds = [10, 25, 50, 100];
        return thresholds.find(t => t > experience) || "Max";
    }

    getTimePeriodIcon(period) {
        const icons = {
            'The Temporal Tavern': '🏛️',
            'WWI - Christmas 1914': '🎖️',
            'London Cholera Outbreak': '🏥',
            'D-Day - June 1944': '⚔️'
        };
        return icons[period] || '🕰️';
    }

    getTimePeriodClass(period) {
        return period.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    renderEmpathyHearts(level) {
        return "💖".repeat(Math.min(level, 5)) + "🤍".repeat(Math.max(0, 5 - level));
    }

    renderRecentAchievements() {
        // Placeholder for achievement system
        return `<div class="achievement-item">🎯 First Story Complete</div>`;
    }

    renderNotifications() {
        return this.notificationQueue.map(notification => 
            `<div class="stat-notification ${notification.type}">${notification.message}</div>`
        ).join('');
    }

    getSessionStartTime() {
        return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Enhanced update mechanism with change detection
    onSceneChange(newSceneId) {
        console.log(`🎬 Enhanced KeeperStats responding to scene: ${newSceneId}`);
        this.detectChangesAndNotify();
        this.rerender();
    }

    detectChangesAndNotify() {
        const watchedVars = [
            'storiesCompleted', 'artifactsCollected', 
            'keeper_experience', 'reputationLevel'
        ];
        
        watchedVars.forEach(varName => {
            const currentValue = this.vnEngine.getVariable(varName);
            const previousValue = this.previousValues[varName];
            
            if (currentValue !== previousValue) {
                this.handleVariableChange(varName, previousValue, currentValue);
                this.previousValues[varName] = currentValue;
            }
        });
    }

    handleVariableChange(varName, oldValue, newValue) {
        let message = '';
        
        switch(varName) {
            case 'storiesCompleted':
                message = `📚 Story completed! (${newValue}/${this.vnEngine.getVariable('totalStories')})`;
                break;
            case 'artifactsCollected':
                message = `🏺 Artifact discovered! (${newValue}/${this.vnEngine.getVariable('totalArtifacts')})`;
                break;
            case 'keeper_experience':
                const gained = newValue - oldValue;
                message = `⭐ Gained ${gained} experience! (${newValue} total)`;
                break;
            case 'reputationLevel':
                message = `🏆 Reputation increased: ${newValue}`;
                break;
        }
        
        if (message) {
            this.showNotification(message, 'success');
            this.pendingUpdates.add(varName);
        }
    }

    showNotification(message, type = 'info') {
        this.notificationQueue.push({ message, type, timestamp: Date.now() });
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            this.notificationQueue = this.notificationQueue.filter(n => n.message !== message);
            this.rerender();
        }, 3000);
        
        this.rerender();
    }

    setupToggleFunction() {
        window.keeperStatsToggle = () => {
            this.toggle();
            this.clearUpdateIndicators();
        };
    }

    clearUpdateIndicators() {
        this.pendingUpdates.clear();
    }

    toggle() {
        this.isExpanded = !this.isExpanded;
        this.rerender();
    }

    rerender() {
        if (this.container) {
            const wasExpanded = this.isExpanded;
            this.container.innerHTML = this.render();
            
            // Restore expanded state after render
            const content = this.container.querySelector('.stats-content');
            if (content) {
                content.classList.toggle('show', wasExpanded);
                content.classList.toggle('hide', !wasExpanded);
            }
        }
    }

    // ... rest of the original methods remain the same
    getStatsFromEngine() {
        if (!this.vnEngine || typeof this.vnEngine.getVariable !== 'function') {
            console.warn('EnhancedKeeperStatsComponent: vnEngine not available');
            return this.getDefaultStats();
        }
        
        return {
            keeperName: this.vnEngine.getVariable('keeper_name') || 'Unknown Keeper',
            experience: this.vnEngine.getVariable('keeper_experience') || 0,
            reputation: this.vnEngine.getVariable('reputationLevel') || 'Unknown Keeper',
            storiesCompleted: this.vnEngine.getVariable('storiesCompleted') || 0,
            totalStories: this.vnEngine.getVariable('totalStories') || 3,
            artifactsCollected: this.vnEngine.getVariable('artifactsCollected') || 0,
            totalArtifacts: this.vnEngine.getVariable('totalArtifacts') || 12,
            timePeriod: this.formatTimePeriod(this.vnEngine.getVariable('current_time_period') || 'neutral'),
            empathy: this.vnEngine.getVariable('empathy_level') || 1
        };
    }

    formatTimePeriod(period) {
        const periods = {
            'neutral': 'The Temporal Tavern',
            '1914': 'WWI - Christmas 1914',
            '1854': 'London Cholera Outbreak',
            '1944': 'D-Day - June 1944'
        };
        return periods[period] || period;
    }

    getDefaultStats() {
        return {
            keeperName: 'Unknown Keeper',
            experience: 0,
            reputation: 'Unknown Keeper',
            storiesCompleted: 0,
            totalStories: 3,
            artifactsCollected: 0,
            totalArtifacts: 12,
            timePeriod: 'The Temporal Tavern',
            empathy: 1
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    onUnmount() {
        console.log('🗑️ Enhanced KeeperStats unmounting');
        if (window.keeperStatsToggle) {
            delete window.keeperStatsToggle;
        }
    }
}

// Register enhanced component
if (typeof window !== 'undefined') {
    window.KeeperStatsComponent = KeeperStatsComponent;
}