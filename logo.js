(function() {
    var canvas = E.id('logo');
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var draw = function(t) {
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        {
            ctx.translate(w/2, h/2);
            ctx.lineWidth = 1;
            ctx.lineJoin = 'miter';
            ctx.fillStyle = '#000';
            ctx.strokeStyle = '#888';

            var r = 140;
            var logoHeight = 2*r/Math.E;
            var logoWidth = logoHeight/Math.E;
            var lh = logoHeight/2;
            var lw = logoWidth/2;

            var s = Math.min(1, t/500);
            s = 0.5-0.5*Math.cos(s*Math.PI);
            ctx.save();
            {
                ctx.scale(s, s);
                ctx.globalAlpha = s;

                // circle
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI*2, false);
                // ctx.stroke();

                // logo
                ctx.beginPath();
                ctx.moveTo(0, lh*1.1);
                ctx.lineTo(0, -lh);
                ctx.lineTo(lw, -lh+lw);
                ctx.lineTo(lw, lh-lw);
                ctx.lineTo(-lw*1.1, lh-lw);
                ctx.lineTo(0, lh*1.1);
                ctx.stroke();
            }
            ctx.restore();

            s = Math.max(0, Math.min(1, (-200+t)/500));
            s = 0.5-0.5*Math.cos(s*Math.PI);
            ctx.scale(s, s);

            // spokes
            var pi2 = Math.PI*2;
            for (var i=0; i<116; i++) {
                var a = (pi2 * i/58) % pi2;
                var b = (t/1000 + pi2 * (i/58)+i/1000) % pi2;
                var f = Math.sin(t/723);
                var ff = Math.sin(t/1800);
                var z = Math.sin(a)*0.2+ff*ff;
                var x = (Math.cos(a)+f*Math.sin(b));
                var y = Math.sin(b)+(1-f)*Math.cos(a);
                var id = r/Math.sqrt(x*x + y*y + z*z);
                x *= id;
                y *= id;
                z *= id;
                ctx.beginPath();
                ctx.save();
                {
                    /*
                    ctx.translate(x, y);
                    //ctx.rotate(x);
                    //ctx.rotate(a);
                    ctx.rotate(z);
                    ctx.rect(0, 0, 5, 1);
                    */
                    ctx.beginPath();
                    ctx.moveTo(x,y);
                    var dx = x/r;
                    var dy = y/r;
                    var rr = 15;//i%5+5;
                    ctx.lineTo(x+rr*dx, y+rr*dy);
                    var red = Math.abs(x+z)|0;
                    var green = Math.abs(y)|0;
                    var blue = Math.min(255, Math.abs(y+z)|0);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'rgb('+red+','+green+','+blue+')';
                    ctx.stroke();
                }
                ctx.restore();
                ctx.fill();
            }
        }
        ctx.restore();
    };

    var t = 0;
    var tick = function() {
        draw(t);
        t += 16;
        setTimeout(tick, 16);
        //E.requestAnimationFrame(tick, canvas);
    };

    tick();
})();
