        // Chess piece Unicode symbols - using black piece symbols for gold pieces for better visibility
        // Chess piece Unicode symbols - using filled symbols for better visibility
const pieces = {
    'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

// Enhanced styling for better visibility
const goldPieceStyle = 'color: #FFD700; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); font-weight: bold;';
const redPieceStyle = 'color: #DC143C; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); font-weight: bold;';

// Initial board setup
let board = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
];

let currentPlayer = 'w';
let selectedSquare = null;
let gameHistory = [];
let moveHistory = [];
let gameOver = false;
let pendingPromotion = null;
let enPassantTarget = null;
let gameStarted = false;
let currentMoveIndex = -1; // For navigation through move history

// Audio context for sound alerts
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playCheckSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function playCheckmateSound() {
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.frequency.setValueAtTime(523, audioContext.currentTime);
    oscillator1.frequency.setValueAtTime(659, audioContext.currentTime + 0.2);
    oscillator1.frequency.setValueAtTime(784, audioContext.currentTime + 0.4);
    
    oscillator2.frequency.setValueAtTime(261, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(329, audioContext.currentTime + 0.2);
    oscillator2.frequency.setValueAtTime(392, audioContext.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.8);
    oscillator2.stop(audioContext.currentTime + 0.8);
}

function getPieceFullName(piece) {
    if (!piece) return '';
    
    const color = piece[0] === 'w' ? 'Gold' : 'Red';
    const pieceType = piece[1];
    
    const pieceNames = {
        'P': 'Pawn',
        'R': 'Rook', 
        'N': 'Knight',
        'B': 'Bishop',
        'Q': 'Queen',
        'K': 'King'
    };
    
    return `${color} ${pieceNames[pieceType]}`;
}

function getSquareNotation(row, col) {
    return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function createBoard() {
    const boardElement = document.getElementById('chessBoard');
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            square.onclick = () => handleSquareClick(row, col);
            
            if (board[row][col]) {
                square.textContent = pieces[board[row][col]];
                square.style.cssText = board[row][col][0] === 'w' ? goldPieceStyle : redPieceStyle;
            }
            
            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(row, col) {
    if (gameOver || pendingPromotion) return;
    
    // Restrict first move to white only
    if (!gameStarted && currentPlayer !== 'w') {
        alert("Gold pieces must move first!");
        return;
    }
    
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    
    if (selectedSquare) {
        const [selectedRow, selectedCol] = selectedSquare;
        
        if (row === selectedRow && col === selectedCol) {
            // Deselect
            clearSelection();
            return;
        }
        
        if (isValidMove(selectedRow, selectedCol, row, col)) {
            // Prevent capturing the king
            if (board[row][col] && board[row][col][1] === 'K') {
                alert("You cannot capture the king! The game should end before this happens.");
                clearSelection();
                return;
            }
            
            // Check for pawn promotion
            if (checkPawnPromotion(selectedRow, selectedCol, row, col)) {
                pendingPromotion = {fromRow: selectedRow, fromCol: selectedCol, toRow: row, toCol: col};
                makeMove(selectedRow, selectedCol, row, col);
                clearSelection();
                showPromotionDialog(currentPlayer, row, col);
                return;
            }
            
            makeMove(selectedRow, selectedCol, row, col);
            clearSelection();
            gameStarted = true;
            currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
            
            // Check for check and checkmate
            if (isInCheck(currentPlayer)) {
                if (isCheckmate(currentPlayer)) {
                    gameOver = true;
                    playCheckmateSound();
                    setTimeout(() => {
                        alert(`Checkmate! ${currentPlayer === 'w' ? 'Red' : 'Gold'} wins!`);
                    }, 500);
                } else {
                    playCheckSound();
                    setTimeout(() => {
                        alert(`${currentPlayer === 'w' ? 'Gold' : 'Red'} is in check!`);
                    }, 100);
                }
            }
            
            updateGameStatus();
        } else {
            clearSelection();
            if (board[row][col] && board[row][col][0] === currentPlayer) {
                selectSquare(row, col);
            }
        }
    } else {
        if (board[row][col] && board[row][col][0] === currentPlayer) {
            selectSquare(row, col);
        }
    }
}

function selectSquare(row, col) {
    selectedSquare = [row, col];
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    square.classList.add('selected');
    highlightValidMoves(row, col);
}

function clearSelection() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'valid-move', 'attack-path-gold', 'attack-path-red');
    });
    selectedSquare = null;
}

