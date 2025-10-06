// Torch mode dark overlay with configurable settings
(function () {
    const ID = 'torch-mode-overlay';
    if (document.getElementById(ID)) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let animationId;
    let isEnabled = true;
    let isInitialized = false;

    // Default settings
    let settings = {
        beamRadius: 280,
        darkness: 95,
        softness: 40
    };

    const overlay = document.createElement('div');
    overlay.id = ID;
    
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '2147483647',
        pointerEvents: 'none',
        transition: 'none',
        display: 'block'
    });

    // Update gradient based on current settings
    const updateGradient = () => {
        if (!isInitialized) return;
        try {
            const darknessAlpha = settings.darkness / 100;
            const newBackground = `radial-gradient(circle ${settings.beamRadius}px at ${mouseX}px ${mouseY}px, transparent 0%, transparent ${settings.softness}%, rgba(0,0,0,${darknessAlpha}) 100%)`;
            overlay.style.background = newBackground;
            console.log('Updated gradient:', { beamRadius: settings.beamRadius, darkness: settings.darkness, softness: settings.softness, mouseX, mouseY });
        } catch (error) {
            console.error('Error updating gradient:', error);
        }
    };

    // Initialize the overlay with settings
    const initialize = () => {
        isInitialized = true;
        overlay.style.display = isEnabled ? 'block' : 'none';
        if (isEnabled) {
            updateGradient();
        }
        console.log('Torch Mode initialized:', { isEnabled, settings });
    };

    // Smooth cursor tracking with requestAnimationFrame
    const updateTorch = () => {
        if (isEnabled && isInitialized) {
            updateGradient();
        }
        animationId = requestAnimationFrame(updateTorch);
    };

    // Track mouse movement
    const handleMouseMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    };

    // Handle resize events
    const handleResize = () => {
        overlay.style.width = window.innerWidth + 'px';
        overlay.style.height = window.innerHeight + 'px';
    };

    // Listen for messages from popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Received message:', message);
            switch (message.action) {
                case 'toggle':
                    isEnabled = message.enabled;
                    overlay.style.display = isEnabled ? 'block' : 'none';
                    console.log('Toggled torch mode:', isEnabled);
                    break;
                case 'updateSettings':
                    if (message.settings) {
                        settings = {
                            beamRadius: message.settings.beamRadius || settings.beamRadius,
                            darkness: message.settings.darkness || settings.darkness,
                            softness: message.settings.softness || settings.softness
                        };
                        console.log('Updated settings:', settings);
                        if (isEnabled && isInitialized) {
                            updateGradient();
                        }
                    }
                    break;
            }
        });
    }

    // Load initial settings from storage
    const loadSettings = () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get({
                enabled: true,
                beamRadius: 280,
                darkness: 95,
                softness: 40
            }, (result) => {
                console.log('Loaded settings from storage:', result);
                isEnabled = result.enabled;
                settings = {
                    beamRadius: result.beamRadius,
                    darkness: result.darkness,
                    softness: result.softness
                };
                initialize();
            });
        } else {
            // Fallback when chrome API is not available
            console.log('Chrome storage not available, using defaults');
            initialize();
        }
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Append overlay to DOM first
    document.documentElement.appendChild(overlay);

    // Start animation loop immediately
    updateTorch();

    // Load settings and initialize (with small delay to ensure DOM is ready)
    setTimeout(loadSettings, 50);

    // Monitor for removal and re-attach if needed
    const observer = new MutationObserver(() => {
        if (!document.documentElement.contains(overlay)) {
            document.documentElement.appendChild(overlay);
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Public API for control
    window.__torchMode = {
        hide: () => {
            isEnabled = false;
            overlay.style.display = 'none';
        },
        show: () => {
            isEnabled = true;
            overlay.style.display = 'block';
        },
        updateSettings: (newSettings) => {
            settings = { ...settings, ...newSettings };
            if (isEnabled) updateGradient();
        },
        remove: () => {
            cancelAnimationFrame(animationId);
            document.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            observer.disconnect();
            overlay.remove();
            delete window.__torchMode;
        }
    };
})();