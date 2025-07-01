// =================================================================================
//  Welcome App - Home Page Script V2 (MODERN CARD TRANSITIONS)
// =================================================================================

// Global variables
let currentUser = null;
let friends = [];
let friendRequests = [];
let selectedFriendRow = null;
let selectedChatFriend = null;
let currentChatMessages = [];
let activeMeetupSessionId = null;
let currentActiveCard = 'newsFeedCard';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    initializeAppData();
    setupCardNavigation();
    setupEventListeners();
});

// =================================================================================
//  CARD NAVIGATION SYSTEM
// =================================================================================

function setupCardNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const cards = document.querySelectorAll('.app-card');
    
    // Ensure the first card is active on load
    const firstCard = document.getElementById('newsFeedCard');
    if (firstCard && !firstCard.classList.contains('active')) {
        firstCard.classList.add('active');
    }
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetCard = button.getAttribute('data-target');
            const cardType = button.getAttribute('data-card');
            
            // Switch to the target card
            switchToCard(targetCard, cardType);
            
            // Update active nav button
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

function switchToCard(targetCardId, cardType) {
    const cards = document.querySelectorAll('.app-card');
    const targetCard = document.getElementById(targetCardId);
    
    if (!targetCard) return;
    
    // Remove active class from all cards
    cards.forEach(card => {
        card.classList.remove('active', 'prev', 'next');
    });
    
    // Add active class to target card
    targetCard.classList.add('active');
    currentActiveCard = targetCardId;
    
    // --- SAVE STATE WHEN SWITCHING CARDS ---
    saveStateDebounced();
    
    // Trigger any card-specific actions
    handleCardSwitch(cardType, targetCardId);
}

function handleCardSwitch(cardType, cardId) {
    switch(cardType) {
        case 'friends':
            renderFriends();
            renderFriendRequests();
            break;
        case 'messages':
            setupMessagesCard();
            break;
        case 'meetup':
            renderHeartFriends();
            break;
        case 'settings':
            loadCurrentUserData();
            loadUserProfilePhoto();
            break;
        case 'home':
        default:
            // Reset any selections when going back to home
            selectedFriendRow = null;
            selectedChatFriend = null;
            break;
    }
}

// =================================================================================
//  EVENT LISTENERS SETUP
// =================================================================================

function setupEventListeners() {
    // Profile logo click
    const profileLogo = document.querySelector('.profile-logo');
    if (profileLogo) {
        profileLogo.addEventListener('click', () => {
            switchToCard('settingsCard', 'settings');
            document.querySelector('[data-target="settingsCard"]').classList.add('active');
        });
    }

    // Search functionality
    const searchFriendsForm = document.getElementById('searchFriendsForm');
    if (searchFriendsForm) {
        searchFriendsForm.addEventListener('submit', handleFriendSearch);
    }

    // Chat functionality
    const chooseFriendBtn = document.getElementById('chooseFriendBtn');
    if (chooseFriendBtn) {
        chooseFriendBtn.addEventListener('click', toggleChatFriendsPopup);
    }

    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
    }

    // Meetup functionality
    const yesPleaseBtn = document.getElementById('yesPleaseBtn');
    const noThanksBtn = document.getElementById('noThanksBtn');
    if (yesPleaseBtn) yesPleaseBtn.addEventListener('click', handleMeetupRequest);
    if (noThanksBtn) noThanksBtn.addEventListener('click', () => {
        const heartActions = document.getElementById('heartActions');
        if (heartActions) heartActions.style.display = 'none';
    });

    // Modal functionality
    setupModalEvents();

    // Profile update functionality
    setupProfileUpdateEvents();

    // Support form
    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', handleSupportSubmit);
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Close chat friends popup when clicking outside
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('chatFriendsPopup');
        const chooseFriendBtn = document.getElementById('chooseFriendBtn');
        
        if (popup && chooseFriendBtn && 
            !popup.contains(e.target) && 
            !chooseFriendBtn.contains(e.target)) {
            popup.classList.remove('show');
        }
    });
}

// =================================================================================
//  CORE FUNCTIONS
// =================================================================================

async function initializeAppData() {
    showSpinner();
    try {
        const [meResponse, friendshipsResponse] = await Promise.all([
            fetch('/api/me'),
            fetch('/api/friendships')
        ]);

        if (!meResponse.ok) {
            window.location.href = '/pages/login.html';
            return;
        }

        const meData = await meResponse.json();
        const friendshipsData = await friendshipsResponse.json();

        currentUser = meData.user;
        
        const allFriendships = friendshipsData.friendships || [];
        friends = allFriendships.filter(f => f.status === 'accepted');
        friendRequests = allFriendships.filter(f => f.status === 'pending' && f.addressee_id === currentUser.id);

        // Initial renders
        renderFriends();
        renderFriendRequests();
        renderHeartFriends();
        
        // Load user profile data
        await loadUserProfilePhoto();
        await loadCurrentUserData();

        // --- ADD STATE RESTORATION HERE ---
        const stateRestored = loadAppState();
        
        if (stateRestored) {
            // Restore the active card
            switchToCard(currentActiveCard, getCardTypeFromId(currentActiveCard));
            
            // Update active nav button
            const navButtons = document.querySelectorAll('.nav-btn');
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            const activeButton = document.querySelector(`[data-target="${currentActiveCard}"]`);
            if (activeButton) activeButton.classList.add('active');
            
            // Restore chat if needed
            if (selectedChatFriend) {
                await openChatWithFriend(selectedChatFriend.id);
            }
            
            console.log(`🔄 App state restored to: ${currentActiveCard}`);
        }

    } catch (error) {
        console.error('Initialization failed:', error);
        showToast('Could not load app data. Please try again.', 'error');
    } finally {
        hideSpinner();
    }
}

// Helper function to get card type from card ID
function getCardTypeFromId(cardId) {
    const cardTypeMap = {
        'newsFeedCard': 'home',
        'friendsCard': 'friends',
        'messagesCard': 'messages',
        'meetupCard': 'meetup',
        'settingsCard': 'settings'
    };
    return cardTypeMap[cardId] || 'home';
}

// =================================================================================
//  FRIENDS FUNCTIONALITY
// =================================================================================

