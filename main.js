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
var KnownMateEvaluation = null
var BackgroundSearchRequestId = 0
var BackgroundSearchActive = false
var BackgroundSearchTimer = null
var BackgroundSearchState = ""
var EvaluationBarCurrentTopPercent = 50
var EvaluationBarTargetTopPercent = 50
var EvaluationBarAnimationFrame = null

const STARTING_BOARD_STATE = "ppmpp" + "e".repeat(15) + "PPMPP";
const BOARD_LEFT = 500
const BOARD_TOP = 200
const SQUARE_SIZE = 100
const BOARD_BORDER_SIZE = 4
const EVAL_BAR_WIDTH = 28
const EVAL_BAR_SECTIONS = 20
const CARD_TOP = 25
const CARD_BOTTOM = 730
const CARD_LEFT_1 = 510
const CARD_LEFT_2 = 760
const NEUTRAL_LEFT = 220
const NEUTRAL_RIGHT = 1020
const NEUTRAL_TOP = 380
const MIN_SELECTED_CARDS = 5
const SELECTED_CARDS_COOKIE = "onitamaSelectedCards"
const PLAYER_COLOR_COOKIE = "onitamaPlayerColor"
const BACKGROUND_THINKING_TIME = 150
const BACKGROUND_THINKING_DELAY = 35
const EVAL_BAR_LERP_FACTOR = 0.16
const EVAL_BAR_LERP_EPSILON = 0.08
const CUSTOM_BOARD_LEFT = 260
const CUSTOM_CARD_LEFT_1 = 270
const CUSTOM_CARD_LEFT_2 = 520
const CUSTOM_NEUTRAL_LEFT = 20
const CUSTOM_NEUTRAL_TOP_1 = 300
const CUSTOM_NEUTRAL_TOP_2 = 470
const CUSTOM_CARD_PANEL_LEFT = 780
const CUSTOM_CARD_PANEL_TOP = 200
const CUSTOM_CARD_SLOT_IDS = ["pRc1","pRc2","pBc1","pBc2","neutralBlue","neutralRed"]
const CUSTOM_REQUIRED_CARD_SLOT_IDS = ["pRc1","pRc2","pBc1","pBc2"]
const CUSTOM_NEUTRAL_SLOT_IDS = ["neutralBlue","neutralRed"]




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
var CustomSetupActive = false
var CustomSetupBoardState = ""
var CustomSetupCards = {}
var CustomSelectedCardID = null
var CustomSelectedPieceSquare = null

// Logic flow ********************************************
function main(){
	setupStartMenu()
	if(startGameFromLaunchParams()) return
	showStartMenu()
}

function showStartMenu(){
	setCustomSetupMode(false)
	document.getElementById("gameArea").style.display = "none"
	document.getElementById("startMenu").style.display = "flex"
}

