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

var GameHistory = {"gameStart":"", "moveHistory":[]}
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
var GreatestDepthSearched = 0




move_dictionary = {
	  "00": {"moves": ["fr","br","fl","bl"]			,"name":"monkey" }
	, "01": {"moves": ["ff","b"] 					,"name":"tiger" }
	, "02": {"moves": ["frr","fll","br","bl"]		,"name":"dragon" }
	, "03": {"moves": ["f","rr","ll"]				,"name":"crab" }
	, "04": {"moves": ["l","r","fl","fr"]			,"name":"elephant" }
	, "05": {"moves": ["fl","fr","b"]				,"name":"mantis" }
	, "06": {"moves": ["f","br","bl"]				,"name":"crane" }
	, "07": {"moves": ["l","r","f"]					,"name":"boar" }
	, "08": {"moves": ["l","f","b"]					,"name":"horse" }
	, "09": {"moves": ["r","b","f"]					,"name":"ox" }
	, "10": {"moves": ["l","br","fr"]				,"name":"cobra" }
	, "11": {"moves": ["r","bl","fl"]				,"name":"eel" }
	, "12": {"moves": ["l","r","bl","fr"]			,"name":"rooster" }
	, "13": {"moves": ["l","r","fl","br"]			,"name":"goose" }
	, "14": {"moves": ["ll","br","fl"]				,"name":"frog" }
	, "15": {"moves": ["bl","rr","fr"]				,"name":"rabbit" }
	, "16": {"moves": ["fr","r","br"]				,"name":"fox" }
	, "17": {"moves": ["fl","l","bl"]				,"name":"dog" }
	, "18": {"moves": ["frr","fll","b"]				,"name":"giraffe" }
	, "19": {"moves": ["f","fr","bl"]				,"name":"panda" }
	, "20": {"moves": ["fl","f","br"]				,"name":"bear" }
	, "21": {"moves": ["ffl","ffr","bb"]			,"name":"kirin" }
	, "22": {"moves": ["f","rr","bl"]				,"name":"sea snake" }
	, "23": {"moves": ["f","ll","br"]				,"name":"viper" }
	, "24": {"moves": ["ll","rr","fr","fl"]			,"name":"phoenix" }
	, "25": {"moves": ["r","f","bl"]				,"name":"mouse" }
	, "26": {"moves": ["l","f","br"]				,"name":"rat" }
	, "27": {"moves": ["rr","ll","bl","br"]			,"name":"turtle" }
	, "28": {"moves": ["f","frr","bl"]				,"name":"tanuki" }
	, "29": {"moves": ["f","fll","br"]				,"name":"iguana" }
	, "30": {"moves": ["ll","bl","fr"]				,"name":"sable" }
	, "31": {"moves":  ["rr","br","fl"]				,"name":"otter" }
}

PrecomputedBoardMoves = {} // this will store actual possible spaces for any move, from any square. index = color+cardID+SquareNum
currentMoveUI = {} //this is a dictionary to build up the current move through the UI

// Logic flow ********************************************
function main(){
	startNewGame()
}

function getAIMove(gameState,color){
	//The AI will make moves on it's turn according to minimax. 
	const thinkingStartTime = getNow()
	GameIsOver = true
	console.log("Thinking about move...")
	AImovesEvaluated = 0

	var evalMove = timeBasedMinMax(gameState, thinkingStartTime, color)
	if ((evalMove.e == Infinity && color == "B") || (evalMove.e == -Infinity && color == "R")){
		if(!ResignShown){
			console.log("AI resigns")
			ResignShown = true
		}
	} else if ((evalMove.e == Infinity && color == "R") || (evalMove.e == -Infinity && color == "B")){
		if(!ForcedMateShown){
			console.log("Mate found")
			ForcedMateShown = true
		}
	}
	// The move sort of occurs...
	var thinkingEndTime = getNow()
	var thinkingTime = (thinkingEndTime - thinkingStartTime)/1000
	PlayerCanMove = true 
	var winningPlayer = evalMove.e > 0 ? "Red by "+evalMove.e : (evalMove.e < 0 ? "Blue by "+(-1*evalMove.e) : "neither side")
	console.log("Done Thinking! ------------------------------")
	console.log("Positions Evaluated: "+AImovesEvaluated)  
	console.log("Thinking time: "+thinkingTime)
	console.log("Edge: "+winningPlayer)
	return evalMove
}


function doAIMove(gameState,color){
	setTimeout(() => {//Wait for the UI to update, then move. TODO: make it so you don't need to wait. 
		const evalMove = getAIMove(gameState,color)
		doRealMove(GameState, evalMove.m)
	},100)

}