function renderFriends(list = friends) {
    const friendsList = document.getElementById('friendsList');
    if (!friendsList) return;
    
    friendsList.innerHTML = '';
    
    if (!list || list.length === 0) {
        friendsList.innerHTML = '<div class="no-friends"><i class="fas fa-user-friends"></i><p>No friends found. Start by searching for users above!</p></div>';
        return;
    }

    const friendIds = new Set(friends.map(f => f.id));

    list.forEach(async (user) => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        if (selectedFriendRow && selectedFriendRow.id === user.id) {
            item.classList.add('selected');
        }

        const isFriend = friendIds.has(user.id);
        const isCurrentUser = user.id === currentUser.id;
        
        let actionsHtml = '';
        
        if (isCurrentUser) {
            actionsHtml = '<span class="you-badge">You</span>';
        } else if (isFriend) {
            if (selectedFriendRow && selectedFriendRow.id === user.id) {
                actionsHtml = `
                    <div class="friend-actions">
                        <button class="bubble-btn message-btn" data-id="${user.id}" title="Message">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="bubble-btn remove-btn" data-id="${user.id}" data-name="${user.username}" title="Remove Friend">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    </div>
                `;
            }
        } else {
            actionsHtml = `
                <div class="friend-actions">
                    <button class="bubble-btn add-btn" data-id="${user.id}" title="Add Friend">
                        <i class="fas fa-user-plus"></i>
                    </button>
                </div>
            `;
        }

        // Create the profile icon container
        const profileIconId = `profile-icon-${user.id}`;
        
        item.innerHTML = `
            <div class="friend-info">
                <div class="profile-icon" id="${profileIconId}">
                    <i class="fas fa-user-circle"></i>
                </div>
                <span class="friend-name">${user.username}</span>
            </div>
            ${actionsHtml}
        `;

        // Add click handler for friend selection
        if (isFriend && !isCurrentUser) {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.bubble-btn')) return;
                selectedFriendRow = (selectedFriendRow && selectedFriendRow.id === user.id) ? null : user;
                renderFriends(list);
            });
        }

        friendsList.appendChild(item);

        // Load the user's profile photo after the item is added to the DOM
        loadUserProfilePhotoById(user.id, profileIconId);
    });

    // Add event listeners for action buttons
    attachFriendActionListeners();
}


function attachFriendActionListeners() {
    const friendsList = document.getElementById('friendsList');
    if (!friendsList) return;

    friendsList.querySelectorAll('.message-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = parseInt(btn.dataset.id, 10);
            openChatWithFriend(userId);
            switchToCard('messagesCard', 'messages');
            document.querySelector('[data-target="messagesCard"]').classList.add('active');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-target="messagesCard"]').classList.add('active');
        });
    });

    friendsList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirm(`Are you sure you want to remove ${btn.dataset.name}?`, () => {
                removeFriend(btn.dataset.id);
            });
        });
    });

    friendsList.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            addFriend(parseInt(btn.dataset.id, 10));
        });
    });
}

