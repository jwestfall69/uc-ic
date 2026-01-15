import toml from "./toml-3.0.0.js";

const PINSIDE = Object.freeze({
    LEFT: 0,
    RIGHT: 1,
    TOP: 2,
    BOTTOM: 3
});

function defined(variable) {
    return (typeof(variable) !== "undefined");
}

async function loadConfig() {
   try {
        const res = await fetch("config.toml");
        if(!res.ok)
            throw new Error(`HTTP ${res.status}`);

        config = toml.parse(await res.text());
    } catch (err) {
        console.error(err);
    }
}

async function loadTypes() {
    const typeSelect = document.getElementById("type-select");
    try {
        const res = await fetch("data/types.toml");
        if(!res.ok)
            throw new Error(`HTTP ${res.status}`);

        typeSelect.innerHTML = "";
        typeSelect.appendChild(new Option("----- Select -----", ""));

        const types = toml.parse(await res.text()).list;
        types.forEach(type => {
            const option = document.createElement("option");
            option.value = type.path;
            option.textContent = type.display;
            typeSelect.appendChild(option);
        });
        typeSelect.disabled = false;
    } catch (err) {
        console.error(err);
        typeSelect.innerHTML = "<option>-- Failed to load --</option>";
    }
}

async function handleTypeChange(event) {
    const icListPath = event.target.value;
    const icSelect = document.getElementById("ic-select");

    document.getElementById("ic-svg").innerHTML = "";
    document.getElementById("ic-markdown").innerHTML = "";
    document.getElementById("ic-short-description").innerHTML = "";

    if(!icListPath) {
        icSelect.innerHTML = "";
        icSelect.disabled = true;

        const option = document.createElement("option");
        option.textContent = "-- Loading --";
        icSelect.appendChild(option);
        return;
    }

    try {
        const res = await fetch(icListPath);
        if(!res.ok)
            throw new Error(`HTTP ${res.status}`);

        icSelect.innerHTML = "";
        icSelect.appendChild(new Option("----- Select -----", ""));

        const ics = toml.parse(await res.text()).list;
        ics.forEach(ic => {
            const option = document.createElement("option");
            option.value = ic.path;
            option.textContent = ic.display;
            icSelect.appendChild(option);
        });
        icSelect.disabled = false;
    } catch (err) {
        console.error(err);
        icSelect.innerHTML = "<option>-- Failed to load --</option>";
    }
}

async function handleIcChange(event) {
    const icPath = event.target.value;
    if(!icPath) {
        document.getElementById("ic-svg").innerHTML = "";
        document.getElementById("ic-markdown").innerHTML = "";
        document.getElementById("ic-short-description").innerHTML = "";
        return;
    }

    try {
        const res = await fetch(icPath);
        if(!res.ok)
            throw new Error(`HTTP ${res.status}`);

        const ic = toml.parse(await res.text());
        renderIC(ic);
    } catch (err) {
        console.error(err);
        document.getElementById("ic-svg").innerHTML = "";
    }
}

