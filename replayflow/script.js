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

        if (recorder.state === "recording") {
            restartRecording();
        }

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
    let recordingStartTime = 0;

    function startRecording() {
        clearTimeout(stopTimeout);
        recorder.start();
        recordingStartTime = Date.now();
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

    function downloadVideo(url, filename, mimeType) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.mimeType = mimeType;
        a.click();
    }

    function pauseOthers() {
        this.parentElement.parentElement.querySelectorAll('video').forEach(video => {
            if (video !== this) {
                video.pause();
            }
        });
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
                document.body.classList.remove("paused");
                // Add the recorded video to #recordingsList
                // Delete the oldest recording if there are more than 5
                const recordingsList =
                    document.getElementById("recordingsList");
                if (recordingsList.children.length > 5) {
                    URL.revokeObjectURL(recordingsList.children[0].src);
                    recordingsList.removeChild(recordingsList.children[0]);
                }
                const recordingContainer = document.createElement("div");
                const recording = document.createElement("video");
                recording.src = slowMotionVideoUrl;
                recording.controls = true;
                recording.loop = true;
                recording.onplay = pauseOthers;
                recordingContainer.appendChild(recording);

                // Add a download button to download the recording
                const downloadButton = document.createElement("button");
                downloadButton.textContent = "↧";
                downloadButton.addEventListener("click", () => {
                    const dateString = new Date()
                        .toLocaleString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })
                        .replace(/[\/]/g, "-")
                        .replace(/[ :]/g, "_");
                    downloadVideo(
                        slowMotionVideoUrl,
                        `replayflow_${dateString}.mp4`,
                        "video/mp4"
                    );
                });
                recordingContainer.appendChild(downloadButton);

                // Add a fullscreen button to view the recording in fullscreen
                const fullscreenButton = document.createElement("button");
                fullscreenButton.textContent = "⛶";
                fullscreenButton.addEventListener("click", () => {
                    recording.requestFullscreen();
                });
                recordingContainer.appendChild(fullscreenButton);

                // Set title to hour:minute:second
                const recordingTitle = document.createElement("h3");
                recordingTitle.textContent = new Date().toLocaleTimeString();
                recordingContainer.appendChild(recordingTitle);

                recordingsList.appendChild(recordingContainer);

                referenceVideo.playbackRate = playbackRate;
                referenceVideo.currentTime = 0;
                referenceVideo.play();
                slowMotionVideo.onended = () => {
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
    setDuration(duration);

    // // Make download button download the currently playing video
    // const downloadVideoButton = document.getElementById("downloadVideo");
    // downloadVideoButton.addEventListener("click", (ev) => {
    //     ev.preventDefault();
    //     ev.stopPropagation();
    //     const a = document.createElement("a");
    //     a.href = slowMotionVideo.src;
    //     a.download = "replayflow.mp4";
    //     a.mimeType = "video/mp4";
    //     a.click();
    // });

    // // Rewind button seeks the currently playing video to the beginning
    // const rewindButton = document.getElementById("rewind");
    // rewindButton.addEventListener("click", (ev) => {
    //     ev.preventDefault();
    //     ev.stopPropagation();
    //     slowMotionVideo.currentTime = 0;
    // });

    // Pause button stops the video playback at the current position and shows the video controls
    const pauseButton = document.getElementById("pause");
    let recordingElapsed = 0;
    pauseButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        // Pause all playing videos in recordingsList
        document.querySelectorAll("#recordingsList video").forEach(video => {
            video.pause();
        });
        if (playingSlowMotion) {
            if (slowMotionVideo.paused) {
                slowMotionVideo.play();
                document.body.classList.remove("paused");
            } else {
                slowMotionVideo.pause();
                document.body.classList.add("paused");
            }
        } else {
            if (recorder.state === "recording") {
                recorder.pause();
                recordingElapsed = Date.now() - recordingStartTime;
                clearTimeout(stopTimeout);
                document.body.classList.add("paused");
            } else {
                recorder.resume();
                recordingStartTime = Date.now() - recordingElapsed;
                if (duration > 0) {
                    stopTimeout = setTimeout(
                        stopRecording,
                        duration * 1000 - recordingElapsed
                    );
                }
                document.body.classList.remove("paused");
            }
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
    });

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
        if (document.body.requestFullscreen) {
            document.body.requestFullscreen();
        } else if (document.body.webkitRequestFullscreen) {
            document.body.webkitRequestFullscreen();
        } else if (document.body.msRequestFullscreen) {
            document.body.msRequestFullscreen();
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
