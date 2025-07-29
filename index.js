const view = document.querySelector('canvas').getContext('2d');
view.canvas.width = window.innerWidth;
view.canvas.height = window.innerHeight;

let selectedObject = null;

class Vec {
    // scale a vector by a given factor
    static scale(v, f) { return { x: v.x * f, y: v.y * f }; }
    // add two vectors
    static add(v1, v2) { return { x: v1.x + v2.x, y: v1.y + v2.y }; }
    // inverse of a vector
    static inverse(v) { return { x: -v.x, y: -v.y }; }
    // caclculate which side of a line a point is on
    static sideOfLine(p, l1, l2) {
        const crossProduct = (l2.x - l1.x) * (p.y - l1.y) - (l2.y - l1.y) * (p.x - l1.x);
        if (crossProduct > 0) return -1; // Point is on the left side of the line
        if (crossProduct < 0) return 1; // Point is on the right side of the line
        return 0; // Point is on the line
    }
    static vector(p1, p2) { // p1 -> p2
        return { x: p2.x - p1.x, y: p2.y - p1.y };
    }
}

class Point {
    constructor(x, y, r = 10, c = "red") {
        this.x = x;
        this.y = y;
        this.radius = r; // Radius for drawing
        this.color = c; // Color for drawing
        this.isDragging = false;
        this.isSelected = false;
        Mouse.register(this);
    }
    drag(mousePosition) {
        if (this.isDragging) {
            this.x = mousePosition.x;
            this.y = mousePosition.y;
            draw();
        }
    }
    // Select the point if it's close enough to the mouse position using Math.hypot
    select(mouse) {
        if (selectedObject) return; // Only allow one object to be selected at a time
        if (Math.hypot(this.x - mouse.x, this.y - mouse.y) <= this.radius) {
            this.isSelected = true;
            this.isDragging = true;
            selectedObject = this;
            // console.log(`Point selected at (${this.x}, ${this.y})`);
        } else {
            if (this.isSelected) {
                this.isSelected = false;
                this.isDragging = false;
                // console.log(`Point deselected at (${this.x}, ${this.y})`);
            }
        }
    }
    // Unselect the point when the mouse is released
    unselect() {
        this.isSelected = false;
        this.isDragging = false;
        if (selectedObject === this) { selectedObject = null; draw(); }
        //this.draw(); // Redraw to update the appearance
    }
    draw() {
        const oldFillStyle = view.fillStyle;
        view.fillStyle = this.color;
        if (this.isSelected) view.fillStyle = 'orange';
        view.beginPath();
        view.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        view.fill();
        view.strokeStyle = 'black';
        view.lineWidth = 3;
        view.stroke();
        view.closePath();
        view.fillStyle = oldFillStyle; // Restore original fill style
    }
}

class Line {
    constructor(p1, p2) {
        this.p1 = new Point(p1.x, p1.y);
        this.p2 = new Point(p2.x, p2.y);
        drawables.push(this);
    }
    get length() { return Math.hypot(this.p2.x - this.p1.x, this.p2.y - this.p1.y); }
    // Calculate the midpoint of the line segment
    get midpoint() {
        return {
            x: (this.p1.x + this.p2.x) / 2,
            y: (this.p1.y + this.p2.y) / 2
        };
    }
    // Calculate the slope of the line segment
    get slope() {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        return dy / dx;
    }
    // calculate the normal vector of the line segment
    get normal() {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const length = Math.hypot(dx, dy);
        return {
            x: -dy / length,
            y: dx / length
        };
    }
    draw() {
        view.strokeStyle = 'black';
        view.lineWidth = 5;
        view.beginPath();
        view.moveTo(this.p1.x, this.p1.y);
        view.lineTo(this.p2.x, this.p2.y);
        view.stroke();
        view.closePath();
        this.p1.draw();
        this.p2.draw();
        this.drawNormal();
    }
    drawNormal() {
        const mid = this.midpoint;
        const normal = Vec.scale(this.normal, 30);
        const endPoint = Vec.add(mid, normal);
        view.strokeStyle = 'black';
        view.lineWidth = 2;
        view.setLineDash([1, 6]);
        view.beginPath();
        this.moveTo(mid);
        this.lineTo(endPoint);
        view.stroke();
        view.setLineDash([]); // Reset to solid line
        view.closePath();
    }
    moveTo(p) { view.moveTo(p.x, p.y); }
    lineTo(p) { view.lineTo(p.x, p.y); }
}

