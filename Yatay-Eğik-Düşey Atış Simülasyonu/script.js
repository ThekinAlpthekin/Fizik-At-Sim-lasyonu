// DOM Elements
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const inputs = {
    velocity: document.getElementById('velocity'),
    angle: document.getElementById('angle'),
    gravity: document.getElementById('gravity'),
    height: document.getElementById('height'),
    time: document.getElementById('time-slider')
};

const displays = {
    velocity: document.getElementById('velocity-val'),
    angle: document.getElementById('angle-val'),
    gravity: document.getElementById('gravity-val'),
    height: document.getElementById('height-val'),
    time: document.getElementById('current-time'),
    flightTime: document.getElementById('flight-time'),
    maxHeight: document.getElementById('max-height'),
    maxRange: document.getElementById('max-range'),
    instX: document.getElementById('inst-x'),
    instY: document.getElementById('inst-y'),
    instV: document.getElementById('inst-v'),
    instVx: document.getElementById('inst-vx'),
    instVy: document.getElementById('inst-vy')
};

const btnPlay = document.getElementById('play-pause');
const btnReset = document.getElementById('reset');

// State
let state = {
    v0: 50,
    theta: 45,
    g: 9.8,
    h0: 0,
    t: 0,
    isPlaying: false,
    animationId: null,
    totalTime: 0
};

// Canvas Scale
let scale = 10; // pixels per meter
let originX = 50;
let originY = canvas.height - 50;

// Resize Observer
const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
    draw();
});
resizeObserver.observe(canvas.parentElement);

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    originY = canvas.height - 50;
    // Recalculate scale to fit the trajectory
    autoScale();
}

function autoScale() {
    // Calculate max range and height to fit in view
    const stats = calculateStats();
    const maxX = stats.range * 1.1; // 10% padding
    const maxY = stats.maxH * 1.1; // 10% padding

    // Available width and height
    const drawWidth = canvas.width - 100;
    const drawHeight = canvas.height - 100;

    const scaleX = drawWidth / (maxX || 100); // precise fallback
    const scaleY = drawHeight / (maxY || 100);

    scale = Math.min(scaleX, scaleY);
    // minimum scale to prevent zooming in too much on small values
    scale = Math.max(scale, 2);
}

// Physics Logic
function toRad(deg) {
    return deg * Math.PI / 180;
}

function calculatePhysics(t) {
    const v0x = state.v0 * Math.cos(toRad(state.theta));
    const v0y = state.v0 * Math.sin(toRad(state.theta));

    const x = v0x * t;
    const y = state.h0 + v0y * t - 0.5 * state.g * t * t;

    const vx = v0x;
    const vy = v0y - state.g * t;
    const v = Math.sqrt(vx * vx + vy * vy);

    return { x, y, vx, vy, v };
}

function calculateStats() {
    const v0y = state.v0 * Math.sin(toRad(state.theta));
    const v0x = state.v0 * Math.cos(toRad(state.theta));

    // Time to max height (v_y = 0)
    let t_peak = v0y / state.g;
    let maxH = state.h0 + v0y * t_peak - 0.5 * state.g * t_peak * t_peak;
    if (t_peak < 0) {
        // If launched downwards
        maxH = state.h0;
    }

    // Total flight time (solve quadratic for y=0)
    // -0.5*g*t^2 + v0y*t + h0 = 0
    // t = (-b - sqrt(b^2 - 4ac)) / 2a   (we need the positive root usually, since a is negative here)
    // a = -0.5*g, b = v0y, c = h0
    const discriminant = Math.sqrt(v0y * v0y + 2 * state.g * state.h0);
    const t_flight = (v0y + discriminant) / state.g;

    const range = v0x * t_flight;

    return { t_flight, maxH, range };
}

