var GameState = ""  //"ppmppeeeeeeeeeeeeeeePPMPP05-09-12-13-07XR"
/* 
p = blue pawn
m = blue master
P = red pawn
M = red master
e = empty square

XR = red's turn
XB = blue's turn

first pair two-digit numbers = red's move cards
second pair two-digit numbers = blue's move cards
last single two-digit number = neutral card
*/

var GameHistory = createEmptyGameHistory()
/*
sampleMove = {cardID: '01', color: 'B', startLocation: 2, tartgetLocation: 12}  
*/
var PlayerCanMove = true
var AIcolor = ["B"] //This contains B or R if there is an AI playing. it is empty if there is no AI.
var EvaluatedStates = {} // this will be the running memory of evaluated states
/*
	key -- gameState
	value -- {
		"e": evaluationScore // How good this position is
		"m": move // The best move to do based on this position (if there is one, based on further searching)
		"d": depthForward // This is effectively the confidence in this move, based on how far forward from here we looked
		"t": turn // This is the turn this state would occur on. use this to prune this dictionary for unlikely future states
		"r": Red's Best (for alpha-beta pruning)
		"b": Blue's Best (for alpha-beta pruning)
		"p": p // Boolean stating if this should be pruned.
	}

*/
var StatesMovesLists = {} // This takes in a state, and outputs a move list, ordered best to worst
/*
	key -- gameState
	value -- [{
		"m": Move //A move doable from this state
		,"e": Eval //Evaluation associated with this move
	}]
*/
var AImovesEvaluated = 0
const MaxThinkingTime = 5000 // how many miliseconds we're giving the AI to think. 
var ForcedMateShown = false
var ResignShown = false
var GameIsOver = true
var GameHasStarted = false
var GreatestDepthSearched = 0
var PlayerColor = "R"
var AIIsThinking = false
var AIWorker = null
var AIWorkerUrl = null
var AIWorkerRequests = {}
var AIWorkerMessageId = 0
var ActiveAIRequestId = 0
var LatestAIEvalMove = null

const STARTING_BOARD_STATE = "ppmpp" + "e".repeat(15) + "PPMPP";
const BOARD_LEFT = 500
const BOARD_TOP = 200
const SQUARE_SIZE = 100
const EVAL_BAR_GAP = 18
const EVAL_BAR_WIDTH = 28
const EVAL_BAR_SECTIONS = 20
const CARD_TOP = 25
const CARD_BOTTOM = 730
const CARD_LEFT_1 = 510
const CARD_LEFT_2 = 760
const NEUTRAL_LEFT = 250
const NEUTRAL_RIGHT = 1020
const NEUTRAL_TOP = 380
const MIN_SELECTED_CARDS = 5
const SELECTED_CARDS_COOKIE = "onitamaSelectedCards"
const PLAYER_COLOR_COOKIE = "onitamaPlayerColor"




move_dictionary = {
	  "00": {"moves": ["fr","br","fl","bl"]			,"name":"monkey", "startColor":"B" } //blue
	, "01": {"moves": ["ff","b"] 					,"name":"tiger", "startColor":"B" } //blue
	, "02": {"moves": ["frr","fll","br","bl"]		,"name":"dragon", "startColor":"R" } //red
	, "03": {"moves": ["f","rr","ll"]				,"name":"crab", "startColor":"B" } //blue
	, "04": {"moves": ["l","r","fl","fr"]			,"name":"elephant", "startColor":"R" } //red
	, "05": {"moves": ["fl","fr","b"]				,"name":"mantis", "startColor":"R" } //red
	, "06": {"moves": ["f","br","bl"]				,"name":"crane", "startColor":"B" } //blue
	, "07": {"moves": ["l","r","f"]					,"name":"boar", "startColor":"R" } //red
	, "08": {"moves": ["l","f","b"]					,"name":"horse", "startColor":"R" } //red
	, "09": {"moves": ["r","b","f"]					,"name":"ox", "startColor":"B" } // blue
	, "10": {"moves": ["l","br","fr"]				,"name":"cobra", "startColor":"R" } //red
	, "11": {"moves": ["r","bl","fl"]				,"name":"eel", "startColor":"B" } //blue
	, "12": {"moves": ["l","r","bl","fr"]			,"name":"rooster", "startColor":"R" } //red
	, "13": {"moves": ["l","r","fl","br"]			,"name":"goose", "startColor":"B" } //blue
	, "14": {"moves": ["ll","br","fl"]				,"name":"frog", "startColor":"R" } //red
	, "15": {"moves": ["bl","rr","fr"]				,"name":"rabbit", "startColor":"B" } // blue
	, "16": {"moves": ["fr","r","br"]				,"name":"fox", "startColor":"R" } //red
	, "17": {"moves": ["fl","l","bl"]				,"name":"dog", "startColor":"B" } //blue 
	, "18": {"moves": ["frr","fll","b"]				,"name":"giraffe", "startColor":"B" } //blue
	, "19": {"moves": ["f","fr","bl"]				,"name":"panda", "startColor":"R" } //red
	, "20": {"moves": ["fl","f","br"]				,"name":"bear", "startColor":"B" } // blue
	, "21": {"moves": ["ffl","ffr","bb"]			,"name":"kirin", "startColor":"R" } //red 
	, "22": {"moves": ["f","rr","bl"]				,"name":"sea snake", "startColor":"B" } // blue
	, "23": {"moves": ["f","ll","br"]				,"name":"viper", "startColor":"R" } //red
	, "24": {"moves": ["ll","rr","fr","fl"]			,"name":"phoenix", "startColor":"B" } //blue
	, "25": {"moves": ["r","f","bl"]				,"name":"mouse", "startColor":"B" } //blue
	, "26": {"moves": ["l","f","br"]				,"name":"rat", "startColor":"R" } //red
	, "27": {"moves": ["rr","ll","bl","br"]			,"name":"turtle", "startColor":"R" } //red
	, "28": {"moves": ["f","frr","bl"]				,"name":"tanuki", "startColor":"B" } //blue
	, "29": {"moves": ["f","fll","br"]				,"name":"iguana", "startColor":"R" } //red
	, "30": {"moves": ["ll","bl","fr"]				,"name":"sable", "startColor":"B" } //blue
	, "31": {"moves":  ["rr","br","fl"]				,"name":"otter", "startColor":"R" } //red
}

PrecomputedBoardMoves = {} // this will store actual possible spaces for any move, from any square. index = color+cardID+SquareNum
currentMoveUI = {} //this is a dictionary to build up the current move through the UI

// Logic flow ********************************************
function main(){
	setupStartMenu()
	if(startGameFromLaunchParams()) return
	showStartMenu()
}

function showStartMenu(){
	document.getElementById("gameArea").style.display = "none"
	document.getElementById("startMenu").style.display = "block"
}

function goHome(){
	const homeMarker = "_______________________\n________HOME________\n_______________________"
	setTimeout(() => console.log(homeMarker), 0)
	ActiveAIRequestId += 1
	resetAIWorker("AI search cancelled.")
	AIIsThinking = false
	PlayerCanMove = false
	GameIsOver = true
	GameHasStarted = false
	currentMoveUI = {}
	GameHistory = createEmptyGameHistory()
	clearLatestAIEvaluation()
	clearTransientGameUI()
	showStartMenu()
}

function playFromMenu(){
	var selectedColor = document.getElementById("playerColor").value
	saveMenuPreferences()
	PlayerColor = selectedColor == "random" ? (Math.random() > 0.5 ? "R" : "B") : selectedColor
	AIcolor = [PlayerColor == "R" ? "B" : "R"]
	document.getElementById("startMenu").style.display = "none"
	document.getElementById("gameArea").style.display = "block"
	startNewGame()
}

function startGameFromLaunchParams(){
	const params = new URLSearchParams(window.location.search)
	const launchState = params.get("state")
	if(!isValidLaunchGameState(launchState)) return false

	const launchAI = params.get("ai")
	const launchPlayer = params.get("player")
	if(["R","B"].includes(launchPlayer)){
		PlayerColor = launchPlayer
	} else if(["R","B"].includes(launchAI)){
		PlayerColor = oppositeColor(launchAI)
	}
	AIcolor = ["R","B"].includes(launchAI) ? [launchAI] : [oppositeColor(PlayerColor)]
	document.getElementById("startMenu").style.display = "none"
	document.getElementById("gameArea").style.display = "block"
	startGameFromState(launchState)
	return true
}

function oppositeColor(color){
	return color == "R" ? "B" : "R"
}

function isValidLaunchGameState(gameState){
	if(!gameState || gameState.length != 41) return false
	if(!/^[pmePM]{25}\d{2}-\d{2}-\d{2}-\d{2}-\d{2}X[RB]$/.test(gameState)) return false
	const cardIDs = [
		gameState.substring(25,27),
		gameState.substring(28,30),
		gameState.substring(31,33),
		gameState.substring(34,36),
		gameState.substring(37,39)
	]
	const validCardIDs = new Set(getAllCardIDs())
	if(new Set(cardIDs).size != cardIDs.length) return false
	return cardIDs.every(cardID => validCardIDs.has(cardID))
}

function setupStartMenu(){
	var playerColorSelect = document.getElementById("playerColor")
	var savedColor = getCookie(PLAYER_COLOR_COOKIE)
	if (["random","R","B"].includes(savedColor)){
		playerColorSelect.value = savedColor
	}
	playerColorSelect.addEventListener("change", saveMenuPreferences)
	renderCardPicker(loadSelectedCardIDs())
}

