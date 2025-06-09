let chatVisible = false;
let isFirstOpen = true;
let recognition = null;
let isVoiceMode = false;
let isSpeaking = false;

document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.classList.remove('open');
    }
    initializeSpeechRecognition();
    document.getElementById('chat-box').style.scrollBehavior = 'smooth';
});

function initializeSpeechRecognition() {
    console.log('Initializing speech recognition at', new Date().toISOString());
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;
        recognition.onresult = handleVoiceResult;
        recognition.onerror = handleVoiceError;
        recognition.onend = () => {
            console.log('Speech recognition ended, isVoiceMode:', isVoiceMode);
            if (isVoiceMode && !isSpeaking) {
                document.getElementById('voice-start').style.display = 'inline-block';
                document.getElementById('voice-start').classList.remove('recording');
                document.getElementById('voice-stop').style.display = 'none';
                document.getElementById('voice-stop-speaking').style.display = isSpeaking ? 'inline-block' : 'none';
            }
        };
        console.log('Speech recognition initialized successfully');
    } else {
        console.error('SpeechRecognition API not supported');
        addBotMessage("Voice recognition is not supported in this browser. Please use text input.", [], false, true);
    }
}

function toggleChat() {
    console.log('toggleChat, chatVisible:', chatVisible);
    chatVisible = !chatVisible;
    const chatContainer = document.getElementById('chat-container');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const chatInput = document.getElementById('chat-input');
    const voiceControls = document.getElementById('voice-controls');

    if (!chatContainer) {
        console.error('chat-container not found');
        return;
    }

    if (chatVisible) {
        chatContainer.classList.add('open');
        userInput.focus();
    } else {
        chatContainer.classList.remove('open');
        stopVoiceRecognition();
        stopSpeaking();
        isVoiceMode = false;
        voiceControls.style.display = 'none';
    }

    if (chatVisible && isFirstOpen) {
        chatBox.innerHTML = '';
        userInput.disabled = false;
        chatInput.style.display = 'flex';
        voiceControls.style.display = 'none';
        fetchBotResponse("start");
        isFirstOpen = false;
    } else if (chatVisible) {
        chatInput.style.display = userInput.disabled ? 'none' : 'flex';
        voiceControls.style.display = isVoiceMode ? 'flex' : 'none';
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function handleKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleUserInput();
    }
}

function handleUserInput() {
    const input = document.getElementById('user-input');
    if (input.disabled) return;
    const message = input.value.trim();
    if (message === '') return;

    addUserMessage(message);
    input.value = '';
    input.focus();
    showLoading(true);
    fetchBotResponse(message);
}

function handleMedicalInquiry() {
    addUserMessage("Ask Medical Question");
    showLoading(true);
    fetchBotResponse("medical_inquiry");
}

function startVoiceRecognition() {
    console.log('startVoiceRecognition called at', new Date().toISOString());
    if (!recognition) {
        console.error('No recognition object');
        addBotMessage("Voice recognition is not supported. Please use text input.", [], false, true);
        return;
    }

    navigator.permissions.query({ name: 'microphone' }).then(permissionStatus => {
        console.log('Microphone permission:', permissionStatus.state);
        if (permissionStatus.state === 'denied') {
            console.error('Microphone permission denied');
            addBotMessage("Microphone access is denied. Please allow microphone access in Chrome settings (chrome://settings/content/microphone) and refresh.", [], false, true);
            return;
        }

        document.getElementById('voice-start').style.display = 'none';
        document.getElementById('voice-start').classList.add('recording');
        document.getElementById('voice-stop').style.display = 'inline-block';
        document.getElementById('voice-stop-speaking').style.display = isSpeaking ? 'inline-block' : 'none';
        document.getElementById('chat-input').style.display = 'none';
        document.getElementById('voice-controls').style.display = 'flex';
        isVoiceMode = true;

        initializeSpeechRecognition();

        setTimeout(() => {
            try {
                console.log('Attempting to start recognition');
                recognition.start();
                console.log('Recognition started successfully');
            } catch (error) {
                console.error('Start recognition failed:', error.name, error.message, error.stack);
                let errorMessage = `Voice recognition failed: ${error.name}. Please try again or use text input.`;
                if (error.name === 'NotAllowedError') {
                    errorMessage = "Microphone access denied. Please allow microphone access in Chrome settings (chrome://settings/content/microphone) and refresh.";
                } else if (error.name === 'NotFoundError') {
                    errorMessage = "No microphone detected. Please connect a microphone and test it in system settings.";
                } else if (error.name === 'InvalidStateError') {
                    errorMessage = "Voice recognition state error. Please try again or use text input.";
                    initializeSpeechRecognition();
                } else if (error.name === 'SecurityError') {
                    errorMessage = "Insecure connection. Please use http://localhost:3000 or HTTPS.";
                }
                addBotMessage(errorMessage, [], false, true);
                isVoiceMode = false;
                document.getElementById('voice-start').style.display = 'inline-block';
                document.getElementById('voice-start').classList.remove('recording');
                document.getElementById('voice-stop').style.display = 'none';
                document.getElementById('chat-input').style.display = 'flex';
                document.getElementById('voice-controls').style.display = 'none';
            }
        }, 100);
    }).catch(error => {
        console.error('Permission query failed:', error.name, error.message, error.stack);
        addBotMessage("Cannot check microphone permission. Please ensure microphone access in Chrome settings (chrome://settings/content/microphone).", [], false, true);
        isVoiceMode = false;
        document.getElementById('voice-start').style.display = 'inline-block';
        document.getElementById('voice-start').classList.remove('recording');
        document.getElementById('voice-stop').style.display = 'none';
        document.getElementById('chat-input').style.display = 'flex';
        document.getElementById('voice-controls').style.display = 'none';
    });
}