function getColor(color) {
    if(config.pin.color_enabled != 1) {
        return config.pin.colors.default;
    }

    if(!defined(color)) {
        return config.pin.colors.default;
    }

    if(color.match(/^#[a-fA-F0-9]{6}.*$/)) {
        return color;
    }

    if(!defined(config.pin.colors[color])) {
        return config.pin.colors.default;
    }
    return config.pin.colors[color];
}

function drawPin(x, y, side, num, pin) {

    const pinGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    if(pin.name === "SKIP") {
        return pinGroup;
    }

    const pinRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    pinRect.setAttribute("x", x);
    pinRect.setAttribute("y", y);
    pinRect.setAttribute("width", config.pin.width);
    pinRect.setAttribute("height", config.pin.height);
    pinRect.setAttribute("stroke", "black");
    pinRect.setAttribute("stroke-width", "1");
    pinRect.setAttribute("fill", getColor(pin.color));
    pinGroup.appendChild(pinRect);

    const pinNum = document.createElementNS("http://www.w3.org/2000/svg", "text");
    pinNum.setAttribute("x", x + config.pin.width / 2);
    pinNum.setAttribute("text-anchor", "middle");
    pinNum.setAttribute("y", y + 2 + config.pin.height / 2);
    pinNum.setAttribute("dominant-baseline", "middle");
    pinNum.setAttribute("font-family", "Roboto Mono");
    pinNum.setAttribute("font-size", "22px");
    pinNum.setAttribute("font-weight", "500");
    pinNum.textContent = defined(pin.num) ? pin.num : num;
    if(defined(pin.color_num)) {
        pinNum.setAttribute("fill", getColor(pin.color_num));
    }
    pinGroup.appendChild(pinNum);

    const pinName = document.createElementNS("http://www.w3.org/2000/svg", "text");
    if(side == PINSIDE.LEFT || side == PINSIDE.BOTTOM) {
        pinName.setAttribute("x", x - (pin.dir == "NONE" ? 8 : 20));
        pinName.setAttribute("text-anchor", "end");
    } else {
        pinName.setAttribute("x", x + config.pin.width + (pin.dir == "NONE" ? 8 : 20));
        pinName.setAttribute("text-anchor", "start");
    }
    pinName.setAttribute("y", y + 2 + config.pin.height / 2);
    pinName.setAttribute("dominant-baseline", "middle");
    pinName.setAttribute("font-family", "Roboto Mono");
    pinName.setAttribute("font-size", "22px");
    pinName.setAttribute("font-weight", "500");
    pinName.textContent = pin.name;
    pinGroup.appendChild(pinName);

    // add ^AP to pinName if audioProbe flag
    if(defined(pin.flags) && pin.flags.includes("audioProbe")) {
        const pinAudioProbe = document.createElementNS("http://www.w3.org/2000/svg", "text");
        const pinNameX = parseInt(pinName.getAttribute("x"));

        if(side == PINSIDE.LEFT || side == PINSIDE.BOTTOM) {
            pinAudioProbe.setAttribute("x", pinNameX - (13 * pin.name.length));
            pinAudioProbe.setAttribute("text-anchor", "end");
        } else {
            pinAudioProbe.setAttribute("x", pinNameX + (13 * pin.name.length));
            pinAudioProbe.setAttribute("text-anchor", "start");
        }
        pinAudioProbe.setAttribute("y", y + 8);
        pinAudioProbe.setAttribute("dominant-baseline", "middle");
        pinAudioProbe.setAttribute("font-family", "Roboto Mono");
        pinAudioProbe.setAttribute("font-size", "12px");
        pinAudioProbe.setAttribute("font-weight", "500");
        pinAudioProbe.textContent = "AP";
        pinGroup.appendChild(pinAudioProbe);
    }

    // add overscore to pinName if activeLow flag
    if(defined(pin.flags) && pin.flags.includes("activeLow")) {
        const pinNameX = parseInt(pinName.getAttribute("x"));
        const pinActiveLow = document.createElementNS("http://www.w3.org/2000/svg", "path");

        const textWidth = 13 * pin.name.length;
        let lineLength;
        if(pin.flags.includes("activeLowLastChar")) {
            lineLength = 13;
        } else {
            lineLength = textWidth;
        }

        if(side == PINSIDE.LEFT || side == PINSIDE.BOTTOM) {
            pinActiveLow.setAttribute("d", `M ${pinNameX - lineLength} ${y + 4} ${pinNameX} ${y + 4}`);
        } else {
            pinActiveLow.setAttribute("d", `M ${pinNameX + textWidth - lineLength} ${y + 4} ${pinNameX + textWidth} ${y + 4}`);
        }
        pinActiveLow.setAttribute("fill", "black");
        pinActiveLow.setAttribute("stroke", "black");
        pinActiveLow.setAttribute("stroke-width", "2");
        pinGroup.appendChild(pinActiveLow);
    }

    // in/out arrows
    if(pin.dir == "IN" || pin.dir == "INOUT") {
        const pinDirIn = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        if(side == PINSIDE.LEFT || side == PINSIDE.BOTTOM) {
            pinDirIn.setAttribute("points", `
                ${x - config.pin.width_direction},${y}
                ${x - config.pin.width_direction},${y + config.pin.height}
                ${x},${y + config.pin.height / 2}`);
        } else {
            pinDirIn.setAttribute("points", `
                ${x + config.pin.width + config.pin.width_direction},${y}
                ${x + config.pin.width + config.pin.width_direction},${y + config.pin.height}
                ${x + config.pin.width},${y + config.pin.height / 2}`);
        }
        pinGroup.appendChild(pinDirIn);
    }

    if(pin.dir == "OUT" || pin.dir == "INOUT") {
        const pinDirOut = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        if(side == PINSIDE.LEFT || side == PINSIDE.BOTTOM) {
            pinDirOut.setAttribute("points", `
                ${x},${y}
                ${x},${y + config.pin.height}
                ${x - config.pin.width_direction},${y + config.pin.height / 2}`);
        } else {
            pinDirOut.setAttribute("points", `
                ${x + config.pin.width},${y}
                ${x + config.pin.width},${y + config.pin.height}
                ${x + config.pin.width + config.pin.width_direction},${y + config.pin.height / 2}`);
        }
        pinGroup.appendChild(pinDirOut);
    }

    if(side == PINSIDE.TOP || side == PINSIDE.BOTTOM) {
        pinGroup.setAttribute("transform", `rotate(-90, ${x + config.pin.width / 2}, ${y + config.pin.height / 2})`);
    }

    return pinGroup;
}

function getDIPWidth(ic) {
    if(!defined(ic.info.width)) {
        return config.package.dip.width.default;
    }

    if(typeof(ic.info.width) == "number") {
        return ic.info.width;
    }

    if(defined(config.package.dip.width[ic.info.width])) {
        return config.package.dip.width[ic.info.width];
    }

    return config.package.dip.width.default;
}

function renderDIP(svg, ic) {
    const numPins = ic.info.num_pins;
    const icHeight = (config.pin.spacing * numPins / 2) + (config.pin.spacing - config.pin.height);
    const icWidth = getDIPWidth(ic);
    svg.setAttribute("width", `${config.package.dip.side_pad * 2 + icWidth}px`);
    svg.setAttribute("height", `${config.package.dip.top_pad * 2 + icHeight}px`);

    const icBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    icBody.setAttribute("x", config.package.dip.side_pad);
    icBody.setAttribute("y", config.package.dip.top_pad);
    icBody.setAttribute("width", icWidth);
    icBody.setAttribute("height", icHeight);
    icBody.setAttribute("stroke", "black");
    icBody.setAttribute("stroke-width", "1");
    icBody.setAttribute("fill", "white");
    svg.appendChild(icBody);

    const icName = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const textX = config.package.dip.side_pad + icWidth / 2;
    const textY = config.package.dip.top_pad + icHeight / 2;
    icName.setAttribute("x", textX);
    icName.setAttribute("y", textY);
    icName.setAttribute("transform", `rotate(90, ${textX}, ${textY})`);
    icName.setAttribute("text-anchor", "middle");
    icName.setAttribute("dominant-baseline", "middle");
    icName.setAttribute("font-family", "Roboto Mono");
    icName.setAttribute("font-size", "64px");
    icName.setAttribute("font-weight", "500");
    icName.setAttribute("fill", "gray");
    icName.textContent = ic.info.name;
    svg.appendChild(icName);

    const icNotch = document.createElementNS("http://www.w3.org/2000/svg", "path");
    icNotch.setAttribute("d", `M ${textX - 20} ${config.package.dip.top_pad}
                               A 20 20 0 0 0 ${textX + 20} ${config.package.dip.top_pad}
                               L ${textX - 20} ${config.package.dip.top_pad}`);
    icNotch.setAttribute("stroke", "black");
    icNotch.setAttribute("stroke-width", "1");
    icNotch.setAttribute("fill", "white");
    svg.appendChild(icNotch);

    const pinStartLeft = config.package.dip.side_pad - config.pin.width;
    const pinStartRight = pinStartLeft + icWidth + config.pin.width;
    const pinStartTop = config.package.dip.top_pad + (config.pin.spacing - config.pin.height);


    for(let pinNum = 0; pinNum < numPins / 2; pinNum++) {
        svg.appendChild(drawPin(pinStartLeft, pinStartTop + pinNum * config.pin.spacing, PINSIDE.LEFT, pinNum + 1, ic.pins[pinNum + 1]));
        svg.appendChild(drawPin(pinStartRight, pinStartTop + pinNum * config.pin.spacing, PINSIDE.Right, numPins - pinNum, ic.pins[numPins - pinNum]));
    }
}

function renderEdge(svg, ic) {
    const numPins = ic.info.num_pins;
    const icHeight = (config.pin.spacing * numPins / 2) + (config.pin.spacing - config.pin.height);
    const icWidth = 100;
    svg.setAttribute("width", `${config.package.edge.side_pad * 2 + icWidth}px`);
    svg.setAttribute("height", `${config.package.edge.top_pad * 2 + icHeight}px`);

    const icBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    icBody.setAttribute("x", config.package.edge.side_pad);
    icBody.setAttribute("y", config.package.edge.top_pad);
    icBody.setAttribute("width", icWidth);
    icBody.setAttribute("height", icHeight);
    icBody.setAttribute("stroke", "black");
    icBody.setAttribute("stroke-width", "1");
    icBody.setAttribute("fill", "white");
    svg.appendChild(icBody);

    const icName = document.createElementNS("http://www.w3.org/2000/svg", "text");
    let textX = config.package.edge.side_pad + icWidth / 2;
    let textY = config.package.edge.top_pad + icHeight / 2;
    icName.setAttribute("x", textX);
    icName.setAttribute("y", textY);
    icName.setAttribute("transform", `rotate(90, ${textX}, ${textY})`);
    icName.setAttribute("text-anchor", "middle");
    icName.setAttribute("dominant-baseline", "middle");
    icName.setAttribute("font-family", "Roboto Mono");
    icName.setAttribute("font-size", "32px");
    icName.setAttribute("font-weight", "500");
    icName.setAttribute("fill", "gray");
    icName.textContent = ic.info.name;
    svg.appendChild(icName);

    const icHeadingRight = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textX = config.package.edge.side_pad + icWidth + 20;
    textY = 0;
    icHeadingRight.setAttribute("x", textX);
    icHeadingRight.setAttribute("y", textY);
    icHeadingRight.setAttribute("text-anchor", "start");
    icHeadingRight.setAttribute("dominant-baseline", "middle");
    icHeadingRight.setAttribute("font-family", "Roboto Mono");
    icHeadingRight.setAttribute("font-size", "32px");
    icHeadingRight.setAttribute("font-weight", "500");
    icHeadingRight.setAttribute("fill", "black");
    icHeadingRight.textContent = ic.info.heading_right;
    svg.appendChild(icHeadingRight);

    const icHeadingLeft = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textX = config.package.edge.side_pad - 20;
    textY = 0;
    icHeadingLeft.setAttribute("x", textX);
    icHeadingLeft.setAttribute("y", textY);
    icHeadingLeft.setAttribute("text-anchor", "end");
    icHeadingLeft.setAttribute("dominant-baseline", "middle");
    icHeadingLeft.setAttribute("font-family", "Roboto Mono");
    icHeadingLeft.setAttribute("font-size", "32px");
    icHeadingLeft.setAttribute("font-weight", "500");
    icHeadingLeft.setAttribute("fill", "black");
    icHeadingLeft.textContent = ic.info.heading_left;
    svg.appendChild(icHeadingLeft);

    const pinStartLeft = config.package.edge.side_pad - config.pin.width;
    const pinStartRight = pinStartLeft + icWidth + config.pin.width;
    const pinStartTop = config.package.edge.top_pad + (config.pin.spacing - config.pin.height);

    // right (top to bottom going from 1 to n)
    let offset = 0;
    for(let pinNum = 0; pinNum < numPins / 2; pinNum++) {
        svg.appendChild(drawPin(pinStartRight, pinStartTop + offset, PINSIDE.Right, pinNum + 1, ic.pins[pinNum + 1]));
        offset += config.pin.spacing;
    }

    // left (top to bottom)
    offset = 0;
    for(let pinNum = numPins / 2; pinNum < numPins; pinNum++) {
        svg.appendChild(drawPin(pinStartLeft, pinStartTop + offset, PINSIDE.LEFT, pinNum + 1, ic.pins[pinNum + 1]));
        offset += config.pin.spacing;
    }
}

function renderPLCC(svg, ic) {
    const numPins = ic.info.num_pins;
    const pinsPerSide = numPins / 4;

    const icWidth = (config.pin.spacing * numPins / 4) + (config.pin.spacing - config.pin.height);
    const icHeight = icWidth;

    svg.setAttribute("width", `${config.package.plcc.side_pad * 2 + icWidth}px`);
    svg.setAttribute("height", `${config.package.plcc.side_pad * 2 + icHeight}px`);

    const icBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    icBody.setAttribute("x", config.package.plcc.side_pad);
    icBody.setAttribute("y", config.package.plcc.side_pad);

    icBody.setAttribute("width", icWidth);
    icBody.setAttribute("height", icHeight);
    icBody.setAttribute("stroke", "black");
    icBody.setAttribute("stroke-width", "1");
    icBody.setAttribute("fill", "white");
    svg.appendChild(icBody);

    const icName = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const textX = config.package.plcc.side_pad + icWidth / 2;
    const textY = config.package.plcc.side_pad + icHeight / 2;
    icName.setAttribute("x", textX);
    icName.setAttribute("y", textY);
    icName.setAttribute("text-anchor", "middle");
    icName.setAttribute("dominant-baseline", "middle");
    icName.setAttribute("font-family", "Roboto Mono");
    icName.setAttribute("font-size", "64px");
    icName.setAttribute("font-weight", "500");
    icName.setAttribute("fill", "gray");
    icName.textContent = ic.info.name;
    svg.appendChild(icName);

    const icNotch = document.createElementNS("http://www.w3.org/2000/svg", "path");
    icNotch.setAttribute("d", `M ${textX - 20} ${config.package.plcc.side_pad}
                               A 20 20 0 0 0 ${textX + 20} ${config.package.plcc.side_pad}
                               L ${textX - 20} ${config.package.plcc.side_pad}`);
    icNotch.setAttribute("stroke", "black");
    icNotch.setAttribute("stroke-width", "1");
    icNotch.setAttribute("fill", "white");
    svg.appendChild(icNotch);

    // top (middle to left)
    let startX = config.package.plcc.side_pad;
    let startY = config.package.plcc.side_pad - config.pin.height - (config.pin.width - config.pin.height) / 2;
    let pinStart = Math.ceil((numPins / 8));
    let pinStop = 0;
    let offset = 0
    for(let pinNum = pinStart; pinNum > pinStop; pinNum--) {
        svg.appendChild(drawPin(startX + offset, startY, PINSIDE.TOP, pinNum, ic.pins[pinNum]));
        offset += config.pin.spacing;
    }

    // top (middle to right)
    pinStop = numPins - pinStart + 1
    pinStart = numPins;
    for(let pinNum = pinStart; pinNum > pinStop; pinNum--) {
        svg.appendChild(drawPin(startX + offset, startY, PINSIDE.TOP, pinNum, ic.pins[pinNum]));
        offset += config.pin.spacing;
    }

    // left (top to bottom)
    startX = config.package.plcc.side_pad - config.pin.width;
    startY = config.package.plcc.side_pad - (config.pin.spacing - config.pin.width);
    pinStart = Math.ceil((numPins / 8)) + 1;
    pinStop = pinStart + pinsPerSide - 1;
    offset = 0;
    for(let pinNum = pinStart; pinNum <= pinStop; pinNum++) {
        svg.appendChild(drawPin(startX, startY + offset, PINSIDE.LEFT, pinNum, ic.pins[pinNum]));
        offset += config.pin.spacing;
    }

    // bottom (left to right)
    startX = config.package.plcc.side_pad;
    startY = config.package.plcc.side_pad + icHeight + Math.abs(config.pin.spacing - config.pin.width);
    pinStart = pinStop + 1;
    pinStop = pinStart + pinsPerSide - 1;
    offset = 0;
    for(let pinNum = pinStart; pinNum <= pinStop; pinNum++) {
        svg.appendChild(drawPin(startX + offset, startY, PINSIDE.BOTTOM, pinNum, ic.pins[pinNum]));
        offset += config.pin.spacing;
    }

    // right (bottom to top)
    startX = icWidth + config.package.plcc.side_pad;
    startY = config.package.plcc.side_pad - (config.pin.spacing - config.pin.width);
    pinStart = pinStop + 1;
    pinStop = pinStart + pinsPerSide - 1;
    offset = (pinsPerSide - 1) * config.pin.spacing;
    for(let pinNum = pinStart; pinNum <= pinStop; pinNum++) {
        svg.appendChild(drawPin(startX, startY + offset, PINSIDE.RIGHT, pinNum, ic.pins[pinNum]));
        offset -= config.pin.spacing;
    }
}

function renderQFP(svg, ic) {

    if(defined(ic.info.num_pins_base)) {
        var numPinsBase = ic.info.num_pins_base;
        var numPinsSide = (ic.info.num_pins / 2) - numPinsBase;
    } else {
        var numPinsBase = ic.info.num_pins / 4;
        var numPinsSide = numPinsBase;
    }

    const icHeight = (config.pin.spacing * numPinsSide) + (config.pin.spacing - config.pin.height);
    const icWidth = (config.pin.spacing * numPinsBase) + (config.pin.spacing - config.pin.height);
    svg.setAttribute("width", `${config.package.qfp.side_pad * 2 + icWidth}px`);
    svg.setAttribute("height", `${config.package.qfp.side_pad * 2 + icHeight}px`);

    const icBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    icBody.setAttribute("x", config.package.qfp.side_pad);
    icBody.setAttribute("y", config.package.qfp.side_pad);

    icBody.setAttribute("width", icWidth);
    icBody.setAttribute("height", icHeight);
    icBody.setAttribute("stroke", "black");
    icBody.setAttribute("stroke-width", "1");
    icBody.setAttribute("fill", "white");
    svg.appendChild(icBody);

    const icName = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const textX = config.package.plcc.side_pad + icWidth / 2;
    const textY = config.package.plcc.side_pad + icHeight / 2;
    icName.setAttribute("x", textX);
    icName.setAttribute("y", textY);
    icName.setAttribute("text-anchor", "middle");
    icName.setAttribute("dominant-baseline", "middle");
    icName.setAttribute("font-family", "Roboto Mono");
    icName.setAttribute("font-size", "64px");
    icName.setAttribute("font-weight", "500");
    icName.setAttribute("fill", "gray");
    icName.textContent = ic.info.name;
    svg.appendChild(icName);

    const icCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    icCircle.setAttribute("cx", `${config.package.qfp.side_pad + 40}`);
    icCircle.setAttribute("cy", `${icHeight + config.package.qfp.side_pad - 40}`);
    icCircle.setAttribute("r", "20");
    icCircle.setAttribute("stroke", "black");
    icCircle.setAttribute("stroke-width", "1");
    icCircle.setAttribute("fill", "white");
    svg.appendChild(icCircle);

    // bottom (left to right)
    let startX = config.package.qfp.side_pad;
    let startY = config.package.qfp.side_pad + icHeight + (config.pin.width - config.pin.height) / 2;
    let offset = 0;
    let pinStart = 1;
    let pinStop = numPinsBase;
    for(let pinNum = pinStart; pinNum <= pinStop; pinNum++) {
        svg.appendChild(drawPin(startX + offset, startY, PINSIDE.BOTTOM, pinNum, ic.pins[pinNum]));
        offset += config.pin.spacing;
    }

    // right (bottom to top)
    startX = icWidth + config.package.qfp.side_pad;
    startY = config.package.qfp.side_pad - (config.pin.spacing - config.pin.width);
    offset = (numPinsSide - 1) * config.pin.spacing;
    pinStart = pinStop + 1;
    pinStop += numPinsSide;
    for(let pinNum = pinStart; pinNum <= pinStop; pinNum++) {
        svg.appendChild(drawPin(startX, startY + offset, PINSIDE.RIGHT, pinNum, ic.pins[pinNum]));
        offset -= config.pin.spacing;
    }

    // top (right to left)
    startX = config.package.qfp.side_pad;
    startY = config.package.qfp.side_pad - config.pin.height - (config.pin.width - config.pin.height) / 2;
    offset = (numPinsBase - 1) * config.pin.spacing;
    pinStart = pinStop + 1;
    pinStop += numPinsBase;
    for(let pinNum = pinStart; pinNum <= pinStop; pinNum++) {
        svg.appendChild(drawPin(startX + offset, startY, PINSIDE.TOP, pinNum, ic.pins[pinNum]));
        offset -= config.pin.spacing;
    }

    // left (top to bottom)
    startX = config.package.qfp.side_pad - config.pin.width;
    startY = config.package.qfp.side_pad + (config.pin.width - config.pin.height) / 2;
    pinStart = pinStop + 1;
    pinStop += numPinsSide;
    offset = 0;
    for(let pinNum = pinStart; pinNum <= pinStop; pinNum++) {
        svg.appendChild(drawPin(startX, startY + offset, PINSIDE.LEFT, pinNum, ic.pins[pinNum]));
        offset += config.pin.spacing;
    }
}

function renderSIP(svg, ic) {
    const numPins = ic.info.num_pins;
    const icHeight = 200;
    const icWidth = (config.pin.spacing * numPins) + (config.pin.spacing - config.pin.height);
    svg.setAttribute("width", `${icWidth}px`);
    svg.setAttribute("height", `${icHeight + config.package.sip.bottom_pad}px`);

    const icBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    icBody.setAttribute("x", "0");
    icBody.setAttribute("y", "0");
    icBody.setAttribute("width", icWidth);
    icBody.setAttribute("height", icHeight);
    icBody.setAttribute("stroke", "black");
    icBody.setAttribute("stroke-width", "1");
    icBody.setAttribute("fill", "white");
    svg.appendChild(icBody);

    const icName = document.createElementNS("http://www.w3.org/2000/svg", "text");
    const textX = icWidth / 2;
    const textY = icHeight / 2;
    icName.setAttribute("x", textX);
    icName.setAttribute("y", textY);
    icName.setAttribute("text-anchor", "middle");
    icName.setAttribute("dominant-baseline", "middle");
    icName.setAttribute("font-family", "Roboto Mono");
    icName.setAttribute("font-size", "64px");
    icName.setAttribute("font-weight", "500");
    icName.setAttribute("fill", "gray");
    icName.textContent = ic.info.name;
    svg.appendChild(icName);

    const icCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    icCircle.setAttribute("cy", `${icHeight - 30}`);
    icCircle.setAttribute("r", "15");
    icCircle.setAttribute("stroke", "black");
    icCircle.setAttribute("stroke-width", "1");
    icCircle.setAttribute("fill", "white");

    const pinBottom = icHeight + (config.pin.width - config.pin.height) / 2;
    if(defined(ic.info.reversed) && ic.info.reversed === true) {
        icCircle.setAttribute("cx", `${icWidth - 30}`);

        const startX = icWidth - config.pin.spacing - (config.pin.width - config.pin.height) / 2;
        for(let pinNum = 0; pinNum < numPins; pinNum++) {
            svg.appendChild(drawPin(startX - (pinNum * config.pin.spacing), pinBottom, PINSIDE.BOTTOM, pinNum + 1, ic.pins[pinNum + 1]));
        }

    } else {
        icCircle.setAttribute("cx", "30");

        for(let pinNum = 0; pinNum < numPins; pinNum++) {
            svg.appendChild(drawPin(pinNum * config.pin.spacing, pinBottom, PINSIDE.BOTTOM, pinNum + 1, ic.pins[pinNum + 1]));
        }
    }
    svg.appendChild(icCircle);

}

function renderIC(ic) {
    const svg = document.getElementById("ic-svg");
    svg.innerHTML = "";

    document.getElementById("ic-short-description").innerHTML = mdp.render(ic.info.description);

    switch (ic.info.package) {
        case "DIP":
            renderDIP(svg, ic);
            break;
        case "EDGE":
            renderEdge(svg, ic);
            break;
        case "PLCC":
            renderPLCC(svg, ic);
            break;
        case "QFP":
            renderQFP(svg, ic);
            break;
        case "SIP":
            renderSIP(svg, ic);
            break;
    }
    //svg.setAttribute("transform-origin", "center");
    //svg.setAttribute("transform", `rotate(-90)`);

    // setting to the exact width/height seems to cause the very edge row/column
    // of pixels to be missing?
    const svgBB = svg.getBBox();
    svg.setAttribute("viewBox", `${svgBB.x} ${svgBB.y} ${svgBB.width + 1} ${svgBB.height + 1}`);

    // don"t allow the svg to be larger then we drew it
    document.getElementById("ic-svg").style.maxWidth = `${svgBB.width}px`;
    document.getElementById("ic-svg").style.maxHeight = `${window.innerHeight * 0.8}px`;

    if(defined(ic.details) && defined(ic.details.markdown)) {
        document.getElementById("ic-markdown").innerHTML = mdp.render(ic.details.markdown);
    } else {
        document.getElementById("ic-markdown").innerHTML = "";
    }
}

const mdp = makeMDP();

// Add a url parser to to markdown to support [link](url){:attributes}
// such that stuff inside the {:} will be added into the anchor as additional
// attributes.  ie {:target="_blank"} to cause link to open a new window/tab
mdp.addInlineSyntax (
    {
	    tag: "ACA",
	    priority: 55,
	    provisionalText: '<a href="$2" $3>$1</a>',
	    matchRegex: new RegExp("\\[(.+?)\\]\\((.+?)\\)\\{\\:(.+?)\\}", 'g'),
	    converter: function ( argBlock ) {
            return null;
	    },
	    matchedString: new Array()
    }
);

// This function call and the function definition after are used to override mdp"s
// built in table parsing.  It has the following changes
// - allow up to 2 header rows
// - add colspan support to header rows
// - fix a bug where it would break if the line after the table wasn"t empty
mdp.addBlockSyntax (
    {
        tag: "TB",
        priority: 30,
        matchRegex: new RegExp("^(\\|.+?\\| *\\n){1,2}\\|[-:| ]*\\| *\\n\\|.+?\\|[\\s\\S]*?(?=\\n[^\\|])", "gm"),
        converter: function ( argBlock ) {
            argBlock = mdp.mdInlineParserFormer(argBlock);
            var temp = argBlock.replace( new RegExp("^\\n*([\\s\\S]*)\\n*$"), "$1" );
            return mdp.mdInlineParserLatter(mdTBParser(temp));
        },
        convertedHTML: new Array()
    }
);

function mdTBParser( argText ) {
    let retText = "";
    let lineText = argText.split(/\n/);

    // figure out if the alignment line row index 1 or 2 and set it up
    let headerCount = 0;
    let foundAlign = false;
    let alignText = new Array();
    for(let kk = 0; kk < 3 && !foundAlign; kk++) {
        let items = lineText[kk].replace(/^\|\s*/, "").replace(/\s*\|$/, "").split(/\s*\|\s*/g);
        for(let jj = 0; jj < items.length; jj++) {

            // :--: center align
            if( /^:[\s-]+:$/.test(items[jj]) ) {
                alignText.push(" style=\"text-align:center\"");   
                foundAlign = true;

            // :--- left align
            } else if( /^:[\s-]+$/.test(items[jj]) ) {
                alignText.push(" style=\"text-align:left\"");
                foundAlign = true;

            // ---: right align
            } else if( /^[\s-]+:$/.test(items[jj]) ) {
                alignText.push(" style=\"text-align:right\"");
                foundAlign = true;
            }
        }
        if(!foundAlign)
            headerCount++;
    }

    // render the header row(s)
    retText = "<table>\n";
    retText += "<thead>";
    for(let kk = 0; kk < headerCount; kk++) {
        retText += "<tr>\n";
        lineText[kk] = lineText[kk].replace(/^\|\s*/, "");
        let items = lineText[kk].split(/\s*\|+\s*/g);
        let colDivText = lineText[kk].replace(/\s/g, "").match(/\|+/g);
        let num = 0;
        for(let jj = 0; jj < (colDivText||[]).length; jj++) {
            if(colDivText[jj] == "|") {
                retText +=  "<th" + alignText[num] + ">" + items[jj] + "</th>\n";
                num += 1;
            } else {
                retText +=  "<th" + alignText[num] + " colspan=" + colDivText[jj].length + ">" + items[jj] + "</th>\n";
                num += colDivText[jj].length;
            }
        }
        retText += "</tr>";
    }
    retText += "</thead>\n";

    // render normal rows
    retText += "<tbody>\n";
    for(let kk = headerCount + 1; kk < lineText.length; kk++) {
        lineText[kk] = lineText[kk].replace(/^\|\s*/, "");
        let items = lineText[kk].split(/\s*\|+\s*/g);
        let colDivText = lineText[kk].replace(/\s/g, "").match(/\|+/g);
        retText +=  "<tr>\n";
        let num = 0;
        for(let jj = 0; jj < (colDivText||[]).length; jj++) {
            if(colDivText[jj] == "|") {
                retText +=  "<td" + alignText[num] + ">" + items[jj] + "</td>\n";
                num += 1;
            } else {
                retText +=  "<td" + alignText[num] + " colspan=" +colDivText[jj].length + ">" + items[jj] + "</td>\n";
                num += colDivText[jj].length;
            }
        }
        retText += "</tr>\n";
    }
    retText += "</tbody></table>";
    return retText;
}

let config = undefined;
loadConfig();
document.addEventListener("DOMContentLoaded", loadTypes);
document.getElementById("type-select").addEventListener("change", handleTypeChange);
document.getElementById("ic-select").addEventListener("change", handleIcChange);
