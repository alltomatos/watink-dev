(function() {
    var config = window.watinkWebchatConfig || window.WatinkWebchat;
    if (!config || !config.whatsappId || !config.url) {
        console.error("WatinkWebchat: Configuration missing (whatsappId or url).");
        return;
    }

    var STATE = {
        open: false,
        config: null,
        ticketId: localStorage.getItem("watink_ticket_" + config.whatsappId),
        contactId: localStorage.getItem("watink_contact_" + config.whatsappId),
        messages: [],
        lastMessageId: null,
        pollingInterval: null
    };

    // Styles
    var styles = `
        #watink-widget-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #watink-widget-bubble {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: #00E676;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s;
        }
        #watink-widget-bubble:hover {
            transform: scale(1.05);
        }
        #watink-widget-bubble svg {
            width: 32px;
            height: 32px;
            fill: #fff;
        }
        #watink-widget-window {
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 360px;
            height: 520px;
            max-height: 80vh;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #f0f0f0;
        }
        #watink-widget-header {
            padding: 16px 20px;
            background: #00E676;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        #watink-widget-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        #watink-widget-header p {
            margin: 4px 0 0 0;
            font-size: 13px;
            opacity: 0.9;
        }
        #watink-widget-close {
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
            opacity: 0.8;
            transition: opacity 0.2s;
        }
        #watink-widget-close:hover {
            opacity: 1;
        }
        #watink-widget-body {
            flex: 1;
            padding: 0;
            overflow-y: auto;
            background: #e5ddd5;
            display: flex;
            flex-direction: column;
        }
        #watink-widget-footer {
            padding: 12px 16px;
            border-top: 1px solid #eee;
            display: flex;
            background: #fff;
            align-items: center;
        }
        #watink-widget-input {
            flex: 1;
            border: 1px solid #e0e0e0;
            border-radius: 24px;
            padding: 10px 16px;
            outline: none;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        #watink-widget-input:focus {
            border-color: #00E676;
        }
        #watink-widget-send {
            margin-left: 12px;
            background: none;
            border: none;
            cursor: pointer;
            color: #00E676;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
        }
        #watink-widget-send svg {
            width: 24px;
            height: 24px;
            fill: currentColor;
        }
        .watink-msg-container {
            display: flex;
            flex-direction: column;
            padding: 16px;
            gap: 8px;
        }
        .watink-msg {
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 80%;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
            position: relative;
            box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        }
        .watink-msg.from-me {
            background: #dcf8c6;
            align-self: flex-end;
            border-top-right-radius: 0;
        }
        .watink-msg.from-them {
            background: #fff;
            align-self: flex-start;
            border-top-left-radius: 0;
        }
        .watink-msg-meta {
            font-size: 10px;
            color: #999;
            text-align: right;
            margin-top: 4px;
            display: block;
        }
        #watink-form {
            padding: 24px;
            background: #fff;
            height: 100%;
            box-sizing: border-box;
            overflow-y: auto;
        }
        #watink-form label {
            display: block;
            margin-bottom: 6px;
            font-size: 14px;
            font-weight: 500;
            color: #333;
        }
        #watink-form input, #watink-form textarea {
            display: block;
            width: 100%;
            margin-bottom: 16px;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-sizing: border-box;
            font-family: inherit;
            font-size: 14px;
        }
        #watink-form input:focus, #watink-form textarea:focus {
            outline: none;
            border-color: #00E676;
        }
        #watink-form button {
            width: 100%;
            padding: 12px;
            background: #00E676;
            color: #fff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.2s;
            margin-top: 8px;
        }
        #watink-form button:hover {
            background-color: #00c853;
        }
        #watink-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            background: #fff;
        }
        /* Scrollbar */
        #watink-widget-body::-webkit-scrollbar {
            width: 6px;
        }
        #watink-widget-body::-webkit-scrollbar-thumb {
            background-color: rgba(0,0,0,0.2);
            border-radius: 3px;
        }
    `;

    // Inject Styles
    var styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Create DOM
    var container = document.createElement("div");
    container.id = "watink-widget-container";
    
    var bubble = document.createElement("div");
    bubble.id = "watink-widget-bubble";
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    
    var windowEl = document.createElement("div");
    windowEl.id = "watink-widget-window";
    windowEl.innerHTML = `
        <div id="watink-widget-header">
            <div>
                <h3 id="watink-title">Suporte</h3>
                <p id="watink-subtitle">Estamos online!</p>
            </div>
            <span id="watink-widget-close">&times;</span>
        </div>
        <div id="watink-widget-body">
            <div id="watink-loading">Carregando...</div>
            <form id="watink-form" style="display:none;">
                <p id="watink-greeting" style="margin-bottom:20px; color:#555; line-height:1.5;"></p>
                
                <div id="watink-field-name">
                    <label>Nome Completo *</label>
                    <input type="text" name="name" placeholder="Seu nome" required>
                </div>
                
                <div id="watink-field-email">
                    <label>E-mail *</label>
                    <input type="email" name="email" placeholder="seu@email.com" required>
                </div>
                
                <div id="watink-field-phone">
                    <label>Telefone</label>
                    <input type="text" name="phone" placeholder="(00) 00000-0000">
                </div>
                
                <label>Como podemos ajudar?</label>
                <textarea name="message" placeholder="Digite sua mensagem inicial..." rows="3"></textarea>
                
                <button type="submit">Iniciar Conversa</button>
            </form>
            <div id="watink-chat" class="watink-msg-container" style="display:none;"></div>
        </div>
        <div id="watink-widget-footer" style="display:none;">
            <input type="text" id="watink-widget-input" placeholder="Digite sua mensagem...">
            <button id="watink-widget-send">
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
        </div>
    `;

    container.appendChild(windowEl);
    container.appendChild(bubble);
    document.body.appendChild(container);

    // Elements
    var form = document.getElementById("watink-form");
    var chat = document.getElementById("watink-chat");
    var footer = document.getElementById("watink-widget-footer");
    var title = document.getElementById("watink-title");
    var subtitle = document.getElementById("watink-subtitle");
    var greeting = document.getElementById("watink-greeting");
    var input = document.getElementById("watink-widget-input");
    var loading = document.getElementById("watink-loading");
    var sendBtn = document.getElementById("watink-widget-send");
    var header = document.getElementById("watink-widget-header");
    var widgetBody = document.getElementById("watink-widget-body");

    // Event Listeners
    bubble.onclick = toggleWindow;
    document.getElementById("watink-widget-close").onclick = toggleWindow;

    form.onsubmit = function(e) {
        e.preventDefault();
        var data = {
            name: form.name.value,
            email: form.email.value,
            phone: form.phone.value,
            message: form.message.value
        };
        createTicket(data);
    };

    sendBtn.onclick = sendMessage;
    input.onkeypress = function(e) {
        if (e.key === 'Enter') sendMessage();
    };

    function toggleWindow() {
        STATE.open = !STATE.open;
        windowEl.style.display = STATE.open ? 'flex' : 'none';
        
        if (STATE.open) {
            if (!STATE.config) {
                init();
            } else {
                if (STATE.ticketId) {
                    scrollToBottom();
                    startPolling();
                }
            }
        } else {
            stopPolling();
        }
    }

    async function init() {
        loading.style.display = 'flex';
        form.style.display = 'none';
        chat.style.display = 'none';
        footer.style.display = 'none';

        try {
            var res = await fetch(config.url + '/api/webchat/' + config.whatsappId);
            if (!res.ok) throw new Error('Failed to load config');
            STATE.config = await res.json();
            applyConfig();
            
            loading.style.display = 'none';
            if (STATE.ticketId) {
                showChat();
                loadMessages();
                startPolling();
            } else {
                showForm();
            }
        } catch (e) {
            console.error(e);
            loading.innerText = "Erro ao carregar chat.";
        }
    }

    function applyConfig() {
        if (STATE.config.chatConfig) {
            var c = STATE.config.chatConfig;
            if (c.buttonColor) {
                bubble.style.backgroundColor = c.buttonColor;
                header.style.backgroundColor = c.buttonColor;
                form.querySelector('button').style.backgroundColor = c.buttonColor;
            }
            if (c.title) title.innerText = c.title;
            if (c.subtitle) subtitle.innerText = c.subtitle;
            
            // Show/Hide fields based on config (simple implementation)
            if (c.fields) {
                if (c.fields.phone === false) document.getElementById('watink-field-phone').style.display = 'none';
            }
        }
        if (STATE.config.greetingMessage) {
            greeting.innerText = STATE.config.greetingMessage;
        }
    }

    function showForm() {
        form.style.display = 'block';
        chat.style.display = 'none';
        footer.style.display = 'none';
        widgetBody.style.background = "#fff";
    }

    function showChat() {
        form.style.display = 'none';
        chat.style.display = 'flex';
        footer.style.display = 'flex';
        widgetBody.style.background = "#e5ddd5";
    }

    async function createTicket(data) {
        loading.style.display = 'flex';
        form.style.display = 'none';
        
        try {
            var res = await fetch(config.url + '/api/webchat/' + config.whatsappId + '/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!res.ok) throw new Error('Failed to create ticket');
            
            var json = await res.json();
            
            STATE.ticketId = json.ticketId;
            STATE.contactId = json.contactId;
            localStorage.setItem("watink_ticket_" + config.whatsappId, STATE.ticketId);
            localStorage.setItem("watink_contact_" + config.whatsappId, STATE.contactId);
            
            loading.style.display = 'none';
            showChat();
            // If there was an initial message, it's handled by backend but we should display it or fetch messages
            loadMessages();
            startPolling();

        } catch (e) {
            console.error(e);
            loading.innerText = "Erro ao iniciar chat. Tente novamente.";
            loading.style.display = 'flex';
            setTimeout(() => {
                loading.style.display = 'none';
                showForm();
            }, 3000);
        }
    }

    async function sendMessage() {
        var text = input.value.trim();
        if (!text) return;

        input.value = '';
        // Optimistic UI
        // addMessage({ fromMe: true, body: text, timestamp: Date.now() / 1000 });

        try {
            var res = await fetch(config.url + '/api/webchat/' + STATE.ticketId + '/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    body: text
                })
            });
            if (res.ok) {
                // Refresh messages to get the real one with ID
                loadMessages();
            }
        } catch (e) {
            console.error("Error sending message", e);
        }
    }

    function renderMessages() {
        chat.innerHTML = '';
        STATE.messages.forEach(msg => {
            var div = document.createElement('div');
            div.className = 'watink-msg ' + (msg.fromMe ? 'from-me' : 'from-them');
            div.innerText = msg.body;
            
            var meta = document.createElement('span');
            meta.className = 'watink-msg-meta';
            var date = new Date(msg.createdAt || msg.timestamp * 1000);
            meta.innerText = date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
            
            div.appendChild(meta);
            chat.appendChild(div);
        });
        scrollToBottom();
    }
    
    function scrollToBottom() {
        widgetBody.scrollTop = widgetBody.scrollHeight;
    }

    async function loadMessages() {
        if (!STATE.ticketId || !STATE.contactId) return;

        try {
            // Using query params for contactId validation
            var res = await fetch(config.url + '/api/webchat/' + STATE.ticketId + '/messages?contactId=' + STATE.contactId);
            if (res.ok) {
                var json = await res.json();
                // Simple diff check could be better, but for MVP full re-render is safer
                if (json.messages && json.messages.length !== STATE.messages.length) {
                    STATE.messages = json.messages.reverse(); // Assuming backend returns DESC
                    renderMessages();
                } else if (json.messages && json.messages.length > 0 && 
                           json.messages[0].id !== (STATE.messages[STATE.messages.length-1] || {}).id) {
                     // Check if last message changed (e.g. status update) or new message arrived
                     STATE.messages = json.messages.reverse();
                     renderMessages();
                }
            } else if (res.status === 403 || res.status === 404) {
                // Session invalid or closed
                // localStorage.removeItem("watink_ticket_" + config.whatsappId);
                // localStorage.removeItem("watink_contact_" + config.whatsappId);
                // STATE.ticketId = null;
                // showForm();
            }
        } catch (e) {
            console.error("Error polling messages", e);
        }
    }

    function startPolling() {
        if (STATE.pollingInterval) return;
        STATE.pollingInterval = setInterval(loadMessages, 3000);
    }

    function stopPolling() {
        if (STATE.pollingInterval) {
            clearInterval(STATE.pollingInterval);
            STATE.pollingInterval = null;
        }
    }

})();