
var canvas = document.getElementById('c');
if (canvas) {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	var ctx = canvas.getContext('2d');

	ctx.translate(0, canvas.height);
	ctx.scale(1, -1);

	var drawLeaf = function() {
		leafCount++;
		ctx.beginPath();
		ctx.moveTo(0,0);
		var xd = Math.random()-0.5;
		var c = [
			xd*40, Math.random()*40,
			(xd*(1.0+Math.random()))*40, Math.random()*40,
			(xd*(2.0*Math.random()))*40, Math.random()*20
		];
		var c2 = [
			c[2], c[3]-4,
			c[0], c[1]-4,
			0, 0
		];
		ctx.bezierCurveTo.apply(ctx, c);
		ctx.bezierCurveTo.apply(ctx, c2);
		ctx.fill();  
	};

	var drawCorn = function(x, y) {
		ctx.beginPath();
		for (var i=0, l=8; i<l; i++) {
			seedCount++;
			ctx.lineTo(x, i*4+y);
			ctx.lineTo(i%2+x+1, i*4+y+3);
			ctx.lineTo(i%2+x-1, i*4+y+3);
			ctx.lineTo(x, i*4+y);
			ctx.rotate(0.1* (0.5-Math.random()));
		}
		ctx.stroke();
	};

	var drawSegment = function(segmentLength, coords) {
		segCount++;
		var x1 = (Math.random()*20-10) * segmentLength, 
				y1 = (20 + 10 * Math.random()) * segmentLength, 
				x2 = (Math.random()*20-10) * segmentLength, 
				y2 = (50 + 20 * Math.random()) * segmentLength;
		drawLeaf();
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.bezierCurveTo(
			0, 0,
			x1, y1,
			x2, y2
		);
		ctx.stroke();
		ctx.translate(x2, y2);
		coords[0] = x1;
		coords[1] = y1;
		coords[2] = x2;
		coords[3] = y2;
	};

	var count = 0;
	var segCount = 0, leafCount = 0, seedCount = 0;

}

ctx.scale(2, 2);

var coords = [0,0,0,0];

var z = 1;
//for (var z=1; z>0.7; z *= 0.95) {
	for (var x=0; x<canvas.width/z/2; x+=50) {
		for (var j=0; j<1; j++) {
			count++;

			ctx.save(); {

				ctx.translate(x, 0);
				var segmentCount = x / (canvas.width/2) * 4;
				coords[0] = coords[1] = coords[2] = coords[3] = 0;

				for (var i=0; i<4; i++) {
					var seg = (segmentCount - i);
					var segmentLength = Math.max(0, seg);
					segmentLength = Math.min(1, segmentLength);
					segmentLength *= segmentCount / 4;

					drawSegment(segmentLength, coords);
				}

				if (segmentCount > 3) {    
					ctx.save(); {
						var a = -Math.atan2(coords[2]-coords[0], coords[3]-coords[1]);
						ctx.rotate(a+0.1*(Math.random()-0.5));
						drawCorn(0, 0);
					} ctx.restore();
				} else {
					drawLeaf();
				}

			} ctx.restore();
				
		}
	}
	ctx.scale(0.95, 0.95);
//}

console.log('corn stalk count', count);
console.log('segment count', segCount);
console.log('leaf count', leafCount);
console.log('seed count', seedCount);

console.log('estimated triangle count', segCount*50 + leafCount*10 + seedCount*6);