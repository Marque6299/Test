document.addEventListener('DOMContentLoaded', () => {
    // Configuration constants
    const CONFIG = {
        TOOLTIP_DURATION: 2000,
        ANIMATION_DURATION: 300,
        SEARCH_DEBOUNCE_TIME: 300
    };

    // Utility query selectors
    const $ = selector => document.querySelector(selector);
    const $$ = selector => document.querySelectorAll(selector);

    // Application State Management
    class AppState {
        constructor() {
            this.formData = { 
                agentName: '', 
                customerName: '', 
                intent: '' 
            };
        }

        // Update form data and placeholders
        updateFormData(key, value) {
            this.formData[key] = value;
            this.updatePlaceholders();
        }

        // Reset form data
        resetFormData(preserveAgentName = true) {
            if (preserveAgentName) {
                this.formData.customerName = '';
                this.formData.intent = '';
            } else {
                this.formData = { 
                    agentName: '', 
                    customerName: '', 
                    intent: '' 
                };
            }
            this.updatePlaceholders();
        }

        // Update placeholder texts across the application
        updatePlaceholders() {
            $$('.customer_name').forEach(el => {
                el.textContent = this.formData.customerName || '[Cx name]';
            });
            $$('.agent_name').forEach(el => {
                el.textContent = this.formData.agentName || '[Agent name]';
            });
            $$('.intent').forEach(el => {
                el.textContent = this.formData.intent || '[intent]';
            });
        }
    }

    // UI Management Class
    class UIManager {
        constructor(state) {
            this.state = state;
            this.inactivityTimeout = null;
            this.initEventListeners();
            this.setupTouchSwipeHandling();
        }

        // Initialize all event listeners
        initEventListeners() {
            // Sidebar toggle
            $('#sidebarToggle')?.addEventListener('click', () => this.toggleSidebar());
            $('#closeSidebar')?.addEventListener('click', () => this.toggleSidebar());
            
            $('#sidebar')?.addEventListener('mousemove', () => this.resetInactivityTimer());
            $('#sidebar')?.addEventListener('mousedown', () => this.resetInactivityTimer());
            $('#sidebar')?.addEventListener('keydown', () => this.resetInactivityTimer());
            document.addEventListener('click', (e) => this.handleOutsideClick(e));
            

            // Form input handling
            $$('.form-input').forEach(input => {
                input.addEventListener('input', e => {
                    this.state.updateFormData(e.target.id, e.target.value);
                });
            });

            // Clear form button
            $('#clearForm')?.addEventListener('click', () => this.clearForm());

            // Navigation buttons
            $$('.nav-btn').forEach(button => {
                button.addEventListener('click', () => this.handleNavigation(button));
            });

            // Search input with debounce
            $('.search-input')?.addEventListener('input', this.debounce(e => {
                const searchTerm = e.target.value.toLowerCase().trim();
                this.performSearch(searchTerm);
            }, CONFIG.SEARCH_DEBOUNCE_TIME));

            // Escape key to close sidebar
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') this.toggleSidebar();
            });
        }

        // Debounce utility function
        debounce(func, delay) {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        }

        // Toggle sidebar visibility
        toggleSidebar() {
            const sidebar = $('#sidebar');
            const sidebarToggle = $('#sidebarToggle');
            
            sidebar.classList.toggle('open');
            sidebarToggle.classList.toggle('active');
            
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
            sidebarToggle.setAttribute('aria-expanded', sidebar.classList.contains('open'));
    
            if (sidebar.classList.contains('open')) {
                // Start the inactivity timer when the sidebar is opened
                this.startInactivityTimer();
            } else {
                // Clear the inactivity timer when the sidebar is closed
                this.clearInactivityTimer();
            }
        }
    
        // Start the inactivity timer
        startInactivityTimer() {
            this.clearInactivityTimer(); // Clear any existing timers first
            this.inactivityTimeout = setTimeout(() => {
                // Collapse the sidebar after a period of inactivity
                this.toggleSidebar();
            }, 5000); // Set to 5 seconds, or adjust as needed
        }
    
        // Reset the inactivity timer when the user interacts with the sidebar
        resetInactivityTimer() {
            if (this.inactivityTimeout) {
                clearTimeout(this.inactivityTimeout);
                this.startInactivityTimer(); // Restart the timer on interaction
            }
        }
    
        // Clear the inactivity timer
        clearInactivityTimer() {
            if (this.inactivityTimeout) {
                clearTimeout(this.inactivityTimeout);
                this.inactivityTimeout = null;
            }
        }

        handleOutsideClick(e) {
            const sidebar = $('#sidebar');
            const sidebarToggle = $('#sidebarToggle');
            
            if (sidebar.classList.contains('open')) {
                // Check if the click was outside the sidebar or the toggle button
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    // If the click is not within a script-card, collapse the sidebar
                    if (!e.target.closest('.script-card')) {
                        this.toggleSidebar(); // Collapse sidebar
                    }
                }
            }
        }

        // Clear form and reset manual edits
        clearForm() {
            this.state.resetFormData();
            $$('.form-input').forEach(input => {
                if (input.id !== 'agentName') input.value = '';
            });
        
            // Reset manual edits on all script cards
            $$('.script-card').forEach(card => {
                resetManualEdits(card);
            });
        }
        
        // Handle navigation between sections
        handleNavigation(button) {
            $$('.nav-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
    
            $$('.interaction-section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';

                section.querySelectorAll('.section-headers, .section-scripts, .script-card').forEach(el => {
                    el.style.display = '';
                });
            });
    
            const sectionId = button.id.replace('-nav', '-section');
            const targetSection = $(`#${sectionId}`);
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
    
            const searchInput = $('.search-input');
            if (searchInput && searchInput.value.trim() !== '') {
                this.performSearch(searchInput.value.toLowerCase().trim());
            }
        }
        
        performSearch(searchTerm) {
            const sections = $$('.interaction-section');
            const activeNavBtn = $('.nav-btn.active');
            const activeSectionId = activeNavBtn.id.replace('-nav', '-section');
            
            if (searchTerm === '') {
                // Reset visibility for all sections before showing active one
                sections.forEach(section => {
                    section.querySelectorAll('.section-headers, .section-scripts, .script-card').forEach(el => {
                        el.style.display = ''; // Show all elements when search is cleared
                    });
                    section.style.display = section.id === activeSectionId ? 'block' : 'none';
                });
                return;
            }
            
            sections.forEach(section => {
                let sectionHasMatch = this.searchSectionHeaders(section, searchTerm);
                section.style.display = sectionHasMatch ? 'block' : 'none';
            });
        }
        
        // Update searchSectionHeaders to also match within .script-card content
        searchSectionHeaders(section, searchTerm) {
            let sectionHasMatch = false;
            
            const headers = section.querySelectorAll('.section-headers');
            const scriptCards = section.querySelectorAll('.script-card');
            
            // First, hide all section headers and script cards in the section
            headers.forEach(header => {
                header.style.display = 'none';
            });
            scriptCards.forEach(scriptCard => {
                scriptCard.style.display = 'none';
            });
            
            // Now, check if any header or script card matches
            headers.forEach(header => {
                const headerText = header.textContent.toLowerCase();
                const headerMatch = headerText.includes(searchTerm);
                
                if (headerMatch) {
                    header.style.display = ''; // Show header if it matches
                    sectionHasMatch = true; // Mark section as having a match
                }
            });
        
            // Check if any script card matches and show the corresponding header and card
            scriptCards.forEach(scriptCard => {
                const scriptText = scriptCard.textContent.toLowerCase();
                if (scriptText.includes(searchTerm)) {
                    const header = scriptCard.closest('.section-headers'); // Find the parent header for the script card
                    header.style.display = ''; // Show the parent header if the script card matches
                    scriptCard.style.display = ''; // Show the matched script card
                    sectionHasMatch = true; // Mark section as having a match
                }
            });
        
            return sectionHasMatch; // Return whether any content in the section matched
        }

        setupTouchSwipeHandling() {
            let touchStartX = 0;

            document.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            });

            document.addEventListener('touchend', e => {
                const touchEndX = e.changedTouches[0].screenX;
                const swipeDistance = touchEndX - touchStartX;
                
                const sidebar = $('#sidebar');
                if (Math.abs(swipeDistance) > 100) {
                    if (swipeDistance > 0 && !sidebar.classList.contains('open')) {
                        sidebar.classList.add('open');
                    } else if (swipeDistance < 0 && sidebar.classList.contains('open')) {
                        sidebar.classList.remove('open');
                    }
                }
            });
        }
    }

    // Enable text editing for manual edit spans
    window.enableTextEdit = function(element) {
        const currentText = element.innerText;
        const defaultText = element.getAttribute('data-default-text');

        if (currentText === defaultText) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = '';
            input.classList.add('edit-input');

            element.innerHTML = '';
            element.appendChild(input);
            input.focus();

            input.addEventListener('input', function() {
                synchronizeText(input.value, defaultText, element);
            });
            
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    saveEditedText(element, input);
                }
            });

            input.addEventListener('blur', function() {
                saveEditedText(element, input);
            });
        }
    };

    function synchronizeText(value, defaultText, editedElement) {
        const allSpans = document.querySelectorAll(`[data-default-text="${defaultText}"]`);
        allSpans.forEach(span => {
            if (span !== editedElement) {  // Skip the currently edited span
                span.innerText = value || defaultText;  // Update all matching spans in real-time
            }
        });
    }

    function saveEditedText(element, input) {
        const newText = input.value.trim();
        const defaultText = element.getAttribute('data-default-text');

        element.innerHTML = newText || defaultText;
        
        synchronizeText(newText, defaultText, element);
    }

    function checkIfAllEdited(scriptCard) {
        const manualEditSpans = scriptCard.querySelectorAll('.manual-edit');
        for (let span of manualEditSpans) {
            const currentText = span.innerText;
            const defaultText = span.getAttribute('data-default-text');
            if (currentText === defaultText) {
                enableTextEdit(span);
                return false;
            }
        }
        return true;
    }

    function copyToClipboard(element) {
        const spans = element.querySelectorAll('span');
        let hasDefaultText = false;
        let hasManualEdit = false;

        spans.forEach(span => {
            const currentText = span.textContent.trim();
            const defaultText = span.getAttribute('data-default-text');
            if (currentText === defaultText && !span.classList.contains('manual-edit')) {
                hasDefaultText = true;
            }
            if (span.classList.contains('manual-edit')) {
                hasManualEdit = true;
            }
        });

        if (hasDefaultText) {
            showTooltip(element, "Please update the form before copying.");
            openSidebar();
            return;
        }

        if (hasManualEdit) {
            const allEdited = checkIfAllEdited(element);
            if (!allEdited) return;
        }

        const textToCopy = element.innerText || element.textContent;

        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = textToCopy;

        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        tempTextArea.setSelectionRange(0, 99999);
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);

        showTooltip(element, "Copied!");
    }

    function showTooltip(element, message) {
        const tooltip = document.getElementById('tooltip');
        const rect = element.getBoundingClientRect();

        tooltip.textContent = message;

        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;

        const topPosition = rect.top + window.scrollY - tooltipHeight - 10;
        const leftPosition = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;

        tooltip.style.top = `${Math.max(0, topPosition)}px`;
        tooltip.style.left = `${Math.max(0, leftPosition)}px`;

        tooltip.style.opacity = 1;

        setTimeout(() => {
            tooltip.style.opacity = 0;
        }, CONFIG.TOOLTIP_DURATION);
    }

    function openSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');

        sidebar.classList.add('open');
        sidebarToggle.classList.add('active');
        document.body.style.overflow = 'hidden';
        sidebarToggle.setAttribute('aria-expanded', true);
    }

    function resetManualEdits(card) {
        const manualEditSpans = card.querySelectorAll('.manual-edit');
        manualEditSpans.forEach(function(span) {
            const defaultText = span.getAttribute('data-default-text');
            span.innerHTML = defaultText;
        });
    }

    function addResetButtonToScriptCards() {
        document.querySelectorAll('.script-card').forEach(function(card) {
            const manualEditSpans = card.querySelectorAll('.manual-edit');

            if (manualEditSpans.length > 0) {
                const resetButton = document.createElement('button');
                resetButton.innerHTML = '<i class="fas fa-undo"></i>';
                resetButton.classList.add('reset-btn');
                resetButton.type = 'button';

                resetButton.addEventListener('click', function() {
                    resetManualEdits(card);
                });

                card.appendChild(resetButton);
            }
        });
    }

    function attachCopyFunctionality() {
        document.querySelectorAll('.script-card').forEach(function(card) {
            card.addEventListener('click', function(event) {
                if (event.target.classList.contains('manual-edit')) return;
                copyToClipboard(card);
            });
        });
    }

    const appState = new AppState();
    const uiManager = new UIManager(appState);
    
    addResetButtonToScriptCards();
    attachCopyFunctionality();
    appState.updatePlaceholders();
});