function renderCardPicker(selectedCardIDs){
	var cardPicker = document.getElementById("cardPicker")
	cardPicker.innerHTML = ""
	var selectedCards = new Set(selectedCardIDs)
	for (let cardID of getAllCardIDs()){
		var cardLabel = document.createElement("label")
		cardLabel.className = "cardToggle"
		cardLabel.setAttribute("data-card-id", cardID)
		cardLabel.style.backgroundImage = "url('images/" + move_dictionary[cardID].name + ".jpeg')"

		var checkbox = document.createElement("input")
		checkbox.type = "checkbox"
		checkbox.checked = selectedCards.has(cardID)
		checkbox.setAttribute("aria-label", titleCase(move_dictionary[cardID].name))
		checkbox.addEventListener("click", function(event){
			if (checkbox.checked && getCheckedCardIDs().length <= MIN_SELECTED_CARDS){
				event.preventDefault()
				shakeCardToggle(cardLabel)
			}
		})
		checkbox.addEventListener("change", function(event){
			handleCardToggleChange(event, cardLabel)
		})

		var checkmark = document.createElement("span")
		checkmark.className = "cardToggleCheckmark"
		checkmark.setAttribute("aria-hidden", "true")

		var name = document.createElement("span")
		name.className = "cardToggleName"
		name.innerText = titleCase(move_dictionary[cardID].name)

		cardLabel.addEventListener("mousedown", function(event){
			if (checkbox.checked && getCheckedCardIDs().length <= MIN_SELECTED_CARDS){
				event.preventDefault()
				shakeCardToggle(cardLabel)
			}
		})
		cardLabel.appendChild(checkbox)
		cardLabel.appendChild(checkmark)
		cardLabel.appendChild(name)
		cardPicker.appendChild(cardLabel)
	}
	updateCardToggleLockedState()
}

function handleCardToggleChange(event, cardLabel){
	var checkbox = event.target
	if (!checkbox.checked && getCheckedCardIDs().length < MIN_SELECTED_CARDS){
		checkbox.checked = true
		shakeCardToggle(cardLabel)
		updateCardToggleLockedState()
		return
	}
	saveMenuPreferences()
	updateCardToggleLockedState()
}

function shakeCardToggle(cardLabel){
	cardLabel.classList.remove("shake")
	void cardLabel.offsetWidth
	cardLabel.classList.add("shake")
}

function updateCardToggleLockedState(){
	var checkedCards = getCheckedCardIDs()
	var isLocked = checkedCards.length <= MIN_SELECTED_CARDS
	var cardToggles = document.querySelectorAll("#cardPicker .cardToggle")
	for (let cardToggle of cardToggles){
		var checkbox = cardToggle.querySelector("input[type='checkbox']")
		cardToggle.classList.toggle("locked", isLocked && checkbox.checked)
	}
}

function saveMenuPreferences(){
	var colorSelect = document.getElementById("playerColor")
	if (colorSelect){
		setCookie(PLAYER_COLOR_COOKIE, colorSelect.value)
	}
	setCookie(SELECTED_CARDS_COOKIE, getCheckedCardIDs().join(","))
}

function getCheckedCardIDs(){
	var checkedCards = []
	var checkboxes = document.querySelectorAll("#cardPicker .cardToggle input[type='checkbox']:checked")
	for (let checkbox of checkboxes){
		checkedCards.push(checkbox.parentElement.getAttribute("data-card-id"))
	}
	return checkedCards
}

function getSelectedCardIDsForDeal(){
	var checkedCardIDs = getCheckedCardIDs()
	return checkedCardIDs.length >= MIN_SELECTED_CARDS ? checkedCardIDs : loadSelectedCardIDs()
}

function loadSelectedCardIDs(){
	var allCardIDs = getAllCardIDs()
	var validCardIDs = new Set(allCardIDs)
	var cookieValue = getCookie(SELECTED_CARDS_COOKIE)
	if (!cookieValue) return allCardIDs
	var selectedCardIDs = []
	for (let cardID of cookieValue.split(",")){
		if (validCardIDs.has(cardID) && !selectedCardIDs.includes(cardID)){
			selectedCardIDs.push(cardID)
		}
	}
	return selectedCardIDs.length >= MIN_SELECTED_CARDS ? selectedCardIDs : allCardIDs
}

function getAllCardIDs(){
	return Object.keys(move_dictionary).sort((a,b) => parseInt(a) - parseInt(b))
}

function setCookie(name, value){
	document.cookie = name + "=" + encodeURIComponent(value) + "; max-age=31536000; path=/; SameSite=Lax"
	try {
		localStorage.setItem(name, value)
	} catch (error) {
		console.warn("Unable to save preference fallback.", error)
	}
}

function getCookie(name){
	var cookiePrefix = name + "="
	var cookies = document.cookie.split(";")
	for (let cookie of cookies){
		var trimmedCookie = cookie.trim()
		if (trimmedCookie.startsWith(cookiePrefix)){
			return decodeURIComponent(trimmedCookie.substring(cookiePrefix.length))
		}
	}
	try {
		return localStorage.getItem(name) || ""
	} catch (error) {
		console.warn("Unable to read preference fallback.", error)
	}
	return ""
}

function getAIMove(gameState,color){
	//The AI will make moves on it's turn according to minimax. 
	const thinkingStartTime = getNow()
	console.log("Thinking about move...")
	AImovesEvaluated = 0

	var evalMove = timeBasedMinMax(gameState, thinkingStartTime, color)
	var thinkingEndTime = getNow()
	logAIMoveResult(evalMove, color, AImovesEvaluated, GreatestDepthSearched, (thinkingEndTime - thinkingStartTime)/1000)
	return evalMove
}


function doAIMove(gameState,color){
	const requestId = ++ActiveAIRequestId
	resetAIWorker("AI search cancelled.")
	PlayerCanMove = false
	AIIsThinking = true
	updateAIThinkingIndicator(color)
	console.log("Thinking about move...")
	setTimeout(() => {
		getAIMoveInWorker(gameState,color).then((result) => {
			if(requestId != ActiveAIRequestId || gameState != GameState || whosTurn(GameState) != color) return
			AIIsThinking = false
			updateAIThinkingIndicator(color)
			PlayerCanMove = true
			AImovesEvaluated = result.nodes
			GreatestDepthSearched = result.depth
			logAIMoveResult(result.evalMove, color, result.nodes, result.depth, result.thinkingTime)
			doRealMove(GameState, result.evalMove.m)
			setLatestAIEvaluation(result.evalMove)
		}).catch((error) => {
			if(requestId != ActiveAIRequestId || gameState != GameState || whosTurn(GameState) != color) return
			console.warn("AI worker failed; using quick fallback move.", error)
			AIIsThinking = false
			updateAIThinkingIndicator(color)
			PlayerCanMove = true
			const fallbackMove = getFallbackMove(GameState)
			doRealMove(GameState, fallbackMove.m)
			setLatestAIEvaluation(fallbackMove)
		})
	},100)

}

function logAIMoveResult(evalMove, color, nodes, depth, thinkingTime){
	if (evalMove.exact && isLosingScoreForColor(evalMove.e, color)){
		if(!ResignShown){
			console.log("AI resigns")
			ResignShown = true
		}
	} else if (evalMove.exact && isWinningScoreForColor(evalMove.e, color)){
		if(!ForcedMateShown){
			console.log("Mate found")
			ForcedMateShown = true
		}
	}
	var winningPlayer = evalMove.e > 0 ? "Red by "+evalMove.e : (evalMove.e < 0 ? "Blue by "+(-1*evalMove.e) : "neither side")
	console.log("Done Thinking! ------------------------------")
	console.log("Positions Evaluated: "+nodes)
	console.log("Thinking time: "+thinkingTime)
	console.log("Edge: "+winningPlayer)
	console.log("Greatest Depth Searched: "+depth)
}

function getAIMoveInWorker(gameState,color){
	return new Promise((resolve,reject) => {
		if(typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined"){
			reject("Web Workers are not available in this browser.")
			return
		}
		const worker = getAIWorker()
		const messageId = ++AIWorkerMessageId
		AIWorkerRequests[messageId] = {resolve: resolve, reject: reject}
		worker.postMessage({
			id: messageId,
			gameState: gameState,
			color: color,
			maxThinkingTime: MaxThinkingTime
		})
	})
}

function getAIWorker(){
	if(AIWorker) return AIWorker
	AIWorkerUrl = URL.createObjectURL(new Blob([buildAIWorkerScript()], {type: "text/javascript"}))
	AIWorker = new Worker(AIWorkerUrl)
	AIWorker.onmessage = (event) => {
		const request = AIWorkerRequests[event.data.id]
		if(!request) return
		delete AIWorkerRequests[event.data.id]
		if(event.data.error){
			request.reject(event.data.error)
		} else {
			request.resolve(event.data)
		}
	}
	AIWorker.onerror = (event) => {
		const pendingRequests = AIWorkerRequests
		AIWorkerRequests = {}
		for(let id in pendingRequests){
			pendingRequests[id].reject(event.message || "AI worker error")
		}
		resetAIWorker()
	}
	return AIWorker
}