function goHome(){
	const homeMarker = "_______________________\n________HOME________\n_______________________"
	setTimeout(() => console.log(homeMarker), 0)
	ActiveAIRequestId += 1
	stopBackgroundSearch()
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

function playRandomMateIn(mateMoves){
	var matePlies = mateMovesToPlies(mateMoves)
	var mateRecords = getFilteredMateStartingStateRecordsForPlies(matePlies)
	if(!mateRecords.length){
		alert("No mate-in-" + mateMoves + " starting positions are loaded.")
		return
	}
	var selectedMate = mateRecords[Math.floor(Math.random() * mateRecords.length)].mateState
	startMatePuzzle(selectedMate, false)
}

function playSelectedMateIn(mateMoves){
	var selectedMate = getSelectedMateStartingState(mateMoves)
	if(!selectedMate) return
	startMatePuzzle(selectedMate, true)
}

function startMatePuzzle(selectedMate, playerHasMate){
	var startingPlayer = whosTurn(selectedMate.game_state)
	PlayerColor = playerHasMate ? startingPlayer : oppositeColor(startingPlayer)
	AIcolor = [oppositeColor(PlayerColor)]
	document.getElementById("startMenu").style.display = "none"
	document.getElementById("gameArea").style.display = "block"
	startGameFromState(selectedMate.game_state)
}

function mateMovesToPlies(mateMoves){
	return (2 * mateMoves) - 1
}

function getMateStartingStatesForPlies(matePlies){
	if(!Array.isArray(window.MATE_STARTING_STATES)) return []
	return window.MATE_STARTING_STATES.filter(function(mateState){
		return mateState
			&& mateState.mate_plies == matePlies
			&& isValidLaunchGameState(mateState.game_state)
	})
}

function getFilteredMateStartingStateRecordsForPlies(matePlies){
	if(!Array.isArray(window.MATE_STARTING_STATES)) return []
	var selectedCards = new Set(getSelectedCardIDsForMateFilter())
	var mateRecords = []
	for(let i = 0; i < window.MATE_STARTING_STATES.length; i++){
		var mateState = window.MATE_STARTING_STATES[i]
		if(!mateState || mateState.mate_plies != matePlies || !isValidLaunchGameState(mateState.game_state)) continue
		if(!getGameStateCardIDs(mateState.game_state).every(function(cardID){ return selectedCards.has(cardID) })) continue
		mateRecords.push({ index: i, mateState: mateState })
	}
	return mateRecords
}

function getGameStateCardIDs(gameState){
	return [
		gameState.substring(25,27),
		gameState.substring(28,30),
		gameState.substring(31,33),
		gameState.substring(34,36),
		gameState.substring(37,39)
	]
}

function startCustomSetup(){
	var selectedColor = document.getElementById("playerColor").value
	saveMenuPreferences()
	PlayerColor = selectedColor == "random" ? (Math.random() > 0.5 ? "R" : "B") : selectedColor
	AIcolor = [PlayerColor == "R" ? "B" : "R"]
	ActiveAIRequestId += 1
	stopBackgroundSearch()
	resetAIWorker("AI search cancelled.")
	AIIsThinking = false
	PlayerCanMove = false
	GameIsOver = false
	GameHasStarted = false
	currentMoveUI = {}
	GameHistory = createEmptyGameHistory()
	clearLatestAIEvaluation()
	ForcedMateShown = false
	ResignShown = false
	CustomSetupBoardState = STARTING_BOARD_STATE
	CustomSetupCards = createEmptyCustomCardSlots()
	CustomSelectedCardID = null
	CustomSelectedPieceSquare = null
	GameState = CustomSetupBoardState + "00-01-02-03-04XR"

	document.getElementById("startMenu").style.display = "none"
	document.getElementById("gameArea").style.display = "block"
	clearTransientGameUI()
	setCustomSetupMode(true)
	applyPlayerPerspective()
	positionCustomSetupLayout()
	bindBoardSquareClicks()
	placePieces(CustomSetupBoardState)
	renderCustomCardPicker()
	renderCustomCardSlots()
	showCustomBeginButton()
	updateTakeBackButton()
	updateSwitchSidesButton()
}

function setCustomSetupMode(isActive){
	CustomSetupActive = isActive
	var gameArea = document.getElementById("gameArea")
	if (gameArea){
		gameArea.classList.toggle("customSetupMode", isActive)
	}
	var customCardPanel = document.getElementById("customCardPanel")
	if (customCardPanel){
		customCardPanel.style.display = isActive ? "block" : "none"
	}
	if (!isActive){
		CustomSelectedCardID = null
		CustomSelectedPieceSquare = null
		hideCustomBeginButton()
	}
	updateSwitchSidesButton()
}

function positionCustomSetupLayout(){
	positionCustomBoardSquares()
	positionCustomEvaluationBar()
	positionCustomCardSlots()
	positionCustomCardPanel()
}

function positionCustomBoardSquares(){
	for(let squareNum=0;squareNum<25;squareNum++){
		const visualPosition = getVisualBoardPosition(squareNum)
		const square = document.getElementById("s"+squareNum)
		square.style.left = (CUSTOM_BOARD_LEFT + visualPosition.col*SQUARE_SIZE) + "px"
		square.style.top = (BOARD_TOP + visualPosition.row*SQUARE_SIZE) + "px"
	}
}

function positionCustomEvaluationBar(){
	const bar = getEvaluationBar()
	if (!bar) return
	bar.style.left = (CUSTOM_BOARD_LEFT - EVAL_BAR_WIDTH) + "px"
	bar.style.top = BOARD_TOP + "px"
	bar.style.height = (SQUARE_SIZE*5 + BOARD_BORDER_SIZE) + "px"
	bar.style.width = EVAL_BAR_WIDTH + "px"
}

function positionCustomCardSlots(){
	if (PlayerColor == "B"){
		setCardSlotPosition("pBc1", CARD_BOTTOM, CUSTOM_CARD_LEFT_1, "rotate(0deg)")
		setCardSlotPosition("pBc2", CARD_BOTTOM, CUSTOM_CARD_LEFT_2, "rotate(0deg)")
		setCardSlotPosition("pRc1", CARD_TOP, CUSTOM_CARD_LEFT_1, "rotate(180deg)")
		setCardSlotPosition("pRc2", CARD_TOP, CUSTOM_CARD_LEFT_2, "rotate(180deg)")
		setCardSlotPosition("neutralBlue", CUSTOM_NEUTRAL_TOP_1, CUSTOM_NEUTRAL_LEFT, "rotate(0deg)")
		setCardSlotPosition("neutralRed", CUSTOM_NEUTRAL_TOP_2, CUSTOM_NEUTRAL_LEFT, "rotate(180deg)")
	} else {
		setCardSlotPosition("pBc1", CARD_TOP, CUSTOM_CARD_LEFT_1, "rotate(180deg)")
		setCardSlotPosition("pBc2", CARD_TOP, CUSTOM_CARD_LEFT_2, "rotate(180deg)")
		setCardSlotPosition("pRc1", CARD_BOTTOM, CUSTOM_CARD_LEFT_1, "rotate(0deg)")
		setCardSlotPosition("pRc2", CARD_BOTTOM, CUSTOM_CARD_LEFT_2, "rotate(0deg)")
		setCardSlotPosition("neutralBlue", CUSTOM_NEUTRAL_TOP_1, CUSTOM_NEUTRAL_LEFT, "rotate(180deg)")
		setCardSlotPosition("neutralRed", CUSTOM_NEUTRAL_TOP_2, CUSTOM_NEUTRAL_LEFT, "rotate(0deg)")
	}
}

function positionCustomCardPanel(){
	var panel = document.getElementById("customCardPanel")
	if (!panel) return
	panel.style.left = CUSTOM_CARD_PANEL_LEFT + "px"
	panel.style.top = CUSTOM_CARD_PANEL_TOP + "px"
}

function createEmptyCustomCardSlots(){
	var slots = {}
	for (let slotID of CUSTOM_CARD_SLOT_IDS){
		slots[slotID] = null
	}
	return slots
}

function renderCustomCardPicker(){
	var cardPicker = document.getElementById("customCardPicker")
	if (!cardPicker) return
	cardPicker.innerHTML = ""
	for (let cardID of getAllCardIDs()){
		var cardButton = document.createElement("button")
		cardButton.type = "button"
		cardButton.className = "customCardChoice"
		cardButton.setAttribute("data-card-id", cardID)
		cardButton.style.backgroundImage = "url('images/" + move_dictionary[cardID].name + ".jpeg')"
		cardButton.onclick = function(){
			selectCustomCard(cardID)
		}

		var name = document.createElement("span")
		name.innerText = titleCase(move_dictionary[cardID].name)
		cardButton.appendChild(name)
		cardPicker.appendChild(cardButton)
	}
	updateCustomCardPickerStyles()
}

function selectCustomCard(cardID){
	if (!CustomSetupActive) return
	CustomSelectedCardID = CustomSelectedCardID == cardID ? null : cardID
	updateCustomCardPickerStyles()
}

function updateCustomCardPickerStyles(){
	var usedCards = new Set(getCustomSelectedGameCards())
	var cardButtons = document.querySelectorAll("#customCardPicker .customCardChoice")
	for (let cardButton of cardButtons){
		var cardID = cardButton.getAttribute("data-card-id")
		cardButton.classList.toggle("selected", cardID == CustomSelectedCardID)
		cardButton.classList.toggle("used", usedCards.has(cardID))
	}
}

function renderCustomCardSlots(){
	for (let slotID of CUSTOM_CARD_SLOT_IDS){
		var slot = document.getElementById(slotID)
		if (!slot) continue
		var cardID = CustomSetupCards[slotID]
		slot.style.backgroundImage = cardID ? "url('images/" + move_dictionary[cardID].name + ".jpeg')" : "none"
		slot.innerText = cardID || ""
		slot.style.borderColor = getCustomCardSlotBorderColor(slotID)
		slot.classList.toggle("customEmptySlot", !cardID)
		slot.classList.toggle("customFilledSlot", !!cardID)
	}
	updateCustomCardPickerStyles()
	updateCustomBeginButton()
}

function getCustomCardSlotBorderColor(slotID){
	if (slotID == "pRc1" || slotID == "pRc2") return "red"
	if (slotID == "pBc1" || slotID == "pBc2") return "blue"
	return "white"
}

function placeCustomCardInSlot(slotID){
	if (!CustomSetupActive) return
	if (!CustomSelectedCardID){
		if (CustomSetupCards[slotID]){
			CustomSelectedCardID = CustomSetupCards[slotID]
			CustomSetupCards[slotID] = null
			renderCustomCardSlots()
		}
		return
	}

	for (let existingSlotID of CUSTOM_CARD_SLOT_IDS){
		if (CustomSetupCards[existingSlotID] == CustomSelectedCardID){
			CustomSetupCards[existingSlotID] = null
		}
	}
	if (isCustomNeutralSlot(slotID)){
		for (let neutralSlotID of CUSTOM_NEUTRAL_SLOT_IDS){
			CustomSetupCards[neutralSlotID] = null
		}
	}
	CustomSetupCards[slotID] = CustomSelectedCardID
	CustomSelectedCardID = null
	renderCustomCardSlots()
}

function isCustomNeutralSlot(slotID){
	return CUSTOM_NEUTRAL_SLOT_IDS.includes(slotID)
}

function getCustomNeutralSlot(){
	for (let slotID of CUSTOM_NEUTRAL_SLOT_IDS){
		if (CustomSetupCards[slotID]) return slotID
	}
	return null
}

function getCustomSelectedGameCards(){
	var selectedCards = []
	for (let slotID of CUSTOM_REQUIRED_CARD_SLOT_IDS){
		if (CustomSetupCards[slotID]){
			selectedCards.push(CustomSetupCards[slotID])
		}
	}
	var neutralSlot = getCustomNeutralSlot()
	if (neutralSlot){
		selectedCards.push(CustomSetupCards[neutralSlot])
	}
	return selectedCards
}

function isCustomSetupReady(){
	for (let slotID of CUSTOM_REQUIRED_CARD_SLOT_IDS){
		if (!CustomSetupCards[slotID]) return false
	}
	var selectedCards = getCustomSelectedGameCards()
	return getCustomNeutralSlot() !== null && new Set(selectedCards).size == selectedCards.length
}

function showCustomBeginButton(){
	var board = document.getElementById("board")
	var beginButton = document.getElementById("customBeginButton")
	if (!beginButton){
		beginButton = document.createElement("button")
		beginButton.id = "customBeginButton"
		beginButton.type = "button"
		beginButton.innerText = "Begin"
		beginButton.onclick = beginCustomGame
		board.appendChild(beginButton)
	}
	beginButton.style.left = (CustomSetupActive ? Math.max(20, CUSTOM_BOARD_LEFT - 112) : BOARD_LEFT) + "px"
	beginButton.style.top = (BOARD_TOP - 56) + "px"
	beginButton.style.display = "block"
	updateCustomBeginButton()
}

function hideCustomBeginButton(){
	var beginButton = document.getElementById("customBeginButton")
	if (beginButton){
		beginButton.style.display = "none"
	}
}

function updateCustomBeginButton(){
	var beginButton = document.getElementById("customBeginButton")
	if (!beginButton) return
	beginButton.disabled = !isCustomSetupReady()
	beginButton.title = beginButton.disabled ? "Choose two red cards, two blue cards, and one neutral card." : "Use this setup."
}

function beginCustomGame(){
	if (!isCustomSetupReady()) return
	startGameFromState(buildCustomGameState())
}

function buildCustomGameState(){
	var neutralSlot = getCustomNeutralSlot()
	var firstTurn = neutralSlot == "neutralRed" ? "R" : "B"
	return CustomSetupBoardState
		+ CustomSetupCards["pRc1"] + "-"
		+ CustomSetupCards["pRc2"] + "-"
		+ CustomSetupCards["pBc1"] + "-"
		+ CustomSetupCards["pBc2"] + "-"
		+ CustomSetupCards[neutralSlot] + "X"
		+ firstTurn
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
	renderMatePuzzleControls()
}

function renderMatePuzzleControls(){
	var mateActions = document.getElementById("menuMateActions")
	if(!mateActions) return
	mateActions.innerHTML = ""
	var mateMoves = getAvailableMateMoveCounts()
	for(let mateMoveCount of mateMoves){
		var row = document.createElement("div")
		row.className = "matePuzzleRow"

		var label = document.createElement("label")
		label.className = "matePuzzleLabel"
		label.setAttribute("for", getMateSelectID(mateMoveCount))
		var mateRecords = getFilteredMateStartingStateRecordsForPlies(mateMovesToPlies(mateMoveCount))
		label.innerText = "Mate in " + mateMoveCount + " (" + mateRecords.length + ")"

		var select = document.createElement("select")
		select.id = getMateSelectID(mateMoveCount)
		select.className = "matePuzzleSelect"
		select.setAttribute("aria-label", "Mate in " + mateMoveCount + " puzzles")

		if(mateRecords.length){
			for(let i = 0; i < mateRecords.length; i++){
				var option = document.createElement("option")
				option.value = mateRecords[i].index
				option.innerText = formatMatePuzzleOption(mateRecords[i].mateState)
				option.style.color = getMatePuzzleOptionColor(mateRecords[i].mateState)
				select.appendChild(option)
			}
			updateMatePuzzleSelectColor(select)
			select.addEventListener("change", function(){
				updateMatePuzzleSelectColor(select)
			})
		} else {
			var emptyOption = document.createElement("option")
			emptyOption.value = ""
			emptyOption.innerText = ""
			select.appendChild(emptyOption)
			select.disabled = true
		}

		var goButton = document.createElement("button")
		goButton.type = "button"
		goButton.innerText = "Go"
		goButton.disabled = !mateRecords.length
		goButton.addEventListener("click", function(){
			playSelectedMateIn(mateMoveCount)
		})

		var randomButton = document.createElement("button")
		randomButton.type = "button"
		randomButton.innerText = "Random"
		randomButton.disabled = !mateRecords.length
		randomButton.addEventListener("click", function(){
			playRandomMateIn(mateMoveCount)
		})

		row.appendChild(label)
		row.appendChild(select)
		row.appendChild(goButton)
		row.appendChild(randomButton)
		mateActions.appendChild(row)
	}
}

function getMateSelectID(mateMoveCount){
	return "mateSelect" + mateMoveCount
}

function getSelectedMateStartingState(mateMoves){
	var select = document.getElementById(getMateSelectID(mateMoves))
	if(!select || select.value === "") return null
	var selectedIndex = Number(select.value)
	if(!Number.isInteger(selectedIndex)) return null
	var mateRecords = getFilteredMateStartingStateRecordsForPlies(mateMovesToPlies(mateMoves))
	for(let mateRecord of mateRecords){
		if(mateRecord.index == selectedIndex){
			return mateRecord.mateState
		}
	}
	return null
}

function formatMatePuzzleOption(mateState){
	var gameState = mateState.game_state
	var cardNames = getGameStateCardIDs(gameState).map(function(cardID){
		return titleCase(move_dictionary[cardID].name)
	})
	return cardNames.join(", ")
}

function getMatePuzzleOptionColor(mateState){
	return whosTurn(mateState.game_state) == "R" ? "red" : "blue"
}

function updateMatePuzzleSelectColor(select){
	var selectedOption = select.options[select.selectedIndex]
	select.style.color = selectedOption ? selectedOption.style.color : ""
}

function getAvailableMateMoveCounts(){
	if(!Array.isArray(window.MATE_STARTING_STATES)) return []
	var available = new Set()
	for(let mateState of window.MATE_STARTING_STATES){
		if(!mateState || !isValidLaunchGameState(mateState.game_state)) continue
		var matePlies = Number(mateState.mate_plies)
		if(!Number.isFinite(matePlies) || matePlies <= 0) continue
		available.add(matePliesToMoves(matePlies))
	}
	return Array.from(available).sort((a,b) => a - b)
}

function renderCardPicker(selectedCardIDs){
	var cardPicker = document.getElementById("cardPicker")
	cardPicker.innerHTML = ""
	var selectedCards = new Set(selectedCardIDs)
	for (let cardID of getAllCardIDsByName()){
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
	renderMatePuzzleControls()
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

function getSelectedCardIDsForMateFilter(){
	var checkedCardIDs = getCheckedCardIDs()
	return checkedCardIDs.length ? checkedCardIDs : loadSelectedCardIDs()
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

function getAllCardIDsByName(){
	return getAllCardIDs().sort(function(a,b){
		return move_dictionary[a].name.localeCompare(move_dictionary[b].name)
	})
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
	setLatestAIEvaluation(evalMove)
	return evalMove
}

function maybeStartBackgroundSearch(){
	if(!shouldRunBackgroundSearch()){
		stopBackgroundSearch()
		return
	}
	if(BackgroundSearchActive && BackgroundSearchState == GameState) return
	BackgroundSearchRequestId += 1
	BackgroundSearchActive = true
	BackgroundSearchState = GameState
	scheduleBackgroundSearch(BACKGROUND_THINKING_DELAY)
}

function shouldRunBackgroundSearch(){
	return GameHasStarted
		&& !GameIsOver
		&& !AIIsThinking
		&& !CustomSetupActive
		&& typeof Worker !== "undefined"
		&& !AIcolor.includes(whosTurn(GameState))
}

function scheduleBackgroundSearch(delayMs){
	clearBackgroundSearchTimer()
	BackgroundSearchTimer = setTimeout(runBackgroundSearchChunk, delayMs)
}

function clearBackgroundSearchTimer(){
	if(BackgroundSearchTimer){
		clearTimeout(BackgroundSearchTimer)
		BackgroundSearchTimer = null
	}
}

function stopBackgroundSearch(){
	BackgroundSearchRequestId += 1
	BackgroundSearchActive = false
	BackgroundSearchState = ""
	clearBackgroundSearchTimer()
}

function runBackgroundSearchChunk(){
	clearBackgroundSearchTimer()
	if(!shouldRunBackgroundSearch()){
		stopBackgroundSearch()
		return
	}
	const requestId = BackgroundSearchRequestId
	const state = GameState
	const color = whosTurn(state)
	BackgroundSearchState = state
	getAIMoveInWorker(state, color, {
		mode: "background",
		maxThinkingTime: BACKGROUND_THINKING_TIME,
		emitProgress: true,
		onProgress: function(progress){
			if(requestId != BackgroundSearchRequestId || state != GameState || !shouldRunBackgroundSearch()) return
			setLatestAIEvaluation(progress.evalMove)
		}
	}).then((result) => {
		if(requestId != BackgroundSearchRequestId || state != GameState || !shouldRunBackgroundSearch()) return
		setLatestAIEvaluation(result.evalMove)
		scheduleBackgroundSearch(BACKGROUND_THINKING_DELAY)
	}).catch((error) => {
		if(requestId != BackgroundSearchRequestId) return
		console.warn("Background AI search paused.", error)
		stopBackgroundSearch()
	})
}

function doAIMove(gameState,color){
	const requestId = ++ActiveAIRequestId
	stopBackgroundSearch()
	PlayerCanMove = false
	AIIsThinking = true
	updateAIThinkingIndicator(color)
	console.log("Thinking about move...")
	setTimeout(() => {
		getAIMoveInWorker(gameState,color, {
			mode: "move",
			maxThinkingTime: MaxThinkingTime,
			emitProgress: true,
			onProgress: function(progress){
				if(requestId != ActiveAIRequestId || gameState != GameState || whosTurn(GameState) != color) return
				setLatestAIEvaluation(progress.evalMove)
			}
		}).then((result) => {
			if(requestId != ActiveAIRequestId || gameState != GameState || whosTurn(GameState) != color) return
			AIIsThinking = false
			updateAIThinkingIndicator(color)
			PlayerCanMove = true
			AImovesEvaluated = result.nodes
			GreatestDepthSearched = result.depth
			logAIMoveResult(result.evalMove, color, result.nodes, result.depth, result.thinkingTime, result.ttStats)
			doRealMove(GameState, result.evalMove.m)
		}).catch((error) => {
			if(requestId != ActiveAIRequestId || gameState != GameState || whosTurn(GameState) != color) return
			console.warn("AI worker failed; using quick fallback move.", error)
			AIIsThinking = false
			updateAIThinkingIndicator(color)
			PlayerCanMove = true
			const fallbackMove = getFallbackMove(GameState)
			doRealMove(GameState, fallbackMove.m)
		})
	},100)

}

function logAIMoveResult(evalMove, color, nodes, depth, thinkingTime, ttStats=null){
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
	if(ttStats && ttStats.probes){
		const hitRate = Math.round((ttStats.hits / ttStats.probes) * 1000) / 10
		console.log("TT hits: "+ttStats.hits+"/"+ttStats.probes+" ("+hitRate+"%), TT cutoffs: "+ttStats.ttCutoffs+", search cutoffs: "+ttStats.searchCutoffs+", stores: "+ttStats.stores)
	}
}

function getAIMoveInWorker(gameState,color,options={}){
	return new Promise((resolve,reject) => {
		if(typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined"){
			reject("Web Workers are not available in this browser.")
			return
		}
		const worker = getAIWorker()
		const messageId = ++AIWorkerMessageId
		AIWorkerRequests[messageId] = {resolve: resolve, reject: reject, onProgress: options.onProgress}
		worker.postMessage({
			id: messageId,
			type: "search",
			mode: options.mode || "move",
			gameState: gameState,
			color: color,
			maxThinkingTime: options.maxThinkingTime || MaxThinkingTime,
			emitProgress: options.emitProgress === true,
			ttKey: getCurrentSearchKey()
		})
	})
}

function getCurrentSearchKey(){
	return GameHistory && GameHistory.gameStart ? GameHistory.gameStart : GameState
}

function getAIWorker(){
	if(AIWorker) return AIWorker
	AIWorkerUrl = URL.createObjectURL(new Blob([buildAIWorkerScript()], {type: "text/javascript"}))
	AIWorker = new Worker(AIWorkerUrl)
	AIWorker.onmessage = (event) => {
		const request = AIWorkerRequests[event.data.id]
		if(!request) return
		if(event.data.type == "progress"){
			if(request.onProgress) request.onProgress(event.data)
			return
		}
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
	stopBackgroundSearch()
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

function getFastSearchWorkerFunctions(){
	return [
		getNow,
		whosTurn,
		twoDigit,
		getEvalMove,
		isWinningScoreForColor,
		isLosingScoreForColor,
		timeBasedMinMax,
		continueTimeBasedMinMax,
		fastSearchRoot,
		getSharedFastTT,
		getSharedFastSearchSession,
		createFastSearchSession,
		createFastSearchMemory,
		createFastSearchState,
		createFastStartingSearchFromCards,
		createFastSearch,
		createFastTranspositionTable,
		createFastTTStats,
		fastCloneTTStats,
		ensureFastSearchTables,
		createFastPieceTables,
		createFastZobrist,
		createFastCardSwapHashes,
		fastAlphaBeta,
		fastTTIndex,
		fastTTProbe,
		fastTTStore,
		fastNormalizeTTScoreForStore,
		fastNormalizeTTScoreForProbe,
		fastProbeRootResult,
		fastStorePrincipalVariation,
		fastFallbackSearch,
		fastGenerateLegalMoves,
		fastOrderMoves,
		fastMoveListContains,
		fastMoveHeuristic,
		fastRecordCutoff,
		fastTerminalMoveScore,
		fastMakeMove,
		fastUnmakeMove,
		fastBitIndex,
		fastPieceAt,
		fastAddPieceStatsByIndex,
		fastRemovePieceStatsByIndex,
		fastAddPieceStats,
		fastRemovePieceStats,
		fastTerminalScore,
		fastStaticEvaluation,
		fastResultToEval,
		fastDisplayScore,
		fastEncodeMove,
		fastMoveTableKey,
		fastMoveSlot,
		fastMoveStart,
		fastMoveTarget,
		fastDecodeMove,
		fastGetCard,
		fastHashKey,
		fastXorPieceIndex,
		fastXorPiece,
		fastXorCard,
		fastXorTurn,
		fastCardSwapKey,
		fastPieceIndex,
		fastPieceFromChar,
		isFastMateScore
	]
}

function buildFastSearchWorkerPrelude(){
	const workerFunctions = getFastSearchWorkerFunctions().map((fn) => fn.toString()).join("\n\n")
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
		const FAST_BOARD_MASK = ${FAST_BOARD_MASK};
		const FAST_EVAL_SCALE = ${FAST_EVAL_SCALE};
		const FAST_ASPIRATION_WINDOW = ${FAST_ASPIRATION_WINDOW};
		const FAST_PVS_WINDOW = ${FAST_PVS_WINDOW};
		const FAST_TT_BITS = ${FAST_TT_BITS};
		const FAST_TT_SIZE = ${FAST_TT_SIZE};
		const FAST_TT_BUCKET_SIZE = ${FAST_TT_BUCKET_SIZE};
		const FAST_TT_BUCKET_MASK = ${FAST_TT_BUCKET_MASK};
		const FAST_HISTORY_SIZE = ${FAST_HISTORY_SIZE};
		const FAST_HISTORY_MAX = ${FAST_HISTORY_MAX};
		const FAST_KILLER_SCORE = ${FAST_KILLER_SCORE};
		const FAST_MAX_MOVES = ${FAST_MAX_MOVES};
		const FAST_MAX_PLY = ${FAST_MAX_PLY};
		const FAST_MOVE_META_SIZE = ${FAST_MOVE_META_SIZE};
		const FAST_MOVE_TABLE_SIZE = ${FAST_MOVE_TABLE_SIZE};
		const FAST_CARD_MASK = ${FAST_CARD_MASK};
		const FAST_TIME_CHECK_MASK = ${FAST_TIME_CHECK_MASK};
		var FastEncodedMoveList = null;
		var FastMoveOffsetTable = null;
		var FastMoveCountTable = null;
		var FastMoveSlotTable = null;
		var FastMoveStartTable = null;
		var FastMoveTargetTable = null;
		var FastMoveStartBitTable = null;
		var FastMoveTargetBitTable = null;
		var FastCardSwapHashA = null;
		var FastCardSwapHashB = null;
		var FastPieceIsRed = null;
		var FastPieceIsMaster = null;
		var FastPieceRedPawnDelta = null;
		var FastPieceBluePawnDelta = null;
		var FastPieceRedCenterDelta = null;
		var FastPieceBlueCenterDelta = null;
		var FastZobrist = null;
		var FastCenterTable = null;
		var FastSharedTT = null;
		var FastSharedTTKey = null;
		var FastSharedSearchMemory = null;
		var FastSharedSearchSession = null;
		var move_dictionary = ${JSON.stringify(move_dictionary)};
		String.prototype.countLetters = function(inputLetter) {
			return this.split(inputLetter).length -1;
		};
		${workerFunctions}
		ensureFastSearchTables();
	`
}

function buildAIWorkerScript(){
	return `
		${buildFastSearchWorkerPrelude()}
		self.onmessage = function(event){
			try {
				MaxThinkingTime = event.data.maxThinkingTime;
				AImovesEvaluated = 0;
				GreatestDepthSearched = 0;
				const thinkingStartTime = getNow();
				const sharedSession = getSharedFastSearchSession(event.data.ttKey || "default", event.data.gameState);
				const progressCallback = event.data.emitProgress ? function(progress){
					self.postMessage({
						id: event.data.id,
						type: "progress",
						evalMove: progress.evalMove,
						nodes: progress.nodes,
						depth: progress.depth,
						completedDepth: progress.completedDepth,
						thinkingTime: progress.thinkingTime,
						ttStats: progress.ttStats
					});
				} : null;
				const evalMove = continueTimeBasedMinMax(event.data.gameState, thinkingStartTime, event.data.color, sharedSession, progressCallback);
				self.postMessage({
					id: event.data.id,
					type: "done",
					evalMove: evalMove,
					nodes: AImovesEvaluated,
					depth: evalMove.searchDepth || GreatestDepthSearched,
					maxPly: GreatestDepthSearched,
					completedDepth: evalMove.searchDepth || sharedSession.completedDepth || 0,
					thinkingTime: (getNow() - thinkingStartTime) / 1000,
					ttStats: fastCloneTTStats(sharedSession.tt)
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
	setCustomSetupMode(false)
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
	updateSwitchSidesButton()
	var thisGameMoveSets = getThisGameCardsMoveSet(move_dictionary, GameState) // Filter down all possible moves to just the cards in this game
	precomputeOnBoardMoves(thisGameMoveSets)
}

function startBoardGame(){
	if (GameIsOver || GameHasStarted) return
	GameHasStarted = true
	PlayerCanMove = !AIcolor.includes(whosTurn(GameState))
	hideBoardStartButton()
	updateTakeBackButton()
	updateSwitchSidesButton()
	if(AIcolor.includes(whosTurn(GameState))){ // If its the AI's turn (and there is an AI) the AI makes a move.
		console.log("Starting game with AI...")
		doAIMove(GameState,whosTurn(GameState))
	} else {
		maybeStartBackgroundSearch()
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
	maybeStartBackgroundSearch()
	console.log("Took back to "+GameHistory.moveHistory.length+" plies.")
}

function switchSides(){
	if(CustomSetupActive) return
	const oldPlayerColor = PlayerColor
	ActiveAIRequestId += 1
	resetAIWorker("AI search cancelled.")
	AIIsThinking = false
	currentMoveUI = {}
	PlayerColor = oppositeColor(PlayerColor)
	AIcolor = [oldPlayerColor]
	PlayerCanMove = GameHasStarted && !GameIsOver && !AIcolor.includes(whosTurn(GameState))
	setCookie(PLAYER_COLOR_COOKIE, PlayerColor)
	applyPlayerPerspective()
	updateUI(GameState)
	updateSwitchSidesButton()
	if(!GameHasStarted || GameIsOver) return
	if(AIcolor.includes(whosTurn(GameState))){
		doAIMove(GameState, whosTurn(GameState))
	} else {
		maybeStartBackgroundSearch()
	}
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
const FAST_BOARD_MASK = (1 << 25) - 1
const FAST_EVAL_SCALE = 8
const FAST_ASPIRATION_WINDOW = 8 * FAST_EVAL_SCALE
const FAST_PVS_WINDOW = 1
const FAST_TT_BITS = 20
const FAST_TT_SIZE = 1 << FAST_TT_BITS
const FAST_TT_BUCKET_SIZE = 2
const FAST_TT_BUCKET_MASK = (FAST_TT_SIZE / FAST_TT_BUCKET_SIZE) - 1
const FAST_HISTORY_SIZE = 1 << 13
const FAST_HISTORY_MAX = 7000
const FAST_KILLER_SCORE = 8000
const FAST_MAX_MOVES = 128
const FAST_MAX_PLY = 128
const FAST_MOVE_META_SIZE = 8192
const FAST_MOVE_TABLE_SIZE = 5 * 2 * 32 * 25
const FAST_CARD_MASK = 31
const FAST_TIME_CHECK_MASK = 4095
var FastEncodedMoveList = null
var FastMoveOffsetTable = null
var FastMoveCountTable = null
var FastMoveSlotTable = null
var FastMoveStartTable = null
var FastMoveTargetTable = null
var FastMoveStartBitTable = null
var FastMoveTargetBitTable = null
var FastCardSwapHashA = null
var FastCardSwapHashB = null
var FastPieceIsRed = null
var FastPieceIsMaster = null
var FastPieceRedPawnDelta = null
var FastPieceBluePawnDelta = null
var FastPieceRedCenterDelta = null
var FastPieceBlueCenterDelta = null
var FastZobrist = null
var FastCenterTable = null
var FastSharedTT = null
var FastSharedTTKey = null
var FastSharedSearchMemory = null
var FastSharedSearchSession = null

function timeBasedMinMax(gameState, thinkingStartTime, color, transpositionTable=null, progressCallback=null){
	const searchMemory = createFastSearchMemory()
	const session = createFastSearchSession("standalone|" + gameState, gameState, transpositionTable || createFastTranspositionTable(), searchMemory)
	return continueTimeBasedMinMax(gameState, thinkingStartTime, color, session, progressCallback)
}

function continueTimeBasedMinMax(gameState, thinkingStartTime, color, session, progressCallback=null){
	// Iterative deepening over a compact, mutable search state.
	EvaluatedStates = {}
	StatesMovesLists = {}
	AImovesEvaluated = 0
	GreatestDepthSearched = 0
	if(!session.search || session.gameState != gameState){
		session.gameState = gameState
		session.search = createFastSearch(gameState, thinkingStartTime, session.tt, session)
		const rootResult = fastProbeRootResult(session.search)
		if(rootResult && rootResult.exact && rootResult.depth > 0){
			session.completedDepth = rootResult.depth
			session.previousScore = rootResult.score
			session.rootMove = rootResult.move
			session.bestResult = rootResult
			session.search.rootMove = rootResult.move
			fastStorePrincipalVariation(session.search, rootResult.depth)
			session.previousPv = session.search.previousPv
			session.previousPvLength = session.search.previousPvLength
			session.bestEvalMove = fastResultToEval(session.search, rootResult)
			session.bestEvalMove.searchDepth = rootResult.depth
			session.depthsBestMove[rootResult.depth] = session.bestEvalMove
		}
	} else {
		session.search.thinkingStartTime = thinkingStartTime
	}
	const search = session.search
	search.thinkingStartTime = thinkingStartTime
	var evalMove = session.bestEvalMove || fastResultToEval(search, fastFallbackSearch(search))
	if(session.completedDepth > 0 && !evalMove.searchDepth) evalMove.searchDepth = session.completedDepth
	var depthRemaining = session.completedDepth || 0
	var previousScore = session.previousScore
	while(getNow() - thinkingStartTime < MaxThinkingTime){
		depthRemaining++
		const thisResult = fastSearchRoot(search, depthRemaining, previousScore)
		if(thisResult.timedOut || getNow() - thinkingStartTime >= MaxThinkingTime) break
		previousScore = thisResult.score
		search.rootMove = thisResult.move
		session.rootMove = thisResult.move
		fastStorePrincipalVariation(search, depthRemaining)
		session.previousPv = search.previousPv
		session.previousPvLength = search.previousPvLength
		evalMove = fastResultToEval(search, thisResult)
		evalMove.searchDepth = depthRemaining
		session.completedDepth = depthRemaining
		session.previousScore = previousScore
		session.bestResult = thisResult
		session.bestEvalMove = evalMove
		session.depthsBestMove[depthRemaining] = evalMove
		if(progressCallback){
			progressCallback({
				evalMove: evalMove,
				nodes: AImovesEvaluated,
				depth: depthRemaining,
				completedDepth: depthRemaining,
				thinkingTime: (getNow() - thinkingStartTime) / 1000,
				ttStats: fastCloneTTStats(search.tt)
			})
		}
		if(evalMove.exact && isWinningScoreForColor(evalMove.e, color)){
			console.log(("Forced mate in "+(evalMove.d)+" plies."))
			break
		} else if (evalMove.exact && isLosingScoreForColor(evalMove.e, color)){
			if(depthRemaining > 1){
				console.log("Forced loss in "+(evalMove.d)+" plies.")
				const forcedLossEvalMove = evalMove
				evalMove = session.depthsBestMove[depthRemaining-1] || evalMove
				if(evalMove) evalMove.latestEvaluation = forcedLossEvalMove
				session.bestEvalMove = evalMove
				break
			}
		}
	}
	console.log("Greatest Depth Searched: "+(GreatestDepthSearched))
	return evalMove
}

function getSharedFastTT(ttKey){
	if(!FastSharedTT || FastSharedTTKey != ttKey){
		FastSharedTT = createFastTranspositionTable()
		FastSharedTTKey = ttKey
		FastSharedSearchMemory = createFastSearchMemory()
		FastSharedSearchSession = null
	}
	return FastSharedTT
}

function getSharedFastSearchSession(ttKey, gameState){
	const tt = getSharedFastTT(ttKey)
	if(!FastSharedSearchMemory) FastSharedSearchMemory = createFastSearchMemory()
	const sessionKey = ttKey + "|" + gameState
	if(!FastSharedSearchSession || FastSharedSearchSession.key != sessionKey){
		FastSharedSearchSession = createFastSearchSession(sessionKey, gameState, tt, FastSharedSearchMemory)
	}
	return FastSharedSearchSession
}

function createFastSearchSession(key, gameState, transpositionTable, searchMemory){
	const memory = searchMemory || createFastSearchMemory()
	return {
		key: key,
		gameState: gameState,
		tt: transpositionTable,
		search: null,
		completedDepth: 0,
		previousScore: null,
		bestResult: null,
		bestEvalMove: null,
		rootMove: 0,
		previousPv: memory.previousPv,
		previousPvLength: 0,
		depthsBestMove: {},
		killerOne: memory.killerOne,
		killerTwo: memory.killerTwo,
		history: memory.history
	}
}

function createFastSearchMemory(){
	return {
		killerOne: new Uint16Array(FAST_MAX_PLY),
		killerTwo: new Uint16Array(FAST_MAX_PLY),
		history: new Int32Array(FAST_HISTORY_SIZE * 2),
		previousPv: new Uint16Array(FAST_MAX_PLY),
		moveBuffers: [],
		moveScoreBuffers: [],
		moveCounts: [],
		quietMoveBuffers: [],
		undoCardBits: new Uint32Array(FAST_MAX_PLY),
		undoOldTurn: new Int8Array(FAST_MAX_PLY),
		undoHashA: new Uint32Array(FAST_MAX_PLY),
		undoHashB: new Uint32Array(FAST_MAX_PLY),
		undoOccupiedMask: new Uint32Array(FAST_MAX_PLY),
		undoRedMask: new Uint32Array(FAST_MAX_PLY),
		undoMasterMask: new Uint32Array(FAST_MAX_PLY),
		undoRedPawnsCount: new Int8Array(FAST_MAX_PLY),
		undoBluePawnsCount: new Int8Array(FAST_MAX_PLY),
		undoRedMasterPos: new Int8Array(FAST_MAX_PLY),
		undoBlueMasterPos: new Int8Array(FAST_MAX_PLY),
		undoRedCenterControl: new Int8Array(FAST_MAX_PLY),
		undoBlueCenterControl: new Int8Array(FAST_MAX_PLY)
	}
}

function minmaxMoveFind(gameState,depthRemaining,depth,rBest,bBest,thinkingStartTime){
	const search = createFastSearch(gameState, thinkingStartTime)
	const result = fastAlphaBeta(search, depthRemaining, rBest, bBest, depth)
	return fastResultToEval(search, result)
}

function fastSearchRoot(search, depthRemaining, previousScore){
	const fullAlpha = -FAST_MATE_SCORE - 1
	const fullBeta = FAST_MATE_SCORE + 1
	if(!search.mateOnly && previousScore !== null && !isFastMateScore(previousScore)){
		const alpha = Math.max(fullAlpha, previousScore - FAST_ASPIRATION_WINDOW)
		const beta = Math.min(fullBeta, previousScore + FAST_ASPIRATION_WINDOW)
		const aspirationResult = fastAlphaBeta(search, depthRemaining, alpha, beta, 0)
		if(aspirationResult.timedOut) return aspirationResult
		if(aspirationResult.score > alpha && aspirationResult.score < beta){
			return aspirationResult
		}
	}
	return fastAlphaBeta(search, depthRemaining, fullAlpha, fullBeta, 0)
}

function createFastSearchState(turn, thinkingStartTime, transpositionTable=null, searchMemory=null){
	ensureFastSearchTables()
	const memory = searchMemory || {}
	return {
		cardBits: 0,
		turn: turn,
		hashA: 0,
		hashB: 0,
		occupiedMask: 0,
		redMask: 0,
		masterMask: 0,
		tt: transpositionTable || createFastTranspositionTable(),
		moveBuffers: memory.moveBuffers || [],
		moveScoreBuffers: memory.moveScoreBuffers || [],
		moveCounts: memory.moveCounts || [],
		quietMoveBuffers: memory.quietMoveBuffers || [],
		rootMove: memory.rootMove || 0,
		previousPv: memory.previousPv || new Uint16Array(FAST_MAX_PLY),
		previousPvLength: memory.previousPvLength || 0,
		killerOne: memory.killerOne || new Uint16Array(FAST_MAX_PLY),
		killerTwo: memory.killerTwo || new Uint16Array(FAST_MAX_PLY),
		history: memory.history || new Int32Array(FAST_HISTORY_SIZE * 2),
		undoCardBits: memory.undoCardBits || new Uint32Array(FAST_MAX_PLY),
		undoOldTurn: memory.undoOldTurn || new Int8Array(FAST_MAX_PLY),
		undoHashA: memory.undoHashA || new Uint32Array(FAST_MAX_PLY),
		undoHashB: memory.undoHashB || new Uint32Array(FAST_MAX_PLY),
		undoOccupiedMask: memory.undoOccupiedMask || new Uint32Array(FAST_MAX_PLY),
		undoRedMask: memory.undoRedMask || new Uint32Array(FAST_MAX_PLY),
		undoMasterMask: memory.undoMasterMask || new Uint32Array(FAST_MAX_PLY),
		undoRedPawnsCount: memory.undoRedPawnsCount || new Int8Array(FAST_MAX_PLY),
		undoBluePawnsCount: memory.undoBluePawnsCount || new Int8Array(FAST_MAX_PLY),
		undoRedMasterPos: memory.undoRedMasterPos || new Int8Array(FAST_MAX_PLY),
		undoBlueMasterPos: memory.undoBlueMasterPos || new Int8Array(FAST_MAX_PLY),
		undoRedCenterControl: memory.undoRedCenterControl || new Int8Array(FAST_MAX_PLY),
		undoBlueCenterControl: memory.undoBlueCenterControl || new Int8Array(FAST_MAX_PLY),
		redPawnsCount: 0,
		bluePawnsCount: 0,
		redMasterPos: -1,
		blueMasterPos: -1,
		redCenterControl: 0,
		blueCenterControl: 0,
		mateOnly: memory.mateOnly === true,
		thinkingStartTime: thinkingStartTime
	}
}

function createFastStartingSearchFromCards(redCard0, redCard1, blueCard0, blueCard1, neutralCard, turn, transpositionTable=null, searchMemory=null, thinkingStartTime=null){
	const search = createFastSearchState(turn == "R" ? FAST_RED : FAST_BLUE, thinkingStartTime === null ? getNow() : thinkingStartTime, transpositionTable, searchMemory)
	fastAddPieceStats(search, 0, FAST_BLUE_PAWN)
	fastXorPiece(search, 0, FAST_BLUE_PAWN)
	fastAddPieceStats(search, 1, FAST_BLUE_PAWN)
	fastXorPiece(search, 1, FAST_BLUE_PAWN)
	fastAddPieceStats(search, 2, FAST_BLUE_MASTER)
	fastXorPiece(search, 2, FAST_BLUE_MASTER)
	fastAddPieceStats(search, 3, FAST_BLUE_PAWN)
	fastXorPiece(search, 3, FAST_BLUE_PAWN)
	fastAddPieceStats(search, 4, FAST_BLUE_PAWN)
	fastXorPiece(search, 4, FAST_BLUE_PAWN)
	fastAddPieceStats(search, 20, FAST_RED_PAWN)
	fastXorPiece(search, 20, FAST_RED_PAWN)
	fastAddPieceStats(search, 21, FAST_RED_PAWN)
	fastXorPiece(search, 21, FAST_RED_PAWN)
	fastAddPieceStats(search, 22, FAST_RED_MASTER)
	fastXorPiece(search, 22, FAST_RED_MASTER)
	fastAddPieceStats(search, 23, FAST_RED_PAWN)
	fastXorPiece(search, 23, FAST_RED_PAWN)
	fastAddPieceStats(search, 24, FAST_RED_PAWN)
	fastXorPiece(search, 24, FAST_RED_PAWN)
	search.cardBits = (redCard0 | (redCard1 << 5) | (blueCard0 << 10) | (blueCard1 << 15) | (neutralCard << 20)) >>> 0
	for(let i=0;i<5;i++){
		fastXorCard(search, i, fastGetCard(search.cardBits, i))
	}
	fastXorTurn(search, search.turn)
	return search
}

function createFastSearch(gameState, thinkingStartTime, transpositionTable=null, searchMemory=null){
	const search = createFastSearchState(whosTurn(gameState) == "R" ? FAST_RED : FAST_BLUE, thinkingStartTime, transpositionTable, searchMemory)
	for(let i=0;i<25;i++){
		const piece = fastPieceFromChar(gameState[i])
		fastAddPieceStats(search, i, piece)
		fastXorPiece(search, i, piece)
	}
	const card0 = parseInt(gameState.substring(25,27))
	const card1 = parseInt(gameState.substring(28,30))
	const card2 = parseInt(gameState.substring(31,33))
	const card3 = parseInt(gameState.substring(34,36))
	const card4 = parseInt(gameState.substring(37,39))
	search.cardBits = (card0 | (card1 << 5) | (card2 << 10) | (card3 << 15) | (card4 << 20)) >>> 0
	for(let i=0;i<5;i++){
		fastXorCard(search, i, fastGetCard(search.cardBits, i))
	}
	fastXorTurn(search, search.turn)
	return search
}

function createFastTranspositionTable(){
	return {
		hashA: new Uint32Array(FAST_TT_SIZE),
		hashB: new Uint32Array(FAST_TT_SIZE),
		depth: new Int16Array(FAST_TT_SIZE),
		score: new Int32Array(FAST_TT_SIZE),
		flag: new Int8Array(FAST_TT_SIZE),
		move: new Uint16Array(FAST_TT_SIZE),
		stats: createFastTTStats()
	}
}

function createFastTTStats(){
	return {
		probes: 0,
		hits: 0,
		exactHits: 0,
		boundHits: 0,
		ttCutoffs: 0,
		searchCutoffs: 0,
		storeRequests: 0,
		stores: 0,
		emptyStores: 0,
		overwrites: 0,
		collisions: 0,
		rejectedStores: 0
	}
}

function fastCloneTTStats(tt){
	if(!tt || !tt.stats) return null
	return {
		probes: tt.stats.probes,
		hits: tt.stats.hits,
		exactHits: tt.stats.exactHits,
		boundHits: tt.stats.boundHits,
		ttCutoffs: tt.stats.ttCutoffs,
		searchCutoffs: tt.stats.searchCutoffs,
		storeRequests: tt.stats.storeRequests,
		stores: tt.stats.stores,
		emptyStores: tt.stats.emptyStores,
		overwrites: tt.stats.overwrites,
		collisions: tt.stats.collisions,
		rejectedStores: tt.stats.rejectedStores
	}
}

function ensureFastSearchTables(){
	if(FastEncodedMoveList && FastMoveOffsetTable && FastMoveTargetBitTable && FastZobrist && FastCenterTable && FastCardSwapHashA && FastPieceIsRed) return
	FastCenterTable = new Int8Array(25)
	FastCenterTable[6] = 1
	FastCenterTable[7] = 1
	FastCenterTable[8] = 1
	FastCenterTable[11] = 1
	FastCenterTable[12] = 1
	FastCenterTable[13] = 1
	FastCenterTable[16] = 1
	FastCenterTable[17] = 1
	FastCenterTable[18] = 1
	createFastPieceTables()
	FastMoveOffsetTable = new Uint32Array(FAST_MOVE_TABLE_SIZE)
	FastMoveCountTable = new Uint8Array(FAST_MOVE_TABLE_SIZE)
	const encodedMoveList = []
	FastMoveSlotTable = new Uint8Array(FAST_MOVE_META_SIZE)
	FastMoveStartTable = new Uint8Array(FAST_MOVE_META_SIZE)
	FastMoveTargetTable = new Uint8Array(FAST_MOVE_META_SIZE)
	FastMoveStartBitTable = new Uint32Array(FAST_MOVE_META_SIZE)
	FastMoveTargetBitTable = new Uint32Array(FAST_MOVE_META_SIZE)
	for(let colorIndex=0;colorIndex<2;colorIndex++){
		const color = colorIndex == 0 ? "R" : "B"
		for(let cardID=0;cardID<32;cardID++){
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
							const target = spaceNum+forwardCount*5 - backwardCount*5 - rightCount + leftCount
							outputMoveList.push(target)
						}
					} else if (color == "R"){
						if(spaceNum - forwardCount*5>=0 && spaceNum + backwardCount*5<25 && spaceNum%5 + rightCount <5 && spaceNum%5 - leftCount >=0){
							const target = spaceNum-forwardCount*5 + backwardCount*5 + rightCount - leftCount
							outputMoveList.push(target)
						}
					}
				}
				for(let slot=0;slot<5;slot++){
					const tableKey = fastMoveTableKey(slot, colorIndex, cardID, spaceNum)
					FastMoveOffsetTable[tableKey] = encodedMoveList.length
					FastMoveCountTable[tableKey] = outputMoveList.length
					for(let i=0;i<outputMoveList.length;i++){
						const target = outputMoveList[i]
						const move = fastEncodeMove(slot, spaceNum, target)
						encodedMoveList.push(move)
						FastMoveSlotTable[move] = slot
						FastMoveStartTable[move] = spaceNum
						FastMoveTargetTable[move] = target
						FastMoveStartBitTable[move] = 1 << spaceNum
						FastMoveTargetBitTable[move] = 1 << target
					}
				}
			}
		}
	}
	FastEncodedMoveList = new Uint16Array(encodedMoveList)
	FastZobrist = createFastZobrist()
	createFastCardSwapHashes()
}

function createFastPieceTables(){
	FastPieceIsRed = new Int8Array([0, 1, 1, 0, 0])
	FastPieceIsMaster = new Int8Array([0, 0, 1, 0, 1])
	FastPieceRedPawnDelta = new Int8Array([0, 1, 0, 0, 0])
	FastPieceBluePawnDelta = new Int8Array([0, 0, 0, 1, 0])
	FastPieceRedCenterDelta = new Int8Array([0, 1, 1, 0, 0])
	FastPieceBlueCenterDelta = new Int8Array([0, 0, 0, 1, 1])
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

function createFastCardSwapHashes(){
	FastCardSwapHashA = new Uint32Array(4 * 32 * 32)
	FastCardSwapHashB = new Uint32Array(4 * 32 * 32)
	for(let slot=0;slot<4;slot++){
		for(let slotCard=0;slotCard<32;slotCard++){
			for(let neutralCard=0;neutralCard<32;neutralCard++){
				const swapKey = fastCardSwapKey(slot, slotCard, neutralCard)
				FastCardSwapHashA[swapKey] = (FastZobrist.cardA[slot][slotCard] ^ FastZobrist.cardA[4][neutralCard] ^ FastZobrist.cardA[slot][neutralCard] ^ FastZobrist.cardA[4][slotCard]) >>> 0
				FastCardSwapHashB[swapKey] = (FastZobrist.cardB[slot][slotCard] ^ FastZobrist.cardB[4][neutralCard] ^ FastZobrist.cardB[slot][neutralCard] ^ FastZobrist.cardB[4][slotCard]) >>> 0
			}
		}
	}
}

function fastAlphaBeta(search, depthRemaining, alpha, beta, ply){
	const searchTimeLimit = search.maxThinkingTime === null ? Infinity : (Number.isFinite(search.maxThinkingTime) ? search.maxThinkingTime : MaxThinkingTime)
	if((AImovesEvaluated & FAST_TIME_CHECK_MASK) == 0 && getNow() - search.thinkingStartTime > searchTimeLimit){
		return {"timedOut": true}
	}
	GreatestDepthSearched = Math.max(GreatestDepthSearched,ply)
	const terminalScore = fastTerminalScore(search, ply)
	if(terminalScore){
		return {"score": terminalScore, "move": 0, "exact": true, "bound": "exact"}
	}
	if(depthRemaining == 0){
		if(search.mateOnly) return {"score": 0, "move": 0, "exact": true, "bound": "exact"}
		return {"score": fastStaticEvaluation(search, ply), "move": 0, "exact": true, "bound": "exact"}
	}

	const alphaOrig = alpha
	const betaOrig = beta
	const ttIndex = fastTTProbe(search)
	var ttMove = 0
	if(ttIndex >= 0){
		const tt = search.tt
		ttMove = tt.move[ttIndex]
		if(tt.depth[ttIndex] >= depthRemaining){
			const ttFlag = tt.flag[ttIndex]
			const ttScore = fastNormalizeTTScoreForProbe(tt.score[ttIndex], ply)
			if(ttFlag == TT_EXACT){
				if(tt.stats) tt.stats.exactHits += 1
				return {"score": ttScore, "move": ttMove, "exact": true, "bound": "exact"}
			}
			if(tt.stats) tt.stats.boundHits += 1
			if(ttFlag == TT_LOWER) alpha = Math.max(alpha, ttScore)
			if(ttFlag == TT_UPPER) beta = Math.min(beta, ttScore)
			if(alpha >= beta){
				if(tt.stats) tt.stats.ttCutoffs += 1
				return {"score": ttScore, "move": ttMove, "exact": false, "bound": ttFlag == TT_LOWER ? "lower" : "upper"}
			}
		}
	}

	const moveCount = fastGenerateLegalMoves(search, ply)
	const legalMoves = search.moveBuffers[ply]
	if(moveCount == 0){
		return {"score": fastStaticEvaluation(search, ply), "move": 0, "exact": true, "bound": "exact"}
	}
	fastOrderMoves(search, legalMoves, moveCount, ttMove, ply)

	const maximizingPlayer = search.turn == FAST_RED
	var bestMove = legalMoves[0]
	var bestScore = maximizingPlayer ? -FAST_MATE_SCORE - 1 : FAST_MATE_SCORE + 1
	var searchedMoves = 0
	for(let moveIndex=0;moveIndex<moveCount;moveIndex++){
		const move = legalMoves[moveIndex]
		AImovesEvaluated += 1
		var childEval = null
		const terminalMoveScore = fastTerminalMoveScore(search, move, ply + 1)
		if(terminalMoveScore){
			childEval = {"score": terminalMoveScore, "move": 0, "exact": true, "bound": "exact"}
		} else {
			fastMakeMove(search, move, ply)
			if(searchedMoves == 0 || depthRemaining <= 1 || beta - alpha <= FAST_PVS_WINDOW){
				childEval = fastAlphaBeta(search, depthRemaining - 1, alpha, beta, ply + 1)
			} else if(maximizingPlayer){
				childEval = fastAlphaBeta(search, depthRemaining - 1, alpha, alpha + FAST_PVS_WINDOW, ply + 1)
				if(!childEval.timedOut && childEval.score > alpha && childEval.score < beta){
					childEval = fastAlphaBeta(search, depthRemaining - 1, alpha, beta, ply + 1)
				}
			} else {
				childEval = fastAlphaBeta(search, depthRemaining - 1, beta - FAST_PVS_WINDOW, beta, ply + 1)
				if(!childEval.timedOut && childEval.score < beta && childEval.score > alpha){
					childEval = fastAlphaBeta(search, depthRemaining - 1, alpha, beta, ply + 1)
				}
			}
			fastUnmakeMove(search, ply)
		}
		if(childEval.timedOut) return childEval
		searchedMoves += 1

		if((maximizingPlayer && childEval.score > bestScore) || (!maximizingPlayer && childEval.score < bestScore)){
			bestScore = childEval.score
			bestMove = move
		}
		if(maximizingPlayer){
			alpha = Math.max(alpha, bestScore)
		} else {
			beta = Math.min(beta, bestScore)
		}
		if(alpha >= beta){
			fastRecordCutoff(search, move, ply, depthRemaining)
			break
		}
	}

	var flag = TT_EXACT
	if(bestScore <= alphaOrig) flag = TT_UPPER
	else if(bestScore >= betaOrig) flag = TT_LOWER
	fastTTStore(search, depthRemaining, bestScore, flag, bestMove, ply)
	return {
		"score": bestScore,
		"move": bestMove,
		"exact": flag == TT_EXACT,
		"bound": flag == TT_EXACT ? "exact" : (flag == TT_LOWER ? "lower" : "upper")
	}
}

function fastTTIndex(search){
	return ((search.hashA ^ Math.imul(search.hashB, 0x9e3779b1)) & FAST_TT_BUCKET_MASK) * FAST_TT_BUCKET_SIZE
}

function fastTTProbe(search){
	const tt = search.tt
	const index = fastTTIndex(search)
	if(tt.stats) tt.stats.probes += 1
	for(let offset=0;offset<FAST_TT_BUCKET_SIZE;offset++){
		const entryIndex = index + offset
		if(tt.depth[entryIndex] > 0 && tt.hashA[entryIndex] == search.hashA && tt.hashB[entryIndex] == search.hashB){
			if(tt.stats) tt.stats.hits += 1
			return entryIndex
		}
	}
	return -1
}

function fastTTStore(search, depthRemaining, score, flag, move, ply){
	const tt = search.tt
	const index = fastTTIndex(search)
	var replaceIndex = -1
	var shallowestIndex = index
	var shallowestDepth = tt.depth[index]
	var replacingEmpty = false
	var replacingCollision = false
	if(tt.stats) tt.stats.storeRequests += 1
	for(let offset=0;offset<FAST_TT_BUCKET_SIZE;offset++){
		const entryIndex = index + offset
		if(tt.hashA[entryIndex] == search.hashA && tt.hashB[entryIndex] == search.hashB && tt.depth[entryIndex] > 0){
			if(tt.depth[entryIndex] > depthRemaining){
				if(tt.stats) tt.stats.rejectedStores += 1
				return
			}
			replaceIndex = entryIndex
			break
		}
		if(tt.depth[entryIndex] == 0){
			replaceIndex = entryIndex
			replacingEmpty = true
			break
		}
		if(tt.depth[entryIndex] < shallowestDepth){
			shallowestIndex = entryIndex
			shallowestDepth = tt.depth[entryIndex]
		}
	}
	if(replaceIndex < 0){
		if(shallowestDepth > depthRemaining){
			if(tt.stats) tt.stats.rejectedStores += 1
			return
		}
		replaceIndex = shallowestIndex
		replacingCollision = true
	} else if(!replacingEmpty && (tt.hashA[replaceIndex] != search.hashA || tt.hashB[replaceIndex] != search.hashB)){
		replacingCollision = true
	}
	tt.hashA[replaceIndex] = search.hashA
	tt.hashB[replaceIndex] = search.hashB
	tt.depth[replaceIndex] = depthRemaining
	tt.score[replaceIndex] = fastNormalizeTTScoreForStore(score, ply)
	tt.flag[replaceIndex] = flag
	tt.move[replaceIndex] = move
	if(tt.stats){
		tt.stats.stores += 1
		if(replacingEmpty) tt.stats.emptyStores += 1
		if(replacingCollision){
			tt.stats.collisions += 1
			tt.stats.overwrites += 1
		}
	}
}

function fastNormalizeTTScoreForStore(score, ply){
	if(score >= FAST_MATE_THRESHOLD) return score + ply
	if(score <= -FAST_MATE_THRESHOLD) return score - ply
	return score
}

function fastNormalizeTTScoreForProbe(score, ply){
	if(score >= FAST_MATE_THRESHOLD) return score - ply
	if(score <= -FAST_MATE_THRESHOLD) return score + ply
	return score
}

function fastProbeRootResult(search){
	const ttIndex = fastTTProbe(search)
	if(ttIndex < 0) return null
	const tt = search.tt
	if(tt.flag[ttIndex] != TT_EXACT) return null
	return {
		score: fastNormalizeTTScoreForProbe(tt.score[ttIndex], 0),
		move: tt.move[ttIndex],
		exact: true,
		bound: "exact",
		depth: tt.depth[ttIndex]
	}
}

function fastStorePrincipalVariation(search, depthRemaining){
	const pv = []
	var madeMoves = 0
	for(let ply=0;ply<depthRemaining;ply++){
		if(fastTerminalScore(search, ply)) break
		const ttIndex = fastTTProbe(search)
		if(ttIndex < 0) break
		const move = search.tt.move[ttIndex]
		if(!move) break
		const moveCount = fastGenerateLegalMoves(search, ply)
		const legalMoves = search.moveBuffers[ply]
		if(!fastMoveListContains(legalMoves, moveCount, move)) break
		pv.push(move)
		fastMakeMove(search, move, ply)
		madeMoves += 1
	}
	for(let ply=madeMoves-1;ply>=0;ply--){
		fastUnmakeMove(search, ply)
	}
	search.previousPv.fill(0)
	for(let i=0;i<pv.length;i++){
		search.previousPv[i] = pv[i]
	}
	search.previousPvLength = pv.length
}

function fastFallbackSearch(search){
	const moveCount = fastGenerateLegalMoves(search, 0)
	const legalMoves = search.moveBuffers[0]
	if(moveCount == 0){
		return {"score": fastStaticEvaluation(search, 0), "move": 0, "exact": true, "bound": "exact"}
	}
	const maximizingPlayer = search.turn == FAST_RED
	var bestMove = legalMoves[0]
	var bestScore = fastTerminalMoveScore(search, bestMove, 1)
	if(!bestScore){
		fastMakeMove(search, bestMove, 0)
		bestScore = fastStaticEvaluation(search, 1)
		fastUnmakeMove(search, 0)
	}
	for(let moveIndex=0;moveIndex<moveCount;moveIndex++){
		const move = legalMoves[moveIndex]
		var score = fastTerminalMoveScore(search, move, 1)
		if(!score){
			fastMakeMove(search, move, 0)
			score = fastStaticEvaluation(search, 1)
			fastUnmakeMove(search, 0)
		}
		if((maximizingPlayer && score > bestScore) || (!maximizingPlayer && score < bestScore)){
			bestMove = move
			bestScore = score
		}
	}
	return {"score": bestScore, "move": bestMove, "exact": false, "bound": "fallback"}
}

function fastGenerateLegalMoves(search, ply){
	const colorIndex = search.turn == FAST_RED ? 0 : 1
	const firstCardSlot = search.turn == FAST_RED ? 0 : 2
	const legalMoves = search.moveBuffers[ply] || (search.moveBuffers[ply] = new Uint16Array(FAST_MAX_MOVES))
	const quietMoves = search.quietMoveBuffers[ply] || (search.quietMoveBuffers[ply] = new Uint16Array(FAST_MAX_MOVES))
	var moveCount = 0
	var quietCount = 0
	const ownMask = search.turn == FAST_RED ? (search.occupiedMask & search.redMask) : (search.occupiedMask & ~search.redMask)
	const occupiedMask = search.occupiedMask
	const cardBits = search.cardBits
	var pieces = ownMask
	while(pieces){
		const startBit = pieces & -pieces
		const start = fastBitIndex(startBit)
		for(let slot=firstCardSlot;slot<firstCardSlot+2;slot++){
			const cardID = fastGetCard(cardBits, slot)
			const tableKey = fastMoveTableKey(slot, colorIndex, cardID, start)
			const moveOffset = FastMoveOffsetTable[tableKey]
			const moveEnd = moveOffset + FastMoveCountTable[tableKey]
			for(let i=moveOffset;i<moveEnd;i++){
				const move = FastEncodedMoveList[i]
				const targetBit = FastMoveTargetBitTable[move]
				if(ownMask & targetBit) continue
				if(occupiedMask & targetBit){
					if(moveCount >= legalMoves.length) throw new Error("Fast move buffer overflow.")
					legalMoves[moveCount] = move
					moveCount += 1
				} else {
					if(quietCount >= quietMoves.length) throw new Error("Fast quiet move buffer overflow.")
					quietMoves[quietCount] = move
					quietCount += 1
				}
			}
		}
		pieces ^= startBit
	}
	for(let i=0;i<quietCount;i++){
		if(moveCount >= legalMoves.length) throw new Error("Fast move buffer overflow.")
		legalMoves[moveCount] = quietMoves[i]
		moveCount += 1
	}
	search.moveCounts[ply] = moveCount
	return moveCount
}

function fastOrderMoves(search, moves, moveCount, ttMove, ply){
	const scores = search.moveScoreBuffers[ply] || (search.moveScoreBuffers[ply] = new Int32Array(FAST_MAX_MOVES))
	for(let i=0;i<moveCount;i++){
		const move = moves[i]
		const score = fastMoveHeuristic(search, move, ttMove, ply)
		let j = i - 1
		while(j >= 0 && scores[j] < score){
			moves[j + 1] = moves[j]
			scores[j + 1] = scores[j]
			j--
		}
		moves[j + 1] = move
		scores[j + 1] = score
	}
}

function fastMoveListContains(moves, moveCount, move){
	for(let i=0;i<moveCount;i++){
		if(moves[i] == move) return true
	}
	return false
}

function fastMoveHeuristic(search, move, ttMove, ply){
	if(ply == 0 && move == search.rootMove) return 2000000
	if(move == ttMove) return 1000000
	if(search.previousPv[ply] == move) return 950000
	const startBit = FastMoveStartBitTable[move]
	const targetBit = FastMoveTargetBitTable[move]
	var score = 0
	if(search.occupiedMask & targetBit){
		score += (search.masterMask & targetBit) ? 50000 : 10000
	}
	if(search.masterMask & startBit){
		const target = FastMoveTargetTable[move]
		if((search.redMask & startBit) && target == 2) score += 90000
		else if((search.redMask & startBit) == 0 && target == 22) score += 90000
	}
	if(score > 0) return score
	if(search.killerOne[ply] == move) score += FAST_KILLER_SCORE
	else if(search.killerTwo[ply] == move) score += FAST_KILLER_SCORE - 1000
	const colorIndex = search.turn == FAST_RED ? 0 : 1
	score += search.history[colorIndex * FAST_HISTORY_SIZE + move]
	return score
}

function fastRecordCutoff(search, move, ply, depthRemaining){
	if(search.tt && search.tt.stats) search.tt.stats.searchCutoffs += 1
	if(search.occupiedMask & FastMoveTargetBitTable[move]) return
	if(search.killerOne[ply] != move){
		search.killerTwo[ply] = search.killerOne[ply] || 0
		search.killerOne[ply] = move
	}
	const colorIndex = search.turn == FAST_RED ? 0 : 1
	const historyIndex = colorIndex * FAST_HISTORY_SIZE + move
	const historyScore = search.history[historyIndex] + depthRemaining * depthRemaining
	search.history[historyIndex] = historyScore > FAST_HISTORY_MAX ? FAST_HISTORY_MAX : historyScore
}

function fastTerminalMoveScore(search, move, childPly){
	const startBit = FastMoveStartBitTable[move]
	const targetBit = FastMoveTargetBitTable[move]
	if(search.masterMask & targetBit){
		return (search.redMask & targetBit) ? -FAST_MATE_SCORE + childPly : FAST_MATE_SCORE - childPly
	}
	if(search.masterMask & startBit){
		const target = FastMoveTargetTable[move]
		if(search.redMask & startBit) return target == 2 ? FAST_MATE_SCORE - childPly : 0
		return target == 22 ? -FAST_MATE_SCORE + childPly : 0
	}
	return 0
}

function fastMakeMove(search, move, ply){
	const slot = FastMoveSlotTable[move]
	const start = FastMoveStartTable[move]
	const target = FastMoveTargetTable[move]
	const startBit = FastMoveStartBitTable[move]
	const targetBit = FastMoveTargetBitTable[move]
	const movingPieceIndex = ((search.redMask & startBit) ? 1 : 3) + ((search.masterMask & startBit) ? 1 : 0)
	const capturedPieceIndex = (search.occupiedMask & targetBit) ? (((search.redMask & targetBit) ? 1 : 3) + ((search.masterMask & targetBit) ? 1 : 0)) : 0
	const oldCardBits = search.cardBits
	const oldSlotCard = fastGetCard(oldCardBits, slot)
	const oldNeutralCard = fastGetCard(oldCardBits, 4)
	search.undoCardBits[ply] = oldCardBits
	search.undoOldTurn[ply] = search.turn
	search.undoHashA[ply] = search.hashA
	search.undoHashB[ply] = search.hashB
	search.undoOccupiedMask[ply] = search.occupiedMask
	search.undoRedMask[ply] = search.redMask
	search.undoMasterMask[ply] = search.masterMask
	search.undoRedPawnsCount[ply] = search.redPawnsCount
	search.undoBluePawnsCount[ply] = search.bluePawnsCount
	search.undoRedMasterPos[ply] = search.redMasterPos
	search.undoBlueMasterPos[ply] = search.blueMasterPos
	search.undoRedCenterControl[ply] = search.redCenterControl
	search.undoBlueCenterControl[ply] = search.blueCenterControl

	fastXorPieceIndex(search, start, movingPieceIndex)
	if(capturedPieceIndex) fastXorPieceIndex(search, target, capturedPieceIndex)
	fastRemovePieceStatsByIndex(search, start, movingPieceIndex)
	if(capturedPieceIndex) fastRemovePieceStatsByIndex(search, target, capturedPieceIndex)
	fastAddPieceStatsByIndex(search, target, movingPieceIndex)
	fastXorPieceIndex(search, target, movingPieceIndex)

	const swapKey = fastCardSwapKey(slot, oldSlotCard, oldNeutralCard)
	const cardDelta = oldSlotCard ^ oldNeutralCard
	search.hashA = (search.hashA ^ FastCardSwapHashA[swapKey]) >>> 0
	search.hashB = (search.hashB ^ FastCardSwapHashB[swapKey]) >>> 0
	search.cardBits = (oldCardBits ^ (cardDelta << (slot * 5)) ^ (cardDelta << 20)) >>> 0

	fastXorTurn(search, search.turn)
	search.turn = -search.turn
	fastXorTurn(search, search.turn)
}

function fastUnmakeMove(search, ply){
	search.cardBits = search.undoCardBits[ply]
	search.turn = search.undoOldTurn[ply]
	search.hashA = search.undoHashA[ply]
	search.hashB = search.undoHashB[ply]
	search.occupiedMask = search.undoOccupiedMask[ply]
	search.redMask = search.undoRedMask[ply]
	search.masterMask = search.undoMasterMask[ply]
	search.redPawnsCount = search.undoRedPawnsCount[ply]
	search.bluePawnsCount = search.undoBluePawnsCount[ply]
	search.redMasterPos = search.undoRedMasterPos[ply]
	search.blueMasterPos = search.undoBlueMasterPos[ply]
	search.redCenterControl = search.undoRedCenterControl[ply]
	search.blueCenterControl = search.undoBlueCenterControl[ply]
}

function fastBitIndex(bit){
	return 31 - Math.clz32(bit)
}

function fastPieceAt(search, square){
	const bit = 1 << square
	if((search.occupiedMask & bit) == 0) return FAST_EMPTY
	if(search.redMask & bit){
		return (search.masterMask & bit) ? FAST_RED_MASTER : FAST_RED_PAWN
	}
	return (search.masterMask & bit) ? FAST_BLUE_MASTER : FAST_BLUE_PAWN
}

function fastAddPieceStatsByIndex(search, square, pieceIndex){
	if(pieceIndex == 0) return
	const bit = 1 << square
	const centerValue = FastCenterTable[square]
	search.occupiedMask |= bit
	search.redMask = (search.redMask & ~bit) | (bit * FastPieceIsRed[pieceIndex])
	search.masterMask = (search.masterMask & ~bit) | (bit * FastPieceIsMaster[pieceIndex])
	search.redPawnsCount += FastPieceRedPawnDelta[pieceIndex]
	search.bluePawnsCount += FastPieceBluePawnDelta[pieceIndex]
	search.redCenterControl += FastPieceRedCenterDelta[pieceIndex] * centerValue
	search.blueCenterControl += FastPieceBlueCenterDelta[pieceIndex] * centerValue
	if(pieceIndex == 2) search.redMasterPos = square
	else if(pieceIndex == 4) search.blueMasterPos = square
}

function fastRemovePieceStatsByIndex(search, square, pieceIndex){
	if(pieceIndex == 0) return
	const bit = 1 << square
	const centerValue = FastCenterTable[square]
	search.occupiedMask &= ~bit
	search.redMask &= ~bit
	search.masterMask &= ~bit
	search.redPawnsCount -= FastPieceRedPawnDelta[pieceIndex]
	search.bluePawnsCount -= FastPieceBluePawnDelta[pieceIndex]
	search.redCenterControl -= FastPieceRedCenterDelta[pieceIndex] * centerValue
	search.blueCenterControl -= FastPieceBlueCenterDelta[pieceIndex] * centerValue
	if(pieceIndex == 2) search.redMasterPos = -1
	else if(pieceIndex == 4) search.blueMasterPos = -1
}

function fastAddPieceStats(search, square, piece){
	fastAddPieceStatsByIndex(search, square, fastPieceIndex(piece))
}

function fastRemovePieceStats(search, square, piece){
	fastRemovePieceStatsByIndex(search, square, fastPieceIndex(piece))
}

function fastTerminalScore(search, ply){
	if(search.blueMasterPos == -1 || search.redMasterPos == 2) return FAST_MATE_SCORE - ply
	if(search.redMasterPos == -1 || search.blueMasterPos == 22) return -FAST_MATE_SCORE + ply
	return 0
}

function fastStaticEvaluation(search, ply){
	const terminalScore = fastTerminalScore(search, ply)
	if(terminalScore) return terminalScore
	const redMasterLocationEval = (4 - Math.floor(search.redMasterPos/5)) - (Math.abs(search.redMasterPos%5 - 2))
	const blueMasterLocationEval = (Math.floor(search.blueMasterPos/5)) - (Math.abs(search.blueMasterPos%5 - 2))
	const remainingPawns = search.bluePawnsCount + search.redPawnsCount
	var evaluation = 40*(search.redPawnsCount - search.bluePawnsCount)
	evaluation += 10*(8 - remainingPawns) * (redMasterLocationEval - blueMasterLocationEval)
	evaluation += 8*(search.redCenterControl - search.blueCenterControl)
	return evaluation
}

function fastResultToEval(search, result){
	if(result.timedOut) return result
	var score = result.score
	var mateDistance = 0
	if(isFastMateScore(score)){
		mateDistance = FAST_MATE_SCORE - Math.abs(score)
		score = score > 0 ? Infinity : -Infinity
	} else {
		score = fastDisplayScore(score)
	}
	const evalMove = getEvalMove(score, fastDecodeMove(search, result.move), mateDistance, 0)
	evalMove.exact = result.exact === true
	evalMove.bound = result.bound
	return evalMove
}

function fastDisplayScore(score){
	return score / FAST_EVAL_SCALE
}

function fastEncodeMove(slot,start,target){
	return slot | (start << 3) | (target << 8)
}

function fastMoveTableKey(slot, colorIndex, cardID, square){
	return (((slot * 2 + colorIndex) * 32 + cardID) * 25 + square)
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
	const slot = FastMoveSlotTable ? FastMoveSlotTable[move] : fastMoveSlot(move)
	return {
		"cardID": twoDigit(fastGetCard(search.cardBits, slot)),
		"color": search.turn == FAST_RED ? "R" : "B",
		"startLocation": FastMoveStartTable ? FastMoveStartTable[move] : fastMoveStart(move),
		"targetLocation": FastMoveTargetTable ? FastMoveTargetTable[move] : fastMoveTarget(move)
	}
}

function fastGetCard(cardBits, slot){
	return (cardBits >>> (slot * 5)) & FAST_CARD_MASK
}

function fastHashKey(search){
	return search.hashA.toString(36)+":"+search.hashB.toString(36)
}

function fastXorPieceIndex(search, square, pieceIndex){
	if(pieceIndex == 0) return
	search.hashA = (search.hashA ^ FastZobrist.pieceA[square][pieceIndex]) >>> 0
	search.hashB = (search.hashB ^ FastZobrist.pieceB[square][pieceIndex]) >>> 0
}

function fastXorPiece(search, square, piece){
	fastXorPieceIndex(search, square, fastPieceIndex(piece))
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

function fastCardSwapKey(slot, slotCard, neutralCard){
	return (slot << 10) | (slotCard << 5) | neutralCard
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

function getStaticEvaluationMove(gameState){
	const evalMove = getEvalMove(staticEvaluation(gameState), {}, 0, 0)
	evalMove.exact = Math.abs(evalMove.e) == Infinity
	evalMove.bound = "static"
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
	stopBackgroundSearch()
	GameState = doMove(gameState,move)
	recordHistory(move, GameState)
	updateUI(GameState,move)
	const carriedMateEval = getCarriedKnownMateEvaluationAfterMove(move)
	setLatestAIEvaluation(carriedMateEval || getStaticEvaluationMove(GameState))
	GameIsOver = Math.abs(staticEvaluation(GameState)) == Infinity
	if (GameIsOver){
		updateSwitchSidesButton()
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
	} else {
		maybeStartBackgroundSearch()
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
	bar.style.left = (BOARD_LEFT - EVAL_BAR_WIDTH) + "px"
	bar.style.top = BOARD_TOP + "px"
	bar.style.height = (SQUARE_SIZE*5 + BOARD_BORDER_SIZE) + "px"
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

function setLatestAIEvaluation(evalMove){
	const displayEvalMove = getDisplayAIEvaluation(evalMove)
	if(KnownMateEvaluation){
		const knownMateEval = getCurrentKnownMateEvaluation()
		if(knownMateEval && !shouldReplaceKnownMateEvaluation(displayEvalMove, knownMateEval)){
			LatestAIEvalMove = knownMateEval
			updateEvaluationBar()
			return
		}
	}
	LatestAIEvalMove = displayEvalMove
	rememberKnownMateEvaluation(displayEvalMove)
	updateEvaluationBar()
}

function clearLatestAIEvaluation(){
	LatestAIEvalMove = null
	KnownMateEvaluation = null
	updateEvaluationBar()
}

function updateEvaluationBar(){
	const bar = getEvaluationBar()
	if (!bar) return
	const targetTopPercent = getEvaluationBarTopPercent(LatestAIEvalMove)
	EvaluationBarTargetTopPercent = targetTopPercent
	ensureEvaluationBarFills(bar)
	updateEvaluationBarFillColors(bar)
	startEvaluationBarAnimation()
	const label = getEvaluationBarLabel(LatestAIEvalMove)
	bar.title = label
	bar.setAttribute("aria-label", label)
}

function getEvaluationBarTopPercent(evalMove){
	const counts = getEvaluationBarColorCounts(evalMove)
	const topColor = PlayerColor == "B" ? "R" : "B"
	return (counts[topColor] / EVAL_BAR_SECTIONS) * 100
}

function ensureEvaluationBarFills(bar){
	var topSegment = bar.querySelector(".evalBarTopFill")
	var bottomSegment = bar.querySelector(".evalBarBottomFill")
	if(topSegment && bottomSegment) return
	bar.innerHTML = ""
	topSegment = document.createElement("div")
	topSegment.className = "evalBarFill evalBarTopFill"
	bottomSegment = document.createElement("div")
	bottomSegment.className = "evalBarFill evalBarBottomFill"
	bar.appendChild(topSegment)
	bar.appendChild(bottomSegment)
	applyEvaluationBarPercent(EvaluationBarCurrentTopPercent)
}

function updateEvaluationBarFillColors(bar){
	const topColor = PlayerColor == "B" ? "R" : "B"
	const bottomColor = oppositeColor(topColor)
	const topSegment = bar.querySelector(".evalBarTopFill")
	const bottomSegment = bar.querySelector(".evalBarBottomFill")
	if(topSegment) topSegment.className = "evalBarFill evalBarTopFill " + (topColor == "R" ? "evalBarRed" : "evalBarBlue")
	if(bottomSegment) bottomSegment.className = "evalBarFill evalBarBottomFill " + (bottomColor == "R" ? "evalBarRed" : "evalBarBlue")
}

function startEvaluationBarAnimation(){
	if(EvaluationBarAnimationFrame !== null) return
	if(typeof requestAnimationFrame === "undefined"){
		EvaluationBarCurrentTopPercent = EvaluationBarTargetTopPercent
		applyEvaluationBarPercent(EvaluationBarCurrentTopPercent)
		return
	}
	EvaluationBarAnimationFrame = requestAnimationFrame(animateEvaluationBar)
}

function animateEvaluationBar(){
	const delta = EvaluationBarTargetTopPercent - EvaluationBarCurrentTopPercent
	if(Math.abs(delta) <= EVAL_BAR_LERP_EPSILON){
		EvaluationBarCurrentTopPercent = EvaluationBarTargetTopPercent
		applyEvaluationBarPercent(EvaluationBarCurrentTopPercent)
		EvaluationBarAnimationFrame = null
		return
	}
	EvaluationBarCurrentTopPercent += delta * EVAL_BAR_LERP_FACTOR
	applyEvaluationBarPercent(EvaluationBarCurrentTopPercent)
	EvaluationBarAnimationFrame = requestAnimationFrame(animateEvaluationBar)
}

function applyEvaluationBarPercent(topPercent){
	const bar = getEvaluationBar()
	if (!bar) return
	const topSegment = bar.querySelector(".evalBarTopFill")
	const bottomSegment = bar.querySelector(".evalBarBottomFill")
	if(topSegment) topSegment.style.flexBasis = topPercent + "%"
	if(bottomSegment) bottomSegment.style.flexBasis = (100 - topPercent) + "%"
}

function getDisplayAIEvaluation(evalMove){
	if (evalMove && evalMove.latestEvaluation) return evalMove.latestEvaluation
	return evalMove
}

function rememberKnownMateEvaluation(evalMove){
	if(!isMateEvaluation(evalMove)){
		if(!KnownMateEvaluation) KnownMateEvaluation = null
		return
	}
	KnownMateEvaluation = {
		evalMove: cloneEvalMove(evalMove),
		sourcePly: getCurrentGamePly(),
		winningColor: evalMove.e == Infinity ? "R" : "B",
		expectedMove: cloneMove(evalMove.m)
	}
}

function shouldReplaceKnownMateEvaluation(evalMove, knownMateEval){
	if(!isMateEvaluation(evalMove)) return false
	if(!knownMateEval) return true
	const evalWinner = evalMove.e == Infinity ? "R" : "B"
	const knownWinner = knownMateEval.e == Infinity ? "R" : "B"
	if(evalWinner != knownWinner) return true
	return evalMove.d <= knownMateEval.d
}

function getCarriedKnownMateEvaluationAfterMove(move){
	if(!KnownMateEvaluation) return null
	const sourcePly = KnownMateEvaluation.sourcePly
	const expectedMove = KnownMateEvaluation.expectedMove
	const isFirstCarriedPly = getCurrentGamePly() == sourcePly + 1
	if(isFirstCarriedPly && expectedMove && expectedMove.cardID && move.color == KnownMateEvaluation.winningColor && !movesMatch(move, expectedMove)){
		KnownMateEvaluation = null
		return null
	}
	return getCurrentKnownMateEvaluation()
}

function getCurrentKnownMateEvaluation(){
	if(!KnownMateEvaluation) return null
	const elapsedPlies = getCurrentGamePly() - KnownMateEvaluation.sourcePly
	const remainingPlies = KnownMateEvaluation.evalMove.d - elapsedPlies
	if(remainingPlies < 0){
		KnownMateEvaluation = null
		return null
	}
	const evalMove = cloneEvalMove(KnownMateEvaluation.evalMove)
	evalMove.d = remainingPlies
	evalMove.m = {}
	evalMove.t = getCurrentGamePly()
	return evalMove
}

function isMateEvaluation(evalMove){
	return evalMove
		&& evalMove.exact
		&& (evalMove.e == Infinity || evalMove.e == -Infinity)
		&& Number.isFinite(evalMove.d)
}

function cloneEvalMove(evalMove){
	if(!evalMove) return evalMove
	const copy = Object.assign({}, evalMove)
	copy.m = cloneMove(evalMove.m)
	if(evalMove.latestEvaluation) copy.latestEvaluation = cloneEvalMove(evalMove.latestEvaluation)
	return copy
}

function cloneMove(move){
	return move ? Object.assign({}, move) : move
}

function movesMatch(firstMove, secondMove){
	return firstMove
		&& secondMove
		&& firstMove.cardID == secondMove.cardID
		&& firstMove.color == secondMove.color
		&& firstMove.startLocation == secondMove.startLocation
		&& firstMove.targetLocation == secondMove.targetLocation
}

function getCurrentGamePly(){
	return GameHistory && GameHistory.moveHistory ? GameHistory.moveHistory.length : 0
}

function getEvaluationBarColorCounts(evalMove){
	if (evalMove && evalMove.exact && evalMove.e == Infinity){
		return {"R": EVAL_BAR_SECTIONS, "B": 0}
	}
	if (evalMove && evalMove.exact && evalMove.e == -Infinity){
		return {"R": 0, "B": EVAL_BAR_SECTIONS}
	}
	const evaluation = evalMove && Number.isFinite(evalMove.e) ? evalMove.e : 0
	const redSections = EVAL_BAR_SECTIONS/2 + getFiniteEvaluationSectionSwing(evaluation)
	return {"R": redSections, "B": EVAL_BAR_SECTIONS - redSections}
}

function getFiniteEvaluationSectionSwing(evaluation){
	const maxFiniteSwing = EVAL_BAR_SECTIONS/2 - 1
	const direction = evaluation > 0 ? 1 : (evaluation < 0 ? -1 : 0)
	const swing = Math.round(Math.log2(Math.abs(evaluation) + 1))
	return direction * clamp(swing, 0, maxFiniteSwing)
}

function getEvaluationBarLabel(evalMove){
	if (!evalMove){
		return "AI evaluation 0"
	}
	if (evalMove.exact && evalMove.e == Infinity){
		return "AI evaluation Red: Mate in " + matePliesToMoves(evalMove.d)
	}
	if (evalMove.exact && evalMove.e == -Infinity){
		return "AI evaluation Blue: Mate in " + matePliesToMoves(evalMove.d)
	}
	if (evalMove.e > 0){
		return "AI evaluation +" + evalMove.e + " red"
	}
	if (evalMove.e < 0){
		return "AI evaluation +" + (-1*evalMove.e) + " blue"
	}
	return "AI evaluation 0"
}

function matePliesToMoves(plies){
	return Math.ceil(plies / 2)
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
			var draggable = CustomSetupActive ? "true" : "false"
			appendHtml("s"+i, "<div id='p"+(pieceNum++)+"' draggable='"+draggable+"' onclick='selectPiece(event)' ondragstart='drag(event)' class='piece "+pieceColor+" "+pieceType+"' style='left:0px; top:0px;'></div>")
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
	removeClassFromElements("cardSlot","customEmptySlot")
	removeClassFromElements("cardSlot","customFilledSlot")
	removeClassFromElements("piece","customSelectedPiece")
	hideBoardStartButton()
	updateTakeBackButton()
	updateSwitchSidesButton()
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

function updateSwitchSidesButton(){
	var switchSidesButton = document.getElementById("switchSidesButton")
	if (!switchSidesButton) return
	switchSidesButton.disabled = GameIsOver || CustomSetupActive
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
	if (CustomSetupActive){
		placeCustomCardInSlot(slot)
		return
	}
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

function selectCustomSetupPiece(ev){
	var squareNum = getSquareNumFromElement(ev.target.parentElement)
	if (squareNum === null || CustomSetupBoardState[squareNum] == "e") return
	ev.stopPropagation()
	if (CustomSelectedPieceSquare !== null && CustomSelectedPieceSquare !== squareNum){
		moveCustomPieceToSquare(squareNum)
		return
	}
	CustomSelectedPieceSquare = CustomSelectedPieceSquare === squareNum ? null : squareNum
	updateCustomPieceSelection()
}

function selectCustomSetupTarget(squareNum){
	if (CustomSelectedPieceSquare === null || squareNum === null) return
	moveCustomPieceToSquare(squareNum)
}

function moveCustomPieceToSquare(targetSquare){
	if (CustomSelectedPieceSquare === null || targetSquare === null) return
	var startSquare = CustomSelectedPieceSquare
	if (startSquare == targetSquare){
		CustomSelectedPieceSquare = null
		updateCustomPieceSelection()
		return
	}
	var movingPiece = CustomSetupBoardState[startSquare]
	if (movingPiece == "e"){
		CustomSelectedPieceSquare = null
		updateCustomPieceSelection()
		return
	}
	var targetPiece = CustomSetupBoardState[targetSquare]
	CustomSetupBoardState = CustomSetupBoardState.replaceAt(targetSquare, movingPiece).replaceAt(startSquare, targetPiece)
	GameState = CustomSetupBoardState + GameState.substring(25)
	CustomSelectedPieceSquare = null
	placePieces(CustomSetupBoardState)
}

function updateCustomPieceSelection(){
	removeClassFromElements("piece","customSelectedPiece")
	if (CustomSelectedPieceSquare === null) return
	var square = document.getElementById("s"+CustomSelectedPieceSquare)
	var piece = square ? square.querySelector(".piece") : null
	if (piece){
		piece.classList.add("customSelectedPiece")
	}
}

function selectPiece(ev){
	if (CustomSetupActive){
		selectCustomSetupPiece(ev)
		return
	}
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
	if (CustomSetupActive){
		selectCustomSetupTarget(getSquareNumFromElement(getSquareElementFromTarget(ev.target)))
		return
	}
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
	if (CustomSetupActive){
		ev.dataTransfer.setData("text", ev.target.id)
		CustomSelectedPieceSquare = getSquareNumFromElement(ev.target.parentElement)
		updateCustomPieceSelection()
		return
	}
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
	if (CustomSetupActive){
		var customTargetSquare = getSquareElementFromTarget(ev.target)
		if (!customTargetSquare) return
		moveCustomPieceToSquare(getSquareNumFromElement(customTargetSquare))
		return
	}
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
	updateSwitchSidesButton()
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

function clamp(value, min, max){
	return Math.max(min, Math.min(max, value))
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
