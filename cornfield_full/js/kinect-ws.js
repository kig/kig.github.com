(function () {

    if (!window.WebSocket) {
        console.log("Your browser does not support web sockets!");
        return;
    }

    console.log("Connecting to server...");

    // Initialize a new web socket.
    var socket = new WebSocket("ws://localhost:8181");

    // Connection established.
    socket.onopen = function () {
        console.log("Connection successful.");
    };

    // Connection closed.
    socket.onclose = function () {
        console.log("Connection closed.");
    }

    window.skeletonWindow = [];

    var bothHandsInFront = function(sk) {
        if (sk.handleft && sk.handright && sk.head && sk.head.z < 2) {
            // console.log("handleft.z: " + sk.handleft.z + " head.z: " + sk.head.z);
            if (sk.head.z - sk.handleft.z > 0.2 && sk.head.z - sk.handright.z > 0.2) {
                return true;
            }
        }
        return false;
    };

    var handsTogether = function(sk) {
        if (sk.handleft && sk.handright) {
            var d = Math.abs(sk.handleft.x - sk.handright.x);
            console.log("hands dx: " + d);
            if (d < 0.2) {
                return true;
            }
        }
        return false;
    }

    var handsApart = function(sk) {
        if (sk.handleft && sk.handright) {
            var d = Math.abs(sk.handleft.x - sk.handright.x);
            if (d > 1.0) {
                return true;
            }
        }
        return false;
    }

    var skeletonTimeout = 0;

    // Receive data FROM the server!
    socket.onmessage = function (event) {
        if (typeof event.data === "string") {
            // SKELETON DATA

            // Get the data in JSON format.
            var jsonObject = JSON.parse(event.data);
            var skeletons = jsonObject.skeletons;

            // Display the skeleton joints.
            for (var i = 0; i < skeletons.length; i++) {
                for (var j = 0; j < skeletons[i].joints.length; j++) {
                    var joint = skeletons[i].joints[j];
                    skeletons[i][joint.name] = joint;
                }
            }

            var closestSkeleton = 99999;
            for (var i=0; i<skeletons.length; i++) {
                if (skeletons[i].head && skeletons[i].head.z < closestSkeleton) {
                    closestSkeleton = skeletons[i].head.z;
                }
            }

            if (closestSkeleton < 2) {
                document.getElementById('i-see-you').classList.remove('fade-out');
            } else {
                document.getElementById('i-see-you').classList.add('fade-out');                
            }
            clearTimeout(skeletonTimeout);
            skeletonTimeout = setTimeout(function() {
                document.getElementById('i-see-you').classList.add('fade-out');                
            }, 500);

            attractBirds = scareBirds = false;

            for (var i = 0; i < skeletons.length; i++) {
                var sk = skeletons[i];
                // If both hands are in front of the body, start tracking grass grow gesture.
                if (bothHandsInFront(sk)) {
                    if (handsTogether(sk)) {
                        attractBirds = true;
                    } else if (handsApart(sk)) {
                        scareBirds = true;
                    } else {
                        var y = ((sk.handleft.y - sk.head.y) + 0.2) / 0.3 + 1;
                        grassHeight = y;
                    }
                }
            }
            grassHeight = Math.max(Math.min(grassHeight, 1.5), 0);

            window.skeletonWindow.push( jsonObject.skeletons );
            if (window.skeletonWindow.length > 200) {
                window.skeletonWindow.splice(0, window.skeletonWindow.length-100);
            }

        }
    };

})();