function resetAIWorker(reason=null){
	if(reason){
		const pendingRequests = AIWorkerRequests
		AIWorkerRequests = {}
		for(let id in pendingRequests){
			pendingRequests[id].reject(reason)
		}
	}
	if(AIWorker){
		AIWorker.terminate()
		AIWorker = null
	}
	if(AIWorkerUrl){
		URL.revokeObjectURL(AIWorkerUrl)
		AIWorkerUrl = null
	}
}

function buildAIWorkerScript(){
	const workerFunctions = [
		getNow,
		whosTurn,
		twoDigit,
		getEvalMove,
		isWinningScoreForColor,
		isLosingScoreForColor,
		timeBasedMinMax,
		createFastSearch,
		ensureFastSearchTables,
		createFastZobrist,
		fastAlphaBeta,
		fastFallbackSearch,
		fastGenerateLegalMoves,
		fastOrderMoves,
		fastMoveHeuristic,
		fastMakeMove,
		fastUnmakeMove,
		fastStaticEvaluation,
		fastResultToEval,
		fastEncodeMove,
		fastMoveSlot,
		fastMoveStart,
		fastMoveTarget,
		fastDecodeMove,
		fastHashKey,
		fastXorPiece,
		fastXorCard,
		fastXorTurn,
		fastPieceIndex,
		fastPieceFromChar,
		isFastMateScore
	].map((fn) => fn.toString()).join("\n\n")
	return `
		var EvaluatedStates = {};
		var StatesMovesLists = {};
		var AImovesEvaluated = 0;
		var GreatestDepthSearched = 0;
		var MaxThinkingTime = ${MaxThinkingTime};
		const FAST_RED = ${FAST_RED};
		const FAST_BLUE = ${FAST_BLUE};
		const FAST_EMPTY = ${FAST_EMPTY};
		const FAST_RED_PAWN = ${FAST_RED_PAWN};
		const FAST_RED_MASTER = ${FAST_RED_MASTER};
		const FAST_BLUE_PAWN = ${FAST_BLUE_PAWN};
		const FAST_BLUE_MASTER = ${FAST_BLUE_MASTER};
		const FAST_MATE_SCORE = ${FAST_MATE_SCORE};
		const FAST_MATE_THRESHOLD = ${FAST_MATE_THRESHOLD};
		const TT_EXACT = ${TT_EXACT};
		const TT_LOWER = ${TT_LOWER};
		const TT_UPPER = ${TT_UPPER};
		var FastMoveTable = null;
		var FastZobrist = null;
		var move_dictionary = ${JSON.stringify(move_dictionary)};
		String.prototype.countLetters = function(inputLetter) {
			return this.split(inputLetter).length -1;
		};
		${workerFunctions}
		self.onmessage = function(event){
			try {
				MaxThinkingTime = event.data.maxThinkingTime;
				AImovesEvaluated = 0;
				GreatestDepthSearched = 0;
				const thinkingStartTime = getNow();
				const evalMove = timeBasedMinMax(event.data.gameState, thinkingStartTime, event.data.color);
				self.postMessage({
					id: event.data.id,
					evalMove: evalMove,
					nodes: AImovesEvaluated,
					depth: GreatestDepthSearched,
					thinkingTime: (getNow() - thinkingStartTime) / 1000
				});
			} catch (error) {
				self.postMessage({
					id: event.data.id,
					error: error && error.message ? error.message : String(error)
				});
			}
		};
	`
}

function startNewGame(){
	startGameFromState(createRandomGameState())
}

function startGameFromState(initialGameState){
	ActiveAIRequestId += 1
	resetAIWorker("AI search cancelled.")
	AIIsThinking = false
	PlayerCanMove = false
	GameState = initialGameState
	GameIsOver = false
	GameHasStarted = false
	currentMoveUI = {}
	GameHistory = createEmptyGameHistory()
	clearLatestAIEvaluation()
	ForcedMateShown = false
	ResignShown = false
	clearTransientGameUI()
	applyPlayerPerspective()
	placePieces(GameState)
	placeCards(GameState)
	bindBoardSquareClicks()
	showBoardStartButton()
	GameHistory.gameStart = GameState
	GameHistory.stateHistory = [GameState]
	updateTakeBackButton()
	var thisGameMoveSets = getThisGameCardsMoveSet(move_dictionary, GameState) // Filter down all possible moves to just the cards in this game
	precomputeOnBoardMoves(thisGameMoveSets)
}

function startBoardGame(){
	if (GameIsOver || GameHasStarted) return
	GameHasStarted = true
	PlayerCanMove = true
	hideBoardStartButton()
	updateTakeBackButton()
	if(AIcolor.includes(whosTurn(GameState))){ // If its the AI's turn (and there is an AI) the AI makes a move.
		console.log("Starting game with AI...")
		doAIMove(GameState,whosTurn(GameState))
	}
}

function takeBack(){
	const targetHistoryIndex = getTakeBackHistoryIndex()
	if (targetHistoryIndex === null) return

	ActiveAIRequestId += 1
	resetAIWorker("AI search cancelled.")
	AIIsThinking = false
	PlayerCanMove = true
	GameIsOver = false
	ForcedMateShown = false
	ResignShown = false
	currentMoveUI = {}
	clearLatestAIEvaluation()

	GameState = getGameStateAtHistoryIndex(targetHistoryIndex)
	GameHistory.moveHistory = GameHistory.moveHistory.slice(0, targetHistoryIndex)
	GameHistory.stateHistory = getStateHistoryThroughIndex(targetHistoryIndex)

	updateUI(GameState)
	console.log("Took back to "+GameHistory.moveHistory.length+" plies.")
}

function getTakeBackHistoryIndex(){
	if (!GameHasStarted || !GameHistory.moveHistory.length) return null
	const currentHistoryIndex = GameHistory.moveHistory.length
	for (let historyIndex = currentHistoryIndex - 1; historyIndex >= 0; historyIndex--){
		if (whosTurn(getGameStateAtHistoryIndex(historyIndex)) == PlayerColor){
			return historyIndex
		}
	}
	return null
}

function getGameStateAtHistoryIndex(historyIndex){
	if (GameHistory.stateHistory && GameHistory.stateHistory[historyIndex]){
		return GameHistory.stateHistory[historyIndex]
	}
	var gameState = GameHistory.gameStart
	for (let moveIndex = 0; moveIndex < historyIndex; moveIndex++){
		gameState = doMove(gameState, GameHistory.moveHistory[moveIndex])
	}
	return gameState
}

function getStateHistoryThroughIndex(historyIndex){
	var stateHistory = []
	for (let stateIndex = 0; stateIndex <= historyIndex; stateIndex++){
		stateHistory.push(getGameStateAtHistoryIndex(stateIndex))
	}
	return stateHistory
}


// AI ****************************************************

const FAST_RED = 1
const FAST_BLUE = -1
const FAST_EMPTY = 0
const FAST_RED_PAWN = 1
const FAST_RED_MASTER = 2
const FAST_BLUE_PAWN = -1
const FAST_BLUE_MASTER = -2
const FAST_MATE_SCORE = 1000000
const FAST_MATE_THRESHOLD = 900000
const TT_EXACT = 0
const TT_LOWER = 1
const TT_UPPER = 2
var FastMoveTable = null
var FastZobrist = null

function timeBasedMinMax(gameState, thinkingStartTime, color){
	// Iterative deepening over a compact, mutable search state.
	EvaluatedStates = {}
	StatesMovesLists = {}
	AImovesEvaluated = 0
	GreatestDepthSearched = 0
	const search = createFastSearch(gameState, thinkingStartTime)
	var evalMove = fastResultToEval(search, fastFallbackSearch(search))
	var depthsBestMove = {}
	var depthRemaining = 0
	while(getNow() - thinkingStartTime < MaxThinkingTime){
		depthRemaining++
		const thisEvalMove = fastAlphaBeta(search, depthRemaining, -FAST_MATE_SCORE - 1, FAST_MATE_SCORE + 1, 0)
		if(thisEvalMove.timedOut || getNow() - thinkingStartTime >= MaxThinkingTime) break
		evalMove = fastResultToEval(search, thisEvalMove)
		evalMove.searchDepth = depthRemaining
		depthsBestMove[depthRemaining] = evalMove
		if(evalMove.exact && isWinningScoreForColor(evalMove.e, color)){
			console.log(("Forced mate in "+(evalMove.d)+" plies."))
			break
		} else if (evalMove.exact && isLosingScoreForColor(evalMove.e, color)){
			if(depthRemaining > 1){
				console.log("Forced loss in "+(evalMove.d)+" plies.")
				evalMove = depthsBestMove[depthRemaining-1]
				break
			}
		}
	}
	console.log("Greatest Depth Searched: "+(GreatestDepthSearched))
	return evalMove
}

function minmaxMoveFind(gameState,depthRemaining,depth,rBest,bBest,thinkingStartTime){
	const search = createFastSearch(gameState, thinkingStartTime)
	const result = fastAlphaBeta(search, depthRemaining, rBest, bBest, depth)
	return fastResultToEval(search, result)
}