function stopVoiceRecognition() {
    if (recognition && isVoiceMode) {
        console.log('Stopping voice recognition');
        try {
            recognition.stop();
            recognition.abort();
            recognition = null;
            initializeSpeechRecognition();
        } catch (error) {
            console.error('Stop recognition failed:', error.name, error.message, error.stack);
        }
        document.getElementById('voice-start').style.display = 'inline-block';
        document.getElementById('voice-start').classList.remove('recording');
        document.getElementById('voice-stop').style.display = 'none';
        document.getElementById('voice-stop-speaking').style.display = isSpeaking ? 'inline-block' : 'none';
        document.getElementById('voice-controls').style.display = 'flex';
        isVoiceMode = false;
    }
}

function stopSpeaking() {
    if ('speechSynthesis' in window && isSpeaking) {
        console.log('Stopping speech synthesis');
        window.speechSynthesis.cancel();
        isSpeaking = false;
        document.getElementById('voice-stop-speaking').style.display = 'none';
        document.getElementById('voice-controls').style.display = 'flex';
        const speakingIndicator = document.getElementById('speaking-indicator');
        if (speakingIndicator) speakingIndicator.style.display = 'none';
    }
}

function handleVoiceResult(event) {
    const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('')
        .trim();
    console.log('Voice input:', transcript, 'isFinal:', event.results[0].isFinal);
    if (transcript) {
        addUserMessage(transcript);
        showLoading(true);
        fetchBotResponse(transcript);
        stopVoiceRecognition();
    } else {
        console.log('Empty transcript ignored');
    }
}

function handleVoiceError(event) {
    console.error('Voice error:', event.error, event.message);
    let errorMessage = "Voice input failed. Please try again or use text input.";
    if (event.error === 'no-speech') {
        errorMessage = "No speech detected. Please speak clearly and try again.";
    } else if (event.error === 'audio-capture') {
        errorMessage = "Microphone not detected. Please connect a microphone and test it.";
    } else if (event.error === 'not-allowed') {
        errorMessage = "Microphone access denied. Please allow microphone access in Chrome settings (chrome://settings/content/microphone).";
    } else if (event.error === 'aborted') {
        errorMessage = "Voice recognition aborted. Please try again.";
    } else if (event.error === 'network') {
        errorMessage = "Network issue with voice recognition. Please check your connection.";
    }
    addBotMessage(errorMessage, [], false, true);
    stopVoiceRecognition();
}

function handleYesNo(response) {
    addUserMessage(response);
    showLoading(true);
    fetchBotResponse(response);
}

function handleReturnBack() {
    addUserMessage("Return Back");
    showLoading(true);
    fetchBotResponse("return_back");
}

function handleSpecialtySelect(specialty) {
    if (!specialty || typeof specialty !== 'string') {
        console.error('Invalid specialty:', specialty);
        addBotMessage("Invalid specialty selected. Please try again.", [], false, true);
        return;
    }
    console.log('Specialty selected:', specialty);
    addUserMessage(specialty);
    showLoading(true);
    fetchBotResponse(`select_specialty:${specialty}`);
}

function handleDoctorSelect(doctor, specialty) {
    console.log('Doctor selected:', doctor, specialty);
    addUserMessage(doctor);
    showLoading(true);
    fetchBotResponse(`select_doctor:${doctor}:${specialty}`);
}