function highlightValidMoves(row, col) {
    const piece = board[row][col];
    const isGoldPiece = piece && piece[0] === 'w';
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(row, col, r, c)) {
                const square = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                square.classList.add('valid-move');
                
                // Add attack path styling
                if (isGoldPiece) {
                    square.classList.add('attack-path-gold');
                } else {
                    square.classList.add('attack-path-red');
                }
            }
        }
    }
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    
    if (!piece || piece[0] !== currentPlayer) return false;
    if (targetPiece && targetPiece[0] === currentPlayer) return false;
    if (fromRow === toRow && fromCol === toCol) return false;
    
    const pieceType = piece[1];
    const color = piece[0];
    
    // Basic move validation for each piece type
    let isValidBasicMove = false;
    switch (pieceType) {
        case 'P':
            isValidBasicMove = isValidPawnMove(fromRow, fromCol, toRow, toCol, color);
            break;
        case 'R':
            isValidBasicMove = isValidRookMove(fromRow, fromCol, toRow, toCol);
            break;
        case 'N':
            isValidBasicMove = isValidKnightMove(fromRow, fromCol, toRow, toCol);
            break;
        case 'B':
            isValidBasicMove = isValidBishopMove(fromRow, fromCol, toRow, toCol);
            break;
        case 'Q':
            isValidBasicMove = isValidQueenMove(fromRow, fromCol, toRow, toCol);
            break;
        case 'K':
            isValidBasicMove = isValidKingMove(fromRow, fromCol, toRow, toCol);
            break;
        default:
            return false;
    }
    
    if (!isValidBasicMove) return false;
    
    // Check if this move would leave the king in check
    const originalPiece = board[toRow][toCol];
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    const wouldBeInCheck = isInCheck(color);
    
    // Restore board
    board[fromRow][fromCol] = piece;
    board[toRow][toCol] = originalPiece;
    
    return !wouldBeInCheck;
}

function isValidPawnMove(fromRow, fromCol, toRow, toCol, color) {
    const direction = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    
    // Forward move
    if (fromCol === toCol && !board[toRow][toCol]) {
        if (toRow === fromRow + direction) return true;
        if (fromRow === startRow && toRow === fromRow + 2 * direction && !board[fromRow + direction][fromCol]) return true;
    }
    
    // Capture (including en passant)
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
        // Regular capture
        if (board[toRow][toCol] && board[toRow][toCol][0] !== color) {
            return true;
        }
        
        // En passant capture
        if (enPassantTarget && 
            enPassantTarget.row === toRow && 
            enPassantTarget.col === toCol &&
            board[fromRow][toCol] && 
            board[fromRow][toCol][1] === 'P' && 
            board[fromRow][toCol][0] !== color) {
            return true;
        }
    }
    
    return false;
}

function checkPawnPromotion(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (piece && piece[1] === 'P') {
        const color = piece[0];
        const promotionRow = color === 'w' ? 0 : 7;
        if (toRow === promotionRow) {
            return true;
        }
    }
    return false;
}