function createFastSearch(gameState, thinkingStartTime){
	ensureFastSearchTables()
	const search = {
		board: new Int8Array(25),
		cards: new Int8Array(5),
		turn: whosTurn(gameState) == "R" ? FAST_RED : FAST_BLUE,
		hashA: 0,
		hashB: 0,
		tt: new Map(),
		thinkingStartTime: thinkingStartTime
	}
	for(let i=0;i<25;i++){
		search.board[i] = fastPieceFromChar(gameState[i])
		fastXorPiece(search, i, search.board[i])
	}
	search.cards[0] = parseInt(gameState.substring(25,27))
	search.cards[1] = parseInt(gameState.substring(28,30))
	search.cards[2] = parseInt(gameState.substring(31,33))
	search.cards[3] = parseInt(gameState.substring(34,36))
	search.cards[4] = parseInt(gameState.substring(37,39))
	for(let i=0;i<5;i++){
		fastXorCard(search, i, search.cards[i])
	}
	fastXorTurn(search, search.turn)
	return search
}

function ensureFastSearchTables(){
	if(FastMoveTable && FastZobrist) return
	FastMoveTable = [[],[]]
	for(let colorIndex=0;colorIndex<2;colorIndex++){
		const color = colorIndex == 0 ? "R" : "B"
		for(let cardID=0;cardID<32;cardID++){
			FastMoveTable[colorIndex][cardID] = []
			const rawMoves = move_dictionary[twoDigit(cardID)].moves
			for(let spaceNum=0;spaceNum<25;spaceNum++){
				const outputMoveList = []
				for(let rawMove of rawMoves){
					const forwardCount = rawMove.countLetters("f")
					const backwardCount = rawMove.countLetters("b")
					const rightCount = rawMove.countLetters("r")
					const leftCount = rawMove.countLetters("l")
					if (color == "B"){
						if(spaceNum + forwardCount*5<25 && spaceNum - backwardCount*5>=0 && spaceNum%5 - rightCount >=0 && spaceNum%5 + leftCount <5){
							outputMoveList.push(spaceNum+forwardCount*5 - backwardCount*5 - rightCount + leftCount)
						}
					} else if (color == "R"){
						if(spaceNum - forwardCount*5>=0 && spaceNum + backwardCount*5<25 && spaceNum%5 + rightCount <5 && spaceNum%5 - leftCount >=0){
							outputMoveList.push(spaceNum-forwardCount*5 + backwardCount*5 + rightCount - leftCount)
						}
					}
				}
				FastMoveTable[colorIndex][cardID][spaceNum] = outputMoveList
			}
		}
	}
	FastZobrist = createFastZobrist()
}

function createFastZobrist(){
	var seed = 0x9e3779b9
	const nextRand32 = () => {
		seed = (seed + 0x6d2b79f5) | 0
		let t = seed
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return (t ^ (t >>> 14)) >>> 0
	}
	const pieceA = []
	const pieceB = []
	for(let square=0;square<25;square++){
		pieceA[square] = []
		pieceB[square] = []
		for(let piece=0;piece<5;piece++){
			pieceA[square][piece] = nextRand32()
			pieceB[square][piece] = nextRand32()
		}
	}
	const cardA = []
	const cardB = []
	for(let slot=0;slot<5;slot++){
		cardA[slot] = []
		cardB[slot] = []
		for(let card=0;card<32;card++){
			cardA[slot][card] = nextRand32()
			cardB[slot][card] = nextRand32()
		}
	}
	return {
		pieceA: pieceA,
		pieceB: pieceB,
		cardA: cardA,
		cardB: cardB,
		turnA: [nextRand32(), nextRand32()],
		turnB: [nextRand32(), nextRand32()]
	}
}

function fastAlphaBeta(search, depthRemaining, alpha, beta, ply){
	if((AImovesEvaluated & 2047) == 0 && getNow() - search.thinkingStartTime > MaxThinkingTime){
		return {"timedOut": true}
	}
	GreatestDepthSearched = Math.max(GreatestDepthSearched,ply)
	const staticEval = fastStaticEvaluation(search, ply)
	if(depthRemaining == 0 || isFastMateScore(staticEval)){
		return {"score": staticEval, "move": 0, "exact": true, "bound": "exact"}
	}

	const alphaOrig = alpha
	const betaOrig = beta
	const key = fastHashKey(search)
	const ttEntry = search.tt.get(key)
	var ttMove = 0
	if(ttEntry){
		ttMove = ttEntry.move
		if(ttEntry.depth >= depthRemaining){
			if(ttEntry.flag == TT_EXACT){
				return {"score": ttEntry.score, "move": ttEntry.move, "exact": true, "bound": "exact"}
			}
			if(ttEntry.flag == TT_LOWER) alpha = Math.max(alpha, ttEntry.score)
			if(ttEntry.flag == TT_UPPER) beta = Math.min(beta, ttEntry.score)
			if(alpha >= beta){
				return {"score": ttEntry.score, "move": ttEntry.move, "exact": false, "bound": ttEntry.flag == TT_LOWER ? "lower" : "upper"}
			}
		}
	}

	const legalMoves = fastGenerateLegalMoves(search)
	if(legalMoves.length == 0){
		return {"score": staticEval, "move": 0, "exact": true, "bound": "exact"}
	}
	fastOrderMoves(search, legalMoves, ttMove)

	const maximizingPlayer = search.turn == FAST_RED
	var bestMove = legalMoves[0]
	var bestScore = maximizingPlayer ? -FAST_MATE_SCORE - 1 : FAST_MATE_SCORE + 1
	for(let move of legalMoves){
		const undo = fastMakeMove(search, move)
		AImovesEvaluated += 1
		const childEval = fastAlphaBeta(search, depthRemaining - 1, alpha, beta, ply + 1)
		fastUnmakeMove(search, undo)
		if(childEval.timedOut) return childEval

		if((maximizingPlayer && childEval.score > bestScore) || (!maximizingPlayer && childEval.score < bestScore)){
			bestScore = childEval.score
			bestMove = move
		}
		if(maximizingPlayer){
			alpha = Math.max(alpha, bestScore)
		} else {
			beta = Math.min(beta, bestScore)
		}
		if(alpha >= beta) break
	}

	var flag = TT_EXACT
	if(bestScore <= alphaOrig) flag = TT_UPPER
	else if(bestScore >= betaOrig) flag = TT_LOWER
	search.tt.set(key, {"depth": depthRemaining, "score": bestScore, "flag": flag, "move": bestMove})
	return {
		"score": bestScore,
		"move": bestMove,
		"exact": flag == TT_EXACT,
		"bound": flag == TT_EXACT ? "exact" : (flag == TT_LOWER ? "lower" : "upper")
	}
}

function fastFallbackSearch(search){
	const legalMoves = fastGenerateLegalMoves(search)
	if(legalMoves.length == 0){
		return {"score": fastStaticEvaluation(search, 0), "move": 0, "exact": true, "bound": "exact"}
	}
	const maximizingPlayer = search.turn == FAST_RED
	var bestMove = legalMoves[0]
	var undo = fastMakeMove(search, bestMove)
	var bestScore = fastStaticEvaluation(search, 1)
	fastUnmakeMove(search, undo)
	for(let move of legalMoves){
		undo = fastMakeMove(search, move)
		const score = fastStaticEvaluation(search, 1)
		fastUnmakeMove(search, undo)
		if((maximizingPlayer && score > bestScore) || (!maximizingPlayer && score < bestScore)){
			bestMove = move
			bestScore = score
		}
	}
	return {"score": bestScore, "move": bestMove, "exact": false, "bound": "fallback"}
}

function fastGenerateLegalMoves(search){
	const colorIndex = search.turn == FAST_RED ? 0 : 1
	const firstCardSlot = search.turn == FAST_RED ? 0 : 2
	const legalMoves = []
	for(let start=0;start<25;start++){
		const piece = search.board[start]
		if(piece == FAST_EMPTY || (search.turn == FAST_RED && piece < 0) || (search.turn == FAST_BLUE && piece > 0)) continue
		for(let slot=firstCardSlot;slot<firstCardSlot+2;slot++){
			const cardID = search.cards[slot]
			const targetLocations = FastMoveTable[colorIndex][cardID][start]
			for(let target of targetLocations){
				const targetPiece = search.board[target]
				if(targetPiece == FAST_EMPTY || (targetPiece > 0) != (piece > 0)){
					legalMoves.push(fastEncodeMove(slot, start, target))
				}
			}
		}
	}
	return legalMoves
}

function fastOrderMoves(search, moves, ttMove){
	moves.sort((a,b) => fastMoveHeuristic(search, b, ttMove) - fastMoveHeuristic(search, a, ttMove))
}

function fastMoveHeuristic(search, move, ttMove){
	if(move == ttMove) return 1000000
	const target = fastMoveTarget(move)
	const targetPiece = search.board[target]
	var score = 0
	if(targetPiece != FAST_EMPTY) score += Math.abs(targetPiece) == 2 ? 50000 : 10000
	if((search.turn == FAST_RED && target == 2) || (search.turn == FAST_BLUE && target == 22)) score += 90000
	return score
}

