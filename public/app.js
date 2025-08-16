let socket;
let currentUser = '';
let currentChat = '';
let friends = [];
let messageIdCounter = 0;

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const currentUserEl = document.getElementById('current-user');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendsList = document.getElementById('friends-list');
const onlineUsersList = document.getElementById('online-users-list');

const chatTitle = document.getElementById('chat-title');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

const addFriendModal = document.getElementById('add-friend-modal');
const friendUsernameInput = document.getElementById('friend-username-input');
const addFriendConfirm = document.getElementById('add-friend-confirm');
const addFriendCancel = document.getElementById('add-friend-cancel');
const addFriendError = document.getElementById('add-friend-error');

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadUserDataFromStorage();
});

function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    addFriendBtn.addEventListener('click', showAddFriendModal);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    addFriendConfirm.addEventListener('click', addFriend);
    addFriendCancel.addEventListener('click', hideAddFriendModal);
    friendUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addFriend();
    });

    addFriendModal.addEventListener('click', (e) => {
        if (e.target === addFriendModal) hideAddFriendModal();
    });
}

async function handleLogin() {
    const username = usernameInput.value.trim();
    
    if (!username) {
        showError(loginError, 'Please enter a username');
        return;
    }

    if (username.length < 3) {
        showError(loginError, 'Username must be at least 3 characters');
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = username;
            initializeChat();
        } else {
            currentUser = username;
            initializeChat();
        }
    } catch (error) {
        showError(loginError, 'Connection error. Please try again.');
    }
}

function initializeChat() {
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    currentUserEl.textContent = currentUser;

    saveUserDataToStorage();

    socket = io();
    setupSocketListeners();
    socket.emit('user_login', currentUser);

    renderFriendsList();
}

function setupSocketListeners() {
    socket.on('receive_message', (messageData) => {
        if (currentChat === messageData.sender) {
            displayMessage(messageData);
        }
    });

    socket.on('message_sent', (messageData) => {
        if (currentChat === messageData.recipient) {
            displayMessage(messageData);
        }
    });

    socket.on('message_deleted', (data) => {
        const messageEl = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageEl) {
            messageEl.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                messageEl.remove();
            }, 300);
        }
    });

    socket.on('online_users', (users) => {
        updateOnlineUsers(users);
    });

    socket.on('user_online', (username) => {
        addOnlineUser(username);
    });

    socket.on('user_offline', (username) => {
        removeOnlineUser(username);
    });
}

function showAddFriendModal() {
    addFriendModal.classList.remove('hidden');
    friendUsernameInput.value = '';
    addFriendError.textContent = '';
    friendUsernameInput.focus();
}

function hideAddFriendModal() {
    addFriendModal.classList.add('hidden');
}

async function addFriend() {
    const friendUsername = friendUsernameInput.value.trim();
    
    if (!friendUsername) {
        showError(addFriendError, 'Please enter a username');
        return;
    }

    if (friendUsername === currentUser) {
        showError(addFriendError, 'You cannot add yourself as a friend');
        return;
    }

    if (friends.includes(friendUsername)) {
        showError(addFriendError, 'User is already in your friends list');
        return;
    }

    try {
        const response = await fetch(`/api/users/${friendUsername}/exists`);
        const data = await response.json();

        if (data.exists) {
            friends.push(friendUsername);
            saveUserDataToStorage();
            renderFriendsList();
            hideAddFriendModal();
        } else {
            showError(addFriendError, 'User not found');
        }
    } catch (error) {
        showError(addFriendError, 'Connection error. Please try again.');
    }
}

function deleteFriend(friendUsername) {
    if (confirm(`Are you sure you want to remove ${friendUsername} from your friends list?`)) {
        friends = friends.filter(friend => friend !== friendUsername);
        saveUserDataToStorage();
        renderFriendsList();
        
        if (currentChat === friendUsername) {
            currentChat = '';
            chatTitle.textContent = 'Select a friend to start chatting';
            messagesContainer.innerHTML = '';
            messageInput.disabled = true;
            sendBtn.disabled = true;
        }
    }
}

