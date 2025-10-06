// Popup.js - Handle configuration settings for torch mode
document.addEventListener('DOMContentLoaded', async () => {
    // Get references to DOM elements
    const toggleBtn = document.getElementById('toggleBtn');
    const toggleIndicator = document.getElementById('toggleIndicator');
    const beamRadiusSlider = document.getElementById('beamRadius');
    const beamRadiusValue = document.getElementById('beamRadiusValue');
    const darknessSlider = document.getElementById('darkness');
    const darknessValue = document.getElementById('darknessValue');
    const softnessSlider = document.getElementById('softness');
    const softnessValue = document.getElementById('softnessValue');


    // Default settings
    const defaultSettings = {
        enabled: true,
        beamRadius: 280,
        darkness: 95,
        softness: 40
    };

    // Load saved settings
    let settings;
    try {
        const result = await chrome.storage.sync.get(defaultSettings);
        settings = { ...defaultSettings, ...result }; // Ensure all defaults are present
        console.log('Loaded settings in popup:', settings);
        
        // Save back to ensure defaults are stored
        await chrome.storage.sync.set(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        settings = defaultSettings;
        // Try to save defaults
        try {
            await chrome.storage.sync.set(settings);
        } catch (saveError) {
            console.error('Error saving default settings:', saveError);
        }
    }

    // Initialize UI with current settings
    updateUI(settings);

    // Send initial settings to all tabs
    setTimeout(() => {
        sendMessageToTabs({ action: 'updateSettings', settings });
        sendMessageToTabs({ action: 'toggle', enabled: settings.enabled });
    }, 100);

    // Toggle functionality
    toggleBtn.addEventListener('click', async () => {
        settings.enabled = !settings.enabled;
        try {
            await chrome.storage.sync.set(settings);
            updateToggleUI(settings.enabled);
            sendMessageToTabs({ action: 'toggle', enabled: settings.enabled });
        } catch (error) {
            console.error('Error saving toggle state:', error);
        }
    });

    // Debounce function to prevent excessive saves
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Save settings with debounce
    const debouncedSave = debounce(async (newSettings) => {
        try {
            await chrome.storage.sync.set(newSettings);
            console.log('Settings saved:', newSettings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }, 300);

    // Update tabs immediately
    const updateTabs = (newSettings) => {
        sendMessageToTabs({ action: 'updateSettings', settings: { ...newSettings } });
    };

    // Beam radius slider
    beamRadiusSlider.addEventListener('input', (e) => {
        settings.beamRadius = parseInt(e.target.value);
        beamRadiusValue.textContent = `${settings.beamRadius}px`;
        updateTabs(settings);
        debouncedSave(settings);
    });

    // Darkness slider
    darknessSlider.addEventListener('input', (e) => {
        settings.darkness = parseInt(e.target.value);
        darknessValue.textContent = `${settings.darkness}%`;
        updateTabs(settings);
        debouncedSave(settings);
    });

    // Softness slider
    softnessSlider.addEventListener('input', (e) => {
        settings.softness = parseInt(e.target.value);
        softnessValue.textContent = `${settings.softness}%`;
        updateTabs(settings);
        debouncedSave(settings);
    });



    // Helper functions
    function updateUI(settings) {
        updateToggleUI(settings.enabled);
        beamRadiusSlider.value = settings.beamRadius;
        beamRadiusValue.textContent = `${settings.beamRadius}px`;
        darknessSlider.value = settings.darkness;
        darknessValue.textContent = `${settings.darkness}%`;
        softnessSlider.value = settings.softness;
        softnessValue.textContent = `${settings.softness}%`;
    }

    function updateToggleUI(enabled) {
        if (enabled) {
            toggleBtn.classList.add('active');
        } else {
            toggleBtn.classList.remove('active');
        }
    }

    async function sendMessageToTabs(message) {
        try {
            console.log('Sending message to tabs:', message);
            const tabs = await chrome.tabs.query({});
            const promises = tabs.map(tab => {
                return chrome.tabs.sendMessage(tab.id, message).catch((error) => {
                    // Ignore errors for tabs that can't receive messages (like chrome:// pages)
                    console.log(`Could not send message to tab ${tab.id}:`, error.message);
                });
            });
            await Promise.allSettled(promises);
        } catch (error) {
            console.error('Error sending messages to tabs:', error);
        }
    }
});