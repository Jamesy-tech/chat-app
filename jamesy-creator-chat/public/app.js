// Global variables
let socket;
let currentUser = '';
let currentChat = '';
let friends = [];

// DOM elements
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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadFriendsFromStorage();
});

function setupEventListeners() {
    // Login events
    loginBtn.addEventListener('click', handleLogin);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Chat events
    addFriendBtn.addEventListener('click', showAddFriendModal);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Modal events
    addFriendConfirm.addEventListener('click', addFriend);
    addFriendCancel.addEventListener('click', hideAddFriendModal);
    friendUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addFriend();
    });

    // Click outside modal to close
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
            // User already exists, try to login
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

    // Initialize socket connection
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
        // You could add notification logic here for messages from other users
    });

    socket.on('message_sent', (messageData) => {
        if (currentChat === messageData.recipient) {
            displayMessage(messageData);
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
            saveFriendsToStorage();
            renderFriendsList();
            hideAddFriendModal();
        } else {
            showError(addFriendError, 'User not found');
        }
    } catch (error) {
        showError(addFriendError, 'Connection error. Please try again.');
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
        `;
        
        friendEl.addEventListener('click', () => openChat(friend));
        friendsList.appendChild(friendEl);
    });
}

async function openChat(friendUsername) {
    currentChat = friendUsername;
    chatTitle.textContent = `Chat with ${friendUsername}`;
    messageInput.disabled = false;
    sendBtn.disabled = false;

    // Update active friend
    document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-username="${friendUsername}"]`).classList.add('active');

    // Load chat history
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
        message: message
    });

    messageInput.value = '';
}

function displayMessage(messageData) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${messageData.sender === currentUser ? 'own' : ''}`;
    
    const time = new Date(messageData.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageEl.innerHTML = `
        <div class="message-bubble">${escapeHtml(messageData.message)}</div>
        <div class="message-info">${time}</div>
    `;

    messagesContainer.appendChild(messageEl);
    scrollToBottom();
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
    userEl.textContent = `● ${username}`;
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

function saveFriendsToStorage() {
    const friendsData = { [currentUser]: friends };
    // In a real app, you'd want to store this on the server
    // For now, we'll use a simple in-memory approach
}

function loadFriendsFromStorage() {
    // In a real app, you'd load this from the server
    friends = [];
}