function fastMakeMove(search, move){
	const slot = fastMoveSlot(move)
	const start = fastMoveStart(move)
	const target = fastMoveTarget(move)
	const movingPiece = search.board[start]
	const capturedPiece = search.board[target]
	const oldSlotCard = search.cards[slot]
	const oldNeutralCard = search.cards[4]
	const undo = {
		"move": move,
		"movingPiece": movingPiece,
		"capturedPiece": capturedPiece,
		"oldSlotCard": oldSlotCard,
		"oldNeutralCard": oldNeutralCard,
		"oldTurn": search.turn,
		"hashA": search.hashA,
		"hashB": search.hashB
	}

	fastXorPiece(search, start, movingPiece)
	if(capturedPiece != FAST_EMPTY) fastXorPiece(search, target, capturedPiece)
	search.board[start] = FAST_EMPTY
	search.board[target] = movingPiece
	fastXorPiece(search, target, movingPiece)

	fastXorCard(search, slot, oldSlotCard)
	fastXorCard(search, 4, oldNeutralCard)
	search.cards[slot] = oldNeutralCard
	search.cards[4] = oldSlotCard
	fastXorCard(search, slot, search.cards[slot])
	fastXorCard(search, 4, search.cards[4])

	fastXorTurn(search, search.turn)
	search.turn = -search.turn
	fastXorTurn(search, search.turn)
	return undo
}

function fastUnmakeMove(search, undo){
	const move = undo.move
	search.board[fastMoveStart(move)] = undo.movingPiece
	search.board[fastMoveTarget(move)] = undo.capturedPiece
	search.cards[fastMoveSlot(move)] = undo.oldSlotCard
	search.cards[4] = undo.oldNeutralCard
	search.turn = undo.oldTurn
	search.hashA = undo.hashA
	search.hashB = undo.hashB
}

function fastStaticEvaluation(search, ply){
	var bluePawnsCount = 0
	var redPawnsCount = 0
	var redMasterPos = -1
	var blueMasterPos = -1
	var redCenterControl = 0
	var blueCenterControl = 0
	for(let i=0;i<25;i++){
		const piece = search.board[i]
		if(piece == FAST_RED_MASTER) redMasterPos = i
		else if(piece == FAST_BLUE_MASTER) blueMasterPos = i
		else if(piece == FAST_RED_PAWN) redPawnsCount += 1
		else if(piece == FAST_BLUE_PAWN) bluePawnsCount += 1
		if(i == 6 || i == 7 || i == 8 || i == 11 || i == 12 || i == 13 || i == 16 || i == 17 || i == 18){
			if(piece > 0) redCenterControl += 1
			else if(piece < 0) blueCenterControl += 1
		}
	}
	if(blueMasterPos == -1 || search.board[2] == FAST_RED_MASTER) return FAST_MATE_SCORE - ply
	if(redMasterPos == -1 || search.board[22] == FAST_BLUE_MASTER) return -FAST_MATE_SCORE + ply

	const redMasterLocationEval = (4 - Math.floor(redMasterPos/5)) - (Math.abs(redMasterPos%5 - 2))
	const blueMasterLocationEval = (Math.floor(blueMasterPos/5)) - (Math.abs(blueMasterPos%5 - 2))
	const endGamePercent = 10*(8 - (bluePawnsCount + redPawnsCount))/8
	var evaluation = 5*(redPawnsCount - bluePawnsCount)
	evaluation += endGamePercent * (redMasterLocationEval - blueMasterLocationEval)
	evaluation += redCenterControl - blueCenterControl
	return evaluation
}

function fastResultToEval(search, result){
	if(result.timedOut) return result
	var score = result.score
	var mateDistance = 0
	if(isFastMateScore(score)){
		mateDistance = FAST_MATE_SCORE - Math.abs(score)
		score = score > 0 ? Infinity : -Infinity
	}
	const evalMove = getEvalMove(score, fastDecodeMove(search, result.move), mateDistance, 0)
	evalMove.exact = result.exact === true
	evalMove.bound = result.bound
	return evalMove
}

function fastEncodeMove(slot,start,target){
	return slot | (start << 3) | (target << 8)
}

function fastMoveSlot(move){
	return move & 7
}

function fastMoveStart(move){
	return (move >> 3) & 31
}

function fastMoveTarget(move){
	return (move >> 8) & 31
}

function fastDecodeMove(search, move){
	if(!move) return {}
	const slot = fastMoveSlot(move)
	return {
		"cardID": twoDigit(search.cards[slot]),
		"color": search.turn == FAST_RED ? "R" : "B",
		"startLocation": fastMoveStart(move),
		"targetLocation": fastMoveTarget(move)
	}
}

function fastHashKey(search){
	return search.hashA.toString(36)+":"+search.hashB.toString(36)
}

function fastXorPiece(search, square, piece){
	const pieceIndex = fastPieceIndex(piece)
	if(pieceIndex == 0) return
	search.hashA = (search.hashA ^ FastZobrist.pieceA[square][pieceIndex]) >>> 0
	search.hashB = (search.hashB ^ FastZobrist.pieceB[square][pieceIndex]) >>> 0
}

function fastXorCard(search, slot, card){
	search.hashA = (search.hashA ^ FastZobrist.cardA[slot][card]) >>> 0
	search.hashB = (search.hashB ^ FastZobrist.cardB[slot][card]) >>> 0
}

function fastXorTurn(search, turn){
	const index = turn == FAST_RED ? 0 : 1
	search.hashA = (search.hashA ^ FastZobrist.turnA[index]) >>> 0
	search.hashB = (search.hashB ^ FastZobrist.turnB[index]) >>> 0
}

function fastPieceIndex(piece){
	if(piece == FAST_RED_PAWN) return 1
	if(piece == FAST_RED_MASTER) return 2
	if(piece == FAST_BLUE_PAWN) return 3
	if(piece == FAST_BLUE_MASTER) return 4
	return 0
}

function fastPieceFromChar(piece){
	if(piece == "P") return FAST_RED_PAWN
	if(piece == "M") return FAST_RED_MASTER
	if(piece == "p") return FAST_BLUE_PAWN
	if(piece == "m") return FAST_BLUE_MASTER
	return FAST_EMPTY
}

function isFastMateScore(score){
	return Math.abs(score) >= FAST_MATE_THRESHOLD
}

function getLegalMoves(gameState){
	const turn = whosTurn(gameState)
	const piecesForPlayersTurn = getColorPieceLocations(gameState, turn)
	const cardIDs = getCurrentTurnPlayersCardIDs(gameState)
	var legalMoves = []
	for (let pieceSpace of piecesForPlayersTurn){
		for (let cardID of cardIDs){
			const startKey = turn+"-"+cardID+"-"+pieceSpace
			const targetLocations = PrecomputedBoardMoves[startKey] || []
			for (let targetLocation of targetLocations){
				const thisMove = {"cardID":cardID,"color":turn,"startLocation":pieceSpace,"targetLocation":targetLocation}
				if(isLegal(gameState,thisMove)) legalMoves.push(thisMove)
			}
		}
	}
	return legalMoves
}

function isWinningScoreForColor(score,color){
	return (score == Infinity && color == "R") || (score == -Infinity && color == "B")
}

function isLosingScoreForColor(score,color){
	return (score == -Infinity && color == "R") || (score == Infinity && color == "B")
}

function getFallbackMove(gameState){
	const search = createFastSearch(gameState, getNow())
	return fastResultToEval(search, fastFallbackSearch(search))
}

function staticEvaluation(gameState){// Evaluate a board. Red is "positive" blue is "negative"
	if(!gameState.includes("m") || gameState[2] == "M"){ // Either there is no blue master, or the red master is in the blue temple
		return Infinity //Red wins
	} else if (!gameState.includes("M") || gameState[22] == "m"){ // Either there is no red master, or the blue master is in the red temple
		return -Infinity //Blue wins
	} else {
		//Eval Variables
		const bluePawnsCount = gameState.countLetters("p")
		const redPawnsCount =  gameState.countLetters("P")
		const redMasterPos = gameState.indexOf("M") 
		const blueMasterPos = gameState.indexOf("m") 
		const redMasterLocationEval = (4 - Math.floor(redMasterPos/5)) - (Math.abs(redMasterPos%5 - 2)) // How close is Red master to blue temple (manhattan Distance)
		const blueMasterLocationEval = (Math.floor(blueMasterPos/5)) - (Math.abs(blueMasterPos%5 - 2))  // How close is Blue master to red temple (manhattan Distance)
		const endGamePercent = 10*(8 - (bluePawnsCount + redPawnsCount))/8 // How deep are we into the end game (as measure by total pawns)
		const centerSpaces = gameState[6]+gameState[7]+gameState[8]+gameState[11]+gameState[12]+gameState[13]+gameState[16]+gameState[17]+gameState[18]
		const redCenterControl = centerSpaces.countLetters("P")
		const blueCenterControl = centerSpaces.countLetters("p")

		// Put in the evals
		var evaluation = 5*(redPawnsCount - bluePawnsCount) // The difference between number of pawns 
		evaluation += endGamePercent * (redMasterLocationEval - blueMasterLocationEval) // As endgame approaches, master distance to enemy temple matters more.
		evaluation += redCenterControl - blueCenterControl // See who has more center control. 
		return evaluation
	}
}

function getEvalMove(thisEval,thisMove,depthRemaining,depth,r=null,b=null,p=null){
	 var evalMove = {"e": thisEval
			, "m": thisMove
			, "d": depthRemaining
			, "t": ((typeof GameHistory !== "undefined" && GameHistory.moveHistory) ? GameHistory.moveHistory.length : 0) + depth
		}
	return evalMove
}

function disposeUnneededStates(evaluatedStates){
	const gameStates = Object.keys(evaluatedStates)
	gameStates.forEach(key => {
		if(evaluatedStates[key].t <= GameHistory.moveHistory.length -1){
			delete evaluatedStates[key]
		}
	})
}

