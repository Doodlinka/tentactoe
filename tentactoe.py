from flask import Flask, render_template, request, session, redirect, Response, jsonify
import secrets, enum, json, time, logging, time


# Configure application
app = Flask(__name__)
# app.config['DEBUG'] = True
app.config['SECRET_KEY'] = "RFia9iHBuiY2hszq8EyDBj16Q3c15D57XPSzkeRppsg"
app.config["SESSION_PERMANENT"] = True
logging.getLogger('werkzeug').setLevel(logging.ERROR)


TURNTIME = 30
WINCONDITIONS = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]]
class CellVaules(enum.Enum):
    EMPTY = 0
    X = 1
    O = 2
    TIE = 3

currentGame = None
# keys are session ids, values are games, 2 uids per game
games = {}
disconnected = set()


# classes

class ExtendedJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, enum.Enum):
            return obj.value
        return json.JSONEncoder.default(self, obj)


class Timer:
    def __init__(self, start: float, paused=False, countdown=False):
        self.reset(start, paused, countdown)

    def reset(self, start: float, paused=False, countdown=None):
        self.__paused = bool(paused)
        self.__time = start
        self.__lastchecked = time.time()
        if countdown is not None:
            self.countdown = bool(countdown)

    @property
    def paused(self):
        return self.__paused

    @paused.setter
    def paused(self, paused: bool):
        self.__paused = paused
        if not paused:
            self.__lastchecked = time.time()

    @property
    def time(self):
        if not self.__paused:
            dir = -1 if self.countdown else 1
            t = time.time()
            self.__time += (t - self.__lastchecked) * dir
            self.__lastchecked = t
        return self.__time



class Game():
    IDList = []

    def __init__(self):
        while 1:
            self.ID = secrets.token_urlsafe(16)
            if self.ID not in self.IDList:
                break
        self.IDList.append(self.ID)

        self.turnX = True
        self.cells = [[CellVaules.EMPTY for _ in range(9)] for _ in range(9)]
        self.bigcells = [CellVaules.EMPTY for _ in range(9)]
        self.currentBoard = None
        self.winner = CellVaules.EMPTY
        self.playerX, self.playerO = '', ''
        self.timer = Timer(30, paused=True, countdown=True)

    # returns if the turn succeeded or not
    def handleTurn(self, i, j, uid):
        self.__handleTimer()
        if self.winner != CellVaules.EMPTY:
            return False
        if (self.turnX and uid != self.playerX) or (not self.turnX and uid != self.playerO):
            return False
        if i not in range(9) or j not in range(9):
            return False
        if self.currentBoard != None and self.currentBoard != i:
            return False
        if self.bigcells[i] != CellVaules.EMPTY or self.cells[i][j] != CellVaules.EMPTY:
            return False

        if self.turnX:
            self.cells[i][j] = CellVaules.X
        else:
            self.cells[i][j] = CellVaules.O

        self.bigcells[i] = self.__calculateWinner(i)
        self.currentBoard = j if self.bigcells[j] == CellVaules.EMPTY else None
        self.winner = self.__calculateWinner()

        self.turnX = not self.turnX
        self.timer.reset(TURNTIME)
        return True

    # returns the winner of the given local or global board
    def __calculateWinner(self, i = None):
        board = self.bigcells if i == None else self.cells[i]
        notie = False
        
        for cond in WINCONDITIONS:
            a, b, c = board[cond[0]], board[cond[1]], board[cond[2]]
            if (a == CellVaules.EMPTY or b == CellVaules.EMPTY or c == CellVaules.EMPTY):
                notie = True
                continue
            if (a == CellVaules.TIE or b == CellVaules.TIE or c == CellVaules.TIE):
                continue
            if a == b and b == c:
                return CellVaules.X if self.turnX else CellVaules.O

        if notie:
            return CellVaules.EMPTY
        return CellVaules.TIE

    def __handleTimer(self):
        if self.timer.time <= 0:
            self.turnX = not self.turnX
            self.timer.reset(TURNTIME)

    # if the given player is not in this game, return empty string
    # __dict__ contains only non-static fields
    def getStateStr(self, uid):
        self.__handleTimer()
        statedict = self.__dict__.copy()
        statedict.pop('playerX')
        statedict.pop('playerO')
        statedict.pop('timer')
        statedict['time'] = self.timer.time
        statedict['youareX'] = True if uid == self.playerX else False
        return json.dumps(statedict, cls=ExtendedJSONEncoder)



#  funcitons

def connectPlayerToGame(uid):
    global currentGame
    if uid in games or (currentGame != None and uid == currentGame.playerX): 
        return False
    # if currentGame exists, it's a match, add the game to games dict twice (with both uids)
    # if not, create new game as currentGame
    if currentGame == None:
        currentGame = Game()
        currentGame.playerX = uid
    else:
        currentGame.playerO = uid
        games[currentGame.playerX] = currentGame
        games[currentGame.playerO] = currentGame
        currentGame.timer.paused = False
        currentGame = None
    return True


# flask callbacks

@app.route('/play', methods=['GET', 'POST'])
def play():
    game = games.get(session.get('uid'))
    if game == None:
        if request.args.get('polling'):
            if session.get('uid') in disconnected:
                return 'disconnected', 200
            return '/', 303
        else:
            return redirect('/')

    if request.method == 'POST':
        if request.json.get('disconnect'):
            xid, oid = games[session['uid']].playerX, games[session['uid']].playerO
            games.pop(xid)
            games.pop(oid)
            disconnected.add(xid)
            disconnected.add(oid)
            return '', 204
        game.handleTurn(request.json.get('i', -1), request.json.get('j', -1), session['uid'])
        return jsonify(game.getStateStr(session['uid'])), 200
    else:
        if not request.args.get('polling'):
            return render_template('play.html')
    return jsonify(game.getStateStr(session['uid'])), 200


@app.route('/wait')
def wait():
    if 'uid' not in session: 
        return redirect('/')
    while session['uid'] not in games:
        time.sleep(0.5)
    return '', 204


@app.route("/")
def index():
    if 'uid' not in session:
        while 1:
            session['uid'] = secrets.token_urlsafe(16)
            if session['uid'] not in games and (currentGame == None or session['uid'] != currentGame.playerX): 
                break
    if session['uid'] in disconnected:
        disconnected.remove(session['uid'])
    connectPlayerToGame(session['uid'])
            
    if currentGame == None:
        return redirect('/play')
    return render_template('index.html', uid=session['uid'])


if __name__ == '__main__':
    app.run(threaded=True, host='0.0.0.0')