function handleTimeSlotSelect(timeSlot, doctor, specialty) {
    console.log('Time slot selected:', timeSlot, doctor, specialty);
    addUserMessage(timeSlot);
    showLoading(true);
    fetchBotResponse(`select_time:${timeSlot}:${doctor}:${specialty}`);
}

function handleEnd() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const chatInput = document.getElementById('chat-input');
    const voiceControls = document.getElementById('voice-controls');
    const chatContainer = document.getElementById('chat-container');

    chatBox.innerHTML = '';
    userInput.disabled = false;
    userInput.value = '';
    chatInput.style.display = 'flex';
    voiceControls.style.display = 'none';
    isVoiceMode = false;
    isSpeaking = false;
    isFirstOpen = true;
    chatVisible = false;
    chatContainer.classList.remove('open');
    stopSpeaking();
    stopVoiceRecognition();
    showLoading(true);
    fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'end' })
    })
        .then(response => response.json())
        .then(data => {
            console.log('End response:', data);
            showLoading(false);
        })
        .catch(error => {
            console.error('End session error:', error);
            showLoading(false);
        });
}

function showLoading(show) {
    const loading = document.getElementById('chat-loading');
    const chatBox = document.getElementById('chat-box');
    if (loading && chatBox) {
        loading.style.display = show ? 'block' : 'none';
        chatBox.setAttribute('aria-busy', show ? 'true' : 'false');
    }
}

