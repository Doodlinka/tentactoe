const CellValues = {
    Empty: 0,
    X: 1,
    O: 2,
    Tie: 3
}
Object.freeze(CellValues);

// stolen from stackoverflow
const sleep = ms => new Promise(r => setTimeout(r, ms));

stoppoll = false;
choseToDisconnect = false;


async function poll(delayms) {
    let request = new XMLHttpRequest();
    request.open('GET', '/play?polling=True', false);
    // request.responseType = 'json';
    request.send();
    // update game view and stop polling if the game is over
    if (request.status == 200) {
        handleResponse(request.response);
    }
    if (request.status == 303) {
        stoppoll = true;
        console.log(request.response);
        window.location.replace(request.response);
    }
    if (stoppoll) return;
    // settimeout so we wait at least once and to avoid infinite recursion (??)
    setTimeout(f => poll(delayms), delayms);
}

// if the turn is successful, the results should be received in poll
function handleCellClick(i, j) {
    let request = new XMLHttpRequest();
    request.open('POST', '/play');
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify({i: i, j: j}));
}

function handleResponse(response) {
    if (response == 'disconnected' && !choseToDisconnect) {
        stoppoll = true;
        statustext.innerHTML = 'Your opponent disconnected, <a href="/">start a new game</a>';
        return;
    }
    gstate = JSON.parse(JSON.parse(response));

    // update the cells' looks
    for (let i = 0; i < 9; i++) {
        let bigcell = container.querySelector(`[index="${i}"]`);

        bigcell.removeAttribute('selected');
        if (gstate['bigcells'][i] != CellValues.Empty) {
            if (gstate['bigcells'][i] != CellValues.Tie) {
                let textel = document.createElement("div");
                let text = gstate['bigcells'][i] == CellValues.X ? "X" : "O";
                textel.setAttribute("class", `bigcelltext ${text}`);
                textel.innerHTML = text;
                bigcell.appendChild(textel);
            }
            bigcell.setAttribute("disabled", "");
        }
        if (i == gstate['currentBoard']) {
            bigcell.setAttribute('selected', '');
        }

        for (let j = 0; j < 9; j++) {
            if (gstate['cells'][i][j] == CellValues.Empty) {
                continue;
            }
            let cell = bigcell.querySelector(`[index="${i}${j}"]`);
            let text = gstate['cells'][i][j] == CellValues.X ? "X" : "O";
            cell.innerHTML = text;
            cell.classList.add(text);
        }
    }

    // update gamestate
    if (gstate['winner'] != CellValues.Empty) {
        if (gstate['winner'] != CellValues.Tie) {
            if (gstate['winner'] == CellValues.X && gstate['youareX'] ||
                gstate['winner'] == CellValues.O && !gstate['youareX']) {
                    statustext.innerHTML = "You won!"
                }
            else {
                statustext.innerHTML = "You lost!"
            }
        }
        else {
            statustext.innerHTML = "It's a tie!";
        }
    }
    else {
        statustext.innerHTML = gstate['turnX'] == gstate['youareX'] ? "Your turn: " : "Opponent's turn: ";
        statustext.innerHTML += Math.trunc(gstate['time']).toString();
    }
}

function disconnect() {
    stoppoll = true;
    choseToDisconnect = true;
    statustext.innerHTML = 'You disconnected, <a href="/">start a new game</a>';
    let request = new XMLHttpRequest();
    request.open('POST', '/play');
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify({'disconnect':true}));
}

// create the boards element and store a reference to it and the game status text
function load() {
    document.getElementById("disconnect").onclick = disconnect;
    statustext = document.getElementById("game-status");
    container = document.getElementById("game-container");

    for (let i = 0; i < 9; i++) {
        let bigcell = document.createElement("div");
        bigcell.setAttribute("index", i);
        bigcell.setAttribute("class", "bigcell");
        container.appendChild(bigcell);

        for (let j = 0; j < 9; j++) {
            let cell = document.createElement("div");
            cell.setAttribute("index", i.toString() + j.toString());
            cell.setAttribute("class", "cell");
            cell.onclick = () => { handleCellClick(i, j) }
            bigcell.appendChild(cell);
        }
    }
    poll(500)
}

window.addEventListener('load', load);