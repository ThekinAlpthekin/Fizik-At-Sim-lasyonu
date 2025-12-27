const v0 = 50;
const angle = 45;
const g = 9.82; // m/s^2
const dt = 0.002;
const k = 0.0; // No drag for analytical comparison

// Analytical Results
const rad = angle * (Math.PI / 180);
const expectedRange = (v0 * v0 * Math.sin(2 * rad)) / g;
const expectedHeight = (Math.pow(v0 * Math.sin(rad), 2)) / (2 * g);
const expectedTime = (2 * v0 * Math.sin(rad)) / g;

console.log(`Expected Range: ${expectedRange.toFixed(4)}`);
console.log(`Expected Height: ${expectedHeight.toFixed(4)}`);
console.log(`Expected Time: ${expectedTime.toFixed(4)}`);

// Simulation Logic (Copied from script.js)
let t = 0;
let x = 0;
let h0 = 0;
let y = h0;
let vx = v0 * Math.cos(rad);
let vy = v0 * Math.sin(rad);
let maxY = y;

while (y >= 0 && t < 100) {
    const v = Math.sqrt(vx * vx + vy * vy);
    const ax = -(k * v * vx);
    const ay = -g - (k * v * vy);

    vx += ax * dt;
    vy += ay * dt;

    x += vx * dt;
    y += vy * dt;
    t += dt;

    if (y > maxY) maxY = y;

    if (y < 0) {
        // Interpolation
        // prev state (approx)
        let prev_x = x - vx * dt;
        let prev_y = y - vy * dt;
        let prev_t = t - dt;

        const fraction = (0 - prev_y) / (y - prev_y);
        x = prev_x + (x - prev_x) * fraction;
        t = prev_t + dt * fraction;
        y = 0;
    }
}

console.log(`Simulated Range: ${x.toFixed(4)}`);
console.log(`Simulated Height: ${maxY.toFixed(4)}`);
console.log(`Simulated Time: ${t.toFixed(4)}`);

const rangeError = Math.abs(x - expectedRange);
const heightError = Math.abs(maxY - expectedHeight);
const timeError = Math.abs(t - expectedTime);

console.log(`Range Error: ${rangeError.toFixed(4)} (${(rangeError / expectedRange * 100).toFixed(4)}%)`);
console.log(`Height Error: ${heightError.toFixed(4)} (${(heightError / expectedHeight * 100).toFixed(4)}%)`);

if (rangeError / expectedRange < 0.001) console.log("PASSED"); else console.log("FAILED");