//SETUP ***************************************************
function createRandomGameState(isStart = true){
	var thisGameState = STARTING_BOARD_STATE;
	var deck = getSelectedCardIDsForDeal()
	if (!isStart) {
		thisGameState = thisGameState.shuffle()
	}
	var dealtCards = []
	for(var i=0;i<5;i++){
		const randomCardID = deck[Math.floor(Math.random() * deck.length)];
		for( var j = 0; j < deck.length; j++){ 
			if ( deck[j] === randomCardID) { 
				deck.splice(j, 1); 
			}
		}
		dealtCards.push(randomCardID)
		thisGameState += randomCardID + (i<4 ? "-" : "X")
	}
	thisGameState += move_dictionary[dealtCards[4]].startColor
	return thisGameState
}

// RULES ***************************************************
function precomputeOnBoardMoves(rawMoveSets){
	// For each possible move in our raw moveset, for each square on the board, for both colors, we will compute all of the legal moves
	for(spaceNum=0;spaceNum<25;spaceNum++){ // iterate over every square on the board
		const colors = ["R", "B"] 
		colors.forEach(function (color, index) { //needs to be done for each color, as that will output different moves, since it's asymeterical 
			for (let cardID in rawMoveSets){ //Iterating over all of the cards
				var thisRawMoveList = rawMoveSets[cardID] //grab the actual list of possible moves from the card
				var outputMoveList = [] //This output list will have actual square numbers
				thisRawMoveList.forEach( function(rawMove,index){ //at the individual move square level now. We need to count the letters.
					var forwardCount = rawMove.countLetters("f");
					var backwardCount = rawMove.countLetters("b");
					var rightCount = rawMove.countLetters("r");
					var leftCount = rawMove.countLetters("l");
					if (color == "B"){ // Blue moves forward "up in numbers"
						if(spaceNum + forwardCount*5<25 && spaceNum - backwardCount*5>=0 && spaceNum%5 - rightCount >=0 && spaceNum%5 + leftCount <5){
							outputMoveList.push(spaceNum+forwardCount*5 - backwardCount*5 - rightCount + leftCount)
						}
					} else if (color == "R"){ // Red moves forward "down in numbers"
						if(spaceNum - forwardCount*5>=0 && spaceNum + backwardCount*5<25 && spaceNum%5 + rightCount <5 && spaceNum%5 - leftCount >=0){
							outputMoveList.push(spaceNum-forwardCount*5 + backwardCount*5 + rightCount - leftCount)
						}
					}
				})
				PrecomputedBoardMoves[color+"-"+cardID+"-"+spaceNum.toString()] = outputMoveList
			}
		})
	}
}

function getThisGameCardsMoveSet(move_dictionary, gameState) {
	// Filter down all possible moves to just the cards in this game
	var thisGameMoves = {}
	//Extract the moves from the game state
	var move0Index = getRedMoveCardIDs(gameState)[0]
	var move1Index = getRedMoveCardIDs(gameState)[1]
	var move2Index = getBlueMoveCardIDs(gameState)[0]
	var move3Index = getBlueMoveCardIDs(gameState)[1]
	var move4Index = getNeutralMoveCardID(gameState) 
	//Add the moves into this game's specific moves
	thisGameMoves[move0Index] = move_dictionary[move0Index].moves
	thisGameMoves[move1Index] = move_dictionary[move1Index].moves
	thisGameMoves[move2Index] = move_dictionary[move2Index].moves
	thisGameMoves[move3Index] = move_dictionary[move3Index].moves
	thisGameMoves[move4Index] = move_dictionary[move4Index].moves
	return thisGameMoves

}

function createEmptyGameHistory(){
	return {"gameStart":"", "moveHistory":[], "stateHistory":[]}
}

function doRealMove(gameState,move){
	//Actually Play out a real move in the game, and record the history
	if (!GameHasStarted) return
	if (!move || !("cardID" in move) || !("startLocation" in move) || !("targetLocation" in move)) return
	GameState = doMove(gameState,move)
	recordHistory(move, GameState)
	updateUI(GameState,move)
	GameIsOver = Math.abs(staticEvaluation(GameState)) == Infinity
	if (GameIsOver){
		var endstring = ""
		if(staticEvaluation(GameState) == Infinity){
			endstring = "Red wins!!! "+GameHistory.moveHistory.length+" plies"

		} else if(staticEvaluation(GameState) == -Infinity){
			endstring = "Blue wins!!! "+GameHistory.moveHistory.length+" plies"
		}
		alert(endstring)
		console.log(endstring)
		return 
	}
	if(GameHasStarted && AIcolor.includes(whosTurn(GameState))){ // If its the AI's turn (and there is an AI), and the game is not over, the AI makes a move.
		doAIMove(GameState,whosTurn(GameState))
	}
}

function doMove(gameState,move){
	gameState = movePiece(gameState,move)
	gameState = rotateCards(gameState, move)
	gameState = changeTurns(gameState) 
	return gameState
}

function recordHistory(move, gameState){
	//Keep a record of what has gone on in the game.
	if (!GameHistory.stateHistory){
		GameHistory.stateHistory = [GameHistory.gameStart]
	}
	GameHistory.moveHistory.push(move)
	GameHistory.stateHistory.push(gameState)
}

function movePiece(gameState,move){
	//Enact the move, and update the game state.
	var newGameState = gameState.replaceAt(move.targetLocation, gameState[move.startLocation]) //The piece will now be in the right place
	var newestGameState = newGameState.replaceAt(move.startLocation,"e") //empty the space it left
	return newestGameState
}

function rotateCards(gameState, move){
	// Find the old card, and the neurtral card, and swap them. 
	var oldNeutralCard = getNeutralMoveCardID(gameState) //Get the Neutral Card
	var usedCardIndex = gameState.indexOf(move.cardID) //Get the locatin of the used card
	var newGameState = gameState.replaceAt(37,move.cardID).replaceAt(usedCardIndex,oldNeutralCard) //swaparoo!!!
	return newGameState
}

function changeTurns(gameState){
	// this changes who's turn is next, by flipping the last letter in gameState form B to R or vice versa.
	var newGameState = gameState.replaceAt(gameState.length-1, (whosTurn(gameState) == "R" ? "B" : "R"))
	return newGameState
}


// VISUAL ********************************************************
function applyPlayerPerspective(){
	positionBoardSquares()
	positionEvaluationBar()
	positionCardSlots()
	updateTempleBorders()
	labelBoardCoordinates()
	updateEvaluationBar()
}

function positionBoardSquares(){
	for(let squareNum=0;squareNum<25;squareNum++){
		const visualPosition = getVisualBoardPosition(squareNum)
		const square = document.getElementById("s"+squareNum)
		square.style.left = (BOARD_LEFT + visualPosition.col*SQUARE_SIZE) + "px"
		square.style.top = (BOARD_TOP + visualPosition.row*SQUARE_SIZE) + "px"
	}
}

function getVisualBoardPosition(squareNum){
	const boardCol = squareNum%5
	const boardRow = Math.floor(squareNum/5)
	if (PlayerColor == "B"){
		return {"col":4-boardCol, "row":4-boardRow}
	}
	return {"col":boardCol, "row":boardRow}
}

function positionCardSlots(){
	if (PlayerColor == "B"){
		setCardSlotPosition("pBc1", CARD_BOTTOM, CARD_LEFT_1, "rotate(0deg)")
		setCardSlotPosition("pBc2", CARD_BOTTOM, CARD_LEFT_2, "rotate(0deg)")
		setCardSlotPosition("pRc1", CARD_TOP, CARD_LEFT_1, "rotate(180deg)")
		setCardSlotPosition("pRc2", CARD_TOP, CARD_LEFT_2, "rotate(180deg)")
		setCardSlotPosition("neutralBlue", NEUTRAL_TOP, NEUTRAL_RIGHT, "rotate(0deg)")
		setCardSlotPosition("neutralRed", NEUTRAL_TOP, NEUTRAL_LEFT, "rotate(180deg)")
	} else {
		setCardSlotPosition("pBc1", CARD_TOP, CARD_LEFT_1, "rotate(180deg)")
		setCardSlotPosition("pBc2", CARD_TOP, CARD_LEFT_2, "rotate(180deg)")
		setCardSlotPosition("pRc1", CARD_BOTTOM, CARD_LEFT_1, "rotate(0deg)")
		setCardSlotPosition("pRc2", CARD_BOTTOM, CARD_LEFT_2, "rotate(0deg)")
		setCardSlotPosition("neutralBlue", NEUTRAL_TOP, NEUTRAL_LEFT, "rotate(180deg)")
		setCardSlotPosition("neutralRed", NEUTRAL_TOP, NEUTRAL_RIGHT, "rotate(0deg)")
	}
}

function setCardSlotPosition(slotID, top, left, transform){
	const slot = document.getElementById(slotID)
	slot.style.top = top + "px"
	slot.style.left = left + "px"
	slot.style.transform = transform
}

function positionEvaluationBar(){
	const bar = getEvaluationBar()
	if (!bar) return
	bar.style.left = (BOARD_LEFT + SQUARE_SIZE*5 + EVAL_BAR_GAP) + "px"
	bar.style.top = BOARD_TOP + "px"
	bar.style.height = (SQUARE_SIZE*5) + "px"
	bar.style.width = EVAL_BAR_WIDTH + "px"
}