function addBotMessage(text, buttons = [], disableInput = false, hideInput = false, isMedicalInquiry = false) {
    console.log('addBotMessage:', { text, buttons: buttons.map(b => b.text), disableInput, hideInput, isMedicalInquiry, isVoiceMode });
    showLoading(false);
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const chatInput = document.getElementById('chat-input');
    const voiceControls = document.getElementById('voice-controls');

    if (!text && buttons.length === 0) {
        console.warn('No text or buttons, updating UI');
        userInput.disabled = disableInput;
        chatInput.style.display = hideInput ? 'none' : (isVoiceMode ? 'none' : 'flex');
        voiceControls.style.display = isVoiceMode ? 'flex' : 'none';
        chatBox.scrollTop = chatBox.scrollHeight;
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.innerHTML = `
        <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3v3m0 0v3m0-3h-3m3 0h3m-6 6h9a3 3 0 013 3v3a3 3 0 01-3 3H9a3 3 0 01-3-3v-3a3 3 0 013-3z"/>
            </svg>
        </div>
        <span>${text || 'Please try again.'}</span>
    `;
    chatBox.appendChild(messageDiv);

    let speakingIndicator = document.getElementById('speaking-indicator');
    if (!speakingIndicator) {
        speakingIndicator = document.createElement('div');
        speakingIndicator.id = 'speaking-indicator';
        speakingIndicator.className = 'speaking-indicator';
        speakingIndicator.textContent = 'Micky is speaking...';
        speakingIndicator.style.display = 'none';
        chatBox.appendChild(speakingIndicator);
    }

    if (isMedicalInquiry && isVoiceMode) {
        const examplesDiv = document.createElement('div');
        examplesDiv.className = 'message bot';
        examplesDiv.innerHTML = `
            <div class="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 3v3m0 0v3m0-3h-3m3 0h3m-6 6h9a3 3 0 013 3v3a3 3 0 01-3 3H9a3 3 0 01-3-3v-3a3 3 0 013-3z"/>
                </svg>
            </div>
            <span>Try asking:<br>
            - What are the symptoms of flu?<br>
            - How is diabetes treated?<br>
            - What causes high blood pressure?</span>
        `;
        chatBox.appendChild(examplesDiv);
    }

    if (isVoiceMode && isMedicalInquiry && 'speechSynthesis' in window && text) {
        console.log('Speaking response:', text);
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onstart = () => {
                console.log('Speech synthesis started');
                isSpeaking = true;
                document.getElementById('voice-stop-speaking').style.display = 'inline-block';
                document.getElementById('voice-controls').style.display = 'flex';
                speakingIndicator.style.display = 'block';
                chatBox.scrollTop = chatBox.scrollHeight;
            };

            utterance.onend = () => {
                console.log('Speech synthesis ended');
                isSpeaking = false;
                document.getElementById('voice-stop-speaking').style.display = 'none';
                document.getElementById('voice-controls').style.display = 'flex';
                speakingIndicator.style.display = 'none';
                chatBox.scrollTop = chatBox.scrollHeight;
                if (isVoiceMode && recognition) {
                    startVoiceRecognition();
                }
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event.error);
                isSpeaking = false;
                document.getElementById('voice-stop-speaking').style.display = 'none';
                speakingIndicator.style.display = 'none';
                addBotMessage("Cannot speak response. Please check browser speech settings.", [], false, true);
                chatBox.scrollTop = chatBox.scrollHeight;
            };

            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis failed:', error.name, error.message);
            addBotMessage("Cannot speak response. Please check browser speech settings.", [], false, true);
        }
    } else if (isVoiceMode && isMedicalInquiry && text) {
        console.warn('SpeechSynthesis not supported');
        addBotMessage("Voice responses not supported. Please use Chrome or Edge.", [], false, true);
    }

    if (buttons.length > 0) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        buttons.forEach(button => {
            console.log('Processing button:', button);
            try {
                const btn = document.createElement('button');
                btn.className = button.class || 'chat-button';
                btn.textContent = button.text;
                btn.setAttribute('tabindex', '0');
                if (button.onclick.startsWith('handleYesNo')) {
                    const response = button.onclick.match(/"(.*?)"/)?.[1];
                    if (!response) throw new Error(`Invalid handleYesNo: ${button.onclick}`);
                    btn.onclick = () => handleYesNo(response);
                    btn.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            handleYesNo(response);
                        }
                    };
                } else if (button.onclick.startsWith('handleSpecialtySelect')) {
                    const specialty = button.onclick.match(/"(.*?)"/)?.[1];
                    if (!specialty) throw new Error(`Invalid handleSpecialtySelect: ${button.onclick}`);
                    btn.onclick = () => handleSpecialtySelect(specialty);
                    btn.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            handleSpecialtySelect(specialty);
                        }
                    };
                } else if (button.onclick.startsWith('handleDoctorSelect')) {
                    const args = button.onclick.match(/"(.*?)","(.*?)"/);
                    if (!args || args.length < 3) throw new Error(`Invalid handleDoctorSelect: ${button.onclick}`);
                    const [_, doctor, specialty] = args;
                    btn.onclick = () => handleDoctorSelect(doctor, specialty);
                    btn.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            handleDoctorSelect(doctor, specialty);
                        }
                    };
                } else if (button.onclick.startsWith('handleTimeSlotSelect')) {
                    const args = button.onclick.match(/"(.*?)","(.*?)","(.*?)"/);
                    if (!args || args.length < 4) throw new Error(`Invalid handleTimeSlotSelect: ${button.onclick}`);
                    const [_, timeSlot, doctor, specialty] = args;
                    btn.onclick = () => handleTimeSlotSelect(timeSlot, doctor, specialty);
                    btn.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            handleTimeSlotSelect(timeSlot, doctor, specialty);
                        }
                    };
                } else if (button.onclick === 'handleMedicalInquiry()') {
                    btn.onclick = handleMedicalInquiry;
                    btn.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            handleMedicalInquiry();
                        }
                    };
                } else if (button.onclick === 'handleReturnBack()') {
                    btn.onclick = handleReturnBack;
                    btn.onkeydown = (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            handleReturnBack();
                        }
                    };
                } else {
                    throw new Error(`Unknown button onclick: ${button.onclick}`);
                }
                buttonContainer.appendChild(btn);
            } catch (error) {
                console.error('Button error:', button, error.message);
                addBotMessage("Error rendering buttons. Please try again.", [], false, true);
            }
        });
        chatBox.appendChild(buttonContainer);
    }

    userInput.disabled = disableInput;
    chatInput.style.display = hideInput ? 'none' : (isVoiceMode ? 'none' : 'flex');
    voiceControls.style.display = isVoiceMode ? 'flex' : 'none';
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addUserMessage(text) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `
        <div class="icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
        </div>
        <span>${text}</span>
    `;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function fetchBotResponse(message) {
    console.log('Fetching response for:', message);
    const maxRetries = 3;
    let retryCount = 0;

    function attemptFetch() {
        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network error: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Response received:', data);
                showLoading(false);
                if (data.error || !data.reply) {
                    console.error('Server error:', data.error || 'No reply');
                    addBotMessage("Something went wrong. Please try again.", [], false, true);
                } else {
                    isVoiceMode = data.isMedicalInquiry ? true : isVoiceMode;
                    addBotMessage(data.reply, data.buttons || [], data.disableInput || false, data.hideInput || false, data.isMedicalInquiry || false);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error.message);
                retryCount++;
                if (retryCount < maxRetries) {
                    console.log(`Retrying fetch, attempt ${retryCount + 1}/${maxRetries}`);
                    setTimeout(attemptFetch, 1000 * retryCount);
                } else {
                    showLoading(false);
                    addBotMessage("Cannot connect to server. Please check your connection.", [], false, true);
                }
            });
    }

    attemptFetch();
}