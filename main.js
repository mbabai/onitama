var GameState = "ppmppeeeeeeeeeeeeeeePPMPP05-09-12-13-07XR"
var GameHistory = {"gameStart":"", "moveHistory":[]}
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
move_image_names = {
	"00": "monkey"
	, "01": "tiger"
	, "02": "dragon"
	, "03": "crab"
	, "04": "elephant"
	, "05": "mantis"
	, "06": "crane"
	, "07": "boar"
	, "08": "horse"
	, "09": "ox"
	, "10": "cobra"
	, "11": "eel"
	, "12": "rooster"
	, "13": "goose"
	, "14": "frog"
	, "15": "rabbit"
}
move_sets_raw = {
	"00": ["fr","br","fl","bl"] 				//Monkey
	, "01": ["ff","b"] 							//Tiger
	, "02": ["frr","fll","br","bl"]				//Dragon
	, "03": ["f","rr","ll"]						//Crab
	, "04": ["l","r","fl","fr"]					//Elephant
	, "05": ["fl","fr","b"]						//Mantis
	, "06": ["f","br","bl"]						//Crane
	, "07": ["l","r","f"]						//Boar
	, "08": ["l","b","f"]						//Horse
	, "09": ["r","b","f"]						//Ox
	, "10": ["l","br","fr"]						//Cobra
	, "11": ["r","bl","fl"]						//Eel
	, "12": ["l","r","bl","fr"]					//Rooster
	, "13": ["l","r","fl","br"]					//Goose
	, "14": ["ll","br","fl"]					//Frog
	, "15": ["bl","rr","fr"]					//Rabbit
}

precomputedBoardMoves = {} // this will store actual possible spaces for any move, from any square. index =  color+cardID+SquareNum
currentMoveUI = {} //this is a dictionary to build up the current move through the UI


$(document).ready(function(){
	main()
})

// Logic flow ********************************************
function main(){
	startNewGame()
}

function startNewGame(){
	GameState = createRandomGameState()
	GameHistory.gameStart = GameState
	var thisGameMoveSets = getThisGameCardsMoveSet(move_sets_raw, GameState) // Filter down all possible moves to just the cards in this game
	precomputeOnBoardMoves(thisGameMoveSets)
	placePieces(GameState)
	placeCards(GameState)
}


// AI ****************************************************

function staticEvaluation(gameState){// Evaluate a board. Red is "positive" blue is "negative"
	if(!gameState.includes("m") || gameState[2] == "M"){ // Either there is no blue master, or the red master is in the blue temple
		return Infinity //Red wins
	} else if (!gameState.includes("M") || gameState[22] == "m"){ // Either there is no red master, or the blue master is in the red temple
		return -Infinity //Blue wins
	}
	else {
		var bluePawnsCount = gameState.countLetters("p")
		var redPawnsCount =  gameState.countLetters("P")
		var redMasterPos = gameState.indexOf("M") 
		var blueMasterPos = gameState.indexOf("m") 
		var redMasterLocationEval = (4 - Math.floor(redMasterPos/5)) - (Math.abs(redMasterPos%5 - 2)) // How close is Red master to blue temple (manhattan Distance)
		var blueMasterLocationEval = (Math.floor(blueMasterPos/5)) - (Math.abs(blueMasterPos%5 - 2))  // How close is Blue master to red temple (manhattan Distance)
		var endGamePercent = 10*(8 - (bluePawnsCount + redPawnsCount))/8 // How deep are we into the end game (as measure by total pawns)
		
		var evaluation = 5*(redPawnsCount - bluePawnsCount) // The difference between number of pawns 
		evaluation += endGamePercent * (redMasterLocationEval - blueMasterLocationEval) // As endgame approaches, master distance to enemy temple matters more.
		return evaluation
	}
}

function countPossiblePlies(gameState){
	//Count the number of board legal plies (moves for one side) of the current player.
	var turn = whosTurn(gameState)
	var countPlies = 0
	var piecesForPlayersTurn = getColorPieceLocations(gameState, turn)
	for (var i = 0; i < piecesForPlayersTurn.length; i++) {
		var pieceSpace = piecesForPlayersTurn[i]
		getCurrentTurnPlayersCardIDs(gameState).forEach(function(cardID){
			var startKey = turn+"-"+cardID+"-"+pieceSpace //defines the starting move, which is the key to our precomputed moves.
			for (var i = precomputedBoardMoves[startKey].length - 1; i >= 0; i--) {
				var targetLocationPiece = gameState[precomputedBoardMoves[startKey][i]]
				if( !( (targetLocationPiece == (turn == "R" ? "M": "m")) || (targetLocationPiece == (turn == "R" ? "P": "p")) ) ) {//If the target doesn't have a same color piece
					countPlies += 1 //Count this as a valid move.
				}
			}
		})
	}
	return countPlies
}

