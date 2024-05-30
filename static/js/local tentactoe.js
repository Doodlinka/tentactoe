// THIS SCRIPT IS FOR PLAYING ON ONE DEVICE

const CellValues = {
    Empty: 0,
    X: 1,
    O: 2,
    // big board state only
    Tie:3
}
Object.freeze(CellValues);

const winConditions = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
Object.freeze(winConditions);

turnX = true;
currentBoard = null;
roundWon = false;

// local board state storage
board = Array(9);
for (let i = 0; i < 9; i++) {
    board[i] = Array(9);
    for (let j = 0; j < 9; j++) {
        board[i][j] = CellValues.Empty;
    }
}
// global board state storage
bigboard = Array(9);
for (let i = 0; i < 9; i++) {
    bigboard[i] = CellValues.Empty;
}


function handleTurn(i, j) {
    // return if can't go there
    if (roundWon) return;
    if (bigboard[i] != CellValues.Empty) return;
    if (board[i][j] != CellValues.Empty) return;
    if (currentBoard != null && currentBoard != i) return;

    // put X or O in the selected spot
    let cell = container.querySelector(`[index="${i}"]`).querySelector(`[index="${i}${j}"]`);
    if (turnX) {
        board[i][j] = CellValues.X;
        cell.innerHTML = "X";
        cell.classList.add("X");
    } else {
        board[i][j] = CellValues.O;
        cell.innerHTML = "O";
        cell.classList.add("O");
    }

    // clear board selection color in advance
    for (let bcell of container.querySelectorAll(".bigcell")) bcell.removeAttribute("selected");

    // check for winning/tieing the local board
    let boardWon = false, emptyFound = false;
    for (let cond of winConditions) {
        let a = board[i][cond[0]], b = board[i][cond[1]], c = board[i][cond[2]];
        if (a == CellValues.Empty || b == CellValues.Empty || c == CellValues.Empty) {
            emptyFound = true;
            continue;
        }
        if (a == b && b == c) {
            boardWon = true;
            break;
        }
    }
    if (boardWon) {
        bigboard[i] = turnX ? CellValues.X : CellValues.O;
        let text = document.createElement("div");
        text.setAttribute("class", `bigcelltext ${turnX ? "X" : "O"}`);
        text.innerHTML = turnX ? "X" : "O";
        let bcell = container.querySelector(`[index="${i}"]`);
        bcell.appendChild(text);
        bcell.setAttribute("disabled", "");
    }
    else if (!emptyFound) {
        bigboard[i] = CellValues.Tie;
        container.querySelector(`[index="${i}"]`).setAttribute("disabled", "");
    }
    // check for winning/tieing the global board
    emptyFound = false
    for (let cond of winConditions) {
        let a = bigboard[cond[0]], b = bigboard[cond[1]], c = bigboard[cond[2]];
        if (a == CellValues.Empty || b == CellValues.Empty || c == CellValues.Empty) {
            emptyFound = true;
            continue;
        }
        if (a == CellValues.Tie || b == CellValues.Tie || c == CellValues.Tie) {
            continue;
        }
        if (a == b && b == c) {
            roundWon = true;
            break;
        }
    }
    if (roundWon) {
        statustext.innerHTML = `${turnX ? "X" : "O"} won!`;
        return;
    }
    else if (!emptyFound) {
        statustext.innerHTML = "It's a tie!";
    }

    // determining the selected board
    if (bigboard[j] == CellValues.Empty) {
        currentBoard = j;
        container.querySelector(`[index="${j}"]`).setAttribute("selected", "");
    }
    else currentBoard = null;

    turnX = !turnX;
    statustext.innerHTML = `${turnX ? "X" : "O"}'s turn`;
}


// create the boards element and store a reference to it and the game status text
function load() {
    statustext = document.querySelector(".game-status");
    container = document.querySelector(".game-container");
    for (let i = 0; i < 9; i++) {
        let bigcell = document.createElement("div");
        bigcell.setAttribute("index", i);
        bigcell.setAttribute("class", "bigcell");
        container.appendChild(bigcell);
        for (let j = 0; j < 9; j++) {
            let cell = document.createElement("div");
            cell.setAttribute("index", i.toString() + j.toString());
            cell.setAttribute("class", "cell");
            cell.onclick = () => { handleTurn(i, j) }
            bigcell.appendChild(cell);
        }
    }
}

window.addEventListener('DOMContentLoaded', load);