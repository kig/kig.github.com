(async () => {
    let duration = 5;
    let playbackRate = 1;

    // Realtime video element
    const video = document.getElementById("video");
    // Camera selector
    const cameraSelect = document.getElementById("cameraSelect");

    // Slow motion video
    const slowMotionVideo = document.getElementById("slowMotionVideo");
    slowMotionVideo.playbackRate = playbackRate;

    const referenceVideo = document.getElementById("referenceVideo");

    window.onmousedown = (e) => {
        slowMotionVideo.muted = false;
    };

    const countdownContainer = document.getElementById("countdown");

    const extraStyle = document.createElement("style");
    extraStyle.innerHTML = ``;
    document.head.appendChild(extraStyle);

    function setDuration(durationSeconds) {
        duration = durationSeconds;

        if (duration === 0) {
            document.body.classList.add("manual");
        } else {
            document.body.classList.remove("manual");
        }

        restartRecording();

        // Adjust animation durations and animation delays
        const recordingProgressBar = document.querySelector(
            "#recordingProgressBar span"
        );
        recordingProgressBar.style.animationDuration = `${duration}s`;
        const playbackProgressBar = document.querySelector(
            "#playbackProgressBar span"
        );
        playbackProgressBar.style.animationDuration = `${
            duration / playbackRate
        }s`;

        countdownContainer.querySelector(
            ".countdown-3"
        ).style.animationDelay = `${duration / playbackRate - 3}s`;
        countdownContainer.querySelector(
            ".countdown-2"
        ).style.animationDelay = `${duration / playbackRate - 2}s`;
        countdownContainer.querySelector(
            ".countdown-1"
        ).style.animationDelay = `${duration / playbackRate - 1}s`;

        extraStyle.innerHTML = `
        #countdown:before {
            animation-delay: ${duration / playbackRate - 3}s;
        }
        #countdown:after {
            animation-delay: ${duration / playbackRate - 4}s;
        }
        `;
    }

    function setMirror(mirror) {
        if (mirror) {
            videoContainer.classList.add("mirror");
        } else {
            videoContainer.classList.remove("mirror");
        }
        updateRotation();
    }

    const cameraMirrorButton = document.getElementById("cameraMirror");
    cameraMirrorButton.addEventListener("click", () => {
        setMirror(!videoContainer.classList.contains("mirror"));
    });

    const durationSelect = document.getElementById("durationSelect");
    durationSelect.addEventListener("input", () => {
        setDuration(parseFloat(durationSelect.value));
    });

    const speedSelect = document.getElementById("speedSelect");
    speedSelect.addEventListener("input", () => {
        playbackRate = parseFloat(speedSelect.value);
        slowMotionVideo.playbackRate = playbackRate;
        setDuration(duration);
    });

    async function getCameras() {
        cameraSelect.innerHTML = "";
        const devices = await navigator.mediaDevices.enumerateDevices();
        let index = 0;
        devices.forEach((device) => {
            if (device.kind === "videoinput") {
                const option = document.createElement("option");
                const capabilities = device.getCapabilities();
                const resolutionString = ` ${capabilities.width.max}x${capabilities.height.max}@${capabilities.frameRate.max}Hz`;
                option.value = device.deviceId;
                option.text =
                    (device.label || `Camera ${index + 1}`) + resolutionString;
                index++;
                cameraSelect.appendChild(option);
            }
        });
    }

    let recorder = null;
    let playingSlowMotion = false;
    let stopTimeout = null;

    function startRecording() {
        clearTimeout(stopTimeout);
        recorder.start();
        document.body.classList.add("countdown");
        if (referenceVideo) {
            referenceVideo.currentTime = 0;
            referenceVideo.playbackRate = 1;
            referenceVideo.play();
        }
        if (duration > 0) {
            stopTimeout = setTimeout(stopRecording, duration * 1000);
        }
    }

    function stopRecording() {
        clearTimeout(stopTimeout);
        document.body.classList.remove("countdown");
        recorder.stop();
    }

    function restartRecording() {
        if (playingSlowMotion) {
            slowMotionVideo.pause();
            slowMotionVideo.onended();
        } else {
            playingSlowMotion = true;
            stopRecording();
        }
    }

    async function startCamera(deviceId) {
        const constraints = {
            video: {
                deviceId: deviceId ? deviceId : undefined,
                width: 1920,
                height: 1080,
                frameRate: 240,
            },
            audio: true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        recorder = new MediaRecorder(stream, {
            videoBitsPerSecond: 30000000,
            mimeType: "video/mp4",
        });

        recorder.ondataavailable = (event) => {
            if (!playingSlowMotion) {
                const threeSecondBlobs = [event.data];
                const slowMotionVideoUrl = URL.createObjectURL(
                    new Blob(threeSecondBlobs, { type: recorder.mimeType })
                );
                slowMotionVideo.src = slowMotionVideoUrl;
                playingSlowMotion = true;
                slowMotionVideo.play();
                slowMotionVideo.playbackRate = playbackRate;
                referenceVideo.playbackRate = playbackRate;
                referenceVideo.currentTime = 0;
                referenceVideo.play();
                slowMotionVideo.onended = () => {
                    URL.revokeObjectURL(slowMotionVideo.src);
                    playingSlowMotion = false;
                    startRecording();
                };
            } else {
                playingSlowMotion = false;
                startRecording();
            }
        };
        startRecording();

        video.addEventListener("play", () => {
            slowMotionVideo.width = video.videoWidth;
            slowMotionVideo.height = video.videoHeight;
        });
    }

    await startCamera();
    await getCameras();
    cameraSelect.addEventListener("change", () =>
        startCamera(cameraSelect.value)
    );

    // Make download button download the currently playing video
    const downloadVideoButton = document.getElementById("downloadVideo");
    downloadVideoButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const a = document.createElement("a");
        a.href = slowMotionVideo.src;
        a.download = "replayflow.mp4";
        a.mimeType = "video/mp4";
        a.click();
    });

    // Rewind button seeks the currently playing video to the beginning
    const rewindButton = document.getElementById("rewind");
    rewindButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        slowMotionVideo.currentTime = 0;
    });

    // Pause button stops the video playback at the current position and shows the video controls
    const pauseButton = document.getElementById("pause");
    pauseButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (slowMotionVideo.paused) {
            slowMotionVideo.play();
            slowMotionVideo.controls = false;
        } else {
            slowMotionVideo.pause();
            slowMotionVideo.controls = true;
        }
    });

    const referenceVideoInput = document.getElementById("referenceVideoInput");
    referenceVideoInput.addEventListener("change", (ev) => {
        const videoFile = ev.target.files[0];
        if (referenceVideo.src) {
            URL.revokeObjectURL(referenceVideo.src);
        }
        if (videoFile) {
            document.body.classList.add("reference");
            referenceVideo.src = URL.createObjectURL(videoFile);
        } else {
            document.body.classList.remove("reference");
        }
    })

    // Reference video button opens a file picker to set the reference video
    const referenceButton = document.getElementById("setReferenceVideo");
    referenceButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        referenceVideoInput.click();
    });

    // Make manual recording button start / stop recording
    const manualRecordingButton = document.getElementById("manualRecording");
    manualRecordingButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (recorder.state === "recording") {
            stopRecording();
        } else {
            startRecording();
        }
    });

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

    const exitFullscreenButton = document.getElementById("exitFullscreen");
    exitFullscreenButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    });

    // #controlsToggle toggles the #controls drawer
    const controlsToggle = document.getElementById("controlsToggle");
    const controls = document.getElementById("controls");
    controlsToggle.addEventListener("click", () => {
        controls.classList.toggle("open");
    });

    const cameraRotateButton = document.getElementById("cameraRotate");
    let rotation = 0;
    function updateRotation() {
        let zoom =
            rotation % 180 === 0
                ? 1
                : Math.max(
                      video.videoWidth / video.videoHeight,
                      video.videoHeight / video.videoWidth
                  );
        const mirror = videoContainer.classList.contains("mirror") ? -1 : 1;
        video.style.transform = `rotate(${rotation}deg) scaleX(${mirror}) scale(${zoom})`;
        slowMotionVideo.style.transform = `rotate(${rotation}deg) scaleX(${mirror}) scale(${zoom})`;
    }
    cameraRotateButton.addEventListener("click", async () => {
        rotation = (rotation + 90) % 360;
        updateRotation();
    });
})();