//SETUP ***************************************************
function createRandomGameState(isStart = true){
	var thisGameState = "ppmppeeeeeeeeeeeeeeePPMPP";
	var deck = ["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15"]
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
				precomputedBoardMoves[color+"-"+cardID.toString()+"-"+spaceNum.toString()] = outputMoveList
			}
		})
	}
}

function getThisGameCardsMoveSet(move_sets_raw, gameState) {
	// Filter down all possible moves to just the cards in this game
	var thisGameMoves = {}
	//Extract the moves from the game state
	var move0Index = getRedMoveCardIDs(gameState)[0]
	var move1Index = getRedMoveCardIDs(gameState)[1]
	var move2Index = getBlueMoveCardIDs(gameState)[0]
	var move3Index = getBlueMoveCardIDs(gameState)[1]
	var move4Index = getNeutralMoveCardID(gameState) 
	//Add the moves into this game's specific moves
	thisGameMoves[move0Index] = move_sets_raw[move0Index]
	thisGameMoves[move1Index] = move_sets_raw[move1Index]
	thisGameMoves[move2Index] = move_sets_raw[move2Index]
	thisGameMoves[move3Index] = move_sets_raw[move3Index]
	thisGameMoves[move4Index] = move_sets_raw[move4Index]
	return thisGameMoves

}

function doMove(move,gameState){
	gameState = movePiece(gameState,move)
	gameState = rotateCards(gameState, move)
	gameState = changeTurns(gameState) 
	recordHistory(move)
	console.log( "Game predicted score: "+staticEvaluation(gameState))
	return gameState
}

function recordHistory(move){
	//Keep a record of what has gone on in the game.
	GameHistory.moveHistory.push(move_image_names[move.cardID] +"-"+ move.color+"-"+ move.startLocation.toString() +"-"+ move.targetLocation.toString()) 
}

function movePiece(gameState,move){
	//Enact the move, and update the game state.
	gameState = gameState.replaceAt(move.targetLocation, gameState[move.startLocation]) //The piece will now be in the right place
	gameState = gameState.replaceAt(move.startLocation,"e") //empty the space it left
	return gameState
}

function rotateCards(gameState, move){
	// Find the old card, and the neurtral card, and swap them. 
	var oldNeutralCard = getNeutralMoveCardID(gameState) //Get the Neutral Card
	var usedCardIndex = gameState.indexOf(move.cardID) //Get the locatin of the used card
	gameState = gameState.replaceAt(37,move.cardID).replaceAt(usedCardIndex,oldNeutralCard) //swaparoo!!!
	return gameState
}

function changeTurns(gameState){
	// this changes who's turn is next, by flipping the last letter in gameState form B to R or vice versa.
	var currentTurn = gameState[gameState.length-1]
	var newTurn = (currentTurn == "R" ? "B" : "R")
	return gameState.replaceAt(gameState.length-1,newTurn)
}


// VISUAL ********************************************************
function placePieces(gameState){
	// Put the piece divs on the board to reflect the game state
	$(".piece").remove() // remove any pieces if there were any.
	var pieceNum = 0
	for(i=0;i<25;i++){
		var letter = gameState[i]
		if(letter != "e"){
			var leftCoordinate = (507+100*(i%5))
			var topCoordinate = (207+100*Math.floor(i/5))
			var pieceColor = (letter==letter.toUpperCase() ? "red" : "blue")
			var pieceType = (letter.toUpperCase() == "M" ? "master" : "pawn")
			$("#s"+i).append("<div id='p"+(pieceNum++)+"' draggable='false' ondragstart='drag(event)' class='piece "+pieceColor+" "+pieceType+"' style='left:0px; top:0px;'></div>")
		} 
	}
}

