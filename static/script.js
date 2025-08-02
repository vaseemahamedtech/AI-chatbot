class ChatInterface {
    constructor() {
        this.messageQueue = [];
        this.isProcessing = false;
        this.isRecording = false;
        this.recognition = null;
        this.initializeElements();
        this.bindEvents();
        this.initSpeechRecognition();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.micButton = document.getElementById('micButton');
        this.stopSpeechButton = document.getElementById('stopSpeechButton');
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.handleSendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // Microphone button
        this.micButton.addEventListener('click', () => this.toggleSpeechRecognition());

        // Stop speech button
        this.stopSpeechButton.addEventListener('click', () => this.stopSpeech());

        // Copy message functionality
        this.chatMessages.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                this.copyMessage(e.target);
            }
        });
    }

    initSpeechRecognition() {
        // Check if browser supports speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.micButton.classList.add('recording');
                this.micButton.title = 'Listening... Click to stop';
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.handleSendMessage();
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.micButton.classList.remove('recording');
                this.micButton.title = 'Voice input';
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isRecording = false;
                this.micButton.classList.remove('recording');
                this.micButton.title = 'Voice input';
            };
        } else {
            // Disable microphone button if not supported
            this.micButton.disabled = true;
            this.micButton.title = 'Speech recognition not supported in this browser';
            this.micButton.style.opacity = '0.5';
        }
    }

    toggleSpeechRecognition() {
        if (!this.recognition) return;

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            // Stop any ongoing speech before starting recognition
            this.stopSpeech();
            this.recognition.start();
        }
    }

    async stopSpeech() {
        try {
            // Call Flask endpoint to stop TTS
            const response = await fetch('/stop_speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                // Visual feedback
                const originalHTML = this.stopSpeechButton.innerHTML;
                this.stopSpeechButton.innerHTML = '✓';
                this.stopSpeechButton.style.background = '#28a745';
                
                setTimeout(() => {
                    this.stopSpeechButton.innerHTML = originalHTML;
                    this.stopSpeechButton.style.background = '';
                }, 1000);
            }

            // Also stop browser speech synthesis as backup
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        } catch (error) {
            console.error('Error stopping speech:', error);
            
            // Fallback to browser speech synthesis stop
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        }
    }

    async copyMessage(copyBtn) {
        try {
            // Find the message content
            const messageContent = copyBtn.parentElement;
            let textToCopy = '';

            // Extract text from all paragraphs
            const paragraphs = messageContent.querySelectorAll('p');
            paragraphs.forEach((p, index) => {
                if (index > 0) textToCopy += '\n\n';
                textToCopy += p.innerText.trim();
            });

            // Use modern clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }

            // Visual feedback
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✓';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 1000);

        } catch (err) {
            console.error('Failed to copy message:', err);
            // Visual feedback for error
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✗';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 1000);
        }
    }

    async handleSendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isProcessing) return;

        // Stop any ongoing speech recognition
        if (this.isRecording && this.recognition) {
            this.recognition.stop();
        }

        // Add to queue and process
        this.messageQueue.push({
            type: 'user',
            content: message,
            timestamp: Date.now()
        });

        // Clear input immediately
        this.messageInput.value = '';

        // Process the queue
        await this.processMessageQueue();
    }

    async processMessageQueue() {
        if (this.isProcessing || this.messageQueue.length === 0) return;

        this.isProcessing = true;
        this.setUIState(false); // Disable input

        try {
            while (this.messageQueue.length > 0) {
                const messageData = this.messageQueue.shift();

                if (messageData.type === 'user') {
                    // Display user message immediately
                    this.displayUserMessage(messageData.content);

                    // Show typing indicator
                    this.showTypingIndicator();

                    // Get bot response
                    const result = await this.getBotResponse(messageData.content);

                    // Hide typing indicator
                    this.hideTypingIndicator();

                    // Display bot response with proper formatting and sources
                    this.displayBotMessage(result.response, result.sources);
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
            this.hideTypingIndicator();
            this.displayBotMessage('Sorry, I encountered an error. Please try again.', []);
        } finally {
            this.isProcessing = false;
            this.setUIState(true); // Re-enable input
        }
    }

    displayUserMessage(message) {
        const messageElement = this.createMessageElement('user', message);
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    displayBotMessage(message, sources = []) {
        const messageElement = this.createMessageElement('bot', message, sources);
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    createMessageElement(sender, content, sources = []) {
        // Create main message container
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;

        // Create message content container
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Add copy button
        const copyBtn = document.createElement('span');
        copyBtn.className = 'copy-btn';
        copyBtn.title = 'Copy message';
        copyBtn.innerHTML = '📋';
        contentDiv.appendChild(copyBtn);

        if (sender === 'bot') {
            // For bot messages, properly format paragraphs
            this.formatBotMessage(contentDiv, content);
            
            // Add sources if available
            if (sources && sources.length > 0) {
                this.addSourcesToMessage(contentDiv, sources);
            }
        } else {
            // For user messages, simple text content
            const p = document.createElement('p');
            p.textContent = content;
            contentDiv.appendChild(p);
        }

        messageDiv.appendChild(contentDiv);
        return messageDiv;
    }

    formatBotMessage(container, content) {
        // Split content into paragraphs (double line breaks)
        const paragraphs = content.split('\n\n').filter(p => p.trim());

        paragraphs.forEach((paragraph, index) => {
            const p = document.createElement('p');

            // Handle single line breaks within paragraphs
            const lines = paragraph.split('\n').filter(line => line.trim());
            lines.forEach((line, lineIndex) => {
                if (lineIndex > 0) {
                    p.appendChild(document.createElement('br'));
                }
                p.appendChild(document.createTextNode(line.trim()));
            });

            container.appendChild(p);
        });

        // If no paragraphs were created (no \n\n), treat as single paragraph
        if (container.children.length <= 1) { // <= 1 because copy button is already there
            const p = document.createElement('p');
            const lines = content.split('\n').filter(line => line.trim());
            lines.forEach((line, lineIndex) => {
                if (lineIndex > 0) {
                    p.appendChild(document.createElement('br'));
                }
                p.appendChild(document.createTextNode(line.trim()));
            });
            container.appendChild(p);
        }
    }

    addSourcesToMessage(container, sources) {
        if (!sources || sources.length === 0) return;

        // Create sources container
        const sourcesContainer = document.createElement('div');
        sourcesContainer.className = 'sources-container';

        // Sources title
        const sourcesTitle = document.createElement('div');
        sourcesTitle.className = 'sources-title';
        sourcesTitle.textContent = 'Sources';
        sourcesContainer.appendChild(sourcesTitle);

        // Source links container
        const sourceLinksContainer = document.createElement('div');
        sourceLinksContainer.className = 'source-links';

        sources.forEach((source, index) => {
            const sourceLink = document.createElement('a');
            sourceLink.className = 'source-link';
            sourceLink.href = source.url;
            sourceLink.target = '_blank';
            sourceLink.rel = 'noopener noreferrer';

            // Source number
            const sourceNumber = document.createElement('span');
            sourceNumber.className = 'source-number';
            sourceNumber.textContent = (index + 1).toString();
            sourceLink.appendChild(sourceNumber);

            // Source title
            const sourceTitle = document.createElement('span');
            sourceTitle.className = 'source-title';
            sourceTitle.textContent = source.title || `Source ${index + 1}`;
            sourceLink.appendChild(sourceTitle);

            sourceLinksContainer.appendChild(sourceLink);
        });

        sourcesContainer.appendChild(sourceLinksContainer);
        container.appendChild(sourcesContainer);
    }

    async getBotResponse(message) {
        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            return {
                response: data.response || 'I received your message but couldn\'t generate a response.',
                sources: data.sources || []
            };
        } catch (error) {
            console.error('Error getting bot response:', error);
            throw error;
        }
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'flex';
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    setUIState(enabled) {
        this.messageInput.disabled = !enabled;
        this.sendButton.disabled = !enabled;

        if (enabled) {
            this.messageInput.focus();
        }
    }

    scrollToBottom() {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        });
    }
}

// Initialize the chat interface when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chat = new ChatInterface();

    // Focus on input field
    document.getElementById('messageInput').focus();
});

// Prevent form submission on Enter key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.id === 'messageInput') {
            e.preventDefault();
        }
    }
});
