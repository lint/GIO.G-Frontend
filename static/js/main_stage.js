
/* -------------------------------------------------------------------------- */
/*                               stage controls                               */
/* -------------------------------------------------------------------------- */


/* ----------------------------- stage resizing ----------------------------- */


// create stage objects using their containers' height
function create_stages() {

    let main_stage_initial_size = 850;

    // get the containers of the stages and their parents
    let main_stage_container = document.getElementById("graph-stage");
    let editor_stage_container = document.getElementById("building-editor-stage");

    // get necessary dimensions of the container cells
    let main_container_width = main_stage_container.offsetWidth;
    let main_container_height = main_stage_container.offsetHeight;
    let editor_container_width = editor_stage_container.offsetWidth; // don't need height since it's a square

    // determine the scale for the stage
    let main_scale = Math.min(1, main_container_height / main_container_width);
    if (main_stage_initial_size < main_container_width) {
        main_scale *= main_stage_initial_size / main_container_width;
    }

    // determine offset to place graph in the middle of the stage
    let main_x_offset = (main_container_width - main_container_width * main_scale) / 2;
    let main_y_offset = (main_container_height - main_container_width * main_scale) / 2;

    console.log("create stages, main width: ", main_container_width, "height: ", main_container_height);
    console.log("editor width: ", editor_container_width);

    // create the stages
    stage = new Konva.Stage({
        container: "graph-stage",
        width: Math.floor(main_container_width) - 1, // slightly underestimate size to prevent display bugs
        height: Math.floor(main_container_height) - 1,
        scale: {x:main_scale, y:main_scale},
        x: main_x_offset,
        y: main_y_offset
    });

    editor_stage = new Konva.Stage({
        container: "building-editor-stage",
        width: Math.floor(editor_container_width) - 1,
        height: Math.floor(editor_container_width) - 1
    });

    // setup callbacks for the main stage
    stage.on("mousedown.pan", panning_main_stage_mousedown);
    stage.on("mousemove.pan", panning_main_stage_mousemove);
    stage.on("mouseout.pan", panning_main_stage_mouseout);
    stage.on("mouseup.pan", panning_main_stage_mouseup);
    stage.on("wheel.zoom", zooming_main_stage_wheel);
}


// update stage objects using their containers' height
function size_stages_to_containers() {

    if (stage === null || editor_stage === null) {
        return;
    }

    // get the stage containers and their parent containers
    let main_stage_container = document.getElementById("graph-stage");
    let editor_stage_container = document.getElementById("building-editor-stage");
    let main_stage_container_container = main_stage_container.parentNode;
    let editor_stage_container_container = editor_stage_container.parentNode;

    // temporarily set the display to none to get accurate readings of sizes
    main_stage_container.style.display = "none";
    editor_stage_container.style.display = "none";

    // get the sizes of the containers
    let main_container_width = main_stage_container_container.offsetWidth;
    let main_container_height = main_stage_container_container.offsetHeight;
    let editor_container_width = editor_stage_container_container.offsetWidth;

    // reset display status
    main_stage_container.style.display = "";
    editor_stage_container.style.display = "";

    
    // set the widths and heights of the stages (slightly under container size to not cause weird overflow issues)
    stage.width(Math.floor(main_container_width) - 1);
    stage.height(Math.floor(main_container_height) - 1);
    editor_stage.width(Math.floor(editor_container_width) - 1);
    editor_stage.height(Math.floor(editor_container_width) - 1);
}


/* -------------------------- stage panning support ------------------------- */


// get the current position of the cursor within the stage in scaled and translated coordinates
// function stage_pointer_coords() {
//     let scale = stage.scaleX();
//     let pointer = stage.getPointerPosition();

//     return {
//         x: (pointer.x - stage.x()) / scale,
//         y: (pointer.y - stage.y()) / scale,
//     };
// }


// callback for detection of any mouse down events on the stage
function panning_main_stage_mousedown(e) {
    // console.log("stage mouse down!");

    if (road_hiding_drag_enabled || !can_pan_enabled) {
        return;
    }

    is_pan_attempted = true;

    // set panning start positions
    pan_start_pointer_pos = stage.getPointerPosition();
    pan_start_stage_pos = {
        x: stage.x(),
        y: stage.y()
    };
    // e.evt.preventDefault();
};


