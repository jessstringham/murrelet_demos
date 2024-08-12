import init, { new_model } from "../murrelet/examples/foolish_guillemot/pkg/foolish_guillemot.js";
import { EditorView, basicSetup} from "codemirror"
import { EditorState } from "@codemirror/state";
import { yaml } from "@codemirror/lang-yaml";
import { keymap } from "@codemirror/view";


const doc = `\
# Hi you found my sneak preview.
# I'm working on things, but this is
# a demo of a part of the engine I've been
# building that I use to livecode viz.

drawing:
  sequencer:
    type: Square  # Hex, Rect (update size to [x, y])
    size: 100
    rows: 5
    cols: 11

  ctx: |
    // can define variables for each cell
  
  node:
    -
      shape:
        start:
          loc: [-50.0, -50.0]
          angle: t * 0.1 + x + 0.05 * y
        dirs:
          - type: Arc  # Line {length}, Repeat {times, what}
            arc_length: 1.5
            radius: 50.0
          - type: Arc
            arc_length: 0.5
            radius: -50.0
      style:
        type: Fill  # Line, Outline, Fill...
        color:
          - s(x, 0.2, 0.5)
          - 0.9
          - 1.0
          - 0.95
        stroke_weight: 3.5

  # some quick scale things, close enough...
  offset: [w / 2, h / 2]
  scale: w / 300.0

app:
    time:
        bpm: 135.0
    redraw: 1.0
    ctx: |
        // define variables for the entire script here\
`;


class MurreletModel {
  constructor(svg) {
    this.murrelet = null;
    this.svg = svg;

    this.imgs = this.svg.getElementById("imgDefs");
    this.defs = this.svg.getElementById("patternDefs");
    this.paths = this.svg.getElementById("paths");

    // init some things about the mouse
    this.mouse_x = 0.0; // mouse x
    this.mouse_y = 0.0; // mouse y
    this.mouse_down = false;

    // init some things about the window (will update soon)
    this.dim_x = 600.0; // will be w
    this.dim_y = 600.0; // will be h

    // init frame count
    this.frame = 1n;

    // initial, but once we successfully load the model we'll update this

    this.fps = 30; // initial, but we'll load this from the config
    this.lastUpdate = performance.now();

    this.addEventListeners();
  }

  async initModel(conf) {
    // if we haven't successfully loaded it, try to do that
    console.log("init model");
    try {
      let model_or_err = await new_model(conf);
        if (model_or_err.is_err()) {
            console.log("ERROR");
            document.getElementById('err_msg').innerHTML = model_or_err.err_msg();
      } else {
          this.murrelet = model_or_err.to_model();
          console.log("model init");
      }
    } catch (err) {
      console.error("init failed", err);
    }
  }


  async reload(conf) {
    var result = "";

    var isInitial = false;
    if (this.murrelet === null) {
      await this.initModel(conf);
      isInitial = true;
    }
    
    if (this.murrelet !== null) {
      result = this.murrelet.update_config(conf);
      this.fps = this.murrelet.fps();
      this.updateWindowSize();

      if (isInitial) {
        // set up imgs just once when it's first initialized
        this.imgs.innerHTML = this.murrelet.make_img_defs();
      }
    }

    return result
  }

  async updateTextures() {
    if (this.murrelet !== null) {
      let canvases = this.murrelet.canvas_ids();
      // optional texture things
      for (let i = 0; i < canvases.length; i++) {
        let canvasId = canvases[i];
        this.canvasToImg(canvasId + "Canvas", canvasId + "Img");
      }
    }
  }

  updateMurreletWithWorld() {
    if (this.murrelet !== null) {
      this.murrelet.update_frame(
        this.frame, 
        this.dim_x, 
        this.dim_y, 
        this.mouse_x, 
        this.mouse_y, 
        this.mouse_down
      );
    }
  }

  // get world state
  updateWindowSize() {
    const rect = this.svg.getBoundingClientRect();

    this.dim_x = rect.width;
    this.dim_y = rect.height;
  }

  mouseMove(event) {
    const rect = this.svg.getBoundingClientRect();

    // Calculate the x and y coordinates relative to the container
    this.mouse_x = event.clientX - rect.left;
    this.mouse_y = event.clientY - rect.top;
  }

  mouseDown() {
    this.mouseDown = true;
  }

  mouseUp() {
    this.mouseDown = false;
  }

  addEventListeners() {
    this.svg.addEventListener('mousemove', () => this.mouseMove);
    this.svg.addEventListener('click', () => this.mouseDown);
    this.svg.addEventListener('mouseup', () => this.mouseUp);

    window.addEventListener('resize', () => this.updateWindowSize);
    document.addEventListener('DOMContentLoaded', () => this.updateWindowSize);
  }

  // optional texture things
  canvasToImg(srcId, targetId) {
    const canvasImage = document.getElementById(targetId);
    // check whether we've written here
    if (!canvasImage) {
      console.log("no svg yet");
      return
    }

    const canvas = document.getElementById(srcId);
    const dataURL = canvas.toDataURL("image/png");
    canvasImage.setAttribute("href", dataURL);
  }

  updateAndDraw() {
    if (this.murrelet !== null) {
      const t = performance.now();
      
      // You _could_ set up FPS, but I'm building this with the assumption folks
      // won't set realtime=false, so we'll just run as fast as we can
      // something like `t - this.lastUpdate > 1000 / this.fps`
      {
        console.log("HI");
        this.updateMurreletWithWorld();

        let patternsAndPaths = this.murrelet.draw();

        this.defs.innerHTML = patternsAndPaths[0];
        this.paths.innerHTML = patternsAndPaths[1];

        this.lastUpdate = t;

        this.svg.style.backgroundColor = this.murrelet.bg_color();
      }

      this.frame += 1n;
    }
  }

}


async function run_app() {
    await init();

    var model = new MurreletModel(
      document.getElementById('frame')
    );

    // console.log(model);

    // evaluate!
    async function updateFrame() {
      let conf = editor.state.doc.toString();
      let errMsg = await model.reload(conf);
      document.getElementById('err_msg').innerHTML = errMsg;

      model.updateTextures()
    }

    async function sendEditorToModel() {
      let conf = editor.state.doc.toString();
      await model.reload(conf) 
    }

    document.getElementById('submit').onclick = sendEditorToModel;

    model.updateWindowSize();

    const customKeymap = keymap.of([
        {
          key: 'Mod-Enter',
          run: async () => {
            updateFrame();
            return true;
          }
        }
    ]);
    
    const startState = EditorState.create({
        doc: doc,
        extensions: [customKeymap, basicSetup, yaml()]
      });
    
    let editor = new EditorView({
        state: startState,
        parent: document.getElementById('editor')
    })

    function renderFrame() {
      model.updateAndDraw();
      requestAnimationFrame(renderFrame);
    }

    requestAnimationFrame(renderFrame);
    await updateFrame();
}
run_app();