function getEvaluationBar(){
	var bar = document.getElementById("aiEvalBar")
	if (bar) return bar
	var board = document.getElementById("board")
	if (!board) return null
	bar = document.createElement("div")
	bar.id = "aiEvalBar"
	bar.className = "evalBar"
	bar.setAttribute("aria-label", "Latest bot evaluation")
	board.appendChild(bar)
	return bar
}

function updateTempleBorders(){
	const redTemple = document.getElementById("s22")
	const blueTemple = document.getElementById("s2")
	redTemple.style.borderTopColor = PlayerColor == "B" ? "red" : "white"
	redTemple.style.borderBottomColor = PlayerColor == "B" ? "white" : "red"
	redTemple.style.borderLeftColor = "red"
	redTemple.style.borderRightColor = "red"
	blueTemple.style.borderTopColor = PlayerColor == "B" ? "white" : "blue"
	blueTemple.style.borderBottomColor = PlayerColor == "B" ? "blue" : "white"
	blueTemple.style.borderLeftColor = "blue"
	blueTemple.style.borderRightColor = "blue"
}

function labelBoardCoordinates(){
	removeElementsByClass("coordinateLabel")
	for(let squareNum=0;squareNum<25;squareNum++){
		const visualPosition = getVisualBoardPosition(squareNum)
		if (visualPosition.row == 4){
			appendHtml("s"+squareNum, "<div class='coordinateLabel fileLabel'>"+getDisplayFileForSquare(squareNum)+"</div>")
		}
		if (visualPosition.col == 0){
			appendHtml("s"+squareNum, "<div class='coordinateLabel rankLabel'>"+getDisplayRankForSquare(squareNum)+"</div>")
		}
	}
}

function getDisplayFileForSquare(squareNum){
	return "ABCDE"[squareNum%5]
}

function getDisplayRankForSquare(squareNum){
	return (5 - Math.floor(squareNum/5)).toString()
}