function renderFriendRequests() {
    const friendRequestsList = document.getElementById('friendRequestsList');
    const friendRequestsContainer = document.getElementById('friendRequestsContainer');
    
    if (!friendRequestsList || !friendRequestsContainer) return;
    
    friendRequestsList.innerHTML = '';
    
    if (!friendRequests || friendRequests.length === 0) {
        friendRequestsContainer.style.display = 'none';
        return;
    }

    friendRequestsContainer.style.display = 'block';
    
    friendRequests.forEach(request => {
        const item = document.createElement('div');
        item.className = 'request-item';
        item.innerHTML = `
            <div class="friend-info">
                <span class="profile-icon"><i class="fas fa-user-circle"></i></span>
                <span class="friend-name">${request.username}</span>
            </div>
            <div class="friend-actions">
                <button class="bubble-btn accept-btn" data-id="${request.id}" title="Accept">
                    <i class="fas fa-check"></i>
                </button>
                <button class="bubble-btn deny-btn" data-id="${request.id}" title="Decline">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        friendRequestsList.appendChild(item);
    });

    // Add event listeners
    friendRequestsList.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', () => respondToRequest(btn.dataset.id, 'accept'));
    });

    friendRequestsList.querySelectorAll('.deny-btn').forEach(btn => {
        btn.addEventListener('click', () => respondToRequest(btn.dataset.id, 'deny'));
    });
}

// =================================================================================
//  MESSAGES FUNCTIONALITY
// =================================================================================

function setupMessagesCard() {
    updateSelectedChatFriend();
    if (!selectedChatFriend) {
        const chatBox = document.getElementById('chatBox');
        if (chatBox) {
            chatBox.innerHTML = `
                <div class="no-chat-selected">
                    <i class="fas fa-comments chat-placeholder-icon"></i>
                    <p>Select a friend to start chatting</p>
                </div>
            `;
        }
    }
}

function toggleChatFriendsPopup() {
    const popup = document.getElementById('chatFriendsPopup');
    if (!popup) return;

    if (!friends || friends.length === 0) {
        showToast('You need friends to chat with. Add some friends first!', 'error');
        return;
    }

    renderChatFriendsPopup();
    popup.classList.toggle('show');
}

function renderChatFriendsPopup() {
    const chatFriendsPopup = document.getElementById('chatFriendsPopup');
    if (!chatFriendsPopup) return;
    
    chatFriendsPopup.innerHTML = '';
    
    if (!friends || friends.length === 0) {
        chatFriendsPopup.innerHTML = '<div class="chat-popup-item">No friends to chat with.</div>';
        return;
    }

    friends.forEach(friend => {
        const item = document.createElement('div');
        item.className = 'chat-popup-item';
        
        // Create profile icon container for each friend
        const profileIconId = `chat-popup-icon-${friend.id}`;
        
        item.innerHTML = `
            <div class="profile-icon" id="${profileIconId}">
                <i class="fas fa-user-circle"></i>
            </div>
            <span class="friend-name">${friend.username}</span>
        `;
        
        item.addEventListener('click', () => {
            chatFriendsPopup.classList.remove('show');
            openChatWithFriend(friend.id);
        });
        
        chatFriendsPopup.appendChild(item);
        
        // Load the friend's profile photo
        loadUserProfilePhotoById(friend.id, profileIconId);
    });
}

function updateSelectedChatFriend() {
    const chatHeader = document.getElementById('chatHeader');
    const selectedChatFriendSpan = document.getElementById('selectedChatFriend');
    const chatForm = document.getElementById('chatForm');
    
    if (selectedChatFriend) {
        if (chatHeader) chatHeader.style.display = 'block';
        if (selectedChatFriendSpan) selectedChatFriendSpan.textContent = selectedChatFriend.username;
        if (chatForm) chatForm.style.display = 'block';
    } else {
        if (chatHeader) chatHeader.style.display = 'none';
        if (chatForm) chatForm.style.display = 'none';
    }
}

function renderChatBox() {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;
    
    chatBox.innerHTML = '';
    
    if (!selectedChatFriend) {
        chatBox.innerHTML = `
            <div class="no-chat-selected">
                <i class="fas fa-comments chat-placeholder-icon"></i>
                <p>Select a friend to start chatting</p>
            </div>
        `;
        return;
    }

    if (!currentChatMessages || currentChatMessages.length === 0) {
        chatBox.innerHTML = `
            <div class="no-messages">
                <p>No messages yet. Start the conversation!</p>
            </div>
        `;
        return;
    }

    // Debug: Log current user ID and messages
    console.log('Current user ID:', currentUser.id);
    console.log('Rendering chat messages:', currentChatMessages);

    currentChatMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    currentChatMessages.forEach(msg => {
        const div = document.createElement('div');
        const isMyMessage = msg.sender_id === currentUser.id;
        
        // Debug: Log each message
        console.log(`Message from ${msg.sender_id}, current user: ${currentUser.id}, isMyMessage: ${isMyMessage}`);
        
        div.className = 'chat-message ' + (isMyMessage ? 'me' : 'them');
        div.innerHTML = `<div class="chat-bubble">${escapeHtml(msg.content)}</div>`;
        chatBox.appendChild(div);
    });
    
    chatBox.scrollTop = chatBox.scrollHeight;
}


// =================================================================================
//  MEETUP FUNCTIONALITY
// =================================================================================

function renderHeartFriends() {
    const heartFriendsList = document.getElementById('heartFriendsList');
    const heartActions = document.getElementById('heartActions');
    
    if (!heartFriendsList) return;
    
    heartFriendsList.innerHTML = '';
    
    if (!friends || friends.length === 0) {
        heartFriendsList.innerHTML = `
            <div class="no-friends">
                <i class="fas fa-user-friends"></i>
                <p>You need to add friends before you can meet up.</p>
            </div>
        `;
        return;
    }

    friends.forEach(friend => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        
        // Create profile icon container for each friend
        const profileIconId = `heart-icon-${friend.id}`;
        
        item.innerHTML = `
            <div class="friend-info">
                <div class="profile-icon" id="${profileIconId}">
                    <i class="fas fa-user-circle"></i>
                </div>
                <span class="friend-name">${friend.username}</span>
            </div>
        `;
        
        item.addEventListener('click', () => {
            heartFriendsList.querySelectorAll('.friend-item').forEach(child => {
                child.classList.remove('selected');
            });
            item.classList.add('selected');
            
            if (heartActions) {
                heartActions.style.display = 'flex';
                heartActions.dataset.selectedFriendId = friend.id;
            }
        });
        
        heartFriendsList.appendChild(item);
        
        // Load the friend's profile photo
        loadUserProfilePhotoById(friend.id, profileIconId);
    });

    if (heartActions) heartActions.style.display = 'none';
}

async function loadPendingMeetupRequests() {
    try {
        const response = await fetch('/api/meetups/pending');
        const result = await response.json();
        
        if (result.status === 'success') {
            renderPendingMeetupRequests(result.pendingRequests || []);
        }
    } catch (error) {
        console.error('Error loading pending meetup requests:', error);
    }
}

function renderPendingMeetupRequests(requests) {
    const pendingContainer = document.getElementById('pendingMeetupRequests');
    const pendingList = document.getElementById('pendingMeetupsList');
    
    if (!pendingContainer || !pendingList) return;
    
    if (!requests || requests.length === 0) {
        pendingContainer.style.display = 'none';
        return;
    }
    
    pendingContainer.style.display = 'block';
    pendingList.innerHTML = '';
    
    requests.forEach(request => {
        const item = document.createElement('div');
        item.className = 'request-item';
        item.innerHTML = `
            <div class="friend-info">
                <span class="profile-icon"><i class="fas fa-user-circle"></i></span>
                <span class="friend-name">${request.requester_name}</span>
            </div>
            <div class="friend-actions">
                <button class="bubble-btn accept-btn" onclick="acceptMeetupRequest(${request.session_id})" title="Accept">
                    <i class="fas fa-check"></i>
                </button>
                <button class="bubble-btn deny-btn" onclick="denyMeetupRequest(${request.session_id})" title="Decline">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        pendingList.appendChild(item);
    });
}

// Add these functions for accepting/denying meetup requests
async function acceptMeetupRequest(sessionId) {
    activeMeetupSessionId = sessionId;
    const ndaModal = document.getElementById('ndaModal');
    if (ndaModal) {
        ndaModal.style.display = 'block';
        const acceptNdaBtn = document.getElementById('acceptNdaBtn');
        if (acceptNdaBtn) acceptNdaBtn.disabled = true;
        
        const ndaText = document.getElementById('ndaText');
        if (ndaText) ndaText.scrollTop = 0;
    }
}

async function denyMeetupRequest(sessionId) {
    try {
        const response = await fetch(`/api/meetups/deny/${sessionId}`, {
            method: 'PUT'
        });
        const result = await response.json();
        
        if (response.ok) {
            showToast('Meetup request declined.');
            loadPendingMeetupRequests(); // Refresh the list
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Update the handleCardSwitch function to load pending requests:
function handleCardSwitch(cardType, cardId) {
    switch(cardType) {
        case 'friends':
            renderFriends();
            renderFriendRequests();
            break;
        case 'messages':
            setupMessagesCard();
            break;
        case 'meetup':
            renderHeartFriends();
            loadPendingMeetupRequests(); // Add this line
            break;
        case 'settings':
            loadCurrentUserData();
            loadUserProfilePhoto();
            break;
        case 'home':
        default:
            selectedFriendRow = null;
            selectedChatFriend = null;
            break;
    }
}

// =================================================================================
//  EVENT HANDLERS
// =================================================================================

async function handleFriendSearch(e) {
    e.preventDefault();
    const searchInput = document.getElementById('searchFriendsInput');
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        renderFriends();
        return;
    }
    
    showSpinner();
    try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        renderFriends(result.users);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideSpinner();
    }
}

async function handleChatSubmit(e) {
    e.preventDefault();
    const chatInput = document.getElementById('chatInput');
    const content = chatInput.value.trim();
    
    if (!content || !selectedChatFriend) return;

    // Clear input immediately
    chatInput.value = '';

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverId: selectedChatFriend.id, content })
        });
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.message);

        // Add the real message from server to our messages array
        const newMessage = {
            id: result.messageId,
            sender_id: currentUser.id,
            receiver_id: selectedChatFriend.id,
            content: content,
            created_at: new Date().toISOString()
        };
        
        currentChatMessages.push(newMessage);
        renderChatBox();
        
    } catch (error) {
        showToast(error.message, 'error');
        // Restore the input value if there was an error
        chatInput.value = content;
    }
}

