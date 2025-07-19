const socket = io();
const chatBox = document.getElementById( 'chat-box' );
const input = document.getElementById( 'message-input' );
const sendBtn = document.getElementById( 'send-btn' );
const roomSelect = document.getElementById( 'room-select' );
const typingStatus = document.getElementById( 'typing-status' );
const usernameDisplay = document.getElementById( 'username-display' );
const clearHistoryBtn = document.getElementById( 'clear-history-btn' );
const exportBtn = document.getElementById( 'export-btn' );
const importBtn = document.getElementById( 'import-btn' );
const importFile = document.getElementById( 'import-file' );
const toast = document.getElementById( 'toast' );

let username = prompt( "Enter your name:" ) || "Guest";
usernameDisplay.textContent = `👤 ${ username }`;
socket.emit( 'set username', username );
socket.emit( 'join room', roomSelect.value );

let undoData = {};

function showToast ( message, undoCallback = null, type = 'info' ) {
    toast.textContent = '';
    toast.className = 'toast';

    if ( type === 'success' ) {
        toast.style.background = '#4caf50';
        toast.textContent = '✅ ' + message;
    } else {
        toast.style.background = '#2196f3';
        toast.textContent = 'ℹ️ ' + message;
    }

    toast.classList.add( 'show' );

    if ( undoCallback ) {
        const undoBtn = document.createElement( 'button' );
        undoBtn.textContent = 'Undo';
        undoBtn.style.marginLeft = '12px';
        undoBtn.style.background = '#fff';
        undoBtn.style.color = '#000';
        undoBtn.style.padding = '2px 6px';
        undoBtn.style.borderRadius = '3px';
        undoBtn.onclick = () => {
            undoCallback();
            toast.classList.remove( 'show' );
        };
        toast.appendChild( undoBtn );
    }

    setTimeout( () => {
        toast.classList.remove( 'show' );
        toast.innerHTML = '';
    }, 3000 );
}

function loadChatHistory ( room ) {
    chatBox.innerHTML = '';
    const history = JSON.parse( localStorage.getItem( `chat-history-${ room }` ) ) || [];
    history.forEach( ( { user, msg, time } ) => {
        appendMessage( `<strong>${ user }:</strong> ${ msg }`, time );
    } );
}

function saveToLocalHistory ( room, entry ) {
    const history = JSON.parse( localStorage.getItem( `chat-history-${ room }` ) ) || [];
    history.push( entry );
    localStorage.setItem( `chat-history-${ room }`, JSON.stringify( history ) );
}

function clearChatHistory ( room ) {
    undoData[ room ] = localStorage.getItem( `chat-history-${ room }` );
    localStorage.removeItem( `chat-history-${ room }` );
    chatBox.innerHTML = '';
}

function restoreChatHistory ( room ) {
    if ( undoData[ room ] ) {
        localStorage.setItem( `chat-history-${ room }`, undoData[ room ] );
        loadChatHistory( room );
        showToast( 'Chat history restored successfully.', null, 'success' );
    }
}

function appendMessage ( message, time ) {
    const div = document.createElement( 'div' );
    div.classList.add( 'chat-message' );
    div.innerHTML = `<span class="time">[${ time }]</span> ${ message }`;
    chatBox.appendChild( div );
    chatBox.scrollTop = chatBox.scrollHeight;
}

sendBtn.addEventListener( 'click', () => {
    const msg = input.value.trim();
    if ( msg ) {
        socket.emit( 'chat message', { msg, room: roomSelect.value } );
        input.value = '';
    }
} );

input.addEventListener( 'keydown', ( e ) => {
    if ( e.key === 'Enter' ) {
        e.preventDefault();
        sendBtn.click();
    }
} );

input.addEventListener( 'input', () => {
    socket.emit( 'typing', roomSelect.value );
} );

roomSelect.addEventListener( 'change', () => {
    socket.emit( 'join room', roomSelect.value );
    loadChatHistory( roomSelect.value );
} );

clearHistoryBtn.addEventListener( 'click', () => {
    const room = roomSelect.value;
    if ( confirm( `Clear chat history for #${ room }?` ) ) {
        clearChatHistory( room );
        showToast( 'Chat history cleared.', () => restoreChatHistory( room ), 'info' );
    }
} );

exportBtn.addEventListener( 'click', () => {
    const room = roomSelect.value;
    const history = localStorage.getItem( `chat-history-${ room }` );
    if ( history ) {
        const blob = new Blob( [ history ], { type: 'application/json' } );
        const url = URL.createObjectURL( blob );
        const a = document.createElement( 'a' );
        a.href = url;
        a.download = `${ room }-chat-history.json`;
        a.click();
        URL.revokeObjectURL( url );
        showToast( 'Chat history exported.', null, 'success' );
    }
} );

importBtn.addEventListener( 'click', () => {
    importFile.click();
} );

importFile.addEventListener( 'change', ( e ) => {
    const file = e.target.files[ 0 ];
    const room = roomSelect.value;
    if ( file && file.type === 'application/json' ) {
        const reader = new FileReader();
        reader.onload = function ( evt ) {
            try {
                const data = JSON.parse( evt.target.result );
                if ( Array.isArray( data ) ) {
                    localStorage.setItem( `chat-history-${ room }`, JSON.stringify( data ) );
                    loadChatHistory( room );
                    showToast( 'Chat history imported.', null, 'success' );
                } else {
                    alert( 'Invalid file format' );
                }
            } catch {
                alert( 'Error parsing file' );
            }
        };
        reader.readAsText( file );
    }
} );

socket.on( 'chat message', ( { user, msg, time } ) => {
    appendMessage( `<strong>${ user }:</strong> ${ msg }`, time );
    saveToLocalHistory( roomSelect.value, { user, msg, time } );
} );

socket.on( 'typing', ( user ) => {
    typingStatus.textContent = `${ user } is typing...`;
    setTimeout( () => typingStatus.textContent = '', 2000 );
} );

// Initial load
loadChatHistory( roomSelect.value );