function titleCase(value){
	return value.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

function placePieces(gameState){
	// Put the piece divs on the board to reflect the game state
	removeElementsByClass("piece") // remove any pieces if there were any.
	var pieceNum = 0
	for(i=0;i<25;i++){
		var letter = gameState[i]
		if(letter != "e"){
			var pieceColor = (letter==letter.toUpperCase() ? "red" : "blue")
			var pieceType = (letter.toUpperCase() == "M" ? "master" : "pawn")
			appendHtml("s"+i, "<div id='p"+(pieceNum++)+"' draggable='false' onclick='selectPiece(event)' ondragstart='drag(event)' class='piece "+pieceColor+" "+pieceType+"' style='left:0px; top:0px;'></div>")
		} 
	}
	if (AIIsThinking){
		updateAIThinkingIndicator(whosTurn(gameState))
	}
}

function updateAIThinkingIndicator(color){
	removeElementsByClass("aiThinkingIndicator")
	if (!AIIsThinking || !AIcolor.includes(color)) return
	var masterLocation = GameState.indexOf(color == "R" ? "M" : "m")
	if (masterLocation < 0) return
	var masterSquare = document.getElementById("s"+masterLocation)
	var masterPiece = masterSquare ? masterSquare.querySelector(".master") : null
	if (!masterPiece) return
	var loadingImage = document.createElement("img")
	loadingImage.className = "aiThinkingIndicator"
	loadingImage.src = "images/loading.gif"
	loadingImage.alt = "AI thinking"
	masterPiece.appendChild(loadingImage)
}

function placeCards(gameState){
	//Shows where the cards are in the game, based on the game state
	setClassStyleValue("cardSlot","background-image","none")// Erase any cards from a prior state
	setClassStyleValue("cardSlot","opacity","0.55")
	setClassInnerText("cardSlot","")
	var turnPlayer = whosTurn(gameState)
	if (turnPlayer == "R"){
		document.getElementById("neutralRed").style.backgroundImage = "url('images/" + move_dictionary[getNeutralMoveCardID(gameState)].name + ".jpeg')"
		document.getElementById("neutralRed").innerText = getNeutralMoveCardID(gameState)

	} else {
		document.getElementById("neutralBlue").style.backgroundImage = "url('images/" + move_dictionary[getNeutralMoveCardID(gameState)].name + ".jpeg')"
		document.getElementById("neutralBlue").innerText = getNeutralMoveCardID(gameState)

	}
	document.getElementById("pBc1").style.backgroundImage = "url('images/" + move_dictionary[getBlueMoveCardIDs(gameState)[0]].name + ".jpeg')"
	document.getElementById("pBc1").innerText = getBlueMoveCardIDs(gameState)[0]
	document.getElementById("pBc2").style.backgroundImage = "url('images/" + move_dictionary[getBlueMoveCardIDs(gameState)[1]].name + ".jpeg')"
	document.getElementById("pBc2").innerText = getBlueMoveCardIDs(gameState)[1]
	document.getElementById("pRc1").style.backgroundImage = "url('images/" + move_dictionary[getRedMoveCardIDs(gameState)[0]].name + ".jpeg')"
	document.getElementById("pRc1").innerText = getRedMoveCardIDs(gameState)[0]
	document.getElementById("pRc2").style.backgroundImage = "url('images/" + move_dictionary[getRedMoveCardIDs(gameState)[1]].name + ".jpeg')"
	document.getElementById("pRc2").innerText = getRedMoveCardIDs(gameState)[1]
	updatePlayableCardStyles()

}

function updatePlayableCardStyles(selectedSlot = null){
	var currentTurnPlayer = whosTurn(GameState)
	setClassStyleValue("cardSlot","border-color","white")
	setClassStyleValue("cardSlot","opacity","0.55")
	var playableSlots = currentTurnPlayer == "R" ? ["pRc1","pRc2"] : ["pBc1","pBc2"]
	for (let slot of playableSlots){
		document.getElementById(slot).style.opacity = "1"
		document.getElementById(slot).style.borderColor = currentTurnPlayer == "R" ? "red" : "blue"
	}
	if (selectedSlot){
		document.getElementById(selectedSlot).style.borderColor = "gold"
	}
}

function colorlastSquare(gameHistory){
	clearBoardHighlights()
	var moves = gameHistory.moveHistory
	if (moves.length === 0) return
	var latestMove = moves[moves.length -1]
	console.log(stringifyMove(latestMove))
	document.getElementById("s"+latestMove.startLocation).classList.add("lastMoveFromSquare")
	document.getElementById("s"+latestMove.targetLocation).classList.add("lastMoveToSquare")
}

function clearTransientGameUI(){
	clearBoardHighlights()
	removeElementsByClass("piece")
	hideBoardStartButton()
	updateTakeBackButton()
	setClassStyleValue("cardSlot","background-image","none")
	setClassStyleValue("cardSlot","border-color","white")
	setClassStyleValue("cardSlot","opacity","")
	setClassInnerText("cardSlot","")
}

function updateTakeBackButton(){
	var takeBackButton = document.getElementById("takeBackButton")
	if (!takeBackButton) return
	takeBackButton.disabled = getTakeBackHistoryIndex() === null
}

function showBoardStartButton(){
	var board = document.getElementById("board")
	var startButton = document.getElementById("boardStartButton")
	if (!startButton){
		startButton = document.createElement("button")
		startButton.id = "boardStartButton"
		startButton.type = "button"
		startButton.innerText = "Start"
		startButton.onclick = startBoardGame
		board.appendChild(startButton)
	}
	startButton.style.display = "block"
}

function hideBoardStartButton(){
	var startButton = document.getElementById("boardStartButton")
	if (startButton){
		startButton.style.display = "none"
	}
}

function clearBoardHighlights(){
	removeClassFromElements("boardSquare","lastMoveSquare")
	removeClassFromElements("boardSquare","lastMoveFromSquare")
	removeClassFromElements("boardSquare","lastMoveToSquare")
	setClassStyleValue("boardSquare","background-color","")
	setClassStyleValue("boardSquare","outline","")
}

function selectCard(slot){
	if (GameIsOver || !GameHasStarted || !PlayerCanMove || AIIsThinking) return;
	var currentTurnPlayer = whosTurn(GameState)
	var cardSlotPlayer = slot[1]
	setClassAttributeToValue("piece","draggable","false") //set nothing to be draggable. If needed, we'll set somethings to be draggable
	clearMoveSelection()
	if(currentTurnPlayer == cardSlotPlayer) { // check that it's the right player's turn.
		if ("cardID" in currentMoveUI && currentMoveUI["cardID"] == document.getElementById(slot).innerText ){ 
			// If we're clicking on the same card, unselect
			delete currentMoveUI["cardID"]
			delete currentMoveUI["color"]
			updatePlayableCardStyles()
		} else {
			//clicking on a new card, unselect everything else, and select this one. 
			updatePlayableCardStyles(slot)
			currentMoveUI["cardID"] = document.getElementById(slot).innerText
			if (currentTurnPlayer == "R"){ // Red's turn
				setClassAttributeToValue("piece red","draggable","true")
				currentMoveUI["color"] = "R"
			}else{ // Blue's turn
				setClassAttributeToValue("piece blue","draggable","true")
				currentMoveUI["color"] = "B"

			}
			highlightDraggablePieces(currentTurnPlayer)
		}
	}
}

function bindBoardSquareClicks(){
	var squares = document.getElementsByClassName("boardSquare")
	for (let square of squares){
		square.onclick = selectTargetSquare
	}
}

function clearMoveSelection(){
	delete currentMoveUI["startLocation"]
	delete currentMoveUI["targetLocation"]
	setClassStyleValue("piece","outline","")
	setClassStyleValue("boardSquare","outline","")
}

function highlightDraggablePieces(color){
	var pieces = getColorPieceLocations(GameState, color)
	for (let pieceLocation of pieces){
		var square = document.getElementById("s"+pieceLocation)
		if (square && square.firstElementChild){
			square.firstElementChild.style.outline = "3px solid white"
		}
	}
}

function highlightLegalTargets(){
	setClassStyleValue("boardSquare","outline","")
	if (!("cardID" in currentMoveUI) || !("startLocation" in currentMoveUI)) return
	var lookUpString = currentMoveUI.color + "-" + currentMoveUI.cardID + "-" + currentMoveUI.startLocation
	var targetLocations = PrecomputedBoardMoves[lookUpString] || []
	for (let targetLocation of targetLocations){
		var move = {
			cardID: currentMoveUI.cardID,
			color: currentMoveUI.color,
			startLocation: currentMoveUI.startLocation,
			targetLocation: targetLocation
		}
		if (isLegal(GameState, move)){
			document.getElementById("s"+targetLocation).style.outline = "3px solid gold"
		}
	}
}

function selectPiece(ev){
	if (GameIsOver || !GameHasStarted || !PlayerCanMove || AIIsThinking || !("cardID" in currentMoveUI)) return
	var squareNum = getSquareNumFromElement(ev.target.parentElement)
	if (squareNum === null) return
	var piece = GameState[squareNum]
	var currentTurnPlayer = whosTurn(GameState)
	if (piece === "e") return
	ev.stopPropagation()
	if (!isPieceColor(piece, currentTurnPlayer)){
		if ("startLocation" in currentMoveUI){
			tryMoveToTarget(squareNum)
		}
		return
	}
	currentMoveUI["startLocation"] = squareNum
	setClassStyleValue("piece","outline","")
	ev.target.style.outline = "3px solid gold"
	highlightLegalTargets()
}

function selectTargetSquare(ev){
	if (GameIsOver || !GameHasStarted || !PlayerCanMove || AIIsThinking || !("startLocation" in currentMoveUI)) return
	var targetSquare = getSquareElementFromTarget(ev.target)
	if (!targetSquare) return
	tryMoveToTarget(getSquareNumFromElement(targetSquare))
}

function allowDrop(ev) {
	// This must always be true. 
	ev.preventDefault();
}

function drag(ev) {
	// fires when we start to move the piece. Let's see what it's legal moves are. 
	if (GameIsOver || !GameHasStarted || !PlayerCanMove || AIIsThinking || !("cardID" in currentMoveUI)) {
		ev.preventDefault()
		return
	}
	ev.dataTransfer.setData("text", ev.target.id)
	currentMoveUI["startLocation"] = getSquareNumFromElement(ev.target.parentElement)
	highlightLegalTargets()

}

function drop(ev) {
	ev.preventDefault();
	if (GameIsOver || !GameHasStarted || !PlayerCanMove || AIIsThinking) return
	var targetSquare = getSquareElementFromTarget(ev.target)
	if (!targetSquare) return
	tryMoveToTarget(getSquareNumFromElement(targetSquare))
}

function tryMoveToTarget(targetSpaceNum){
	currentMoveUI["targetLocation"] = targetSpaceNum
	if (isLegal(GameState,currentMoveUI)){// check for legal move
		var move = {
			cardID: currentMoveUI.cardID,
			color: currentMoveUI.color,
			startLocation: currentMoveUI.startLocation,
			targetLocation: currentMoveUI.targetLocation
		}
		doRealMove(GameState,move)
	} 
}

function doMoveUI(gameState,currentMoveUI){
	//Actually enact the move - also take care of the UI
	if(!PlayerCanMove) return gameState
	setClassAttributeToValue("piece","draggable","false")//set nothing to be draggable. If needed, we'll set somethings to be draggable
	setClassStyleValue("cardSlot","border-color","white")
}

function updateUI(gameState,move){
	placePieces(gameState)
	placeCards(gameState)
	colorlastSquare(GameHistory)
	currentMoveUI = {}
	updateTakeBackButton()
}



function isLegal(gameState,move){ //Check if a move made in the UI is legal
	if (!move || !("color" in move) || !("cardID" in move) || !("startLocation" in move) || !("targetLocation" in move)) return false
	if (move.color != whosTurn(gameState)) return false // can't move on the wrong turn
	var lookUpString = move.color + "-" + move.cardID + "-" + move.startLocation
	var boardLegal = PrecomputedBoardMoves[lookUpString] && PrecomputedBoardMoves[lookUpString].includes(move.targetLocation) //is it in the precomputed board moves
	if (!boardLegal) return false
	// Move is legal if it's to an empty space || to an enemy piece. 
	return (gameState[move.targetLocation] == "e" || !areSameCase(gameState[move.targetLocation],gameState[move.startLocation]))
	 
}


// UTILITY ************************************************************
function stringifyMove(move){
	if (Object.keys(move).length === 0) return "Empty Move"
	return move.color +"-"+move_dictionary[move.cardID].name +":"+  coordinatifySquareNumber(move.startLocation) +"-"+ coordinatifySquareNumber(move.targetLocation)
}

function coordinatifySquareNumber(n){
	return getDisplayFileForSquare(n).toLowerCase() + getDisplayRankForSquare(n)
}

function twoDigit(n){
	return n.toString().padStart(2,"0")
}

function getColorPieceLocations(gameState, color){
	// get a list of pawn locations. The first entry is always the master (if there is one)
	var locations =[]
	locations.push(gameState.indexOf(color =="R" ? "M":"m"))//Get the master of the appropriate color
	for(i=0;i<25;i++){
		if (gameState[i] == (color =="R" ? "P":"p")){ //get the index of the pawns of the appropriate color
			locations.push(i)
		}
	}
	return locations
}

function whosTurn(gameState){
	//returns "R" or "B" depending on who's turn it is
	return gameState.charAt(gameState.length - 1)
}


function getRedMoveCardIDs(gameState){
	var move0Index = gameState.substring(25,27) 
	var move1Index = gameState.substring(28,30)
	return [move0Index,move1Index]
}

function getCurrentTurnPlayersCardIDs(gameState){
	if (whosTurn(gameState) == "R"){
		return  getRedMoveCardIDs(gameState)
	}
	return getBlueMoveCardIDs(gameState)
}

function getBlueMoveCardIDs(gameState){
	var move2Index = gameState.substring(31,33)
	var move3Index = gameState.substring(34,36)
	return [move2Index,move3Index]
}

function getNeutralMoveCardID(gameState){
	return gameState.substring(37,39)
}

function getNow(){
	const d = new Date();
	return d.getTime();
}

String.prototype.isEmpty = function() {
    return (this.length === 0 || !this.trim());
};

function valuesAreEqual(array1,array2){
	return array1.every(i => array2.includes(i)) && array2.every(i => array1.includes(i));
}

function isUpperCase(letter){
	return letter.toUpperCase() === letter
}

function isLowerCase(letter){
	return letter.toUpperCase() !== letter
}

function areSameCase(letterA,letterB){
	return (isUpperCase(letterA) && isUpperCase(letterB)) || (isLowerCase(letterA) && isLowerCase(letterB))
}

function isPieceColor(piece, color){
	return color === "R" ? isUpperCase(piece) : isLowerCase(piece)
}

function getSquareElementFromTarget(target){
	if (!target) return null
	if (target.classList && target.classList.contains("boardSquare")) return target
	return target.parentElement && target.parentElement.classList && target.parentElement.classList.contains("boardSquare") ? target.parentElement : null
}

function getSquareNumFromElement(squareElement){
	if (!squareElement || !squareElement.id || !squareElement.id.startsWith("s")) return null
	return parseInt(squareElement.id.split("s")[1])
}

String.prototype.replaceAt = function(index, replacement) {
    return this.substring(0, index) + replacement + this.substring(index + replacement.length);
}

String.prototype.shuffle = function () {
    var a = this.split(""),
        n = a.length;

    for(var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a.join("");
}

String.prototype.countLetters = function(inputLetter) {
    return this.split(inputLetter).length -1;
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

//JQUERY REPLACEMENTS ***********************************
function removeElementsByClass(className){
    var elements = document.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}

function appendHtml(parentID, str) {
	var el = document.getElementById(parentID)
  	var div = document.createElement('div');
  	div.innerHTML = str;
  	while (div.children.length > 0) {
    	el.appendChild(div.children[0]);
  	}
}

function setClassStyleValue(classID,style,value){
	var elements = document.getElementsByClassName(classID)
	for (let element of elements){
		element.style[style] = value
	}
}

function setClassInnerText(classID,value){
	var elements = document.getElementsByClassName(classID)
	for (let element of elements){
		element.innerText = value
	}
}

function removeClassFromElements(classID,classToRemove){
	var elements = document.getElementsByClassName(classID)
	for (let element of elements){
		element.classList.remove(classToRemove)
	}
}

function setClassAttributeToValue(classID,attribute,value){
	var elements = document.getElementsByClassName(classID)
	for (let element of elements){
		element.setAttribute(attribute,value)
		if (attribute === "draggable"){
			element.draggable = value === "true"
		}
	}
}
