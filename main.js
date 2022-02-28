var GameState = "ppmppeeeeeeeeeeeeeeePPMPP00-01-02-03-04X1"
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
move_sets_raw = {
	"00": ["fr","br","fl","bl"] 				//Monkey
	, "01": ["ff","b"] 							//Tiger
	, "02": ["frr","fll","br","bl"]				//Dragon
	, "03": ["f","rr","ll"]						//Crab
	, "04": ["l","r","fl","fr"]					//Elephant
}
blue020: []

precomputedBoardMoves = {} // this will store actual possible spaces for any move, from any square: index color+cardID+SquareNum
currentMoveUI = {} //this is a dictionary to build up the current move through the UI


$(document).ready(function(){
	main()
})


function main(){
	precomputeOnBoardMoves(move_sets_raw)
	placePiecesStart(GameState)
	placeCards(GameState)
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
							outputMoveList.push(spaceNum+forwardCount*5 - backwardCount*5 - rightCount + leftCount)
						}
					}
				})
				precomputedBoardMoves[color+"-"+cardID.toString()+"-"+spaceNum.toString()] = outputMoveList
			}
		})
	}
}


// VISUAL ********************************************************
function placePiecesStart(gameState){
	// Put the piece divs on the board at the start of the game
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
	//Shows where the cards are in the game.
	var turnPlayerID = parseInt(gameState.slice(25).split("X")[1])
	var cardState = gameState.slice(25).split("X")[0].split("-")
	cardState.forEach(function (cardID,index){
		switch (index){
			case 0:
				if (turnPlayerID == 0){
					$("#neutralRight").text(cardID)
				} else {
					$("#neutralLeft").text(cardID)
				}
			case 1:
				$("#p1c1").text(cardID)
			case 2:
				$("#p1c2").text(cardID)
			case 3:
				$("#p0c1").text(cardID)
			case 4:
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
			}else{ // Blue's turn
				$(".piece.blue").attr('draggable', 'True')
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
	console.log("starting to move from space:"+currentMoveUI["startLocation"])

}

function drop(ev) {
	ev.preventDefault();
	console.log("Attempting to move here!")
	//TODO: Check if this is actually legal
	var data = ev.dataTransfer.getData("text");
	ev.target.appendChild(document.getElementById(data));
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