function showPromotionDialog(color, row, col) {
    const dialog = document.createElement('div');
    dialog.className = 'promotion-dialog';
    
    const pieceStyle = color === 'w' ? goldPieceStyle : redPieceStyle;
    
    dialog.innerHTML = `
        <h3>Promote your pawn to:</h3>
        <div class="promotion-pieces">
            <div class="promotion-piece" onclick="promotePawn('${color}Q', ${row}, ${col})">
                <span style="${pieceStyle}">${pieces[color + 'Q']}</span>
            </div>
            <div class="promotion-piece" onclick="promotePawn('${color}R', ${row}, ${col})">
                <span style="${pieceStyle}">${pieces[color + 'R']}</span>
            </div>
            <div class="promotion-piece" onclick="promotePawn('${color}B', ${row}, ${col})">
                <span style="${pieceStyle}">${pieces[color + 'B']}</span>
            </div>
            <div class="promotion-piece" onclick="promotePawn('${color}N', ${row}, ${col})">
                <span style="${pieceStyle}">${pieces[color + 'N']}</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

function promotePawn(newPiece, row, col) {
    board[row][col] = newPiece;
    
    // Remove dialog
    const dialog = document.querySelector('.promotion-dialog');
    if (dialog) {
        dialog.remove();
    }
    
    // Continue with game logic
    pendingPromotion = null;
    currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
    
    // Check for check and checkmate after promotion
    if (isInCheck(currentPlayer)) {
        if (isCheckmate(currentPlayer)) {
            gameOver = true;
            playCheckmateSound();
            setTimeout(() => {
                alert(`Checkmate! ${currentPlayer === 'w' ? 'Red' : 'Gold'} wins!`);
            }, 500);
        } else {
            playCheckSound();
            setTimeout(() => {
                alert(`${currentPlayer === 'w' ? 'Gold' : 'Red'} is in check!`);
            }, 100);
        }
    }
    
    createBoard();
    updateGameStatus();
}

function isValidRookMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return isPathClear(fromRow, fromCol, toRow, toCol);
}

function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

function isValidBishopMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);
    if (rowDiff !== colDiff) return false;
    return isPathClear(fromRow, fromCol, toRow, toCol);
}

function isValidQueenMove(fromRow, fromCol, toRow, toCol) {
    return isValidRookMove(fromRow, fromCol, toRow, toCol) || 
           isValidBishopMove(fromRow, fromCol, toRow, toCol);
}

function isValidKingMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);
    return rowDiff <= 1 && colDiff <= 1;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowDir = Math.sign(toRow - fromRow);
    const colDir = Math.sign(toCol - fromCol);
    
    let currentRow = fromRow + rowDir;
    let currentCol = fromCol + colDir;
    
    while (currentRow !== toRow || currentCol !== toCol) {
        if (board[currentRow][currentCol]) return false;
        currentRow += rowDir;
        currentCol += colDir;
    }
    
    return true;
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Save move for history
    gameHistory.push({
        board: board.map(row => [...row]),
        currentPlayer: currentPlayer,
        enPassantTarget: enPassantTarget ? {...enPassantTarget} : null
    });
    
    // Handle en passant capture
    let enPassantCapture = false;
    if (piece[1] === 'P' && enPassantTarget && 
        enPassantTarget.row === toRow && enPassantTarget.col === toCol) {
        // Remove the captured pawn
        board[fromRow][toCol] = null;
        enPassantCapture = true;
    }
    
    // Make the move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    // Set en passant target for next move
    enPassantTarget = null;
    if (piece[1] === 'P' && Math.abs(fromRow - toRow) === 2) {
        enPassantTarget = {
            row: fromRow + (toRow - fromRow) / 2,
            col: fromCol
        };
    }
    
    // Create detailed move description
    let moveDescription = getPieceFullName(piece) + ' moved to ' + getSquareNotation(toRow, toCol);
    
    if (capturedPiece) {
        moveDescription += ' and captured ' + getPieceFullName(capturedPiece);
    } else if (enPassantCapture) {
        moveDescription += ' and captured a pawn (en passant)';
    }
    
    // Check if this move puts the opponent in check
    const opponentColor = currentPlayer === 'w' ? 'b' : 'w';
    const tempCurrentPlayer = currentPlayer;
    currentPlayer = opponentColor; // Temporarily switch to check if opponent is in check
    
    if (isInCheck(opponentColor)) {
        if (isCheckmate(opponentColor)) {
            moveDescription += ' - Checkmate!';
        } else {
            moveDescription += ' - Check!';
        }
    }
    
    currentPlayer = tempCurrentPlayer; // Switch back
    
    // Add to move history
    moveHistory.push(moveDescription);
    currentMoveIndex = moveHistory.length - 1;
    updateMoveHistory();
    
    createBoard();
}

function updateGameStatus() {
    const status = document.getElementById('gameStatus');
    if (gameOver) {
        status.textContent = `Game Over - ${currentPlayer === 'w' ? 'Red' : 'Gold'} wins!`;
        status.style.color = '#ff4444';
    } else {
        status.textContent = `${currentPlayer === 'w' ? 'Gold' : 'Red'} to move`;
        status.className = `game-status ${currentPlayer === 'w' ? 'gold-turn' : 'red-turn'}`;
    }
}

function updateMoveHistory() {
    const historyElement = document.getElementById('moveHistory');
    
    if (moveHistory.length === 0) {
        historyElement.innerHTML = '<h3>Move History:</h3><p>No moves yet</p>';
        return;
    }
    
    const currentMove = moveHistory[currentMoveIndex];
    const moveNumber = currentMoveIndex + 1;
    
    historyElement.innerHTML = `
        <h3>Move History:</h3>
        <div style="display: flex; align-items: center; gap: 10px; margin: 10px 0;">
            <button onclick="previousMove()" ${currentMoveIndex <= 0 ? 'disabled' : ''}>←</button>
            <span style="flex: 1; text-align: center;">Move ${moveNumber} of ${moveHistory.length}</span>
            <button onclick="nextMove()" ${currentMoveIndex >= moveHistory.length - 1 ? 'disabled' : ''}>→</button>
        </div>
        <div style="padding: 10px; background: #f0f0f0; border-radius: 5px; margin: 10px 0;">
            ${currentMove}
        </div>
    `;
}

function previousMove() {
    if (currentMoveIndex > 0) {
        currentMoveIndex--;
        updateMoveHistory();
    }
}

function nextMove() {
    if (currentMoveIndex < moveHistory.length - 1) {
        currentMoveIndex++;
        updateMoveHistory();
    }
}

function resetGame() {
    board = [
        ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
        ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
        ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ];
    currentPlayer = 'w';
    selectedSquare = null;
    gameHistory = [];
    moveHistory = [];
    currentMoveIndex = -1;
    gameOver = false;
    pendingPromotion = null;
    enPassantTarget = null;
    gameStarted = false;
    createBoard();
    updateGameStatus();
    updateMoveHistory();
}

function isInCheck(color) {
    // Find the king
    let kingRow, kingCol;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === color + 'K') {
                kingRow = r;
                kingCol = c;
                break;
            }
        }
    }
    
    // Check if any enemy piece can attack the king
    const enemyColor = color === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece[0] === enemyColor) {
                if (canPieceAttack(r, c, kingRow, kingCol)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function canPieceAttack(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const pieceType = piece[1];
    const color = piece[0];
    
    switch (pieceType) {
        case 'P':
            const direction = color === 'w' ? -1 : 1;
            return Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction;
        case 'R':
            return isValidRookMove(fromRow, fromCol, toRow, toCol);
        case 'N':
            return isValidKnightMove(fromRow, fromCol, toRow, toCol);
        case 'B':
            return isValidBishopMove(fromRow, fromCol, toRow, toCol);
        case 'Q':
            return isValidQueenMove(fromRow, fromCol, toRow, toCol);
        case 'K':
            return isValidKingMove(fromRow, fromCol, toRow, toCol);
        default:
            return false;
    }
}

function isCheckmate(color) {
    if (!isInCheck(color)) return false;
    
    // Try all possible moves for the current player
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = board[fromRow][fromCol];
            if (piece && piece[0] === color) {
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                            return false; // Found a valid move, not checkmate
                        }
                    }
                }
            }
        }
    }
    return true; // No valid moves found, it's checkmate
}

// Initialize the game
createBoard();