class Mouse {
    static #objects = [];
    static {
        addEventListener('mousemove', e => { if (e.buttons & 1) Mouse.#drag(e); });
        addEventListener('mousedown', e => { if (e.buttons & 1) Mouse.#select(e); });
        addEventListener('mouseup', e => { if (e.button === 0) Mouse.#unselect(); });
    }
    static register(o) { Mouse.#objects.push(o); }
    static unregister(o) {
        const index = Mouse.#objects.indexOf(o);
        if (index !== -1) Mouse.#objects.splice(index, 1);
    }
    static #drag(e) { for (const o of Mouse.#objects) o.drag?.({ x: e.clientX, y: e.clientY }); }
    static #select(e) { for (const o of Mouse.#objects) o.select?.({ x: e.clientX, y: e.clientY }); }
    static #unselect() { for (const o of Mouse.#objects) o.unselect?.(); }
}

// calculate the point of intersection between two lines defined by two points each
function intersection(p1, p2, p3, p4) {
    const a1 = p2.y - p1.y;
    const b1 = p1.x - p2.x;
    const c1 = a1 * p1.x + b1 * p1.y;

    const a2 = p4.y - p3.y;
    const b2 = p3.x - p4.x;
    const c2 = a2 * p3.x + b2 * p3.y;

    const determinant = a1 * b2 - a2 * b1;

    if (determinant === 0) {
        return null; // Lines are parallel
    } else {
        const x = (b2 * c1 - b1 * c2) / determinant;
        const y = (a1 * c2 - a2 * c1) / determinant;
        return { x, y };
    }
}
function intersect(l1, l2) {
    const p1 = l1.p1;
    const p2 = l1.p2;
    const p3 = l2.p1;
    const p4 = l2.p2;

    return intersection(p1, p2, p3, p4);
}

class Intersect {
    constructor(line1, line2) {
        this.line1 = line1;
        this.line2 = line2;
        drawables.push(this);
    }

    get intersect() { return intersect(this.line1, this.line2); }
    draw() {
        const ip = this.intersect;
        if (ip && this.visible(ip)) {

            this.drawNormalToIntersection();

            view.fillStyle = 'yellow';
            view.beginPath();
            view.arc(ip.x, ip.y, 5, 0, Math.PI * 2);
            view.fill();
            view.strokeStyle = 'black';
            view.lineWidth = 2;
            view.stroke();
            view.closePath();
            view.fillStyle = 'black';
            view.fillText(`Intersection: (${ip.x.toFixed(2)}, ${ip.y.toFixed(2)})`, ip.x + 10, ip.y + 10);
        } else {
            view.fillStyle = 'black';
            view.fillText('No visible intersection', 10, 30);
        }
    }
    get normal() { return Vec.inverse(this.line1.normal); }
    drawNormalToIntersection() {
        const ip = this.intersect;
        if (!ip) return;

        const scaledNormal = Vec.scale(this.normal, 30);
        const endPoint = Vec.add(ip, scaledNormal);

        view.strokeStyle = 'red';
        view.lineWidth = 2;
        view.setLineDash([1, 3]);
        view.beginPath();
        view.moveTo(ip.x, ip.y);
        view.lineTo(endPoint.x, endPoint.y);
        view.stroke();
        view.closePath();
        view.setLineDash([]); // Reset to solid line
    }
    // method indicating whether a point in visible on the canvas
    visible(p) {
        return (
            p.x >= 0 && p.x <= view.canvas.width &&
            p.y >= 0 && p.y <= view.canvas.height
        );
    }
}

// calculate if a point is inside the bounds of the canvas
function visible(p) {
    return (p.x >= 0 && p.x <= view.canvas.width && p.y >= 0 && p.y <= view.canvas.height);
}
function closestPt(point, line) { return closestPointOnLine(point, line.p1, line.p2); }
function closestPointOnLine(p, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return p1; // p1 and p2 are the same point

    const t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lengthSquared;

    return {
        x: p1.x + t * dx,
        y: p1.y + t * dy
    };
}

function draw() {
    view.clearRect(0, 0, view.canvas.width, view.canvas.height);
    view.fillStyle = 'black';
    view.fillText(selectedObject ? 'Selected' : 'No point selected', 10, 20);

    let { distance, clp } = shortestDistanceToLine(p1, p2, point);
    let closestPoint = closestPt(point, line);

    // draw dashed line between line and closest point to line
    view.beginPath();
    view.setLineDash([5, 5]); // Dashed line
    view.strokeStyle = 'blue';
    view.moveTo(point.x, point.y);
    view.lineTo(closestPoint.x, closestPoint.y);
    view.stroke();
    view.setLineDash([]); // Reset to solid line
    view.closePath();

    for (const drawable of drawables) drawable.draw();

    // write status text
    view.fillStyle = 'black';
    view.fillText(`Distance: ${distance.toFixed(2)}`, closestPoint.x + 20, closestPoint.y + 20);
    view.fillText(`Closest Point: (${closestPoint.x.toFixed(2)}, ${closestPoint.y.toFixed(2)})`, closestPoint.x + 20, closestPoint.y + 40);
    
    // draw point at closest point on line
    view.beginPath();
    view.arc(closestPoint.x, closestPoint.y, 5, 0, Math.PI * 2);
    view.fillStyle = 'purple';
    view.fill();
    view.strokeStyle = 'black';
    view.lineWidth = 2;
    view.stroke();
    view.closePath();


    // draw points projected onto line by arrow
    const cp1 = closestPt(arrow.p1, line);
    const cp2 = closestPt(arrow.p2, line);
    if (visible(cp1)) {
        circle(cp1.x, cp1.y, 5, 'pink');
    }
    if (visible(cp2)) {
        circle(cp2.x, cp2.y, 5, 'pink');
    }

    // draw point projected on normal to line by arrow
    const inter = intersect(arrow, line);
    if (inter && visible(inter)) {
        const interN = Vec.add(inter, line.normal);
        const cn1 = closestPointOnLine(arrow.p1, inter, interN);
        const cn2 = closestPointOnLine(arrow.p2, inter, interN);
        if (visible(cn1)) {
            circle(cn1.x, cn1.y, 5, 'lime');
        }
        if (visible(cn2)) {
            circle(cn2.x, cn2.y, 5, 'lime');
        }

        // calc reflection
        const paraVec = Vec.vector(cp2, cp1);
        const normVec = Vec.vector(cn1, cn2); // reverse for reflection
        const reflectVec = Vec.add(paraVec, normVec);
        drawVector(inter, reflectVec);

    }
}
function drawVector(p, v) {
    const p2 = Vec.add(p, v);
    drawArrow(p2.x, p2.y, p.x, p.y)
}
// draw circle with black border and fill with color
function circle(x, y, r, color = 'red') {
    view.fillStyle = color;
    view.beginPath();
    view.arc(x, y, r, 0, Math.PI * 2);
    view.fill();
    view.strokeStyle = 'black';
    view.lineWidth = 2;
    view.stroke();
    view.closePath();
}

// calculate the shortest distance between a line, defined by two points, and a point and the point on the line closest to the point
function shortestDistanceToLine(p1, p2, point) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lineLength = Math.hypot(dx, dy);
    if (lineLength === 0) return { distance: Math.hypot(point.x - p1.x, point.y - p1.y), closestPoint: { x: p1.x, y: p1.y } };

    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (lineLength * lineLength);
    const clampedT = Math.max(0, Math.min(1, t));
    const closestPoint = {
        x: p1.x + t * dx,
        y: p1.y + t * dy
    };
    const distance = Math.hypot(point.x - closestPoint.x, point.y - closestPoint.y);
    return { distance, closestPoint };
}

class Arrow {
    constructor(x1, y1, x2, y2) {
        this.p1 = { x: x1, y: y1 };
        this.p2 = { x: x2, y: y2 };
        this.dragPoint = null; // Point being dragged
        this.isDragging = false;
        Mouse.register(this);
        drawables.push(this);
    }
    get pos() { this.pos.x = this.x1; this.pos.y = this.y1; return this.pos; }
    draw() {
        drawArrow(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    }
    drag(mousePosition) {
        //console.log("Checking Arrow drag");
        if (this.isDragging) {
            //console.log('Dragging arrow');
            this.dragPoint.x = mousePosition.x;
            this.dragPoint.y = mousePosition.y;
            draw();
        }
    }
    unselect() {
        this.isDragging = false;
        this.dragPoint = null;
        if (selectedObject === this) { selectedObject = null; draw(); }
    }
    select(mouse) {
        if (selectedObject) return; // Only allow one object to be selected at a time

        if (near(this.p1, mouse)) {
            this.isDragging = true;
            this.dragPoint = this.p1;
            selectedObject = this;
            draw();
            return;
        }

        if (near(this.p2, mouse)) {
            this.isDragging = true;
            this.dragPoint = this.p2;
            selectedObject = this;
            draw();
            return;
        }
    }
    get length() { return Math.hypot(p1.x - p2.x, p1.y - p2.y); }
}
const dist = (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
const near = (p1, p2, r = 20) => dist(p1, p2) <= r;

function drawArrow(x1, y1, x2, y2) {
    view.lineWidth = 8;
    view.strokeStyle = 'black';
    view.lineJoin = 'miter';
    view.fillStyle = 'black';
    view.lineCap = 'round';

    // Calculate the angle of the line
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Arrowhead length and angle
    const headLength = 20;
    const arrowAngle = Math.PI / 7;

    // Calculate the arrowhead at the first point
    const arrowX1 = x1 + headLength * Math.cos(angle + arrowAngle);
    const arrowY1 = y1 + headLength * Math.sin(angle + arrowAngle);
    const arrowX2 = x1 + headLength * Math.cos(angle - arrowAngle);
    const arrowY2 = y1 + headLength * Math.sin(angle - arrowAngle);


    // Draw the main line
    view.beginPath();
    view.moveTo(x2, y2);
    view.lineTo(x1, y1);
    view.stroke();

    // Draw the arrowhead
    view.beginPath();
    view.moveTo(arrowX1, arrowY1);
    view.lineTo(x1, y1);
    view.lineTo(arrowX2, arrowY2);
    view.closePath();
    view.fill();
    view.stroke();
}


const drawables = [];

const p1 = new Point(100, 100);
const p2 = new Point(300, 200);
const line = new Line(p1, p2);

const point = new Point(400, 600, 10, 'lightgreen');
drawables.push(point);
const arrow = new Arrow(500, 100, 600, 200); // Draw an arrow from p1 to p2
const intersectLine = new Intersect(line, arrow);
draw();