// Draw Logic
function draw() {
    // Clear
    ctx.fillStyle = '#020617'; // matches CSS canvas-bg
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // X-axis
    ctx.moveTo(0, originY);
    ctx.lineTo(canvas.width, originY);
    // Y-axis
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, canvas.height);
    ctx.stroke();

    // Draw Trajectory
    const stats = calculateStats();
    state.totalTime = stats.t_flight;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'; // accent color faded
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    for (let t = 0; t <= stats.t_flight; t += 0.05) {
        const p = calculatePhysics(t);
        const canvasX = originX + p.x * scale;
        const canvasY = originY - p.y * scale;

        if (t === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
    }
    // ensure we draw to the very end
    const lastP = calculatePhysics(stats.t_flight);
    ctx.lineTo(originX + lastP.x * scale, originY - lastP.y * scale);

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Current Position
    const current = calculatePhysics(state.t);
    const curCanvasX = originX + current.x * scale;
    const curCanvasY = originY - current.y * scale;

    // Ball
    if (state.t <= state.totalTime && current.y >= -0.1) {
        ctx.beginPath();
        ctx.fillStyle = '#38bdf8';
        ctx.arc(curCanvasX, curCanvasY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Shadow (ground projection)
        ctx.beginPath();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.ellipse(curCanvasX, originY, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Update Slider Max
    inputs.time.max = stats.t_flight.toFixed(2);

    // Update UI Values
    displays.flightTime.textContent = stats.t_flight.toFixed(2) + ' s';
    displays.maxHeight.textContent = stats.maxH.toFixed(2) + ' m';
    displays.maxRange.textContent = stats.range.toFixed(2) + ' m';

    displays.time.textContent = state.t.toFixed(2);
    displays.instX.textContent = current.x.toFixed(2);
    displays.instY.textContent = Math.max(0, current.y).toFixed(2);
    displays.instV.textContent = current.v.toFixed(2);
    displays.instVx.textContent = current.vx.toFixed(2);
    displays.instVy.textContent = current.vy.toFixed(2);
}

// Interactivity
function updateStateFromInputs() {
    state.v0 = parseFloat(inputs.velocity.value);
    state.theta = parseFloat(inputs.angle.value);
    state.g = parseFloat(inputs.gravity.value);
    state.h0 = parseFloat(inputs.height.value);

    // Update display text next to sliders
    displays.velocity.textContent = state.v0 + ' m/s';
    displays.angle.textContent = state.theta + '°';
    displays.gravity.textContent = state.g + ' m/s²';
    displays.height.textContent = state.h0 + ' m';

    // Re-scale and redraw
    // If user interacts with parameters, reset scale logic slightly or keep it dynamic
    autoScale();
    draw();
}

function updateTimeFromSlider() {
    state.t = parseFloat(inputs.time.value);
    draw();
}

// Animation
function togglePlay() {
    state.isPlaying = !state.isPlaying;
    btnPlay.textContent = state.isPlaying ? 'Duraklat' : 'Oynat';

    if (state.isPlaying) {
        let lastTimestamp = performance.now();

        function loop(timestamp) {
            if (!state.isPlaying) return;

            const dt = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;

            // Advance time
            state.t += dt; // Real-time speed

            // Loop or Stop? Let's stop at end
            if (state.t >= state.totalTime) {
                state.t = state.totalTime;
                state.isPlaying = false;
                btnPlay.textContent = 'Oynat';
            }

            // Update slider
            inputs.time.value = state.t;
            draw();

            if (state.isPlaying) {
                requestAnimationFrame(loop);
            }
        }
        requestAnimationFrame(loop);
    }
}

function resetSim() {
    state.isPlaying = false;
    btnPlay.textContent = 'Oynat';
    state.t = 0;
    inputs.time.value = 0;

    // Optional: Reset parameters to default? 
    // Usually "Reset" in these sims just resets the run, not the params.
    // Let's stick to resetting the run.

    draw();
}

// Event Listeners
Object.values(inputs).forEach(input => {
    if (input === inputs.time) {
        input.addEventListener('input', () => {
            // If user drags slider, pause animation
            state.isPlaying = false;
            btnPlay.textContent = 'Oynat';
            updateTimeFromSlider();
        });
    } else {
        input.addEventListener('input', updateStateFromInputs);
    }
});

btnPlay.addEventListener('click', togglePlay);
btnReset.addEventListener('click', resetSim);

// Init
window.addEventListener('load', () => {
    resizeCanvas();
    updateStateFromInputs();
});
