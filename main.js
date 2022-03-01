var GameState = "ppmppeeeeeeeeeeeeeeePPMPP05-09-12-13-07X0"
var GameHistory = {"gameStart":"", "moveHistory":[]}
/* 
p = blue pawn
m = blue master
P = red pawn
M = red master
e = empty square

X0 = red's turn
X1 = blue's turn

first two two-digit numbers = red's move cards
second two two-digit numbers = blue's move cards
last one two-digit number = neutral card

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


function main(){
	GameState = createRandomGameState()
	GameHistory.gameStart = GameState
	precomputeOnBoardMoves(move_sets_raw)
	placePieces()
	placeCards()
}

//SETUP
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
	thisGameState += Math.random() > 0.5 ? "1" : "0";
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
					var forwardCount = rawMove.split("f").length -1;
					var backwardCount = rawMove.split("b").length -1;
					var rightCount = rawMove.split("r").length -1;
					var leftCount = rawMove.split("l").length -1;
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

function doMove(move){
	//Enact the move, and update the game state.
	GameState = GameState.replaceAt(move.targetLocation, GameState[move.startLocation]) //The piece will now be in the right place
	GameState = GameState.replaceAt(move.startLocation,"e") //empty the space it left
	var oldNeutralCard = GameState.substring(25,27) //Get the Neutral Card
	var usedCardIndex = GameState.indexOf(move.cardID) //Get the locatin of the used card
	GameState = GameState.replaceAt(25,move.cardID).replaceAt(usedCardIndex,oldNeutralCard) //swaparoo!!!
	var flipBit = (1 - parseInt(GameState[GameState.length-1])).toString() // Flip the bit at the end of the string
	GameState = GameState.replaceAt(GameState.length-1,flipBit) // this changes who's turn is next
	GameHistory.moveHistory.push(move_image_names[move.cardID] +"-"+ move.color+"-"+ move.startLocation.toString() +"-"+ move.targetLocation.toString()) 
}


// VISUAL ********************************************************
function placePieces(){
	// Put the piece divs on the board to reflect the game state
	$(".piece").remove() // remove any pieces if there were any.
	var pieceNum = 0
	for(i=0;i<25;i++){
		var letter = GameState[i]
		if(letter != "e"){
			var leftCoordinate = (507+100*(i%5))
			var topCoordinate = (207+100*Math.floor(i/5))
			var pieceColor = (letter==letter.toUpperCase() ? "red" : "blue")
			var pieceType = (letter.toUpperCase() == "M" ? "master" : "pawn")
			$("#s"+i).append("<div id='p"+(pieceNum++)+"' draggable='false' ondragstart='drag(event)' class='piece "+pieceColor+" "+pieceType+"' style='left:0px; top:0px;'></div>")
		} 
	}
}

function placeCards(){
	//Shows where the cards are in the game, based on the game state
	$(".cardSlot").css("background-image", "none"); // Erase any cards from a prior state
	var turnPlayerID = parseInt(GameState.slice(25).split("X")[1])
	var cardState = GameState.slice(25).split("X")[0].split("-")
	cardState.forEach(function (cardID,index){
		switch (index){
			case 0:
				if (turnPlayerID == 0){
					$("#neutralRight").css("background-image", "url('images/" + move_image_names[cardID] + ".jpeg')");
					$("#neutralRight").text(cardID)
				} else {
					$("#neutralLeft").css("background-image", "url('images/" + move_image_names[cardID] + ".jpeg')");
					$("#neutralLeft").text(cardID)

				}
			case 1:
				$("#p1c1").css("background-image", "url('images/" + move_image_names[cardID] + ".jpeg')");
				$("#p1c1").text(cardID)
			case 2:
				$("#p1c2").css("background-image", "url('images/" + move_image_names[cardID] + ".jpeg')");
				$("#p1c2").text(cardID)
			case 3:
				$("#p0c1").css("background-image", "url('images/" + move_image_names[cardID] + ".jpeg')");
				$("#p0c1").text(cardID)
			case 4:
				$("#p0c2").css("background-image", "url('images/" + move_image_names[cardID] + ".jpeg')");
				$("#p0c2").text(cardID)
								}
	})
}

function selectCard(slot){
	var currentTurnPlayer = parseInt(GameState[GameState.length-1])
	var cardSlotPlayer = parseInt(slot[1])
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
			if (currentTurnPlayer == 0){ // Red's turn
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
		doMoveUI(currentMoveUI)
	} 
}

function doMoveUI(currentMoveUI){
	//Actually enact the move - also take care of the UI
	doMove(currentMoveUI)
	currentMoveUI = {}
	$("[draggable='True']").attr('draggable', 'False'); //set nothing to be draggable. If needed, we'll set somethings to be draggable
	$(".cardSlot").css("border-color","white")
	placePieces()
	placeCards()
}



function isLegal(moveUI){ //Check if a move made in the UI is legal 
	var lookUpString = moveUI.color + "-" + moveUI.cardID + "-" + moveUI.startLocation
	var boardLegal = precomputedBoardMoves[lookUpString].includes(moveUI.targetLocation) //is it in the precomputed board moves
	// Move is legal if it's on the board && to an empty space || to an enemy piece. 
	return boardLegal && (GameState[moveUI.targetLocation] == "e" || !areSameCase(GameState[moveUI.targetLocation],GameState[moveUI.startLocation]))
}


// UTILITY ************************************************************

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