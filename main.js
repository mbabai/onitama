var GameState = "ppmppeeeeeeeeeeeeeeePPMPP0101010101-0"
/* 
p = blue pawn
m = blue master
P = red pawn
M = red master
e = empty square

-0 = red's turn
-1 = blue's turn

first two two-digit numbers = red's move cards
second two two-digit numbers = blue's move cards
last one two-digit number = neutral card

moves:
01 = monkey

*/



$(document).ready(function(){
	main()
})


function main(){
	placePieces(GameState)
	// placeCards(GameState)
}

function placePieces(gameState){
	for(i=0;i<25;i++){
		var letter = gameState[i]
		if(letter != "e"){
			var leftCoordinate = (507+100*(i%5))
			var topCoordinate = (207+100*Math.floor(i/5))
			var pieceColor = (letter==letter.toUpperCase() ? "redPiece" : "bluePiece")
			var pieceType = (letter.toUpperCase() == "M" ? "master" : "pawn")
			$("#board").append("<div class='piece "+pieceColor+" "+pieceType+"' style='left:"+leftCoordinate+"px; top:"+topCoordinate+"px;'></div>")
		} 
	}
}

function allowDrop(ev) {
	ev.preventDefault();
  }
  
  function drag(ev) {
	ev.dataTransfer.setData("text", ev.target.id);
  }
  
  function drop(ev) {
	ev.preventDefault();
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