function startNewGame(){
	GameState = createRandomGameState()
	GameIsOver = false
	placePieces(GameState)
	placeCards(GameState)
	GameHistory.gameStart = GameState
	var thisGameMoveSets = getThisGameCardsMoveSet(move_dictionary, GameState) // Filter down all possible moves to just the cards in this game
	precomputeOnBoardMoves(thisGameMoveSets)
	if(AIcolor.includes(whosTurn(GameState))){ // If its the AI's turn (and there is an AI) the AI makes a move.
		console.log("Starting game with AI...")
		doAIMove(GameState,whosTurn(GameState))
	}
}


// AI ****************************************************

function timeBasedMinMax(gameState, thinkingStartTime, color){
	//This function will progressively go deeper in depth of search, and stop when it's r un out of time. 
	disposeUnneededStates(EvaluatedStates) // pear down the evaluated states by removing old turns
	StatesMovesLists = {}
	GreatestDepthSearched = 0
	var evalMove = {}
	var depthsBestMove = {}
	var depthRemaining = 0
	//Start the thinking loop
	while(getNow() - thinkingStartTime < MaxThinkingTime){
		depthRemaining++
		const thisEvalMove = minmaxMoveFind(gameState,depthRemaining,0,-Infinity,Infinity, (color == "R"),thinkingStartTime)
		if(getNow() - thinkingStartTime < MaxThinkingTime){//We completed the search in time, so it should be fine.
			evalMove = thisEvalMove
		}
		depthsBestMove[depthRemaining] = evalMove
		if((evalMove.e == Infinity && color == "R") || (evalMove.e == -Infinity && color =="B")){
			//The current color is winning
			console.log(("Checkmate in "+(evalMove.d)+" moves."))
			break;
		} else if ((evalMove.e == -Infinity && color =="R") || (evalMove.e == Infinity && color == "B")){
			//The current color is losing
			if(depthRemaining > 1){ 
				console.log("Resigning due to mate in "+(evalMove.d)+" moves.")
				//In order to not play a random move, let's see what the best we could come up with is.
				evalMove = depthsBestMove[depthRemaining-1] 
				break;
			}
		}
	}
	console.log("Greatest Depth Searched: "+(GreatestDepthSearched))
	return evalMove
}

function evaluateMoveViaMinMax(gameState,depthRemaining,depth,rBest,bBest,maximizingPlayer,thinkingStartTime 		
		,topMove,topEval,thisMove){
	// Run the evaluation on a move that is known to be legal from a given game state.
	const newGameState = doMove(gameState,thisMove) 
	AImovesEvaluated +=1
	const moveEval = minmaxMoveFind(newGameState,depthRemaining - 1,depth+1,rBest,bBest, !maximizingPlayer,thinkingStartTime)
	if(maximizingPlayer){
		if (moveEval.e >= topEval){
			topMove = thisMove //keep track of the best move
			topEval = moveEval.e
			rBest = Math.max(rBest,topEval)
		} 
	} else {
		if (moveEval.e <= topEval){
			topMove = thisMove //keep track of the best move
			topEval = moveEval.e
			bBest = Math.min(bBest,topEval)
		}
	}

	var finalMoveEval = getEvalMove(topEval,topMove,depthRemaining,depth)
	//Alpha-beta pruning:
	finalMoveEval.b = bBest
	finalMoveEval.r = rBest
	finalMoveEval.p = (bBest < rBest)
	if(finalMoveEval.p){EvaluatedStates[gameState] = finalMoveEval;} //Prepare to prune 
	return finalMoveEval
}