function placeCards(gameState){
	//Shows where the cards are in the game, based on the game state
	$(".cardSlot").css("background-image", "none"); // Erase any cards from a prior state
	var turnPlayer = whosTurn(gameState)
	if (turnPlayer == "R"){
		$("#neutralRed").css("background-image", "url('images/" + move_image_names[getNeutralMoveCardID(gameState)] + ".jpeg')");
		$("#neutralRed").text(getNeutralMoveCardID(gameState))
	} else {
		$("#neutralBlue").css("background-image", "url('images/" + move_image_names[getNeutralMoveCardID(gameState)] + ".jpeg')");
		$("#neutralBlue").text(getNeutralMoveCardID(gameState))
	}
	$("#pBc1").css("background-image", "url('images/" + move_image_names[getBlueMoveCardIDs(gameState)[0]] + ".jpeg')");
	$("#pBc1").text(getBlueMoveCardIDs(gameState)[0])
	$("#pBc2").css("background-image", "url('images/" + move_image_names[getBlueMoveCardIDs(gameState)[1]] + ".jpeg')");
	$("#pBc2").text(getBlueMoveCardIDs(gameState)[1])
	$("#pRc1").css("background-image", "url('images/" + move_image_names[getRedMoveCardIDs(gameState)[0]] + ".jpeg')");
	$("#pRc1").text(getRedMoveCardIDs(gameState)[0])
	$("#pRc2").css("background-image", "url('images/" + move_image_names[getRedMoveCardIDs(gameState)[1]] + ".jpeg')");
	$("#pRc2").text(getRedMoveCardIDs(gameState)[1])
}

function selectCard(slot){
	var currentTurnPlayer = whosTurn(GameState)
	var cardSlotPlayer = slot[1]
	$("[draggable='True']").attr('draggable', 'False'); //set nothing to be draggable. If needed, we'll set somethings to be draggable
	if(currentTurnPlayer == cardSlotPlayer) { // check that it's the right player's turn.
		if ("cardID" in currentMoveUI && currentMoveUI["cardID"] == $("#"+slot).text()){ 
			// If we're clicking on the same card, unselect
			$(".cardSlot").css("border-color","white")
			delete currentMoveUI["cardID"]
		} else {
			//clicking on a new card, unselect everything else, and select this one. 
			$(".cardSlot").css("border-color","white")
			$("#"+slot).css("border-color","gold")
			currentMoveUI["cardID"] = $("#"+slot).text()
			if (currentTurnPlayer == "R"){ // Red's turn
				$(".piece.red").attr('draggable', 'True')
				currentMoveUI["color"] = "R"
			}else{ // Blue's turn
				$(".piece.blue").attr('draggable', 'True')
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
	currentMoveUI["startLocation"] = parseInt($("#"+data).parent().attr('id').split("s")[1])

}

function drop(ev) {
	ev.preventDefault();
	var targetSquare = ev.target
	if (targetSquare.id.includes("p")){ //If we're moving onto another piece, we need to know that piece's location (parent ID)
		targetSquare = targetSquare.parentElement
	}
	var targetSpaceNum = parseInt(targetSquare.id.split("s")[1])

	currentMoveUI["targetLocation"] = targetSpaceNum
	if (isLegal(currentMoveUI)){// check for legal move
		// PERHAPS UNCOMMENT THIS
		//var data = ev.dataTransfer.getData("text");
		//targetSquare.appendChild(document.getElementById(data));
		GameState = doMoveUI(currentMoveUI,GameState)
	} 
	if(staticEvaluation(GameState) == Infinity){
		alert("Red wins!!!")
	}else if(staticEvaluation(GameState) == -Infinity){
		alert("Blue wins!!!")
	}
}

function doMoveUI(currentMoveUI,gameState){
	//Actually enact the move - also take care of the UI
	gameState = doMove(currentMoveUI,gameState)
	currentMoveUI = {}
	$("[draggable='True']").attr('draggable', 'False'); //set nothing to be draggable. If needed, we'll set somethings to be draggable
	$(".cardSlot").css("border-color","white")
	placePieces(gameState)
	placeCards(gameState)
	return gameState
}



function isLegal(moveUI){ //Check if a move made in the UI is legal 
	var lookUpString = moveUI.color + "-" + moveUI.cardID + "-" + moveUI.startLocation
	var boardLegal = precomputedBoardMoves[lookUpString].includes(moveUI.targetLocation) //is it in the precomputed board moves
	// Move is legal if it's on the board && to an empty space || to an enemy piece. 
	return boardLegal && (GameState[moveUI.targetLocation] == "e" || !areSameCase(GameState[moveUI.targetLocation],GameState[moveUI.startLocation]))
}


// UTILITY ************************************************************
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