async function handleMeetupRequest() {
    const heartActions = document.getElementById('heartActions');
    const friendId = parseInt(heartActions?.dataset.selectedFriendId, 10);
    
    if (!friendId) {
        showToast('No friend selected.', 'error');
        return;
    }

    showSpinner();
    try {
        const response = await fetch('/api/meetups/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresseeId: friendId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        activeMeetupSessionId = result.sessionId;
        const ndaModal = document.getElementById('ndaModal');
        if (ndaModal) {
            ndaModal.style.display = 'block';
            const acceptNdaBtn = document.getElementById('acceptNdaBtn');
            if (acceptNdaBtn) acceptNdaBtn.disabled = true;
            
            const ndaText = document.getElementById('ndaText');
            if (ndaText) ndaText.scrollTop = 0;
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideSpinner();
    }
}

// ADD THIS NEW FUNCTION FOR REAL-TIME MEETUP STATUS CHECKING
let meetupStatusInterval = null;

async function startMeetupStatusPolling(sessionId) {
    console.log(`🔄 Starting meetup status polling for session ${sessionId}`);
    
    // Clear any existing polling
    if (meetupStatusInterval) {
        clearInterval(meetupStatusInterval);
    }
    
    // Poll every 3 seconds
    meetupStatusInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/meetups/status/${sessionId}`);
            const result = await response.json();
            
            if (!response.ok) {
                console.error('Error checking meetup status:', result.message);
                return;
            }
            
            console.log(`📊 Meetup status update:`, result);
            
            const waitingCard = document.getElementById('waitingCard');
            const sessionStartedCard = document.getElementById('sessionStartedCard');
            
            // Check if both users have confirmed
            if (result.requesterConfirmed && result.addresseeConfirmed) {
                console.log('🎯 Both users confirmed! Checking final status...');
                
                if (result.meetupStatus === 'completed' && result.proximityCheckSuccessful) {
                    // Success - users are close enough
                    console.log('🎉 Meetup completed - users are close!');
                    
                    if (meetupStatusInterval) {
                        clearInterval(meetupStatusInterval);
                        meetupStatusInterval = null;
                    }
                    
                    if (waitingCard) waitingCard.style.display = 'none';
                    if (sessionStartedCard) sessionStartedCard.style.display = 'block';
                    
                    showToast('Meetup confirmed! Both users are within 10 feet of each other.', 'success');
                    
                    // NEW: Save state after UI change
                    saveStateDebounced();
                    
                } else if (result.meetupStatus === 'failed_proximity') {
                    // Failed - users too far apart
                    console.log('❌ Meetup failed - users too far apart');
                    
                    if (meetupStatusInterval) {
                        clearInterval(meetupStatusInterval);
                        meetupStatusInterval = null;
                    }
                    
                    if (waitingCard) waitingCard.style.display = 'none';
                    if (sessionStartedCard) sessionStartedCard.style.display = 'none';
                    
                    showToast('Meetup failed - you are not close enough to each other.', 'error');
                    switchToCard('meetupCard', 'meetup');
                    
                    // NEW: Clear session and save state
                    activeMeetupSessionId = null;
                    saveStateDebounced();
                }
            }
            
            // Handle other status changes
            if (result.meetupStatus === 'denied') {
                console.log('🚫 Meetup denied by other user');
                
                if (meetupStatusInterval) {
                    clearInterval(meetupStatusInterval);
                    meetupStatusInterval = null;
                }
                
                if (waitingCard) waitingCard.style.display = 'none';
                if (sessionStartedCard) sessionStartedCard.style.display = 'none';
                
                showToast('Meetup was declined by the other user.', 'error');
                switchToCard('meetupCard', 'meetup');
                
                // NEW: Clear session and save state
                activeMeetupSessionId = null;
                saveStateDebounced();
            }
            
            // NEW: Handle ended status
            if (result.meetupStatus === 'ended') {
                console.log('🔚 Meetup ended by other user');
                
                if (meetupStatusInterval) {
                    clearInterval(meetupStatusInterval);
                    meetupStatusInterval = null;
                }
                
                if (waitingCard) waitingCard.style.display = 'none';
                if (sessionStartedCard) sessionStartedCard.style.display = 'none';
                
                showToast('Meetup session was ended by the other user.', 'info');
                switchToCard('meetupCard', 'meetup');
                
                // NEW: Clear session and save state
                activeMeetupSessionId = null;
                saveStateDebounced();
            }
            
        } catch (error) {
            console.error('Error polling meetup status:', error);
        }
    }, 3000); // Poll every 3 seconds
}

function stopMeetupStatusPolling() {
    if (meetupStatusInterval) {
        clearInterval(meetupStatusInterval);
        meetupStatusInterval = null;
        console.log('⏹️ Stopped meetup status polling');
    }
}

async function handleSupportSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const subject = formData.get('subject');
    const message = formData.get('message');
    
    if (!subject || !message) {
        showToast('Please fill in all fields.', 'error');
        return;
    }

    showSpinner();
    try {
        const response = await fetch('/api/support', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, message })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        showToast('Support request sent successfully!');
        e.target.reset();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideSpinner();
    }
}

async function handleLogout() {
    showSpinner();
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            // --- CLEAR STATE ON LOGOUT ---
            clearAppState();
            stopMeetupStatusPolling();
            
            showToast('Logged out successfully!');
            setTimeout(() => {
                window.location.href = '/pages/login.html';
            }, 1000);
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed. Please try again.', 'error');
        setTimeout(() => {
            clearAppState(); // Clear state even on failed logout
            window.location.href = '/pages/login.html';
        }, 2000);
    } finally {
        hideSpinner();
    }
}

// =================================================================================
//  MODAL FUNCTIONALITY
// =================================================================================

function setupModalEvents() {
    const ndaModal = document.getElementById('ndaModal');
    const ndaText = document.getElementById('ndaText');
    const acceptNdaBtn = document.getElementById('acceptNdaBtn');
    const declineNdaBtn = document.getElementById('declineNdaBtn');
    const endSessionBtn = document.getElementById('endSessionBtn');

    // NDA scroll detection
    if (ndaText) {
        ndaText.addEventListener('scroll', () => {
            if (ndaText.scrollTop + ndaText.clientHeight >= ndaText.scrollHeight - 5) {
                if (acceptNdaBtn) acceptNdaBtn.disabled = false;
            }
        });
    }

    // NDA accept
    if (acceptNdaBtn) {
        acceptNdaBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showToast('Geolocation is not supported.', 'error');
                return;
            }
            
            showSpinner();
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`/api/meetups/confirm/${activeMeetupSessionId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);

                    if (ndaModal) ndaModal.style.display = 'none';
                    
                    const waitingCard = document.getElementById('waitingCard');
                    const sessionStartedCard = document.getElementById('sessionStartedCard');
                    
                    if (result.finalStatus === 'completed') {
                        // Both users confirmed immediately
                        if (sessionStartedCard) sessionStartedCard.style.display = 'block';
                        showToast('Meetup confirmed! Both users are within 10 feet of each other.', 'success');
                    } else {
                        // Still waiting for other user - start polling
                        if (waitingCard) waitingCard.style.display = 'block';
                        showToast('Location confirmed. Waiting for the other user...', 'info');
                        
                        // Start real-time status checking
                        startMeetupStatusPolling(activeMeetupSessionId);
                }
                
                // NEW: Save state after UI changes
                saveStateDebounced();
                
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideSpinner();
            }
        }, () => {
            hideSpinner();
            showToast('Could not get your location.', 'error');
        });
    });
}

    // NDA decline
    if (declineNdaBtn) {
        declineNdaBtn.addEventListener('click', () => {
            if (ndaModal) ndaModal.style.display = 'none';
            stopMeetupStatusPolling(); // Stop polling if user declines
            switchToCard('newsFeedCard', 'home');
        });
    }

    // End session
    if (endSessionBtn) {
    endSessionBtn.addEventListener('click', async () => {
        if (!activeMeetupSessionId) {
            console.error('No active meetup session to end');
            return;
        }
        
        showSpinner();
        try {
            // Call the server to end the session
            const response = await fetch(`/api/meetups/end/${activeMeetupSessionId}`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to end session');
            }
            
            console.log('✅ Session ended successfully');
            
            // Hide session card and stop polling
            const sessionStartedCard = document.getElementById('sessionStartedCard');
            if (sessionStartedCard) sessionStartedCard.style.display = 'none';
            
            stopMeetupStatusPolling();
            activeMeetupSessionId = null;
            
            showToast('Meetup session ended successfully.', 'success');
            switchToCard('meetupCard', 'meetup');
            
        } catch (error) {
            console.error('Error ending session:', error);
            showToast(error.message || 'Failed to end session.', 'error');
        } finally {
            hideSpinner();
        }
    });
}

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    // Close modals on outside click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// =================================================================================
//  PROFILE FUNCTIONALITY
// =================================================================================

