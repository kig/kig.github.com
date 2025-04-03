const landingOverlay = document.getElementById("landingOverlay");
const startRecordingButton = document.getElementById("startRecording");
startRecordingButton.addEventListener("click", async () => {
    landingOverlay.style.display = "none";
    await init();
});

// If we're in WeChat, show the viewInBrowserOverlay
if (/micromessenger/i.test(navigator.userAgent)) {
    const viewInBrowserOverlay = document.getElementById(
        "viewInBrowserOverlay"
    );
    viewInBrowserOverlay.style.display = "flex";
}

window.onmousedown = (e) => {
    slowMotionVideo.muted = false;
};

document.body.classList.add("no-camera");

const init = async () => {
    let updateLoop = null;

    let durationSeconds = 5;
    let playbackRate = 1;

    // Realtime video element
    const video = document.getElementById("video");
    // Camera selector
    const cameraSelect = document.getElementById("cameraSelect");

    // Slow motion video
    const slowMotionVideo = document.getElementById("slowMotionVideo");
    slowMotionVideo.playbackRate = playbackRate;

    const referenceVideo = document.getElementById("referenceVideo");

    const countdownContainer = document.getElementById("countdown");

    const extraStyle = document.createElement("style");
    extraStyle.innerHTML = ``;
    document.head.appendChild(extraStyle);

    function setDuration(durationSeconds) {
        durationSeconds = durationSeconds;

        if (durationSeconds === 0) {
            document.body.classList.add("manual");
        } else {
            document.body.classList.remove("manual");
        }

        if (recorder.state === "recording") {
            restartRecording();
        }
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
        setDuration(durationSeconds);
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

    let stream = null;
    let recorder = null;
    let playingSlowMotion = false;
    let stopTimeout = null;
    let recordingStartTime = 0;
    let playbackStartTime = 0;

    function startRecording() {
        clearTimeout(stopTimeout);
        recorder.start();
        recordingStartTime = Date.now();
        document.body.classList.add("recording");
        if (referenceVideo) {
            referenceVideo.currentTime = 0;
            referenceVideo.playbackRate = 1;
            referenceVideo.play();
        }
        if (durationSeconds > 0) {
            stopTimeout = setTimeout(stopRecording, durationSeconds * 1000);
        }
    }

    function stopRecording() {
        clearTimeout(stopTimeout);
        document.body.classList.remove("recording");
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
        this.parentElement.parentElement
            .querySelectorAll("video")
            .forEach((video) => {
                if (video !== this) {
                    video.pause();
                }
            });
    }

    let lastStartCameraTime = 0;
    async function startCamera(deviceId) {
        if (Date.now() - lastStartCameraTime > 3000) {
            lastStartCameraTime = Date.now();
        } else {
            // Avoid spamming startCamera.
            return;
        }
        const constraints = {
            video: {
                deviceId: deviceId ? deviceId : undefined,
                facingMode: deviceId ? undefined : "user",
                width: 1920,
                height: 1080,
                frameRate: 240,
            },
            audio: true,
        };
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
        if (recorder) {
            recorder.stop();
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch(err) {
            document.body.classList.add("camera-error");
            console.error(err);
            return;
        }
        document.body.classList.remove("no-camera");
        document.body.classList.remove("camera-error");
        const cameras = stream.getVideoTracks();
        if (cameras.length > 0) {
            cameraSelect.value = cameras[0].getSettings().deviceId;
        }
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
                playbackStartTime = Date.now();
                document.body.classList.remove("paused");
                // Add the recorded video to #recordingsList
                // Delete the oldest recording if there are more than maxRecordings of them
                const recordingsList =
                    document.getElementById("recordingsList");
                const isMobile = /mobile|android/i.test(navigator.userAgent);
                const maxRecordings = isMobile ? 3 : 5;
                if (recordingsList.children.length >= maxRecordings) {
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

                // Add a "Use as reference" button to the recording
                const referenceButton = document.createElement("button");
                referenceButton.textContent = "⚑";
                referenceButton.addEventListener("click", () => {
                    referenceVideo.src = slowMotionVideoUrl;
                    document.body.classList.add("reference");
                });
                recordingContainer.appendChild(referenceButton);

                // Set title to hour:minute:second
                const recordingTitle = document.createElement("h3");
                recordingTitle.textContent = new Date().toLocaleTimeString();
                recordingContainer.appendChild(recordingTitle);

                recordingsList.appendChild(recordingContainer);

                // Play animation to tell the user that the recording has been
                // added to the list of recordings. This should look like the
                // current frame of the video flying to the left side of the
                // screen and disappearing.
                const recordingAnimationFrame =
                    document.body.querySelector(".recordingAnimationFrame") ||
                    document.createElement("canvas");
                recordingAnimationFrame.width = video.videoWidth / 5;
                recordingAnimationFrame.height = video.videoHeight / 5;
                const recordingAnimationFrameCtx =
                    recordingAnimationFrame.getContext("2d");
                recordingAnimationFrameCtx.drawImage(
                    video,
                    0,
                    0,
                    recordingAnimationFrame.width,
                    recordingAnimationFrame.height
                );
                recordingAnimationFrame.className = "recordingAnimationFrame";
                document.body.appendChild(recordingAnimationFrame);

                if (referenceVideo && referenceVideo.src) {
                    referenceVideo.playbackRate = playbackRate;
                    referenceVideo.currentTime = 0;
                    referenceVideo.play();
                }
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
        if (!updateLoop) {
            updateLoop = setInterval(() => {
                // The update loop runs an animation loop and monitors the video stream status.
                //
                // If we don't have a camera stream, try starting one.
                // During recording and playback, we update the progress bar widths and trigger countdown timers.
                if (stream.getTracks().some((track) => track.readyState === "ended")) {
                    document.body.classList.add("no-camera");
                    // Assert that all the tracks in the stream are active.
                    startCamera(cameraSelect.value);
                }
                if (isPaused) return;
                if (playingSlowMotion) {
                    const elapsedMs = Date.now() - playbackStartTime;
                    const pct =
                        (elapsedMs / ((durationSeconds / playbackRate) * 1e3)) *
                        100;
                    playbackProgressBar.firstChild.style.width = `${pct}%`;
                    const remaining = durationSeconds - elapsedMs * 1e-3;
                    // Animate the countdown timer
                    // The countdown animation is:
                    // - Fade in "Recording in" at 4s remaining
                    // - Fade in .countdown-3 at 3s remaining and fade it out
                    // - Fade in .countdown-2 at 2s remaining and fade it out
                    // - Fade in .countdown-1 at 1s remaining and fade it out
                    countdownContainer.classList.toggle(
                        "recording-in",
                        remaining <= 4
                    );
                    countdownContainer.classList.toggle(
                        "countdown-3",
                        remaining <= 3 && remaining > 2
                    );
                    countdownContainer.classList.toggle(
                        "countdown-2",
                        remaining <= 2 && remaining > 1
                    );
                    countdownContainer.classList.toggle(
                        "countdown-1",
                        remaining <= 1 && remaining > 0
                    );
                } else {
                    const elapsed = Date.now() - recordingStartTime;
                    const pct = (elapsed / durationSeconds / 1000) * 100;
                    recordingProgressBar.firstChild.style.width = `${pct}%`;
                }
            }, 10);
        }
    }

    await startCamera();
    await getCameras();
    cameraSelect.addEventListener("change", () =>
        startCamera(cameraSelect.value)
    );
    setDuration(durationSeconds);

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
    let isPaused = false;
    pauseButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        // Pause all playing videos in recordingsList
        document.querySelectorAll("#recordingsList video").forEach((video) => {
            video.pause();
        });
        if (playingSlowMotion) {
            if (slowMotionVideo.paused) {
                isPaused = false;
                slowMotionVideo.play();
                document.body.classList.remove("paused");
                playbackStartTime = Date.now() - recordingElapsed;
            } else {
                isPaused = true;
                slowMotionVideo.pause();
                document.body.classList.add("paused");
                recordingElapsed = Date.now() - playbackStartTime;
            }
        } else {
            if (recorder.state === "recording") {
                isPaused = true;
                recorder.pause();
                recordingElapsed = Date.now() - recordingStartTime;
                clearTimeout(stopTimeout);
                document.body.classList.add("paused");
            } else {
                isPaused = false;
                recorder.resume();
                recordingStartTime = Date.now() - recordingElapsed;
                if (durationSeconds > 0) {
                    stopTimeout = setTimeout(
                        stopRecording,
                        durationSeconds * 1000 - recordingElapsed
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

    const cameraRetryButton = document.getElementById("cameraErrorRetry");
    cameraRetryButton.addEventListener("click", async () => {
        await startCamera(cameraSelect.value);
    });

    layoutSideBySide.onclick = () => document.body.classList.remove('layout-overlay');
    layoutOverlay.onclick = () => document.body.classList.add('layout-overlay');

    layoutFit.onclick = () => document.body.classList.remove('layout-fill');
    layoutFill.onclick = () => document.body.classList.add('layout-fill');
};