// callback for detection of mouse movement events on the stage
function panning_main_stage_mousemove(e) {

    // do nothing if not currently panning
    if (!is_pan_attempted || (!is_pan_attempted && !is_panning) || pan_start_pointer_pos === null || pan_start_stage_pos === null || !can_pan_enabled) {
        return;
    }

    // get the current position of the pointer
    let pan_end_pointer_pos = stage.getPointerPosition();

    // find the difference in pointer positions
    let pan_diff = {
        x: pan_end_pointer_pos.x - pan_start_pointer_pos.x,
        y: pan_end_pointer_pos.y - pan_start_pointer_pos.y 
    };

    // check if a pan has been attempted but not started
    if (is_pan_attempted && !is_panning) {
        
        let dist = Math.hypot(pan_diff.x, pan_diff.y);

        if (dist > pan_min_dist) {
            is_panning = true;

            // reset start pointer position to cleanly begin panning
            pan_start_pointer_pos = pan_end_pointer_pos;
            pan_diff = {
                x: pan_end_pointer_pos.x - pan_start_pointer_pos.x,
                y: pan_end_pointer_pos.y - pan_start_pointer_pos.y 
            };
        } else {
            return;
        }
    }

    // set the move cursor pointer
    stage.container().style.cursor = "move";

    let scale = stage.scaleX();

    // convert the end pointer position to local coordinates
    let pan_end_local = {
        x: (pan_end_pointer_pos.x - pan_start_stage_pos.x) / scale,
        y: (pan_end_pointer_pos.y - pan_start_stage_pos.y) / scale
    };

    // calculate the new stage position
    let new_stage_pos = {
        x: pan_end_pointer_pos.x - pan_end_local.x * scale + pan_diff.x,
        y: pan_end_pointer_pos.y - pan_end_local.y * scale + pan_diff.y
    };

    stage.position(new_stage_pos);
};


// callback for detection of when the cursor moves out of the stage
function panning_main_stage_mouseout(e) {

    // console.log("stage mouseout!");
    // disable panning if it is enabled
    // if (is_panning) {
    //     is_panning = false;
    //     return;
    // }

    // TODO: causes weird behavior when going over shapes / layers (mouseout is triggered for some reason, find a way to prevent this)
    stage.container().style.cursor = "default";
};


// callback for detection of when the cursor is released in the stage
function panning_main_stage_mouseup(e) {
    console.log("stage mouse up");

    // disable panning if it is enabled
    if (is_panning || is_pan_attempted || !can_pan_enabled) {
        is_panning = false;
        is_pan_attempted = false;
    }

    stage.container().style.cursor = "default";
};


/* -------------------------- stage zooming support ------------------------- */


// callback for when wheel movement detected on main stage
function zooming_main_stage_wheel(e) {
    // stop default scrolling
    e.evt.preventDefault();

    if (is_panning || !can_zoom_enabled) {
        return;
    }

    let old_scale = stage.scaleX();
    let pointer = stage.getPointerPosition();

    let stage_coords = {
        x: (pointer.x - stage.x()) / old_scale,
        y: (pointer.y - stage.y()) / old_scale,
    };

    // how to scale? Zoom in? Or zoom out?
    let direction = e.evt.deltaY > 0 ? -1 : 1;

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey) {
        direction = -direction;
    }

    let new_scale = direction > 0 ? old_scale * main_stage_scale_by : old_scale / main_stage_scale_by;

    stage.scale({ x: new_scale, y: new_scale });

    let new_pos = {
        x: pointer.x - stage_coords.x * new_scale,
        y: pointer.y - stage_coords.y * new_scale,
    };
    stage.position(new_pos);
};
  

/* ------------------------- main stage road hiding ------------------------- */


// start the road hiding rect bounds on mouse down
function road_hiding_stage_mousedown(e) {

    if (road_hiding_drag_enabled) {
        is_dragging_road_hide = true;
        
        let scale = stage.scaleX();
        let pointer = stage.getPointerPosition();

        let pointer_stage_coords = {
            x: (pointer.x - stage.x()) / scale,
            y: (pointer.y - stage.y()) / scale,
        };

        road_hide_start_pos = pointer_stage_coords;
        road_hide_cur_pos = pointer_stage_coords;
    } else {
        is_dragging_road_hide = false;
        road_hide_start_pos = null;
        road_hide_cur_pos = null;
    }
};


// update hiding road rect bounds
function road_hiding_stage_mousemove(e) {
    if (is_dragging_road_hide) {
        
        let scale = stage.scaleX();
        let pointer = stage.getPointerPosition();

        let pointer_stage_coords = {
            x: (pointer.x - stage.x()) / scale,
            y: (pointer.y - stage.y()) / scale,
        };

        road_hide_cur_pos = pointer_stage_coords;
        let pos_rect = invert_rect_coords(road_hide_start_pos, road_hide_cur_pos);

        road_hiding_bounds_rect.x(pos_rect.x1);
        road_hiding_bounds_rect.y(pos_rect.y1);
        road_hiding_bounds_rect.width(pos_rect.x2 - pos_rect.x1);
        road_hiding_bounds_rect.height(pos_rect.y2 - pos_rect.y1);
        road_hiding_bounds_rect.visible(true);        
    }
};
  

// draw a new road hiding rectangle at the current bound coordinates and size
function road_hiding_stage_mouseup(e) {
    
    is_dragging_road_hide = false;
    road_hiding_bounds_rect.visible(false);

    if (!road_hiding_drag_enabled) {
        return;
    }
    
    var new_hide_rect = new Konva.Rect({
        x: road_hiding_bounds_rect.x(),
        y: road_hiding_bounds_rect.y(),
        width: road_hiding_bounds_rect.width(),
        height: road_hiding_bounds_rect.height(),
        fill: "white",
        draggable: true
    })
    road_layer.add(new_hide_rect);
}
