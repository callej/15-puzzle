const BOARD_SIZE = 4;
let tiles = [];
let moves = 0;
let isSolved = false;
let isDragging = false;
let dragData = null;

const boardEl = document.getElementById('board');
const movesEl = document.getElementById('move-counter');
const shuffleBtn = document.getElementById('shuffle-btn');
const winModal = document.getElementById('win-modal');
const playAgainBtn = document.getElementById('play-again-btn');
const finalMovesEl = document.getElementById('final-moves');
const tileElements = {};

function init() {
    createTileElements();
    shuffleBoard();
    updateMoves();
    renderBoard();

    shuffleBtn.addEventListener('click', () => {
        if(isDragging) return;
        shuffleBoard();
        moves = 0;
        updateMoves();
        renderBoard();
    });

    playAgainBtn.addEventListener('click', () => {
        winModal.classList.add('hidden');
        shuffleBoard();
        moves = 0;
        updateMoves();
        renderBoard();
    });

    window.addEventListener('resize', () => {
        if (!isDragging) renderBoard();
    });
}

function getGridMetrics() {
    let tileSize = 55;
    let gap = 5;
    if (tileElements[1]) {
        tileSize = tileElements[1].offsetWidth;
        // Read gap directly from CSS variables
        const rootStyles = getComputedStyle(document.documentElement);
        const gapVal = rootStyles.getPropertyValue('--gap').trim();
        if (gapVal.endsWith('px')) {
            gap = parseFloat(gapVal);
        }
    }
    return { tileSize, gap };
}

function createTileElements() {
    boardEl.innerHTML = '';
    for (let i = 1; i < BOARD_SIZE * BOARD_SIZE; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.textContent = i;
        tile.dataset.value = i;
        tile.addEventListener('pointerdown', handlePointerDown);
        boardEl.appendChild(tile);
        tileElements[i] = tile;
    }
}

function handlePointerDown(e) {
    if (isSolved || isDragging) return;
    
    const value = parseInt(e.target.dataset.value);
    const index = tiles.indexOf(value);
    const empIndex = tiles.indexOf(0);
    
    const startCol = index % BOARD_SIZE;
    const startRow = Math.floor(index / BOARD_SIZE);
    
    const empCol = empIndex % BOARD_SIZE;
    const empRow = Math.floor(empIndex / BOARD_SIZE);
    
    // Check if clicked tile is adjacent to empty tile
    const dist = Math.abs(startCol - empCol) + Math.abs(startRow - empRow);
    if (dist !== 1) return;
    
    isDragging = true;
    e.target.setPointerCapture(e.pointerId);
    e.target.classList.add('dragging');
    
    const { tileSize, gap } = getGridMetrics();
    const step = tileSize + gap;
    
    dragData = {
        pointerId: e.pointerId,
        value,
        index,
        empIndex,
        startX: e.clientX,
        startY: e.clientY,
        startCol, startRow,
        empCol, empRow,
        elem: e.target,
        deltaX: 0,
        deltaY: 0,
        step,
        baseTranslateX: startCol * step,
        baseTranslateY: startRow * step
    };
    
    e.target.addEventListener('pointermove', handlePointerMove);
    e.target.addEventListener('pointerup', handlePointerUp);
    e.target.addEventListener('pointercancel', handlePointerUp);
}

function handlePointerMove(e) {
    if (!isDragging || !dragData || e.pointerId !== dragData.pointerId) return;
    
    const { startX, startY, startCol, startRow, empCol, empRow, elem, step, baseTranslateX, baseTranslateY } = dragData;
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;
    
    // Constrain logic so that a tile can only slide towards the exact empty slot
    if (startCol === empCol) {
        dx = 0;
        if (empRow > startRow) dy = Math.max(0, Math.min(dy, step));
        else dy = Math.max(-step, Math.min(dy, 0));
    } else {
        dy = 0;
        if (empCol > startCol) dx = Math.max(0, Math.min(dx, step));
        else dx = Math.max(-step, Math.min(dx, 0));
    }
    
    dragData.deltaX = dx;
    dragData.deltaY = dy;
    
    elem.style.transform = `translate(${baseTranslateX + dx}px, ${baseTranslateY + dy}px)`;
}

function handlePointerUp(e) {
    if (!isDragging || !dragData || e.pointerId !== dragData.pointerId) return;
    
    const { elem, deltaX, deltaY, index, empIndex, step } = dragData;
    
    elem.removeEventListener('pointermove', handlePointerMove);
    elem.removeEventListener('pointerup', handlePointerUp);
    elem.removeEventListener('pointercancel', handlePointerUp);
    elem.releasePointerCapture(e.pointerId);
    elem.classList.remove('dragging');
    
    const movedDist = Math.abs(deltaX) + Math.abs(deltaY);
    const isCancel = e.type === 'pointercancel';
    const isTap = movedDist < 5; // tap threshold
    const isDragOverHalf = movedDist > step / 2; // dragged past half a block
    
    if (!isCancel && (isDragOverHalf || isTap)) {
        tiles[empIndex] = dragData.value;
        tiles[index] = 0;
        moves++;
        updateMoves();
        checkWin();
    }
    
    isDragging = false;
    dragData = null;
    
    renderBoard();
    
    if (isSolved) {
        setTimeout(showWin, 200);
    }
}

function updateMoves() {
    movesEl.textContent = moves;
}

function shuffleBoard() {
    let solvable = false;
    while (!solvable) {
        const numbers = Array.from({length: 15}, (_, i) => i + 1);
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        
        // Put empty block at the bottom right end
        tiles = [...numbers, 0];
        
        let inversions = 0;
        for (let i = 0; i < 15; i++) {
            for (let j = i + 1; j < 15; j++) {
                if (tiles[i] > tiles[j]) inversions++;
            }
        }
        
        // Even inversions -> solvable with empty place on bottom right (even row counting up)
        if (inversions % 2 === 0) {
            solvable = true;
        } else {
            // Swap to turn odd inversions to even
            [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
            solvable = true;
        }
    }
    isSolved = false;
}

function renderBoard() {
    const { tileSize, gap } = getGridMetrics();
    const step = tileSize + gap;
    
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        const val = tiles[i];
        if (val === 0) continue;
        
        const col = i % BOARD_SIZE;
        const row = Math.floor(i / BOARD_SIZE);
        
        const elem = tileElements[val];
        elem.style.transform = `translate(${col * step}px, ${row * step}px)`;
        
        if (val === i + 1) {
            elem.classList.add('correct');
        } else {
            elem.classList.remove('correct');
        }
    }
}

function checkWin() {
    isSolved = true;
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE - 1; i++) {
        if (tiles[i] !== i + 1) {
            isSolved = false;
            break;
        }
    }
    if (tiles[15] !== 0) isSolved = false;
}

function showWin() {
    finalMovesEl.textContent = moves;
    winModal.classList.remove('hidden');
}

// Start game
init();
