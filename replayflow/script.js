const landingOverlay = document.getElementById("landingOverlay");
const startRecordingButtons = document.querySelectorAll(".startRecording");
startRecordingButtons.forEach((btn) =>
    btn.addEventListener("click", async () => {
        landingOverlay.style.display = "none";
        await init();
    })
);

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

// Check if localStorage has replayflow-onboarding-done set
const onboardingDone = localStorage.getItem("replayflow-onboarding-done") === "true";
let firstDialogDone = !onboardingDone;
let secondDialogDone = onboardingDone;

// Camera selector
const cameraSelect = document.getElementById("cameraSelect");
const microphoneSelect = document.getElementById("microphoneSelect");

async function getCameras() {
    cameraSelect.innerHTML = "";
    microphoneSelect.innerHTML = "";
    const devices = await navigator.mediaDevices.enumerateDevices();
    let index = 0;
    let micIndex = 0;
    // Add all video and audio input devices to the select elements
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
        } else if (device.kind === "audioinput") {
            const option = document.createElement("option");
            option.value = device.deviceId;
            option.text =
                device.label || `Microphone ${micIndex + 1}`;
            micIndex++;
            microphoneSelect.appendChild(option);
        }
    });
    // Add a "None" option to the camera and microphone select elements
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.text = "None";
    cameraSelect.appendChild(noneOption);
    microphoneSelect.appendChild(noneOption.cloneNode(true));
}

