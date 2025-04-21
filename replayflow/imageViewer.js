class ImageViewer {
    constructor(containerElement) {
        this.container = containerElement;
        this.image = this.container.querySelector("img");
        this.slider = this.container.querySelector(
            '.slider input[type="range"]'
        );
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.texture = null;
        this.controls = null;

        this.distance = 500;
        this.lon = 0;
        this.lat = 0;
        this.isUserInteracting = false;
        this.onPointerDownPointerX = 0;
        this.onPointerDownPointerY = 0;
        this.onPointerDownLon = 0;
        this.onPointerDownLat = 0;

        this.initThreeJS();
        this.initEventListeners();
        this.animate();
    }

    initThreeJS() {
        // Basic Three.js setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            1,
            1100
        );
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.container.appendChild(this.renderer.domElement); // Append renderer to the container

        // Load the image texture
        this.texture = new THREE.TextureLoader().load(this.image.src, () => {
            // Create sphere geometry and map the texture
            const geometry = new THREE.SphereGeometry(500, 60, 40);
            // Invert the geometry on the x-axis so that all of the faces point inward
            geometry.scale(-1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ map: this.texture });
            const mesh = new THREE.Mesh(geometry, material);
            this.scene.add(mesh);
            this.image.style.display = "none"; // Hide the original img element
        });

        // Device Orientation Controls (optional, if needed)
        this.controls = new THREE.DeviceOrientationControls(this.camera);

        // Initial camera position (will be updated in animate)
        this.camera.target = new THREE.Vector3(0, 0, 0);
    }

    initEventListeners() {
        // Mouse/Touch interaction
        this.renderer.domElement.addEventListener(
            "pointerdown",
            this.onPointerDown.bind(this)
        );
        this.renderer.domElement.addEventListener(
            "pointermove",
            this.onPointerMove.bind(this)
        );
        this.renderer.domElement.addEventListener(
            "pointerup",
            this.onPointerUp.bind(this)
        );
        this.renderer.domElement.addEventListener(
            "wheel",
            this.onDocumentMouseWheel.bind(this),
            { passive: false }
        );

        // Slider interaction
        if (this.slider) {
            this.slider.addEventListener(
                "input",
                this.onSliderInput.bind(this)
            );
            // Initialize slider based on initial lon if needed
            this.slider.value = this.lon % 360;
            if (this.slider.value < 0) this.slider.value += 360; // Ensure positive value
        }

        // Window resize
        window.addEventListener("resize", this.onWindowResize.bind(this));
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect =
            this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );
    }

    onPointerDown(event) {
        this.isUserInteracting = true;
        this.onPointerDownPointerX = event.clientX;
        this.onPointerDownPointerY = event.clientY;
        this.onPointerDownLon = this.lon;
        this.onPointerDownLat = this.lat;
        this.container.style.cursor = "grabbing";
    }

    onPointerMove(event) {
        if (this.isUserInteracting === true) {
            const x = event.clientX;
            const y = event.clientY;
            const dx = x - this.onPointerDownPointerX;
            const dy = y - this.onPointerDownPointerY;
            this.lon = (dx / this.renderer.width) * 360 + onPointerDownLon;
            this.lat = (dy / this.renderer.height) * -360 + onPointerDownLat;
            this.lat = Math.max(-85, Math.min(85, this.lat));
            this.updateSlider(); // Update slider as we drag
        }
    }

    onPointerUp() {
        this.isUserInteracting = false;
        this.container.style.cursor = "grab";
    }

    onDocumentMouseWheel(event) {
        if (!this.camera) return;
        return;
        // Adjust field of view for zoom effect
        const fov = this.camera.fov + event.deltaY * 0.05;
        this.camera.fov = THREE.MathUtils.clamp(fov, 10, 75); // Clamp FOV between 10 and 75
        this.camera.updateProjectionMatrix();
    }

    onSliderInput(event) {
        if (!this.isUserInteracting) {
            // Avoid conflict if user is dragging
            this.lon = parseFloat(event.target.value);
        }
    }

    updateSlider() {
        if (this.slider) {
            let sliderValue = this.lon % 360;
            if (sliderValue < 0) sliderValue += 360; // Ensure positive value 0-360
            this.slider.value = sliderValue;
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.update();
    }

    update() {
        if (!this.camera || !this.scene || !this.renderer) return;
        if (!this.controls || !this.controls.enabled || this.controls.deviceOrientation.alpha === null || this.controls.deviceOrientation.alpha === undefined) {
            // Manual rotation update
            const phi = (Math.PI / 180) * (90 - this.lat);
            const theta = (Math.PI / 180) * this.lon;
            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.cos(phi);
            const z = Math.sin(phi) * Math.sin(theta);
            const camera = this.camera;
            camera.target.set(x, y, z);
            camera.lookAt(camera.target);
            camera.position.set(0, 0, 0);
            camera.fov =
                2 *
                Math.atan(this.renderer.height / (2 * this.distance)) *
                (180 / Math.PI);
            camera.updateProjectionMatrix();
        } else {
            // If using DeviceOrientationControls, update them
            this.controls.update();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.update();
        this.render();
    }
}
