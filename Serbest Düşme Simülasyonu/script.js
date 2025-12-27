const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const heightInput = document.getElementById('height');
const heightVal = document.getElementById('height-val');
const gravityInput = document.getElementById('gravity');
const gravityVal = document.getElementById('gravity-val');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const timeDisplay = document.getElementById('time-display');
const heightDisplay = document.getElementById('height-display');
const velocityDisplay = document.getElementById('velocity-display');

// Constants
const GROUND_OFFSET = 50; // pixels from bottom
const BALL_RADIUS = 15;
const MAX_HEIGHT_POSSIBLE = 220; // m (slightly more than max slider)

// State
let state = {
    h0: 100, // m
    g: 9.81, // m/s^2
    t: 0,    // s
    y: 100,  // m
    v: 0,    // m/s
    running: false,
    startTime: 0,
    animationId: null,
    trail: [] // Store previous positions
};

// Scale Factor (Pixels per Meter)
let scalePPM = 1;

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    // Calculate scale to fit 200m vertical
    scalePPM = (canvas.height - GROUND_OFFSET - 50) / MAX_HEIGHT_POSSIBLE;
    draw();
}

function updateScale() {
    // Re-calculate in case window resized
    scalePPM = (canvas.height - GROUND_OFFSET - 50) / MAX_HEIGHT_POSSIBLE;
}

function metersToPixels(m) {
    return canvas.height - GROUND_OFFSET - (m * scalePPM);
}

function drawGrid() {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = '12px Space Mono';
    ctx.textAlign = 'right';

    // Draw horizontal lines every 20m
    for (let h = 0; h <= MAX_HEIGHT_POSSIBLE; h += 20) {
        const y = metersToPixels(h);

        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        ctx.fillText(h + 'm', 50, y + 4);
    }

    // Draw Ground
    // Use a gradient for ground
    const groundGradient = ctx.createLinearGradient(0, canvas.height - GROUND_OFFSET, 0, canvas.height);
    groundGradient.addColorStop(0, '#1e293b');
    groundGradient.addColorStop(1, '#0f172a');

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - GROUND_OFFSET, canvas.width, GROUND_OFFSET);

    // Glowing Ground Line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - GROUND_OFFSET);
    ctx.lineTo(canvas.width, canvas.height - GROUND_OFFSET);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#6366f1';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
}

function drawTrail() {
    if (state.trail.length < 2) return;

    ctx.beginPath();
    const x = canvas.width / 2;
    ctx.moveTo(x, metersToPixels(state.trail[0]));

    for (let i = 1; i < state.trail.length; i++) {
        ctx.lineTo(x, metersToPixels(state.trail[i]));
    }

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan trail
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 5;
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
}

function drawBall(y_m) {
    const y_px = metersToPixels(y_m);
    const x_px = canvas.width / 2;

    // Shadow on ground
    if (y_m > 0) {
        const groundY = metersToPixels(0);
        ctx.beginPath();
        ctx.ellipse(x_px, groundY, BALL_RADIUS * (1 + y_m / 100), BALL_RADIUS * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.4 / (1 + y_m / 20)})`;
        ctx.fill();
    }

    // Ball Glow
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 20;

    // Ball Body
    ctx.beginPath();
    ctx.arc(x_px, y_px - BALL_RADIUS, BALL_RADIUS, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(
        x_px - BALL_RADIUS / 3, y_px - BALL_RADIUS - BALL_RADIUS / 3, BALL_RADIUS / 4,
        x_px, y_px - BALL_RADIUS, BALL_RADIUS
    );
    gradient.addColorStop(0, '#c084fc'); // Lighter purple
    gradient.addColorStop(1, '#7e22ce'); // Darker purple

    ctx.fillStyle = gradient;
    ctx.fill();

    // Rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.shadowBlur = 0; // Reset
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawTrail();
    drawBall(state.y);
}

function updateStats() {
    timeDisplay.textContent = state.t.toFixed(2) + ' s';
    heightDisplay.textContent = Math.max(0, state.y).toFixed(2) + ' m';
    velocityDisplay.textContent = state.v.toFixed(2) + ' m/s';
}

function reset() {
    state.running = false;
    if (state.animationId) cancelAnimationFrame(state.animationId);

    state.h0 = parseFloat(heightInput.value);
    state.g = parseFloat(gravityInput.value);
    state.t = 0;
    state.y = state.h0;
    state.v = 0;
    state.trail = [state.h0]; // Start trail

    updateStats();
    draw();
    startBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Başlat
    `;
}

let lastTimestamp = 0;

function loop(timestamp) {
    if (!state.running) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = (timestamp - lastTimestamp) / 1000; // seconds

    state.t += dt;

    // Physics
    state.y = state.h0 - 0.5 * state.g * state.t * state.t;
    state.v = state.g * state.t;

    // Add to trail every frame (or could throttle)
    state.trail.push(state.y);

    if (state.y <= 0) {
        state.y = 0;
        state.v = state.g * Math.sqrt(2 * state.h0 / state.g); // Impact velocity
        state.running = false;
        startBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 2.3 6.3"></path>
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Tekrar
        `;
    }

    updateStats();
    draw();

    if (state.running) {
        lastTimestamp = timestamp;
        state.animationId = requestAnimationFrame(loop);
    } else {
        lastTimestamp = 0;
    }
}

// Event Listeners
heightInput.addEventListener('input', (e) => {
    heightVal.textContent = e.target.value;
    if (!state.running) reset();
});

gravityInput.addEventListener('input', (e) => {
    gravityVal.textContent = e.target.value;
    if (!state.running) reset();
});

startBtn.addEventListener('click', () => {
    if (state.running) return;

    // If trying to start after finished, reset first
    if (state.y === 0) {
        reset(); // resets position
        // now start
    }

    state.running = true;
    lastTimestamp = performance.now();
    loop(lastTimestamp);

    startBtn.innerHTML = `Running...`; // Visual feedback
});

resetBtn.addEventListener('click', reset);

window.addEventListener('resize', resize);

// Init
resize();
reset();
