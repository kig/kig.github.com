(async () => {
    // Realtime video element
    const video = document.getElementById("video");
    // Camera selector
    const cameraSelect = document.getElementById("cameraSelect");

    // Slow motion video
    const slowMotionVideo = document.getElementById("slowMotionVideo");
    slowMotionVideo.playbackRate = 0.5;

    const countdownContainer = document.getElementById("countdown");

    // const playbackProgress = document.querySelector('#playbackProgressBar > span');
    // const recordingProgress = document.querySelector('#recordingProgressBar > span');
    let recordingStartTime = 0;

    // slowMotionVideo.ontimeupdate = () => {
    //     playbackProgress.style.width = slowMotionVideo.currentTime / 5 * 100 + '%';
    // };
    // video.ontimeupdate = () => {
    //     recordingProgress.style.width = (video.currentTime - recordingStartTime) / 5 * 100 + '%';
    // };

    async function getCameras() {
        cameraSelect.innerHTML = "";
        const devices = await navigator.mediaDevices.enumerateDevices();
        let index = 0;
        devices.forEach((device) => {
            if (device.kind === "videoinput") {
                const option = document.createElement("option");
                option.value = device.deviceId;
                option.text = device.label || `Camera ${index + 1}`;
                index++;
                cameraSelect.appendChild(option);
            }
        });
    }

    async function startCamera(deviceId) {
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                width: { min: 640, ideal: 1920, max: 7680 },
                height: { min: 480, ideal: 1080, max: 4320 },
                frameRate: { min: 30, ideal: 240, max: 240 },
            },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        const threeSecondBlobs = [];
        let playingSlowMotion = false;
        const recorder = new MediaRecorder(stream, {
            videoBitsPerSecond: 30000000,
        });
        recorder.ondataavailable = (event) => {
            if (!playingSlowMotion) {
                threeSecondBlobs.push(event.data);
                const slowMotionVideoUrl = URL.createObjectURL(
                    new Blob(threeSecondBlobs, { type: recorder.mimeType })
                );
                slowMotionVideo.src = slowMotionVideoUrl;
                threeSecondBlobs.length = 0;
                playingSlowMotion = true;
                slowMotionVideo.play();
                slowMotionVideo.playbackRate = 0.5;
                slowMotionVideo.onended = () => {
                    URL.revokeObjectURL(slowMotionVideoUrl);
                    playingSlowMotion = false;
                    recorder.start();
                    recordingStartTime = video.currentTime;
                    document.body.classList.add("countdown");
                    setTimeout(() => {
                        document.body.classList.remove("countdown");
                        recorder.stop();
                    }, 5000);
                };
            }
        };
        recorder.start();
        recordingStartTime = video.currentTime;
        document.body.classList.add("countdown");
        setTimeout(() => {
            document.body.classList.remove("countdown");
            recorder.stop();
        }, 5000);
        video.addEventListener('play', () => {
            slowMotionVideo.width = video.videoWidth;
            slowMotionVideo.height = video.videoHeight;
        });
    }

    await startCamera();
    await getCameras();
    cameraSelect.addEventListener("change", () =>
        startCamera(cameraSelect.value)
    );

    // Make tapping on videoContainer make it fullscreen
    const videoContainer = document.querySelector(".videoContainer");
    videoContainer.addEventListener("click", () => {
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) {
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) {
            videoContainer.msRequestFullscreen();
        }
    });

    const cameraRotateButton = document.getElementById("cameraRotate");
    let rotation = 0;
    cameraRotateButton.addEventListener("click", async () => {
        rotation = (rotation + 90) % 360;
        let zoom = (rotation % 180 === 0) ? 1 : video.videoHeight / video.videoWidth;
        video.style.transform = `rotate(${rotation}deg) scale(${zoom})`;
        slowMotionVideo.style.transform = `rotate(${rotation}deg) scale(${zoom})`;
    });
})();
