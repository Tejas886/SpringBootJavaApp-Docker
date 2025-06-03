'use strict';

let stompClient = null;
let username = null;
let currentSubscription = null;
let messageSound = new Audio('sounds/message.mp3');
const colors = [
  '#4F46E5', '#0D9488', '#F97316', '#10B981', 
  '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899'
];

function connect(event) {
  username = document.querySelector('#name').value.trim();
  
  if (username) {
    document.querySelector('.user-form').classList.add('hidden');
    document.querySelector('.chat-page').classList.remove('hidden');
    document.querySelector('.user-name').textContent = username;
    
    // Update page title
    document.title = `Chat - ${username}`;
    
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    
    stompClient.connect({}, onConnected, onError);
  }
  event.preventDefault();
}

function onConnected() {
  // Subscribe to the Public Topic
  currentSubscription = stompClient.subscribe('/topic/public', onMessageReceived);

  // Tell your username to the server
  stompClient.send('/app/chat.addUser',
    {},
    JSON.stringify({
      sender: username,
      type: 'JOIN'
    })
  );
  
  document.querySelector('.connecting').classList.add('hidden');
  
  // Update online status
  updateOnlineStatus(true);
  
  // Listen for window/tab close
  window.addEventListener('beforeunload', () => {
    disconnect();
  });
}

function disconnect() {
  if (stompClient !== null) {
    stompClient.send('/app/chat.addUser',
      {},
      JSON.stringify({
        sender: username,
        type: 'LEAVE'
      })
    );
    
    if (currentSubscription) {
      currentSubscription.unsubscribe();
    }
    
    stompClient.disconnect();
    updateOnlineStatus(false);
  }
}

function updateOnlineStatus(isOnline) {
  const indicator = document.querySelector('.indicator');
  const statusText = document.querySelector('.status-text');
  
  if (isOnline) {
    indicator.style.backgroundColor = 'var(--success-color)';
    statusText.textContent = 'Online';
  } else {
    indicator.style.backgroundColor = 'var(--text-light)';
    statusText.textContent = 'Offline';
  }
}

function onError(error) {
  const connectingElement = document.querySelector('.connecting');
  connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
  connectingElement.style.color = 'var(--error-color)';
}

function sendMessage(event) {
  const messageInput = document.querySelector('#message');
  const messageContent = messageInput.value.trim();
  
  if (messageContent && stompClient) {
    const chatMessage = {
      sender: username,
      content: messageContent,
      type: 'CHAT'
    };
    
    stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(chatMessage));
    messageInput.value = '';
  }
  event.preventDefault();
}

function onMessageReceived(payload) {
  const message = JSON.parse(payload.body);
  const messageList = document.querySelector('.message-list');
  
  // Play sound for new messages (except your own)
  if (message.type === 'CHAT' && message.sender !== username) {
    messageSound.play();
  }
  
  const messageElement = document.createElement('div');
  
  if (message.type === 'JOIN') {
    messageElement.classList.add('message', 'message-join');
    message.content = `${message.sender} joined the chat`;
  } else if (message.type === 'LEAVE') {
    messageElement.classList.add('message', 'message-leave');
    message.content = `${message.sender} left the chat`;
  } else {
    // Get consistent color for user
    const color = getAvatarColor(message.sender);
    const isOwnMessage = message.sender === username;
    
    messageElement.classList.add('message', isOwnMessage ? 'message-outgoing' : 'message-incoming');
    
    // Create avatar
    const avatarElement = document.createElement('div');
    avatarElement.classList.add('avatar');
    avatarElement.style.backgroundColor = color;
    avatarElement.textContent = message.sender.charAt(0).toUpperCase();
    
    // Create message content container
    const messageContentElement = document.createElement('div');
    messageContentElement.classList.add('message-content');
    
    // Create message header (sender + timestamp)
    const messageHeaderElement = document.createElement('div');
    messageHeaderElement.classList.add('message-header');
    
    // Add sender name
    const senderElement = document.createElement('span');
    senderElement.classList.add('sender');
    senderElement.textContent = message.sender;
    
    // Add timestamp
    const timestampElement = document.createElement('span');
    timestampElement.classList.add('timestamp');
    timestampElement.textContent = message.timestamp;
    
    // Append sender and timestamp to header
    messageHeaderElement.appendChild(senderElement);
    messageHeaderElement.appendChild(timestampElement);
    
    // Create message text element
    const textElement = document.createElement('span');
    textElement.classList.add('message-text');
    textElement.textContent = message.content;
    
    // Assemble message
    messageContentElement.appendChild(messageHeaderElement);
    messageContentElement.appendChild(textElement);
    
    messageElement.appendChild(avatarElement);
    messageElement.appendChild(messageContentElement);
  }
  
  messageList.appendChild(messageElement);
  messageList.scrollTop = messageList.scrollHeight;
}

function getAvatarColor(messageSender) {
  let hash = 0;
  for (let i = 0; i < messageSender.length; i++) {
    hash = 31 * hash + messageSender.charCodeAt(i);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  const userForm = document.querySelector('#userForm');
  const chatForm = document.querySelector('#chatForm');
  const messageInput = document.querySelector('#message');
  
  userForm.addEventListener('submit', connect, true);
  chatForm.addEventListener('submit', sendMessage, true);
  
  // Add typing indicator functionality
  const typingIndicator = document.querySelector('.typing-indicator');
  let typingTimeout = null;
  
  messageInput.addEventListener('input', () => {
    if (messageInput.value.trim() !== '') {
      clearTimeout(typingTimeout);
      // Logic for showing typing indicator to others would go here
      // (would require additional server endpoints)
    }
  });
  
  // Handle reconnection on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && username && !stompClient) {
      const socket = new SockJS('/ws');
      stompClient = Stomp.over(socket);
      stompClient.connect({}, onConnected, onError);
    }
  });
});