function renderFriendsList() {
    friendsList.innerHTML = '';
    
    friends.forEach(friend => {
        const friendEl = document.createElement('div');
        friendEl.className = 'friend-item';
        friendEl.dataset.username = friend;
        
        friendEl.innerHTML = `
            <div class="friend-avatar">${friend[0].toUpperCase()}</div>
            <div class="friend-info">
                <h4>${friend}</h4>
                <div class="friend-status">Click to chat</div>
            </div>
            <div class="friend-actions">
                <button class="delete-friend-btn" onclick="deleteFriend('${friend}')" title="Remove friend">
                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                </button>
            </div>
        `;
        
        friendEl.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-friend-btn')) {
                openChat(friend);
            }
        });
        friendsList.appendChild(friendEl);
    });
}

async function openChat(friendUsername) {
    currentChat = friendUsername;
    chatTitle.textContent = `Chat with ${friendUsername}`;
    messageInput.disabled = false;
    sendBtn.disabled = false;

    document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeFriend = document.querySelector(`[data-username="${friendUsername}"]`);
    if (activeFriend) {
        activeFriend.classList.add('active');
    }

    try {
        const response = await fetch(`/api/messages/${currentUser}/${friendUsername}`);
        const messages = await response.json();
        
        messagesContainer.innerHTML = '';
        messages.forEach(message => displayMessage(message));
        scrollToBottom();
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || !currentChat) return;

    socket.emit('send_message', {
        recipient: currentChat,
        message: message,
        messageId: `msg_${Date.now()}_${messageIdCounter++}`
    });

    messageInput.value = '';
}

function displayMessage(messageData) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${messageData.sender === currentUser ? 'own' : ''}`;
    messageEl.dataset.messageId = messageData.messageId || `msg_${Date.now()}_${Math.random()}`;
    
    const time = new Date(messageData.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    const deleteButton = messageData.sender === currentUser ? 
        `<div class="message-actions">
            <button class="delete-message-btn" onclick="deleteMessage('${messageEl.dataset.messageId}')" title="Delete message">
                <span class="material-symbols-outlined" style="font-size: 14px;">delete</span>
            </button>
        </div>` : '';

    messageEl.innerHTML = `
        <div class="message-bubble">
            ${escapeHtml(messageData.message)}
            ${deleteButton}
        </div>
        <div class="message-info">${time}</div>
    `;

    messagesContainer.appendChild(messageEl);
    scrollToBottom();
}

function deleteMessage(messageId) {
    if (confirm('Are you sure you want to delete this message?')) {
        socket.emit('delete_message', {
            messageId: messageId,
            recipient: currentChat
        });
    }
}

function updateOnlineUsers(users) {
    onlineUsersList.innerHTML = '';
    users.forEach(user => {
        if (user !== currentUser) {
            addOnlineUser(user);
        }
    });
}

function addOnlineUser(username) {
    if (username === currentUser) return;
    
    const existingUser = onlineUsersList.querySelector(`[data-user="${username}"]`);
    if (existingUser) return;

    const userEl = document.createElement('div');
    userEl.className = 'online-user';
    userEl.dataset.user = username;
    userEl.innerHTML = `
        <span class="material-symbols-outlined" style="color: #27ae60; font-size: 12px;">circle</span>
        ${username}
    `;
    onlineUsersList.appendChild(userEl);
}

function removeOnlineUser(username) {
    const userEl = onlineUsersList.querySelector(`[data-user="${username}"]`);
    if (userEl) {
        userEl.remove();
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showError(element, message) {
    element.textContent = message;
    setTimeout(() => {
        element.textContent = '';
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function saveUserDataToStorage() {
    const userData = {
        username: currentUser,
        friends: friends
    };
    localStorage.setItem('chatAppUserData', JSON.stringify(userData));
}

function loadUserDataFromStorage() {
    try {
        const savedData = localStorage.getItem('chatAppUserData');
        if (savedData) {
            const userData = JSON.parse(savedData);
            if (userData.username) {
                usernameInput.value = userData.username;
                friends = userData.friends || [];
            }
        }
    } catch (error) {
        console.error('Error loading user data from storage:', error);
        friends = [];
    }
}