const init = async () => {

    // Move cameraSelect and microphoneSelect to #cameraSelects
    const cameraSelects = document.getElementById("cameraSelects");
    if (!onboardingDone) {
        const deviceId = cameraSelect.value;
        const audioDeviceId = microphoneSelect.value;
        cameraSelects.appendChild(cameraSelect);
        cameraSelects.appendChild(microphoneSelect);
        cameraSelect.value = deviceId;
        microphoneSelect.value = audioDeviceId;
    }

    let isPaused = false;

    let updateLoop = null;

    let durationSeconds = 5;
    let actualDurationSeconds = 5;
    let playbackRate = 1;

    // Realtime video element
    const videoContainer = document.body.querySelector(".videoContainer");
    const video = document.getElementById("video");

    // Slow motion video
    const slowMotionVideo = document.getElementById("slowMotionVideo");
    slowMotionVideo.playbackRate = playbackRate;

    const referenceVideo = document.getElementById("referenceVideo");

    const countdownContainer = document.getElementById("countdown");

    const extraStyle = document.createElement("style");
    extraStyle.innerHTML = ``;
    document.head.appendChild(extraStyle);

    function setDuration(newDurationSeconds) {
        durationSeconds = newDurationSeconds;

        if (durationSeconds === 0) {
            document.body.classList.add("manual");
        } else {
            document.body.classList.remove("manual");
        }

        takeNumber = 1;

        if (recorder.state === "recording") {
            actualDurationSeconds = durationSeconds;
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

    const pipCheckbox = document.getElementById("pipCheckbox");
    pipCheckbox.addEventListener("click", () => {
        if (pipCheckbox.checked) {
            videoContainer.classList.remove('no-pip');
        } else {
            videoContainer.classList.add('no-pip');
        }
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

    let stream = null;
    let recorder = null;
    let playingSlowMotion = false;
    let stopTimeout = null;
    let recordingStartTime = 0;
    let playbackStartTime = 0;

    let takeNumber = 1;

    async function startRecording() {
        clearTimeout(stopTimeout);
        if (recorder.state === "recording") {
            // Already recording, stop it
            await stopRecording();
        }
        recorder.start();
        recordingStartTime = Date.now();
        document.body.classList.add("recording");
        playingSlowMotion = false;
        slowMotionVideo.src = "";
        if (referenceVideo) {
            referenceVideo.currentTime = 0;
            referenceVideo.playbackRate = 1;
            referenceVideo.play();
        }
        if (durationSeconds > 0) {
            stopTimeout = setTimeout(stopRecording, durationSeconds * 1000);
        }
    }

    async function stopRecording() {
        clearTimeout(stopTimeout);
        document.body.classList.remove("recording");
        await recorder.stop();
    }

    async function restartRecording() {
        if (playingSlowMotion) {
            slowMotionVideo.pause();
            slowMotionVideo.onended();
        } else {
            playingSlowMotion = true;
            await stopRecording();
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
    let noMediaDeviceMode = false;
    async function startCamera(deviceId, audioDeviceId) {
        if (deviceId === "" && audioDeviceId === "") {
            // If both are empty, we can't getUserMedia.
            // The right thing to do would be to show a blank screen with
            // the recording timer progress bar and a message saying 
            // "No camera or microphone selected".
            document.body.classList.add("no-media-device-selected");
            noMediaDeviceMode = true;
            playingSlowMotion = false;
            if (recorder) {
                await stopRecording();
                recorder = null;
            }
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                stream = null;
            }
            if (video.srcObject) {
                video.srcObject = null;
            }
            if (slowMotionVideo.src) {
                slowMotionVideo.src = "";
            }
            return;
        }
        document.body.classList.remove("no-media-device-selected");
        noMediaDeviceMode = false;
        if (Date.now() - lastStartCameraTime > 3000) {
            lastStartCameraTime = Date.now();
        } else {
            // Avoid spamming startCamera.
            return;
        }
        const constraints = {
            video: deviceId === "" ? false : ({
                deviceId: deviceId ? deviceId : undefined,
                facingMode: deviceId ? undefined : "user",
                width: 1920,
                height: 1080,
                frameRate: 60,
            }),
            audio: audioDeviceId === "" ? false : ({
                deviceId: audioDeviceId ? audioDeviceId : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                sampleSize: 16,
            }),
        };
        if (recorder) {
            await stopRecording();
            recorder = null;
        }
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
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
        video.onplay = () => {
            slowMotionVideo.width = video.videoWidth;
            slowMotionVideo.height = video.videoHeight;
        };
        if (!updateLoop) {
            updateLoop = setInterval(() => {
                // The update loop runs an animation loop and monitors the video stream status.
                //
                // If we don't have a camera stream, try starting one.
                // During recording and playback, we update the progress bar widths and trigger countdown timers.
                if (
                    !stream ||
                    stream
                        .getTracks()
                        .some((track) => track.readyState === "ended")
                ) {
                    document.body.classList.add("no-camera");
                    // Assert that all the tracks in the stream are active.
                    startCamera(cameraSelect.value, microphoneSelect.value);
                }
                if (isPaused) return;
                if (playingSlowMotion) {
                    const elapsedMs = Date.now() - playbackStartTime;
                    const pct =
                        (elapsedMs / ((actualDurationSeconds / playbackRate) * 1e3)) *
                        100;
                    playbackProgressBar.firstChild.style.width = `${pct}%`;
                    const remaining = (actualDurationSeconds / playbackRate) - elapsedMs * 1e-3;
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
        
        recorder = new MediaRecorder(stream, {
            videoBitsPerSecond: 30000000,
            mimeType: "video/mp4",
        });

        recorder.ondataavailable = function(event) {
            if (!playingSlowMotion) {
                const threeSecondBlobs = [event.data];
                const slowMotionVideoUrl = URL.createObjectURL(
                    new Blob(threeSecondBlobs, { type: event.target.mimeType })
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
                const unpinnedRecordings = recordingsList.querySelectorAll('.recordingContainer:not(.pinned)');
                if (unpinnedRecordings.length >= maxRecordings) {
                    const deletedRecording = unpinnedRecordings[unpinnedRecordings.length - 1];
                    URL.revokeObjectURL(deletedRecording.dataset.videoSrc);
                    recordingsList.removeChild(deletedRecording);
                }
                const recordingContainer = document.createElement("div");
                recordingContainer.className = "recordingContainer";
                // Poster image
                const poster = document.createElement("canvas");
                // If we're audio-only, use a play button as the poster
                if (!video.videoWidth || !video.videoHeight) {
                    poster.width = 128;
                    poster.height = 128;
                    const posterCtx = poster.getContext("2d");
                    posterCtx.fillStyle = "black";
                    posterCtx.fillRect(0, 0, poster.width, poster.height);
                    posterCtx.fillStyle = "white";
                    posterCtx.font = "bold 64px sans-serif";
                    posterCtx.textAlign = "center";
                    posterCtx.textBaseline = "middle";
                    posterCtx.fillText("▶", 64, 64);
                } else {
                    // Set the poster size to 1/5 of the video size
                    poster.width = video.videoWidth / 5;
                    poster.height = video.videoHeight / 5;
                    const posterCtx = poster.getContext("2d");
                    posterCtx.drawImage(
                        video,
                        0,
                        0,
                        poster.width,
                        poster.height
                    );
                }
                poster.className = "poster";
                recordingContainer.dataset.videoSrc = slowMotionVideoUrl;
                poster.onclick = (ev) => {
                    const recording = document.createElement("video");
                    recording.src = recordingContainer.dataset.videoSrc;
                    recording.controls = true;
                    recording.loop = true;
                    recording.onplay = pauseOthers;
                    recording.dataset.durationSeconds = actualDurationSeconds;
                    recording.playbackRate = playbackRate;
                    recordingContainer.insertBefore(
                        recording,
                        poster
                    );
                    recording.play();
                    recording.requestFullscreen();
                    poster.style.display = "none";
                    // When exiting fullscreen remove the video and bring back the poster
                    recording.onfullscreenchange = (ev) => {
                        if (
                            document.fullscreenElement === null &&
                            recordingContainer.parentElement
                        ) {
                            recordingContainer.removeChild(recording);
                            poster.style.display = "block";
                        }
                    };
                };
                recordingContainer.appendChild(poster);

                // Add a download button to download the recording
                const downloadButton = document.createElement("button");
                downloadButton.textContent = "↧";
                const recordingDate = new Date();
                const recordingTakeNumber = takeNumber++;
                downloadButton.addEventListener("click", () => {
                    const dateString = recordingDate
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
                        `ReplayFlow_${dateString}_Take_${recordingTakeNumber}.mp4`,
                        "video/mp4"
                    );
                });
                recordingContainer.appendChild(downloadButton);

                // // Add a fullscreen button to view the recording in fullscreen
                // const fullscreenButton = document.createElement("button");
                // fullscreenButton.textContent = "⛶";
                // fullscreenButton.addEventListener("click", () => {
                //     recording.requestFullscreen();
                // });
                // recordingContainer.appendChild(fullscreenButton);

                // Add a "Use as reference" button to the recording
                const referenceButton = document.createElement("button");
                referenceButton.textContent = "⚑";
                referenceButton.addEventListener("click", () => {
                    referenceVideo.src = slowMotionVideoUrl;
                    document.body.classList.add("reference");
                });
                recordingContainer.appendChild(referenceButton);

                // Add a "Pin" button to pin the recording so that it's not deleted
                const pinButton = document.createElement("button");
                if (recordingTakeNumber === 1) {
                    // Pin the first take
                    recordingContainer.classList.add("pinned");
                    pinButton.textContent = "📍";
                } else {
                    pinButton.textContent = "📌";
                }
                pinButton.addEventListener("click", () => {
                    if (recordingContainer.classList.contains("pinned")) {
                        recordingContainer.classList.remove("pinned");
                        pinButton.textContent = "📌";
                    } else {
                        recordingContainer.classList.add("pinned");
                        pinButton.textContent = "📍";
                    }
                });
                recordingContainer.appendChild(pinButton);

                // Set title to hour:minute:second
                const recordingTitle = document.createElement("h3");
                recordingTitle.textContent = `Take #${recordingTakeNumber}`;
                recordingContainer.appendChild(recordingTitle);

                recordingsList.prepend(recordingContainer);

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
                slowMotionVideo.onended = async () => {
                    playingSlowMotion = false;

                    if (!secondDialogDone) {
                        document.body.classList.add('recording');
                        const dialog = document.getElementById("secondRecordingDialog");
                        dialog.showModal();
                        secondDialogDone = true;
                        localStorage.setItem("replayflow-onboarding-done", "true");
                        const closeButton = document.getElementById("secondRecordingGo");
                        await new Promise((resolve) => {
                            closeButton.addEventListener("click", () => {
                                dialog.close();
                                resolve();
                            });
                        });
                    }
                    startRecording();
                };
            } else {
                playingSlowMotion = false;
                startRecording();
            }
        };
        startRecording();

    }


    function stopCamera() {
        clearTimeout(stopTimeout);
        document.body.classList.remove("recording");
        if (recorder) {
            recorder.stop();
        }
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }
        slowMotionVideo.onended = null;
        slowMotionVideo.src = "";
        video.srcObject = null;
        recordingStartTime = 0;
        playbackStartTime = 0;
    }

    if (!firstDialogDone) {
        document.body.classList.add('recording');
        const dialog = document.getElementById("firstRecordingDialog");
        document.getElementById('firstDialogCameraSelects').append(cameraSelect, microphoneSelect);
        dialog.showModal();
        firstDialogDone = true;
        const closeButton = document.getElementById("firstRecordingGo");
        await new Promise((resolve) => {
            closeButton.addEventListener("click", () => {
                dialog.close();
                const deviceId = cameraSelect.value;
                const audioDeviceId = microphoneSelect.value;
                cameraSelects.append(cameraSelect, microphoneSelect);
                cameraSelect.value = deviceId;
                microphoneSelect.value = audioDeviceId;
                resolve();
            });
        });
    }
    await startCamera(cameraSelect.value, microphoneSelect.value);
    cameraSelect.addEventListener("change", () =>
        startCamera(cameraSelect.value, microphoneSelect.value)
    );
    microphoneSelect.addEventListener("change", () =>
        startCamera(cameraSelect.value, microphoneSelect.value)
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


    // Add a fast-forward (ffwd) button to discard current recording/playback and start a new one
    const ffwdButton = document.getElementById("fastForward");
    ffwdButton.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        // Stop any ongoing playback or recording
        if (playingSlowMotion) {
            slowMotionVideo.pause();
            playingSlowMotion = false;
            slowMotionVideo.onended();
        } else if (recorder && recorder.state === "recording") {
            restartRecording();
        }
    });

    document.addEventListener("keydown", (ev) => {
        if (ev.key === " ") {
            // Space presses pause button
            ev.preventDefault();
            ev.stopPropagation();
            pauseButton.click();
        } else if (ev.key === "f") {
            // F key presses enterFullscreen/exitFullscreen button
            ev.preventDefault();
            ev.stopPropagation();
            if (
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            ) {
                exitFullscreenButton.click();
            } else {
                enterFullscreenButton.click();
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

    // Make tapping on enterFullscreen button enter fullscreen
    const enterFullscreenButton = document.getElementById("enterFullscreen");
    enterFullscreenButton.addEventListener("click", () => {
        if (document.body.requestFullscreen) {
            document.body.requestFullscreen();
        } else if (document.body.webkitRequestFullscreen) {
            document.body.webkitRequestFullscreen();
        } else if (document.body.msRequestFullscreen) {
            document.body.msRequestFullscreen();
        }
    });

    // If there's no fullscreen API support, hide the enterFullscreen button
    const iPhone = /iphone/i.test(navigator.userAgent);
    if (
        iPhone ||
        !(
            document.body.requestFullscreen ||
            document.body.webkitRequestFullscreen ||
            document.body.msRequestFullscreen
        )
    ) {
        enterFullscreenButton.style.display = "none";
    }

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
        if (rotation % 180 !== 0) {
            videoContainer.classList.add('rotated');
        } else {
            videoContainer.classList.remove('rotated');
        }
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
        await startCamera(cameraSelect.value, microphoneSelect.value);
    });

    layoutSideBySide.onclick = () =>
        document.body.classList.remove("layout-overlay");
    layoutOverlay.onclick = () => document.body.classList.add("layout-overlay");

    layoutFit.onclick = () => document.body.classList.remove("layout-fill");
    layoutFill.onclick = () => document.body.classList.add("layout-fill");
};



// If we landed here from ?pwa, hide the landing overlay and go directly to init()
if (location.search.includes("?pwa")) {
    document.body.querySelector('#landing').style.display = "none";
    document.body.querySelector('main').style.display = "flex";
    init();
}


async function onboardingStep(step) {
    if (step === 1 || onboardingDone) {
        await getCameras();
    }
    if (onboardingDone) {
        step = 4;
    }
    if (step === 3) {
        document.body.classList.add("acquiring-camera");
        try {
            const deviceId = cameraSelect.value;
            const audioDeviceId = microphoneSelect.value;
            const dev = await navigator.mediaDevices.getUserMedia({
                video: (deviceId ? { deviceId: deviceId } : false),
                audio: (audioDeviceId ? { deviceId: audioDeviceId } : false),
            });            
            dev.getTracks().forEach(t => t.stop());
            document.body.classList.remove("acquiring-camera");
        } catch (e) {
            document.body.classList.add("camera-error");
            console.error(e);
            return;
        }
    }
    document.body.dataset.onboarding = step;
    if (onboardingDone) {
        init();
    }
}

function startPracticing() {
    onboardingStep(4);
    init();
}

function selectAll(element) {
    // Set document selection to element's text
    const selection = window.getSelection();
    selection.removeAllRanges();

    const range = document.createRange();
    range.selectNodeContents(element);

    selection.addRange(range);
}