function minmaxMoveFind(gameState,depthRemaining,depth,rBest,bBest,maximizingPlayer,thinkingStartTime){ //return {"e":number,"m":moveString,"d":depthRemaining}
	// Given a game state, and a depth, recursively get the best move until bottom depth or game over node
	// maximizingPlayer true if Red, false if Blue
	if (getNow() - thinkingStartTime > MaxThinkingTime){ return {};}// Ran out of time, we won't be using this search anyway.
	GreatestDepthSearched = Math.max(GreatestDepthSearched,depth) // For tracking purposes only
	const priorEval = EvaluatedStates[gameState] // Grab an existing eval for this game state, so we only have to look up once.
	if (priorEval && priorEval.d >= depthRemaining){ return priorEval;} //If it's deeper than we have now, use it.

	const staticEval = staticEvaluation(gameState)
	if(depthRemaining == 0 || Math.abs(staticEval) == Infinity) { 
		//Either we won't be searching further, or we've reached an end node of the game, or we've run out of thiniking time.
		const finalMove = getEvalMove(staticEval,"",Math.abs(staticEval) == Infinity ? Infinity : 0,depth)
		EvaluatedStates[gameState] = finalMove
		return finalMove
	}

	var topMove = {}
	var topEval = (maximizingPlayer ? -Infinity : Infinity) // Depending on the player trying to optimize, the "top" is either infinity of negative infinity (Red is trying to go up, blue down)
	const turn = whosTurn(gameState)
	const piecesForPlayersTurn = getColorPieceLocations(gameState, turn) // get a list of pieces for the current player's turn
	const cardIDs = getCurrentTurnPlayersCardIDs(gameState)

	if(StatesMovesLists[gameState]){ //we already have a list of moves, with associated evals.
		const sortedMovesList = StatesMovesLists[gameState].sort((a, b) => (a.e < b.e) ? 1 : -1)
		for (let thisMoveEval of sortedMovesList){//sort the evals, this will optimize for alpha-beta pruning.
			const thisMove = thisMoveEval.m
			const moveEval = evaluateMoveViaMinMax(gameState,depthRemaining,depth,rBest,bBest,maximizingPlayer,thinkingStartTime 		
				,topMove,topEval,thisMove,true)
			topMove = moveEval.m
			topEval = moveEval.e
			rBest = moveEval.r
			bBest = moveEval.b
			if (moveEval.p){ return moveEval;}// Prune by alpha-beta pruning
		}
	} else {//We've never seen this set of moves before.
		StatesMovesLists[gameState] = []
		var canPrune = false
		//Begin iterating through moves
		for (let pieceSpace of piecesForPlayersTurn){ // Loop through all the pieces the current player has on the board
			//get the square number for that piece
			for (let cardID of cardIDs){ 
				const startKey = turn+"-"+cardID+"-"+pieceSpace //defines the starting move, which is the key to our precomputed moves.
				const targetLocations = PrecomputedBoardMoves[startKey] //List of places this pieces can move from here using this card
				if(!targetLocations){ continue;} // If we don't have any moves with this card, then we move on.
				for (let targetLocation of targetLocations){ // Loop through the precomputed legal moves makeable with those cards for the given piece
					const targetLocationPiece = gameState[targetLocation] // what, if anything, is one this space
					const thisMove = {"cardID":cardID,"color":turn,"startLocation":pieceSpace,"targetLocation":targetLocation}
					const moveIsLegal = isLegal(gameState,thisMove)
					if(moveIsLegal) { //If the target doesn't have a same color piece	
						//This is a legal move, let's enact it, and run the game state
						var moveEval = {}
						if(!canPrune){ //Evaluate the next move, unless we can prune. 
							moveEval = evaluateMoveViaMinMax(gameState,depthRemaining,depth,rBest,bBest,maximizingPlayer,thinkingStartTime 		
								,topMove,topEval,thisMove)
							topMove = moveEval.m
							topEval = moveEval.e
							rBest = moveEval.r
							bBest = moveEval.b
						} else { // Even if we prune, we still want to keep all the remaining moves in a list, but assume they are bad. 
							topEval = (maximizingPlayer ? -Infinity : Infinity)
						}
						
						StatesMovesLists[gameState].push({"m":thisMove,"e":topEval}) //keep track of all moves we've evaluated. 
						canPrune = moveEval.p // We don't want to look at any more moves, but still want to write out the possible moves.
					}
				}
			}
		}
	}
	const finalMoveEval = getEvalMove(topEval,topMove,depthRemaining,depth)
	EvaluatedStates[gameState] = finalMoveEval
	return finalMoveEval
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
			, "t": (GameHistory.moveHistory.length+depth)
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
	var thisGameState = "eemeeeeeeeeeeeeeeeeeeeMee";
	var deck = ["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"]
	if (!isStart) {
		thisGameState = thisGameState.shuffle()
	}
	for(var i=0;i<5;i++){
		const randomCardID = deck[Math.floor(Math.random() * deck.length)];
		for( var j = 0; j < deck.length; j++){ 
			if ( deck[j] === randomCardID) { 
				deck.splice(j, 1); 
			}
		}
		thisGameState += randomCardID + (i<4 ? "-" : "X")
	}
	thisGameState += Math.random() > 0.5 ? "R" : "B";
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

function doRealMove(gameState,move){
	//Actually Play out a real move in the game, and record the history
	GameState = doMove(gameState,move)
	recordHistory(move)
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
	if(AIcolor.includes(whosTurn(GameState))){ // If its the AI's turn (and there is an AI), and the game is not over, the AI makes a move.
		doAIMove(GameState,whosTurn(GameState))
	}
}

function doMove(gameState,move){
	gameState = movePiece(gameState,move)
	gameState = rotateCards(gameState, move)
	gameState = changeTurns(gameState) 
	return gameState
}

function recordHistory(move){
	//Keep a record of what has gone on in the game.
	GameHistory.moveHistory.push(move) 
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
function placePieces(gameState){
	// Put the piece divs on the board to reflect the game state
	removeElementsByClass("piece") // remove any pieces if there were any.
	var pieceNum = 0
	for(i=0;i<25;i++){
		var letter = gameState[i]
		if(letter != "e"){
			var leftCoordinate = (507+100*(i%5))
			var topCoordinate = (207+100*Math.floor(i/5))
			var pieceColor = (letter==letter.toUpperCase() ? "red" : "blue")
			var pieceType = (letter.toUpperCase() == "M" ? "master" : "pawn")
			appendHtml("s"+i, "<div id='p"+(pieceNum++)+"' draggable='false' ondragstart='drag(event)' class='piece "+pieceColor+" "+pieceType+"' style='left:0px; top:0px;'></div>")
		} 
	}
}

function placeCards(gameState){
	//Shows where the cards are in the game, based on the game state
	setClassStyleValue("cardSlot","background-image","none")// Erase any cards from a prior state
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


}

function colorlastSquare(gameHistory){
	setClassStyleValue("boardSquare","background-color","beige")
	var moves = gameHistory.moveHistory
	console.log(stringifyMove(moves[moves.length -1]))
	document.getElementById("s"+moves[moves.length -1].targetLocation).style["background-color"] = "tan"
}

function selectCard(slot){
	if (GameIsOver) return;
	var currentTurnPlayer = whosTurn(GameState)
	var cardSlotPlayer = slot[1]
	setClassAttributeToValue("piece","draggable","False") //set nothing to be draggable. If needed, we'll set somethings to be draggable
	if(currentTurnPlayer == cardSlotPlayer) { // check that it's the right player's turn.
		if ("cardID" in currentMoveUI && currentMoveUI["cardID"] == document.getElementById(slot).innerText ){ 
			// If we're clicking on the same card, unselect
			document.getElementById(slot).style["border-color"] = "white"
			delete currentMoveUI["cardID"]
		} else {
			//clicking on a new card, unselect everything else, and select this one. 
			setClassStyleValue("cardSlot","border-color","white")
			document.getElementById(slot).style["border-color"] = "gold"
			currentMoveUI["cardID"] = document.getElementById(slot).innerText
			if (currentTurnPlayer == "R"){ // Red's turn
				setClassAttributeToValue("piece red","draggable","True")
				currentMoveUI["color"] = "R"
			}else{ // Blue's turn
				setClassAttributeToValue("piece blue","draggable","True")
				currentMoveUI["color"] = "B"

			}
		}
	}
}

function allowDrop(ev) {
	// This must always be true. 
	ev.preventDefault();
}

function drag(ev) {
	// fires when we start to move the piece. Let's see what it's legal moves are. 
	var data = ev.dataTransfer.setData("text", ev.target.id);
	var data = ev.dataTransfer.getData("text"); // ID of the piece
	currentMoveUI["startLocation"] = parseInt(document.getElementById(data).parentElement.id.split("s")[1]) //

}

function drop(ev) {
	ev.preventDefault();
	var targetSquare = ev.target
	if (targetSquare.id.includes("p")){ //If we're moving onto another piece, we need to know that piece's location (parent ID)
		targetSquare = targetSquare.parentElement
	}
	var targetSpaceNum = parseInt(targetSquare.id.split("s")[1])

	currentMoveUI["targetLocation"] = targetSpaceNum
	if (isLegal(GameState,currentMoveUI)){// check for legal move
		doRealMove(GameState,currentMoveUI)
		doMoveUI(GameState,currentMoveUI)
	} 
}

function doMoveUI(gameState,currentMoveUI){
	//Actually enact the move - also take care of the UI
	if(!PlayerCanMove) return gameState
	setClassAttributeToValue("piece","draggable","False")//set nothing to be draggable. If needed, we'll set somethings to be draggable
	setClassStyleValue("cardSlot","border-color","white")
}

function updateUI(gameState,move){
	placePieces(gameState)
	placeCards(gameState)
	colorlastSquare(GameHistory)
	currentMoveUI = {}
}



function isLegal(gameState,move){ //Check if a move made in the UI is legal
	if (move.color != whosTurn(gameState)) return false // can't move on the wrong turn
	var lookUpString = move.color + "-" + move.cardID + "-" + move.startLocation
	var boardLegal = PrecomputedBoardMoves[lookUpString].includes(move.targetLocation) //is it in the precomputed board moves
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
	var letters = "abcde"
	return letters[n%5] + (Math.floor(n/5)+1)
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

function setClassAttributeToValue(classID,attribute,value){
	var elements = document.getElementsByClassName(classID)
	for (let element of elements){
		element.setAttribute(attribute,value)
	}
}