function setupProfileUpdateEvents() {
    // Profile photo change handler
    const newProfilePhoto = document.getElementById('newProfilePhoto');
    if (newProfilePhoto) {
        newProfilePhoto.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Check file size (5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                    showToast('Profile photo must be less than 5MB', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const currentPhoto = document.getElementById('currentProfilePhoto');
                    if (currentPhoto) {
                        currentPhoto.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Profile update form
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', handleProfileUpdate);
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const photoFile = formData.get('profilePhoto');
    
    showSpinner();
    try {
        let photoUpdated = false;
        // 1. Update profile photo if a new one was selected
        if (photoFile && photoFile.size > 0) {
            const photoFormData = new FormData();
            photoFormData.append('profilePhoto', photoFile);
            
            const photoResponse = await fetch('/api/update-profile-photo', {
                method: 'POST',
                body: photoFormData
            });
            
            const photoResult = await photoResponse.json();
            if (!photoResponse.ok) {
                throw new Error(photoResult.message || 'Failed to update photo.');
            }
            
            // Use the new photo data from the server to update the UI
            if (photoResult.status === 'success' && photoResult.photo) {
                const newPhotoSrc = photoResult.photo;

                // Update header logo
                const profileLogo = document.querySelector('.profile-logo');
                if (profileLogo) profileLogo.src = newPhotoSrc;

                // Update settings card photo preview
                const currentProfilePhoto = document.getElementById('currentProfilePhoto');
                if (currentProfilePhoto) {
                    currentProfilePhoto.innerHTML = `<img src="${newPhotoSrc}" alt="New Profile Photo" style="width: 100%; height: 100%; object-fit: cover;">`;
                }
            }
            photoUpdated = true;
        }
        
        // 2. Update other profile info (no changes needed here)
        const updateData = {};
        const username = formData.get('username').trim();
        const email = formData.get('email').trim();
        const password = formData.get('password');

        if (username && username !== currentUser.username) updateData.username = username;
        if (email && email !== currentUser.email) updateData.email = email;
        if (password) updateData.password = password;
        
        let infoUpdated = false;
        if (Object.keys(updateData).length > 0) {
            const profileResponse = await fetch('/api/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            if (!profileResponse.ok) {
                const errorData = await profileResponse.json();
                throw new Error(errorData.message || 'Failed to update profile info.');
            }
            
            // Manually update the currentUser object with the new data that we know was successful.
            if (updateData.username) currentUser.username = updateData.username;
            if (updateData.email) currentUser.email = updateData.email;

            infoUpdated = true;
        }
        
        // 3. Show success messages and refresh data
        if (photoUpdated) showToast('Profile photo updated successfully!');
        if (infoUpdated) {
            showToast('Profile info updated successfully!');
            // No longer need to call loadCurrentUserData() here, as we updated it manually.
        }
        if (!photoUpdated && !infoUpdated) showToast('No changes were made.', 'info');

        e.target.querySelector('input[name="password"]').value = '';

    } catch (error) {
        console.error('Profile update error:', error);
        showToast(error.message, 'error');
    } finally {
        hideSpinner();
    }
}

async function loadUserProfilePhoto() {
    try {
        const response = await fetch('/api/profile-photo');
        const data = await response.json();
        
        if (data.status === 'success' && data.hasPhoto) {
            // Update profile logo
            const profileLogo = document.querySelector('.profile-logo');
            if (profileLogo) {
                profileLogo.src = data.photo;
                profileLogo.style.borderRadius = '50%';
                profileLogo.style.border = '3px solid #00bcd4';
                profileLogo.style.objectFit = 'cover';
            }
            
            // Update settings profile photo
            const currentProfilePhoto = document.getElementById('currentProfilePhoto');
            if (currentProfilePhoto) {
                currentProfilePhoto.innerHTML = `<img src="${data.photo}" style="width: 100%; height: 100%; object-fit: cover;">`;
            }
        }
    } catch (error) {
        console.error('Error loading profile photo:', error);
    }
}

// NEW FUNCTION: Load profile photo for a specific user
async function loadUserProfilePhotoById(userId, profileIconId) {
    try {
        const response = await fetch(`/api/profile-photo/${userId}`);
        const data = await response.json();
        
        const profileIcon = document.getElementById(profileIconId);
        if (!profileIcon) return;
        
        if (data.status === 'success' && data.hasPhoto) {
            // Replace the icon with the actual photo
            profileIcon.innerHTML = `<img src="${data.photo}" alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #00bcd4;">`;
        }
        // If no photo, keep the default icon
    } catch (error) {
        console.error(`Error loading profile photo for user ${userId}:`, error);
        // Keep the default icon on error
    }
}

async function loadCurrentUserData() {
    try {
        const response = await fetch('/api/me');
        const data = await response.json();
        
        if (data.status === 'success') {
            // Update the global currentUser object to keep it in sync with the database.
            currentUser = data.user;

            const usernameInput = document.getElementById('currentUsername');
            const emailInput = document.getElementById('currentEmail');
            
            if (usernameInput) usernameInput.value = data.user.username;
            if (emailInput) emailInput.value = data.user.email;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// =================================================================================
//  API FUNCTIONS
// =================================================================================

async function addFriend(userId) {
    showSpinner();
    try {
        const response = await fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresseeId: userId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        showToast('Friend request sent!');
        await initializeAppData();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideSpinner();
    }
}

async function removeFriend(userId) {
    showSpinner();
    try {
        const response = await fetch(`/api/friends/${userId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        showToast('Friend removed successfully!');
        await initializeAppData();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideSpinner();
    }
}

async function respondToRequest(requesterId, response) {
    showSpinner();
    try {
        const res = await fetch(`/api/friends/request/${requesterId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
        
        showToast(`Request ${response === 'accept' ? 'accepted' : 'denied'}.`);
        await initializeAppData();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideSpinner();
    }
}

async function openChatWithFriend(userId) {
    const friendToChatWith = friends.find(f => f.id === userId);
    if (!friendToChatWith) {
        showToast('Could not find that friend.', 'error');
        return;
    }

    selectedChatFriend = friendToChatWith;
    
    // --- SAVE STATE WHEN CHAT FRIEND CHANGES ---
    saveStateDebounced();
    
    updateSelectedChatFriend();
    
    showSpinner();
    try {
        const response = await fetch(`/api/messages/${friendToChatWith.id}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        currentChatMessages = result.messages || [];
        renderChatBox();
    } catch (error) {
        showToast(error.message, 'error');
        const chatBox = document.getElementById('chatBox');
        if (chatBox) {
            chatBox.innerHTML = `
                <div class="no-messages">
                    <p>Could not load messages.</p>
                </div>
            `;
        }
    } finally {
        hideSpinner();
    }
}

// =================================================================================
//  UTILITY FUNCTIONS
// =================================================================================

function showSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showConfirm(message, onConfirm) {
    if (confirm(message)) onConfirm();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =================================================================================
//  CSS STYLES FOR MISSING ELEMENTS
// =================================================================================

// Add these styles if they're missing from CSS
const additionalStyles = `
<style>
.no-friends, .no-messages {
    text-align: center;
    padding: 2rem;
    color: #999;
}

.no-friends i {
    font-size: 3rem;
    color: #ddd;
    margin-bottom: 1rem;
}

.you-badge {
    background: #e3f2fd;
    color: #00bcd4;
    padding: 0.3rem 0.8rem;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
}

.friend-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.friends-popup.show {
    display: block;
}

.heart-selected {
    background: #e3f2fd !important;
    border-color: #00bcd4 !important;
}
</style>
`;

// Inject additional styles if needed
if (!document.querySelector('#additional-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'additional-styles';
    styleElement.innerHTML = additionalStyles;
    document.head.appendChild(styleElement);
}

function saveAppState() {
    const appState = {
        currentActiveCard: currentActiveCard,
        selectedChatFriend: selectedChatFriend ? {
            id: selectedChatFriend.id,
            username: selectedChatFriend.username
        } : null,
        selectedFriendRow: selectedFriendRow ? {
            id: selectedFriendRow.id,
            username: selectedFriendRow.username
        } : null,
        activeMeetupSessionId: activeMeetupSessionId,
        // NEW: Save meetup session UI states
        meetupUIState: {
            isWaitingCardVisible: document.getElementById('waitingCard')?.style.display === 'block',
            isSessionStartedCardVisible: document.getElementById('sessionStartedCard')?.style.display === 'block',
            isNdaModalVisible: document.getElementById('ndaModal')?.style.display === 'block'
        },
        lastSaved: Date.now()
    };
    
    try {
        localStorage.setItem('welcomeAppState', JSON.stringify(appState));
        console.log('💾 App state saved:', appState);
    } catch (error) {
        console.error('Failed to save app state:', error);
    }
}

function loadAppState() {
    try {
        const savedState = localStorage.getItem('welcomeAppState');
        if (!savedState) return false;
        
        const appState = JSON.parse(savedState);
        
        // Don't restore state if it's older than 1 hour
        if (Date.now() - appState.lastSaved > 60 * 60 * 1000) {
            localStorage.removeItem('welcomeAppState');
            return false;
        }
        
        console.log('📂 Loading app state:', appState);
        
        // Restore global variables
        currentActiveCard = appState.currentActiveCard || 'newsFeedCard';
        activeMeetupSessionId = appState.activeMeetupSessionId || null;
        
        // Restore selected chat friend
        if (appState.selectedChatFriend) {
            selectedChatFriend = appState.selectedChatFriend;
        }
        
        // Restore selected friend row
        if (appState.selectedFriendRow) {
            selectedFriendRow = appState.selectedFriendRow;
        }
        
        // NEW: Restore meetup session UI state
        if (activeMeetupSessionId && appState.meetupUIState) {
            setTimeout(() => {
                restoreMeetupUIState(appState.meetupUIState);
            }, 100); // Small delay to ensure DOM is ready
        }
        
        return true;
    } catch (error) {
        console.error('Failed to load app state:', error);
        localStorage.removeItem('welcomeAppState');
        return false;
    }
}

async function restoreMeetupUIState(meetupUIState) {
    if (!activeMeetupSessionId) return;
    
    console.log('🔄 Restoring meetup session state...', meetupUIState);
    
    try {
        // Check current session status from server
        const response = await fetch(`/api/meetups/status/${activeMeetupSessionId}`);
        const result = await response.json();
        
        if (!response.ok) {
            console.log('❌ Session no longer exists, clearing state');
            activeMeetupSessionId = null;
            clearAppState();
            return;
        }
        
        console.log('📊 Current session status:', result);
        
        const waitingCard = document.getElementById('waitingCard');
        const sessionStartedCard = document.getElementById('sessionStartedCard');
        const ndaModal = document.getElementById('ndaModal');
        
        // Hide all meetup UI elements first
        if (waitingCard) waitingCard.style.display = 'none';
        if (sessionStartedCard) sessionStartedCard.style.display = 'none';
        if (ndaModal) ndaModal.style.display = 'none';
        
        // Restore UI based on current server state
        if (result.meetupStatus === 'completed' && result.proximityCheckSuccessful) {
            // Session completed successfully
            if (sessionStartedCard) {
                sessionStartedCard.style.display = 'block';
                console.log('✅ Restored to completed session view');
            }
            
        } else if (result.meetupStatus === 'pending') {
            // Check if current user has confirmed
            const currentUserConfirmed = (result.requesterId === currentUser.id && result.requesterConfirmed) ||
                                       (result.addresseeId === currentUser.id && result.addresseeConfirmed);
            
            if (currentUserConfirmed) {
                // User has confirmed, waiting for other user
                if (waitingCard) {
                    waitingCard.style.display = 'block';
                    console.log('⏳ Restored to waiting view');
                }
                
                // Restart status polling
                startMeetupStatusPolling(activeMeetupSessionId);
                
            } else {
                // User hasn't confirmed yet, show NDA modal
                if (ndaModal) {
                    ndaModal.style.display = 'block';
                    const acceptNdaBtn = document.getElementById('acceptNdaBtn');
                    if (acceptNdaBtn) acceptNdaBtn.disabled = true;
                    
                    const ndaText = document.getElementById('ndaText');
                    if (ndaText) ndaText.scrollTop = 0;
                    
                    console.log('📋 Restored to NDA confirmation view');
                }
            }
            
        } else if (result.meetupStatus === 'failed_proximity') {
            console.log('❌ Session failed proximity check');
            showToast('Previous meetup session failed - users were not close enough.', 'error');
            activeMeetupSessionId = null;
            
        } else if (result.meetupStatus === 'denied') {
            console.log('🚫 Session was denied');
            showToast('Previous meetup session was declined.', 'error');
            activeMeetupSessionId = null;
            
        } else if (result.meetupStatus === 'ended') {
            console.log('🔚 Session was ended');
            showToast('Previous meetup session was ended.', 'info');
            activeMeetupSessionId = null;
        }
        
        // Clear session ID if it's no longer active
        if (!['pending', 'completed'].includes(result.meetupStatus)) {
            activeMeetupSessionId = null;
            clearAppState();
        }
        
    } catch (error) {
        console.error('❌ Error restoring meetup session:', error);
        // Clear invalid session
        activeMeetupSessionId = null;
        clearAppState();
    }
}

function clearAppState() {
    localStorage.removeItem('welcomeAppState');
    console.log('🗑️ App state cleared');
}

// Save state whenever important changes happen
function saveStateDebounced() {
    clearTimeout(window.saveStateTimeout);
    window.saveStateTimeout = setTimeout(saveAppState, 500); // Save after 500ms of no changes
}


// Add this function after the existing initializeAppData function (around line 150):
async function loadNewsFeed() {
    try {
        const response = await fetch('/api/news-feed');
        const result = await response.json();
        
        if (result.status === 'success') {
            renderNewsFeed(result.posts);
        } else {
            throw new Error(result.message || 'Failed to load news feed');
        }
    } catch (error) {
        console.error('Error loading news feed:', error);
        renderNewsFeedError();
    }
}

// Replace the renderNewsFeed function:
function renderNewsFeed(posts) {
    const newsFeedCard = document.getElementById('newsFeedCard');
    const cardContent = newsFeedCard?.querySelector('.card-content');
    
    if (!cardContent) return;
    
    cardContent.innerHTML = '';
    
    if (!posts || posts.length === 0) {
        cardContent.innerHTML = `
            <div class="no-posts">
                <div class="no-posts-icon">
                    <i class="fas fa-newspaper"></i>
                </div>
                <h3>No News Yet</h3>
                <p>Check back later for updates and announcements!</p>
            </div>
        `;
        return;
    }
    
    posts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.setAttribute('data-post-id', post.id);
        
        // Get post type icon and color
        const typeInfo = getPostTypeInfo(post.post_type);
        
        // Format the date
        const postDate = new Date(post.created_at).toLocaleString();
        
        // Determine priority styling
        const priorityClass = post.priority === 'high' ? 'high-priority' : '';
        
        // Determine like button state
        const likeButtonClass = post.user_liked ? 'liked' : '';
        const likeCount = post.like_count || 0;
        
        postItem.innerHTML = `
            <div class="post-header ${priorityClass}">
                <div class="post-avatar ${typeInfo.bgColor}">
                    <i class="${typeInfo.icon} ${typeInfo.textColor}"></i>
                </div>
                <div class="post-info">
                    <div class="post-meta">
                        <span class="post-username">${escapeHtml(post.admin_name)}</span>
                        <span class="post-type-badge ${typeInfo.badgeClass}">${typeInfo.label}</span>
                        ${post.priority === 'high' ? '<span class="priority-badge">Important</span>' : ''}
                    </div>
                    <span class="post-time">${postDate}</span>
                </div>
            </div>
            <div class="post-content">
                <h4 class="post-title">${escapeHtml(post.title)}</h4>
                <div class="post-text">${formatPostContent(post.content)}</div>
            </div>
            <div class="post-actions">
                <button class="action-btn like-btn ${likeButtonClass}" onclick="toggleLike(${post.id})" data-post-id="${post.id}">
                    <i class="fas fa-thumbs-up"></i> <span class="like-count">${likeCount}</span>
                </button>
            </div>
        `;
        
        cardContent.appendChild(postItem);
    });
}

// Add this new function to handle post content formatting:
function formatPostContent(content) {
    if (!content) return '';
    
    // Escape HTML first to prevent XSS
    let formattedContent = escapeHtml(content);
    
    // Convert line breaks to HTML line breaks
    formattedContent = formattedContent.replace(/\n\n/g, '</p><p>'); // Double line breaks become paragraph breaks
    formattedContent = formattedContent.replace(/\n/g, '<br>'); // Single line breaks become <br>
    
    // Wrap in paragraphs if it contains paragraph breaks
    if (formattedContent.includes('</p><p>')) {
        formattedContent = `<p>${formattedContent}</p>`;
    }
    
    return formattedContent;
}

// Replace the existing likePost function with this new toggleLike function:
async function toggleLike(postId) {
    const likeButton = document.querySelector(`[data-post-id="${postId}"].like-btn`);
    const likeCountSpan = likeButton?.querySelector('.like-count');
    
    if (!likeButton || !likeCountSpan) return;
    
    const isLiked = likeButton.classList.contains('liked');
    const method = isLiked ? 'DELETE' : 'POST';
    
    try {
        // Optimistic UI update
        likeButton.disabled = true;
        
        const response = await fetch(`/api/news-posts/${postId}/like`, {
            method: method,
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update UI based on server response
            likeCountSpan.textContent = result.like_count;
            
            if (result.user_liked) {
                likeButton.classList.add('liked');
                showToast('Thanks for your feedback!', 'success');
            } else {
                likeButton.classList.remove('liked');
                showToast('Like removed', 'info');
            }
        } else {
            throw new Error(result.message || 'Failed to update like');
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        showToast(error.message || 'Failed to update like', 'error');
    } finally {
        likeButton.disabled = false;
    }
}

// Remove the old placeholder functions and keep only toggleLike:
// Remove: function likePost(postId) { ... }
// Remove: function showComments(postId) { ... }
// Remove: function sharePost(postId) { ... }

function getPostTypeInfo(postType) {
    const typeMap = {
        'announcement': {
            icon: 'fas fa-bullhorn',
            label: 'Announcement',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-600',
            badgeClass: 'bg-blue-100 text-blue-800'
        },
        'update': {
            icon: 'fas fa-sync-alt',
            label: 'Update',
            bgColor: 'bg-green-100',
            textColor: 'text-green-600',
            badgeClass: 'bg-green-100 text-green-800'
        },
        'maintenance': {
            icon: 'fas fa-tools',
            label: 'Maintenance',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-600',
            badgeClass: 'bg-orange-100 text-orange-800'
        },
        'feature': {
            icon: 'fas fa-star',
            label: 'New Feature',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-600',
            badgeClass: 'bg-purple-100 text-purple-800'
        }
    };
    
    return typeMap[postType] || typeMap['announcement'];
}

function renderNewsFeedError() {
    const newsFeedCard = document.getElementById('newsFeedCard');
    const cardContent = newsFeedCard?.querySelector('.card-content');
    
    if (!cardContent) return;
    
    cardContent.innerHTML = `
        <div class="error-state">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Couldn't Load News</h3>
            <p>There was a problem loading the news feed. Please try again later.</p>
            <button class="retry-btn" onclick="loadNewsFeed()">
                <i class="fas fa-sync-alt"></i> Try Again
            </button>
        </div>
    `;
}

// Placeholder functions for post interactions
function likePost(postId) {
    showToast('Thanks for your feedback!', 'info');
}

function showComments(postId) {
    showToast('Comments feature coming soon!', 'info');
}

function sharePost(postId) {
    showToast('Share feature coming soon!', 'info');
}

// Update the initializeAppData function to load news feed:
async function initializeAppData() {
    showSpinner();
    try {
        const [meResponse, friendshipsResponse] = await Promise.all([
            fetch('/api/me'),
            fetch('/api/friendships')
        ]);

        if (!meResponse.ok) {
            window.location.href = '/pages/login.html';
            return;
        }

        const meData = await meResponse.json();
        const friendshipsData = await friendshipsResponse.json();

        currentUser = meData.user;
        
        const allFriendships = friendshipsData.friendships || [];
        friends = allFriendships.filter(f => f.status === 'accepted');
        friendRequests = allFriendships.filter(f => f.status === 'pending' && f.addressee_id === currentUser.id);

        // Initial renders
        renderFriends();
        renderFriendRequests();
        renderHeartFriends();
        
        // Load news feed - ADD THIS LINE
        await loadNewsFeed();
        
        // Load user profile data
        await loadUserProfilePhoto();
        await loadCurrentUserData();

        // State restoration code...
        const stateRestored = loadAppState();
        
        if (stateRestored) {
            // Restore the active card
            switchToCard(currentActiveCard, getCardTypeFromId(currentActiveCard));
            
            // Update active nav button
            const navButtons = document.querySelectorAll('.nav-btn');
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            const activeButton = document.querySelector(`[data-target="${currentActiveCard}"]`);
            if (activeButton) activeButton.classList.add('active');
            
            // Restore chat if needed
            if (selectedChatFriend) {
                await openChatWithFriend(selectedChatFriend.id);
            }
            
            console.log(`🔄 App state restored to: ${currentActiveCard}`);
        }

    } catch (error) {
        console.error('Initialization failed:', error);
        showToast('Could not load app data. Please try again.', 'error');
    } finally {
        hideSpinner();
    }
}

// Update the handleCardSwitch function to reload news feed when switching to home:
function handleCardSwitch(cardType, cardId) {
    switch(cardType) {
        case 'friends':
            renderFriends();
            renderFriendRequests();
            break;
        case 'messages':
            setupMessagesCard();
            break;
        case 'meetup':
            renderHeartFriends();
            loadPendingMeetupRequests();
            break;
        case 'settings':
            loadCurrentUserData();
            loadUserProfilePhoto();
            break;
        case 'home':
        default:
            selectedFriendRow = null;
            selectedChatFriend = null;
            loadNewsFeed(); // Reload news feed when returning to home
            break;
    }
}