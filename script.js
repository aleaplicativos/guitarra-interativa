// OPTIONS
var base_url = "https://s3-us-west-2.amazonaws.com/s.cdpn.io/61062/";
var audioData = {
  loaded: false,
  loadIndex: 0,
  strings: [
  { stringName: "e2", url: "e2_string" },
  { stringName: "a", url: "a_string" },
  { stringName: "d", url: "d_string" },
  { stringName: "g", url: "g_string" },
  { stringName: "b", url: "b_string" },
  { stringName: "e", url: "e_string" }],

  buffer: {},
  source: {} };


var time = 0;
let o = {
  size: {
    x: window.innerWidth,
    y: window.innerHeight } };


//_____________
let guitar = {
  gridSize: audioData.strings.length,
  gridGap: 20,
  threshold: 20,
  mouseRadius: 20,
  direction: 0, // 0==vertical || 1 == horizontal
  mouse: {
    x: 0,
    y: 0 },

  strings: [] };


//____________________________________
try {
  // Fix up for prefixing
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var context = new AudioContext();
  audioData.bufferLoader = new AudioBufferLoader(context);
}
catch (e) {
  console.log('Web Audio API is not supported in this browser');
}

function loadSingleString(name, url, cb) {
  audioData.bufferLoader.loadBuffer(name, url, function (buffer) {
    audioData.buffer[name] = buffer;
    audioData.source[name] = createSource(buffer);
    cb(name);
  });
}
for (var i = 0; i < audioData.strings.length; i++) {
  loadSingleString(audioData.strings[i].stringName, base_url + audioData.strings[i].url + ".mp3", name => {
    audioData.loadIndex++;
    if (audioData.loadIndex == audioData.strings.length) {
      audioData.loaded = true;
      init();
      console.log("complete loaded", audioData.loaded);
    }
  });

}
//load single Buffer

function createSource(buffer) {
  var source = context.createBufferSource();
  source.buffer = buffer;
  // Connect gain to destination.
  source.connect(context.destination);
  return {
    source: source };


}

function playSound(source, buffer, loop) {
  source = createSource(buffer);
  source.source.loop = loop;
  source.playing = true;
  source.source.start ? source.source.start() : source.source.noteOn(0);
  return source;
}

function pointInCircle(point, target, axis, radius) {
  var distsq = (point[axis] - target[axis]) * (point[axis] - target[axis]);
  return [distsq <= radius * radius, distsq];
}

function getPos(dir, stringNum, vert) {
  var positions;
  if (dir == 0) {
    positions = {
      x: -(guitar.gridSize * guitar.gridGap / 2) + o.size.x / 2 + stringNum * guitar.gridGap,
      y: o.size.y * .1 + o.size.y / 2 * .8 * vert };

  } else {
    positions = {
      x: o.size.x * .1 + o.size.x / 2 * .8 * vert,
      y: -(guitar.gridSize * guitar.gridGap / 2) + o.size.y / 2 + stringNum * guitar.gridGap };

  }
  return positions;
}

function checkIntersect(point, axis) {

  let checker = pointInCircle(point.origin, guitar.mouse, axis, guitar.mouseRadius);

  if (checker[0]) {
    if (point.enterPos != point.origin[axis] > guitar.mouse[axis] && point.enterPos === null) {
      point.enterPos = point.origin[axis] > guitar.mouse[axis];
    } else if (point.enterPos != point.origin[axis] > guitar.mouse[axis]) {
      point.triggered = true;
    }
    if (point.triggered) {
      point.pos.x = guitar.mouse.x;
      point.pos.y = guitar.mouse.y;
      point.offset[axis] = Math.abs(point.pos[axis] - point.origin[axis]);
    }
    if (point.offset[axis] > point.threshold) {
      point.swing = true;
    }
  } else {
    if (point.triggered) {
      point.swing = true;
    }
  }
}
//__________________________________


const canvas = document.createElement("canvas");
canvas.width = o.size.x;
canvas.height = o.size.y;
document.body.appendChild(canvas);
const c = canvas.getContext("2d");

//__________________________________
function init() {
  preparePoints();
  Animation(time);
}
function preparePoints() {
  guitar.strings = [];
  for (var j = 0; j < guitar.gridSize; j++) {
    let origins = [];
    for (var i = 0; i <= 2; i++) {
      origins.push({
        swing: false,
        swinging: false,
        threshold: guitar.threshold,
        enterPos: null,
        triggered: false,
        enterPos: 0,
        stringName: audioData.strings[j].stringName,
        pos: getPos(guitar.direction, j, i),
        origin: getPos(guitar.direction, j, i),
        offset: {
          x: 0,
          y: 0 } });


    }
    guitar.strings.push(origins);
  }
}

//________________________________
function update() {
  c.clearRect(0, 0, o.size.x, o.size.y);
  c.fillStyle = "#ffffff";
  c.strokeStyle = "#ffffff";

  guitar.strings.forEach((str, index) => {
    str.forEach((p, index) => {
      if (index == 0 || index == 2) {
        c.beginPath();
        c.arc(p.pos.x, p.pos.y, 3, 0, 2 * Math.PI);
        c.fill();
        c.closePath();
        return;
      }
      if (!p.swing) {
        if (guitar.direction == 0) {
          checkIntersect(p, "x");
        } else {
          checkIntersect(p, "y");
        }
      } else {
        if (!p.swinging) {
          swing(p, index);
        }
      }
    });
  });

  guitar.strings.forEach((str, index) => {
    c.beginPath();
    str.forEach((p, index) => {
      c.lineTo(p.pos.x, p.pos.y);
    });
    c.stroke();
    c.closePath();
  });
}

function swing(point, index) {
  point.swinging = true;
  point.offset.x = 0;
  point.offset.y = 0;
  var start = {
    x: point.pos.x,
    y: point.pos.y };

  var end = {
    x: point.origin.x,
    y: point.origin.y };

  //play
  playSound(audioData.source[point.stringName].source, audioData.buffer[point.stringName], false);

  new TWEEN.Tween(start).to(end, 500).easing(TWEEN.Easing.Elastic.Out).onUpdate(function () {

    point.pos.x = this.x;
    point.pos.y = this.y;

  }).onComplete(function () {
    point.swing = false;
    point.swinging = false;
    point.triggered = false;
    point.enterPos = null;
  }).start();
}

//________________________________
function mousemove(event) {
  guitar.mouse.delta = {
    x: guitar.mouse.x - event.pageX,
    y: guitar.mouse.y - event.pageY };

  guitar.mouse.x = event.pageX;
  guitar.mouse.y = event.pageY;
}
function touchmove(event) {
  guitar.mouse.delta = {
    x: guitar.mouse.x - event.touches[0].pageX,
    y: guitar.mouse.y - event.touches[0].pageY };

  guitar.mouse.x = event.touches[0].pageX;
  guitar.mouse.y = event.touches[0].pageY;
}

window.addEventListener('mousemove', mousemove);
window.addEventListener('touchmove', touchmove);
window.onresize = function () {
  o.size.x = window.innerWidth;
  o.size.y = window.innerHeight;
  canvas.width = o.size.x;
  canvas.height = o.size.y;
  preparePoints();
};
//________________________________
function Animation(time) {
  requestAnimationFrame(Animation);
  TWEEN.update(time);
  update();
}