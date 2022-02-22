var GameState = ""



$(document).ready(function(){
	main()
})


function main(){
	GameState = "ppmppeeeeeeeeeeeeeeePPMPP12345"
	resizeCanvas()
	drawAll()
}


// Graphics ***********************************************************************************************
var Buffers = []
var DrawingBuffer = 1
var LastFrameTime = getNow()
var GameScale = 100

window.addEventListener("resize", resizeCanvas);

function resizeCanvas(){
	const mainCanvasHolder = $("#mainCanvasHolder")
	const canvas0 = document.getElementById("mainCanvas0");
  	const canvas1 = document.getElementById("mainCanvas1");
  	Buffers.push(canvas0,canvas1)
	const widthHeightRatio = 1.8
	var limitingSide = "none"
	if($(window).width() >= $(window).height()*widthHeightRatio){
		limitingSide = "height"
		mainCanvasHolder.height($(window).height())
		mainCanvasHolder.width($(window).height()*widthHeightRatio)
		const centerVal = (($(window).width() - mainCanvasHolder.width())/2)+"px"
		mainCanvasHolder.css({left:centerVal})
	}else{
		limitingSide = "width"
		mainCanvasHolder.width($(window).width())
		mainCanvasHolder.height(mainCanvasHolder.width()/widthHeightRatio)
		const centerVal = (($(window).height() - mainCanvasHolder.height())/2)+"px"
		mainCanvasHolder.css({top:centerVal})

	}
	//resize the canvas, in case someone changed the window size
	canvas0.width  = mainCanvasHolder.width();
  	canvas0.height = mainCanvasHolder.height();
	canvas1.width  = mainCanvasHolder.width();
  	canvas1.height = mainCanvasHolder.height();
}


window.requestAnimFrame = (function(){ 
 	return  window.requestAnimationFrame       ||  
	    window.webkitRequestAnimationFrame ||  
	    window.mozRequestAnimationFrame    ||  
	    window.oRequestAnimationFrame      ||  
	    window.msRequestAnimationFrame     ||  
	    function( callback ){ 
	    	window.setTimeout(callback, 1000 / 144); 
	    }; 
})();


function drawAll(){
	//This will draw everything that needs to be drawn, properly swapping the canvases for better view. 
    window.requestAnimFrame(drawAll)
    Buffers[1-DrawingBuffer].style.visibility='visible';
    Buffers[DrawingBuffer].style.visibility='hidden';
    c=Buffers[DrawingBuffer]
    ctx=c.getContext('2d');;
    ctx.clearRect(0,0,c.width,c.height)

    ctx.restore();
    ctx.save()

    drawGame(c,ctx,GameState)
    DrawingBuffer=1-DrawingBuffer;
}

function drawGame(c,ctx,gameState){
	drawEmptyBoard(c,ctx)
	// drawPieces(gameState)
	// drawCards(gameState)
}

function drawEmptyBoard(c,ctx){
	// hard coded widtha and length of 5
	for (let y = 0; y < 5; y++) {
    	for (let x = 0; x < 5; x++) {
    		drawSquare(c,ctx,y,x) 
    	}
  	}
}

function drawSquare(c,ctx,y,x){
	ctx.strokeStyle = "black";
	if (y==0 && x==2){
		ctx.fillStyle = "red";
	} else if (y==4 && x==2){
		ctx.fillStyle = "blue";
	} else{
		ctx.fillStyle = "beige";
	}
	ctx.lineWidth =3;
	ctx.fillRect(c.width/3+x*GameScale,c.height/5+y*GameScale,GameScale,GameScale);
	ctx.strokeRect(c.width/3+x*GameScale,c.height/5+y*GameScale,GameScale,GameScale)
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