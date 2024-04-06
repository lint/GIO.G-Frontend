

/* -------------------------------------------------------------------------- */
/*                               canvas drawing                               */
/* -------------------------------------------------------------------------- */


/* --------------------------- drawing dimensions --------------------------- */


// calculate cell dimensions for the main stage and editor stage based on a given config 
function calculate_cell_dims(grid_len) {

    // get number of spaces between grid cells
    let num_spaces = grid_len - 1;

    let no_spacing_main_width = stage.width() / grid_len;
    let cell_spacing = cell_spacing_ratio * no_spacing_main_width;

    // calculate the dimensions of each building cell including spacing
    let main_cell_width = (stage.width() - num_spaces * cell_spacing) / grid_len;

    main_cell_dims = {
        size: main_cell_width,
        spacing: cell_spacing,
        stroke: 2
    };

    editor_cell_dims = {
        size: editor_stage.width(),
        spacing: 0,
        stroke: 4
    };
}


// get the cell dimensions object for either the main stage or the editor stage
function get_cell_dims(for_main_stage) {
    return for_main_stage ? main_cell_dims : editor_cell_dims;
}


// get the door dimensions object for either the main stage or the editor stage
function get_door_dims(for_main_stage) {

    // define dimensions for doors given dimensions for cell
    let cell_dims = get_cell_dims(for_main_stage);
    return {
        size: cell_dims.size * door_len_ratio,
        stroke: for_main_stage ? 1 : 2
    };
}


// path type options to useable stage coordinates
function get_main_stage_path_dash(path_type) {

    let path_options = path_type_options[path_type];
    let door_dims = get_door_dims(true);
    let cell_dims = get_cell_dims(true);

    if (path_options.dash === null) {
        return null;
    }

    return path_options.dash.map((dash_part) => dash_part * cell_dims.size);
}


/* ---------------------------- building drawing ---------------------------- */


// initialize and draw all elements for the main stage
function draw_main_stage() {

    // reset stage scale and position
    // stage.scale({x:1, y:1});
    // stage.position({x:0, y:0});

    // reset selected points
    path_start_selected_grid_coords = null;
    path_end_selected_grid_coords = null;
    update_path_select_labels();    

    // reset cell selections
    reset_cell_selections();

    // clear the building editor
    reset_building_editor();

    // clear any previous layers
    stage.destroyChildren();

    // create the necessary layers to draw
    create_main_layers();

    // setup necessary callbacks
    setup_main_stage_callbacks();

    // draw selection overlay
    // draw_selection_overlays(selection_layer);

    // draw buildings 
    draw_buildings(building_layer);

    // draw roads display
    draw_roads(road_layer);
}


// create and add layers to the main stage
function create_main_layers() {

    // create and add new layers
    building_layer = new Konva.Layer({
        listening: false
    });
    road_layer = new Konva.Layer({
        // listening: false // TODO: add listening false back when you remove road hiding support
    });
    path_layer = new Konva.Layer({
        listening: false
    });
    selection_layer = new Konva.Layer({
        listening: false
    });
    
    stage.add(road_layer);
    stage.add(building_layer);
    stage.add(path_layer);
    stage.add(selection_layer);
}


// setup stage event handlers
function setup_main_stage_callbacks() {
    
    // process clicks for the selection layer
    // (different from panning mouseup which is already bound, if want to bind to that event you need to use namespaces like mouseup.pan and mouseup.select)
    stage.off(".selection");
    stage.on("click.selection", function (e) {
        if (!is_panning) {
            select_point();
        }
    });

    // setup stage road hiding events
    stage.off(".road_hiding");
    stage.on("mousedown.road_hiding", road_hiding_stage_mousedown);
    stage.on("mousemove.road_hiding", road_hiding_stage_mousemove);
    stage.on("mouseup.road_hiding", road_hiding_stage_mouseup);
    road_hiding_bounds_rect = new Konva.Rect({x: 0, y: 0, width: 0, height: 0, stroke: 'red', dash: [2,2], listening: false});
    road_layer.add(road_hiding_bounds_rect);
}


// draw buildings on the main stage
function draw_buildings(parent) {

    let buildings = current_graph;

    // iterate over every building
    for (let b = 0; b < buildings.length; b++) {

        let building = buildings[b];

        // get building x and y coordinates (convert 1-indexed to 0-indexed)
        let building_grid_coords = grid_coords_for_building_or_door(building);

        // draw the building
        draw_building(building_grid_coords, parent, true) 
    }
}


// redraw the selected building on the main stage and the editor stage
function redraw_selected_building(building_grid_coords) {

    if (building_grid_coords === null) {
        return;
    }

    let cell_info = grid_object_at_coords(building_grid_coords);
    if (cell_info.building_data === null) {
        return;
    }

    // clear the editor stage
    editor_stage.destroyChildren();

    // create a new layer to draw the building on
    let editor_layer = new Konva.Layer();
    editor_stage.add(editor_layer);

    // draw the building on the editor stage
    draw_building(building_grid_coords, editor_layer, false);

    // draw the building on the main stage
    draw_building(building_grid_coords, building_layer, true);
}


// draw a given building: its shape and doors
function draw_building(building_grid_coords, parent, for_main_stage) {
    
    // get information about the given building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info.building_mods;

    // create a group to contain the building and its entrances
    let building_group = new Konva.Group();
    
    if (for_main_stage) {

        // remove previous shapes if they exist
        let prev_group = cell_info.shapes.building_group;
        if (prev_group !== null) {
            prev_group.destroy();
        }
    }

    // construct and draw the building shape
    let building_shape = draw_building_shape(building_grid_coords, building_group, for_main_stage);
    let points = building_shape.points();
    
    // TODO: remove entirely
    // add a clipping function to the building group to hide doors from appearing outside of building
    if (building_clipping_enabled) {
        building_group.clipFunc(function(ctx) {
            ctx.beginPath();
            ctx.moveTo(points[0], points[1]);
    
            for (let i = 2; i < points.length - 1; i += 2) {
              ctx.lineTo(points[i], points[i+1]);
            }
    
            ctx.closePath();
        });
    }

    // draw building corridors
    draw_corridors(building_grid_coords, building_group, for_main_stage);

    // draw building entrances
    draw_entrances(building_grid_coords, building_group, for_main_stage);

    // draw building outline
    draw_building_outline(building_grid_coords, building_group, for_main_stage);

    // store main stage shapes
    if (for_main_stage) {
        cell_info.shapes.building_group = building_group;
    }

    // add the building group to the parent group / layer
    parent.add(building_group);
}


// draw the building shape for the building at the given coordinates
function draw_building_shape(building_grid_coords, parent, for_main_stage) {

    // get the grid cell info object associated with the building
    let cell_info = grid_object_at_coords(building_grid_coords);

    // destroy previous building shape if there is one
    if (for_main_stage) {
        let prev_building_shape = cell_info.shapes.building;
        if (prev_building_shape !== null) {
            prev_building_shape.destroy();
        }
    }

    // convert the grid path to a path that can be used by the stage
    let grid_shape_path = cell_info.building_mods.outline_grid_path;
    let stage_shape_path = grid_shape_path.map((point) => door_grid_coords_to_stage_coords(point, building_grid_coords, for_main_stage));
    stage_shape_path = flatten_points(stage_shape_path);

    let building_color = building_con_colors_enabled ? building_con_colors[cell_info.building_data.congestion_type || cell_info.building_mods.con_level] : building_con_colors["constant"];

    // construct a building shape given the door coordinates and calculated corners
    let building_shape = new Konva.Line({
        points: stage_shape_path,
        fill: building_color,
        // stroke: 'black',
        // strokeWidth: building_stroke_width,
        closed: true,
        perfectDrawEnabled: false
    });
    parent.add(building_shape);

    // add necessary info about the building cell to the grid array
    if (for_main_stage) {
        cell_info.shapes.building = building_shape;
    }

    return building_shape;
}


// draw a shape to represent a building being selected
function draw_building_select_highlight(building_grid_coords) {

    // TODO: comment this later
    
    // get the grid cell info object associated with the building
    // let cell_info = grid_object_at_coords(building_grid_coords);
    // let building_mods = cell_info.building_mods;
    // let cell_dims = get_cell_dims(true);

    // let building_center = building_mods.outline_grid_center;
    // let building_center_stage = door_grid_coords_to_stage_coords(building_center, building_grid_coords, true);
    // let outline_path = building_mods.outline_grid_path;

    // let min_x = Number.MAX_SAFE_INTEGER;
    // let min_y = Number.MAX_SAFE_INTEGER;
    // let max_x = Number.MIN_SAFE_INTEGER;
    // let max_y = Number.MIN_SAFE_INTEGER;

    // console.log(min_x, min_y, max_x, max_y);

    // for (let i = 0; i < outline_path.length; i++) {

    //     let point = outline_path[i];
    //     console.log(point);

    //     if (point.x < min_x) {
    //         min_x = point.x;
    //     }

    //     if (point.x > max_x) {
    //         max_x = point.x;
    //     }

    //     if (point.y < min_y) {
    //         min_y = point.y;
    //     }

    //     if (point.y > max_y) {
    //         max_y = point.y;
    //     }
    // }

    // console.log(min_x, min_y, max_x, max_y);

    // let min_point = {x:min_x, y:min_y};
    // let max_point = {x:max_x, y:max_y};

    // let min_max_dist = calc_dist(min_point, max_point);
    // let stage_radius = (min_max_dist * cell_dims.size) / 2;

    // console.log("stage radius: ", stage_radius);
    // console.log("cell size", cell_dims.size);
    // console.log(building_center_stage.x, building_center_stage.y);
    // console.log(grid_coords_to_main_stage_coords(building_grid_coords));
    // console.log(building_center_stage);

    // let select_circle = new Konva.Circle({
    //     x: building_center_stage.x,
    //     y: building_center_stage.y,
    //     radius: stage_radius,
    //     fill: "red",
    //     opacity: 0.5
    // });


    // path_layer.add(select_circle);
}


// update the building shape color to a new color
function update_building_colors(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_shape = cell_info.shapes.building;
    let corridors_group = cell_info.shapes.corridors_group;

    // update the building fill color
    if (building_shape !== null) {
        let building_color = building_con_colors_enabled ? building_con_colors[cell_info.building_mods.con_level] : building_con_colors["constant"];
        building_shape.fill(building_color);
    }

    // update the corridors color
    if (corridors_group !== null) {
        let corridors_color = building_con_colors_enabled ? corridor_con_colors[cell_info.building_mods.con_level] : corridor_con_colors["constant"];
        let corridors = corridors_group.getChildren();

        for (let i = 0; i < corridors.length; i++) {
            corridors[i].stroke(corridors_color);
        }
    }
}


// draw the building outline for the building at the given coordinates
function draw_building_outline(building_grid_coords, parent, for_main_stage) {

    // get the grid cell info object associated with the building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info.building_mods;

    // destroy previous building outline if there is one
    if (for_main_stage) {
        let prev_building_outline = cell_info.shapes.building_outline;
        if (prev_building_outline !== null) {
            prev_building_outline.destroy();
        }
    }

    // convert the grid path to a path that can be used by the stage
    let grid_shape_path = building_mods.outline_grid_path;
    let stage_shape_path = grid_shape_path.map((point) => door_grid_coords_to_stage_coords(point, building_grid_coords, for_main_stage));
    stage_shape_path = flatten_points(stage_shape_path);

    // draw building outline (ensures doors have an outer border along the building shape)
    // let outline_color = building_mods.open ? "black" : "red";
    let outline_color = building_mods.open ? corridor_con_colors[building_mods.con_level] :  "red";
    let building_outline = new Konva.Line({
        points: stage_shape_path,
        stroke: outline_color,
        strokeWidth: get_cell_dims(for_main_stage).stroke * 2,
        closed: true,
        listening: false, // needed for the editor layer to allow doors to be dragged
        perfectDrawEnabled: false
    });
    parent.add(building_outline);

    // store the building outline shape
    if (for_main_stage) {
        cell_info.shapes.building_outline = building_outline;
    }
}


// draw the doors for the building at the given coordinates
function draw_entrances(building_grid_coords, parent, for_main_stage) {

    // get cell and door dimensions
    let cell_dims = get_cell_dims(for_main_stage);
    let door_dims = get_door_dims(for_main_stage);

    // get the grid cell info object associated with the building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info.building_mods;
    let door_mods = building_mods.entrance_mods;
    let doors = cell_info.building_data.entrances;

    // create new entrances group
    let entrances_group = new Konva.Group();
    parent.add(entrances_group);

    // remove previous door shapes if they exist
    if (for_main_stage) {

        let prev_entrances_group = cell_info.shapes.entrances_group;
        if (prev_entrances_group !== null) {
            prev_entrances_group.destroy();
        }

        cell_info.shapes.entrances_group = entrances_group;
        cell_info.shapes.entrances = {};
    }

    // define an array to determine door draw order
    let door_draw_order = [];

    // add doors to the draw order
    for (let door_id in door_mods) {
        let door_mod = door_mods[door_id];
        door_draw_order.push([door_mod.last_drag_time, door_mod["data_ref"]]);
    }

    // sort by last dragged timestamp to ensure the most last repositioned doors appear on top of other doors
    door_draw_order.sort(function (a, b) {

        let a_ts = a[0];
        let b_ts = b[0];

        if(a_ts > b_ts) return 1;
        if(a_ts < b_ts) return -1;
        return 0;
    });

    // different door colors for testing
    // let door_colors = ["red", "orange", "yellow", "green", "blue"]

    // iterate over every door in the draw order
    for (let d = 0; d < door_draw_order.length; d++) {
        
        let door = door_draw_order[d][1];
        let door_id = door["id"];
        let door_mod = door_mods[door_id];        
        
        // get door x and y coordinates (convert 1-indexed to 0-indexed)
        let door_grid_coords_unscaled = grid_coords_for_building_or_door(door);

        // convert grid coordinates to stage coordinates
        let door_stage_coords = door_grid_coords_to_stage_coords(door_grid_coords_unscaled, building_grid_coords, for_main_stage);
        
        let door_color = door["accessible"] == 1 ? "blue" : "gray";
        let door_stroke_color = door_mod.open ? "black" : "red";

        let door_shape = new Konva.Rect({
            width: door_dims.size,
            height: door_dims.size,
            fill: door_color,
            // fill: door_colors[d],
            stroke: door_stroke_color,
            strokeWidth: door_dims.stroke,
            x: door_stage_coords.x - door_dims.size/2, // adjust for rect positioning being top left corner
            y: door_stage_coords.y - door_dims.size/2,
            perfectDrawEnabled: false
        });
        
        if (for_main_stage) {
            
            // add necessary info about the building's doors to the grid array
            cell_info.shapes.entrances[door_id] = door_shape;

        } else {
            // enable dragging to reposition doors in editor view
            door_shape.draggable(true);

            // make the current dragged door always appear on top of other doors on drag start
            door_shape.on("dragstart", function (e) {
                door_shape.zIndex(door_draw_order.length - 1); 
            });

            // get the stage coordinates of the effective grid walls
            let effective_grid_walls = cell_info.building_mods.effective_grid_walls;
            let effective_stage_walls = effective_grid_walls.map(function (line) {
                return [
                    door_grid_coords_to_stage_coords(line[0], building_grid_coords, for_main_stage),
                    door_grid_coords_to_stage_coords(line[1], building_grid_coords, for_main_stage)
                ];
            });

            // lock the door's position to the building shape
            // door_shape.on("dragmove", function(e) {
            door_shape.dragBoundFunc(function (pos) {

                // get the current shape position
                let current_pos = {
                    x: door_shape.x(),
                    y: door_shape.y()
                };
                // current_pos = editor_stage.getPointerPosition(); 
                current_pos = pos;

                // find the point closest to the shape from the current point
                // let best_point = calc_closest_point_to_shape(outline_stage_points, current_pos);
                // let best_point = calc_closest_point_to_lines(effective_stage_walls, current_pos);
                // let attached_line = calc_closest_line_from_point_to_lines(effective_stage_walls, current_pos);
                let best_point_and_line = calc_closest_line_and_point_from_point_to_lines(effective_stage_walls, current_pos);
                let line_direction = calc_line_orthogonal_direction(best_point_and_line.line[0], best_point_and_line.line[1]);
                door_mod["wall_direction"] = line_direction;
                door_mod["attached_wall"] = best_point_and_line.line;

                // adjust the point to door top left coordinate rather than center
                let best_point_adjusted = {
                    x: best_point_and_line.point.x - door_dims.size/2,
                    y: best_point_and_line.point.y - door_dims.size/2
                };

                // set the new position
                // door_shape.x(best_point_adjusted.x);
                // door_shape.y(best_point_adjusted.y);
                return best_point_adjusted;
            });

            // drag ended, update stages
            door_shape.on("dragend", function (e) {
                selected_door_moved(building_grid_coords, door_id, e.target);
            });
        }

        entrances_group.add(door_shape);
    }
}


// draw corridors for the building at the given grid coordinates
function draw_corridors(building_grid_coords, parent, for_main_stage) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let cell_dims = get_cell_dims(for_main_stage);
    let door_dims = get_door_dims(for_main_stage);
    let door_mods = cell_info.building_mods.entrance_mods;

    let corridor_color = building_con_colors_enabled ? corridor_con_colors[cell_info.building_data.congestion_type || cell_info.building_mods.con_level] : corridor_con_colors["constant"];
    let corridor_width = door_dims.size / 3;

    // create new corridors group
    let corridors_group = new Konva.Group();

    // remove previous corridors shapes if they exist
    if (for_main_stage) {

        let prev_corridors_group = cell_info.shapes.corridors_group;
        if (prev_corridors_group !== null) {
            prev_corridors_group.destroy();
        }

        cell_info.shapes.corridors_group = corridors_group;
    }

    // get the calculated center of the building shape
    let shape_grid_center = cell_info.building_mods.outline_grid_center;

    // calculate grid points in all directions from center
    let center_grid_left   = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:1, y:0}, 1);
    let center_grid_right  = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:-1, y:0}, 1);
    let center_grid_up     = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:0, y:1}, 1);
    let center_grid_down   = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:0, y:-1}, 1);

    // calculate stage coords
    // let shape_stage_center = door_grid_coords_to_stage_coords(shape_grid_center, building_grid_coords, for_main_stage);
    let center_stage_left  = door_grid_coords_to_stage_coords(center_grid_left, building_grid_coords, for_main_stage);
    let center_stage_right = door_grid_coords_to_stage_coords(center_grid_right, building_grid_coords, for_main_stage);
    let center_stage_up    = door_grid_coords_to_stage_coords(center_grid_up, building_grid_coords, for_main_stage);
    let center_stage_down  = door_grid_coords_to_stage_coords(center_grid_down, building_grid_coords, for_main_stage);

    // draw all middle pathways as one big line
    let center_line = new Konva.Line({
        points: flatten_points([center_stage_up, center_stage_down, center_stage_right, center_stage_left]),
        stroke: corridor_color,
        strokeWidth: corridor_width,
        perfectDrawEnabled: false
    });
    corridors_group.add(center_line);

    // draw a corridor for every door
    for (let door_id in door_mods) {
        let door_mod = door_mods[door_id];

        let path_to_center = door_grid_path_to_center(building_grid_coords, door_id);
        let stage_path = path_to_center.map((grid_point) => door_grid_coords_to_stage_coords(grid_point, building_grid_coords, for_main_stage));

        let corridor = new Konva.Line({
            points: flatten_points(stage_path),
            stroke: corridor_color,
            strokeWidth: corridor_width,
            perfectDrawEnabled: false
        });

        corridors_group.add(corridor);
    }

    if (!building_corridors_enabled) {
        corridors_group.hide();
    }

    parent.add(corridors_group);
}



/* ------------------------------ road drawing ------------------------------ */


// draws roads in the background 
function draw_roads(parent) {

    // draw roads squares around each grid cell
    // for (let y = 0; y < grid.length; y++) {
    //     for (let x = 0; x < grid.length; x++) {

    //         let grid_coords = {x: x, y: y};
    //         draw_road_rect(grid_coords, parent);
    //     }
    // }

    for (let i = 0; i <= 1; i++) {

        // draw background on first iteration, dashed lines on second iteration
        let is_dashed = i == 1;
    
        // draw vertical roads 
        for (let x = 1; x < grid.length; x++) {

            let start_grid_point = { x: x, y: 0 };
            let end_grid_point   = { x: x, y: grid.length };

            draw_road_line(start_grid_point, end_grid_point, is_dashed, true, parent);
        }

        // draw horizontal roads 
        for (let y = 1; y < grid.length; y++) {

            let start_grid_point = { x: 0, y: y };
            let end_grid_point   = { x: grid.length, y: y };

            draw_road_line(start_grid_point, end_grid_point, is_dashed, false, parent);
        }
    }
}

// draw a road background for a given start and end grid point
function draw_road_line(start_grid_point, end_grid_point, is_dashed, is_vertical, parent, skips) {

    let cell_dims = get_cell_dims(true);
    // let road_size = (cell_dims.size + cell_dims.spacing) * road_size_ratio;
    let road_size = cell_dims.spacing;
    let dash_spacing = road_size / 2;
    let dash_size = ((cell_dims.size + cell_dims.spacing) - ((road_dashes_per_cell ) * dash_spacing)) / road_dashes_per_cell;

    // randomize road size
    let rand_road_size = road_size * rand_in_range(0.35, 1.25);
    // let rand_road_size = road_size;

    // get amount to offset dash in certain direction based on input (creates pluses at intersections)
    let dash_size_offset = is_dashed ? dash_size / 2 : 0;
    let dash_size_offset_x = !is_vertical ? dash_size_offset : 0;
    let dash_size_offset_y = is_vertical ? dash_size_offset : 0;

    // convert the given grid coords to stage coords
    let start_stage_point = grid_coords_to_main_stage_coords(start_grid_point);
    let end_stage_point = grid_coords_to_main_stage_coords(end_grid_point);

    // adjust stage coords to be in the middle of spacing
    start_stage_point = {
        x: start_stage_point.x - cell_dims.spacing/2 - dash_size_offset_x,
        y: start_stage_point.y - cell_dims.spacing/2 - dash_size_offset_y
    };

    end_stage_point = {
        x: end_stage_point.x - cell_dims.spacing/2,
        y: end_stage_point.y - cell_dims.spacing/2
    };

    let path = flatten_points([start_stage_point, end_stage_point]);

    // google maps road color 
    let road_background_color = "#AAB9C9";

    // pale yellow
    let road_dash_color = "#fffcc9";

    // determine drawing values
    let road_color = is_dashed ? road_dash_color : road_background_color;
    let stroke_width = is_dashed ?  road_size / 6 : rand_road_size;

    // create new road path
    let road = new Konva.Line({
        points: path,
        stroke: road_color,
        strokeWidth: stroke_width,
        closed: false,
        perfectDrawEnabled: false
    });

    if (is_dashed) {
        road.dash([dash_size, dash_spacing]);
    }

    parent.add(road);
}

// draw a road rectangle around a given cell to create rounded road corners
function draw_road_rect(building_grid_coords, parent) {

    let cell_dims = get_cell_dims(true);
    // let road_size = cell_dims.size * road_size_ratio;
    let road_size = cell_dims.spacing;

    // convert the given grid coords to stage coords
    let stage_coords = grid_coords_to_main_stage_coords(building_grid_coords);

    stage_coords = {
        x: stage_coords.x - cell_dims.spacing/2,
        y: stage_coords.y - cell_dims.spacing/2
    };

    // google maps road color 
    let road_background_color = "#AAB9C9";
    let stroke_width = road_size;

    // create new road rect
    let road = new Konva.Rect({
        x: stage_coords.x,
        y: stage_coords.y,
        width: cell_dims.size + cell_dims.spacing,
        height: cell_dims.size + cell_dims.spacing,
        stroke: road_background_color,
        strokeWidth: stroke_width,
        cornerRadius: road_size * 1.5,
        perfectDrawEnabled: false
    });

    parent.add(road);
}


/* ------------------------------ path drawing ------------------------------ */


// draw a few manually selected paths
function draw_manual_paths() {

    // reset the path layer
    path_layer.destroy();
    path_layer = new Konva.Layer();
    stage.add(path_layer);

    try {
        draw_endpoint_path_part({x:-0.5, y:5.55}, {x:0, y:5}, 1, path_layer, "dashed");
        draw_internal_path_part({x:0, y:5}, 1, 4, path_layer, "dashed");
        draw_external_path_part({x:0, y:5}, null, 4, {x:2, y:3}, null, 1, path_layer, "dashed");
        draw_internal_path_part({x:2, y:3}, 1, 2, path_layer, "dashed");
        draw_external_path_part({x:2, y:3}, null, 2, {x:3, y:1}, null, 3, path_layer, "dashed");
        draw_internal_path_part({x:3, y:1}, 3, 2, path_layer, "dashed");
        draw_external_path_part({x:3, y:1}, null, 2, {x:5, y:0}, null, 1, path_layer, "dashed");
        draw_internal_path_part({x:5, y:0}, 1, 2, path_layer, "dashed");
        draw_endpoint_path_part({x:5.5, y:-0.5}, {x:5, y:0}, 2, path_layer, "dashed");
    } catch(e){console.log(e);}

    try {
        draw_endpoint_path_part({x:-0.5, y:5.5}, {x:0, y:5}, 1, path_layer, "dotted");
        draw_internal_path_part({x:0, y:5}, 1, 4, path_layer, "dotted");
        draw_external_path_part({x:0, y:5}, null, 4, {x:3, y:4}, null, 2, path_layer, "dotted");
        draw_internal_path_part({x:3, y:4}, 2, 4, path_layer, "dotted");
        draw_external_path_part({x:3, y:4}, null, 4, {x:5, y:0}, null, 1, path_layer, "dotted");
        draw_internal_path_part({x:5, y:0}, 1, 2, path_layer, "dotted");
        draw_endpoint_path_part({x:5.5, y:-0.5}, {x:5, y:0}, 2, path_layer, "dotted");
    } catch(e){console.log(e);}

    try {
        draw_endpoint_path_part({x:-0.5, y:5.5}, {x:0, y:5}, 1, path_layer, "solid");
        draw_internal_path_part({x:0, y:5}, 1, 4, path_layer, "solid");
        draw_external_path_part({x:0, y:5}, null, 4, {x:1, y:1}, null, 1, path_layer, "solid");
        draw_internal_path_part({x:1, y:1}, 1, 2, path_layer, "solid");
        draw_external_path_part({x:1, y:1}, null, 2, {x:5, y:0}, null, 1, path_layer, "solid");
        draw_internal_path_part({x:5, y:0}, 1, 2, path_layer, "solid");
        draw_endpoint_path_part({x:5.5, y:-0.5}, {x:5, y:0}, 2, path_layer, "solid");
    } catch(e){console.log(e);}

    try {
        draw_endpoint_path_part({x:-0.5, y:5.5}, {x:0, y:5}, 1, path_layer, "dotdashed");
        draw_internal_path_part({x:0, y:5}, 1, 4, path_layer, "dotdashed");
        draw_external_path_part({x:0, y:5}, null, 4, {x:4, y:1}, null, 1, path_layer, "dotdashed");
        draw_internal_path_part({x:4, y:1}, 1, 3, path_layer, "dotdashed");
        draw_external_path_part({x:4, y:1}, null, 3, {x:5, y:0}, null, 1, path_layer, "dotdashed");
        draw_internal_path_part({x:5, y:0}, 1, 2, path_layer, "dotdashed");
        draw_endpoint_path_part({x:5.5, y:-0.5}, {x:5, y:0}, 2, path_layer, "dotdashed");
    } catch(e){console.log(e);}

    try {
        draw_endpoint_path_part({x:-0.5, y:5.5}, {x:0, y:5}, 1, path_layer, "longdashed");
        draw_internal_path_part({x:0, y:5}, 1, 4, path_layer, "longdashed");
        draw_external_path_part({x:0, y:5}, null, 4, {x:3, y:4}, null, 2, path_layer, "longdashed");
        draw_internal_path_part({x:3, y:4}, 2, 4, path_layer, "longdashed");
        draw_external_path_part({x:3, y:4}, null, 4, {x:4, y:3}, null, 1, path_layer, "longdashed");
        draw_internal_path_part({x:4, y:3}, 1, 4, path_layer, "longdashed");
        draw_external_path_part({x:4, y:3}, null, 4, {x:5, y:0}, null, 1, path_layer, "longdashed");
        draw_internal_path_part({x:5, y:0}, 1, 2, path_layer, "longdashed");
        draw_endpoint_path_part({x:5.5, y:-0.5}, {x:5, y:0}, 2, path_layer, "longdashed");
    } catch(e){console.log(e);}
}

// draw the current paths on the main stage
function draw_paths() {

    // reset the path layer
    path_layer.destroy();
    path_layer = new Konva.Layer();
    stage.add(path_layer);

    // iterate over every current path
    for (let p = 0; p < current_paths.length; p++) {

        let path = current_paths[p];
        let path_type = Object.keys(path_type_options)[p]; // TODO: specify path types for specific algorithms?

        // iterate over every building in the path
        for (let i = 0; i < path.length - 1; i++) {

            let building1 = path[i];
            let building2 = path[i+1];
    
            let cell_info1 = grid_object_for_id(building1.id);
            let cell_info2 = grid_object_for_id(building2.id);

            // check for drawing starting path
            if (i === 0) {
                
                let start_door = building1.entrances[0];
                let end_point_grid_coords = {
                    x: start_door.x,
                    y: start_door.y
                };
                let building_grid_coords = grid_coords_for_building_or_door(cell_info2.building_data);

                draw_endpoint_path_part(end_point_grid_coords, building_grid_coords, building2.entrances[0].id, path_layer, path_type);

            // check for drawing end path
            } else if (i + 1 === path.length - 1) {

                let end_door = building2.entrances[0];
                let end_point_grid_coords = {
                    x: end_door.x,
                    y: end_door.y
                };
                let building_grid_coords = grid_coords_for_building_or_door(cell_info1.building_data);

                draw_endpoint_path_part(end_point_grid_coords, building_grid_coords, building1.entrances[0].id, path_layer, path_type);

            // drawing path between or inside buildings
            } else {

                if (cell_info1 === null || cell_info2 === null) {
                    console.log("failed to draw path for: ", building1.id, cell_info1, building2.id, cell_info2);
                    continue;
                }
                
                let building1_grid_coords = grid_coords_for_building_or_door(cell_info1.building_data);
                let building2_grid_coords = grid_coords_for_building_or_door(cell_info2.building_data);
        
                // draw internal path if buildings have the same id
                if (building1.id === building2.id) {
                    draw_internal_path_part(building1_grid_coords, building1.entrances[0].id, building2.entrances[0].id, path_layer, path_type);
                } else {
                    draw_external_path_part(building1_grid_coords, null, building1.entrances[0].id, building2_grid_coords, null, building2.entrances[0].id, path_layer, path_type);
                }
            }
        }
    }
}


// draws a point at the location of selection
function draw_point_selection(door_grid_coords, building_grid_coords, parent, is_start) {

    console.log(door_grid_coords, building_grid_coords);
    
    let cell_dims = get_cell_dims(true);
    let selection_color = is_start ? selection_colors.path_start : selection_colors.path_end;
    console.log(selection_color);

    // remove the previous selection point shapes if they exist
    if (is_start && path_start_selection_shape !== null) {
        path_start_selection_shape.destroy();
    } else if (!is_start && path_end_selection_shape !== null) {
        path_end_selection_shape.destroy();
    }

    let stage_coords = door_grid_coords_to_stage_coords(door_grid_coords, building_grid_coords, true);
    
    let endpoint_circle = new Konva.Circle({
        x: stage_coords.x,
        y: stage_coords.y,
        radius: cell_dims.size / 10,
        // fill: "red",
        // fill: "rgba(255, 0, 0, 0.5)",
        stroke: selection_color,
        strokeWidth: cell_dims.size / 20
    });

    if (is_start) {
        path_start_selection_shape = endpoint_circle;
    } else {
        path_end_selection_shape = endpoint_circle;
    }

    parent.add(endpoint_circle);
}


// draw path between an endpoint and building
function draw_endpoint_path_part(endpoint_door_grid_coords, building_grid_coords, door_id, parent, path_type) {
    
    // get the cell info for the provided building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let door_mods = cell_info.building_mods.entrance_mods[door_id];
    let door_grid_coords = grid_coords_for_building_or_door(door_mods.data_ref);

    // calculate the building grid coords for the endpoint
    let endpoint_building_grid_coords = door_grid_coords_to_building_grid_coords_rounding(endpoint_door_grid_coords);

    // draw the external path
    draw_external_path_part(endpoint_building_grid_coords, endpoint_door_grid_coords, null, building_grid_coords, door_grid_coords, door_id, parent, path_type);
}

// draw external path from a given building to another building
function draw_external_path_part(building1_grid_coords, door1_grid_coords, door1_id, building2_grid_coords, door2_grid_coords, door2_id, parent, path_type) {

    console.log("external path: building1: ", building1_grid_coords, "door1: ", door1_grid_coords, "building2_grid_coords: ", building2_grid_coords, "door2: ", door2_grid_coords);

    // figuring this method out was way more complicated than it had any right or need to be ...

    let cell1_info = grid_object_at_coords(building1_grid_coords);
    let cell2_info = grid_object_at_coords(building2_grid_coords);

    // use door id to get grid coords if possible
    if (cell1_info !== null && door1_id !== null) {
        let door1_mods = cell1_info.building_mods.entrance_mods[door1_id];
        door1_grid_coords = grid_coords_for_building_or_door(door1_mods.data_ref);
    }
    if (cell2_info !== null && door2_id !== null) {
        let door2_mods = cell2_info.building_mods.entrance_mods[door2_id];
        door2_grid_coords = grid_coords_for_building_or_door(door2_mods.data_ref);
    }

    let cell_dims = get_cell_dims(true);
    let door_dims = get_door_dims(true);

    // get path drawing options 
    let path_options = path_type_options[path_type];
    let path_color = show_path_type_color ? path_options.color : "red";
    let path_width = door_dims.size / 5;
    let path_grid_offset = path_options.exterior_offset * (path_width / cell_dims.size * 1.25);
    let door_grid_offset = (path_options.exterior_offset - 3) * (path_width / cell_dims.size);

    // get different cell corners for building 1 (adjusted to door coordinates)
    let building1_grid_corners = [
        {x:building1_grid_coords.x-0.5+path_grid_offset, y:building1_grid_coords.y-0.5+path_grid_offset}, 
        {x:building1_grid_coords.x+0.5-path_grid_offset, y:building1_grid_coords.y-0.5+path_grid_offset}, 
        {x:building1_grid_coords.x+0.5-path_grid_offset, y:building1_grid_coords.y+0.5-path_grid_offset},
        {x:building1_grid_coords.x-0.5+path_grid_offset, y:building1_grid_coords.y+0.5-path_grid_offset}
    ];

    let building2_grid_corners = [
        {x:building2_grid_coords.x-0.5+path_grid_offset, y:building2_grid_coords.y-0.5+path_grid_offset}, 
        {x:building2_grid_coords.x+0.5-path_grid_offset, y:building2_grid_coords.y-0.5+path_grid_offset}, 
        {x:building2_grid_coords.x+0.5-path_grid_offset, y:building2_grid_coords.y+0.5-path_grid_offset},
        {x:building2_grid_coords.x-0.5+path_grid_offset, y:building2_grid_coords.y+0.5-path_grid_offset}
    ];

    let best_building1_corner = null;
    let best_building2_corner = null;

    // buildings are on a straight line 
    if (building1_grid_coords.x === building2_grid_coords.x || building1_grid_coords.y === building2_grid_coords.y) {

        let building1_corner_options = null;
        
        // buildings are on the same x coordinate
        if (building1_grid_coords.x === building2_grid_coords.x) {

            // building 1 is above building 2
            if ((!should_invert_door_y && building1_grid_coords.y < building2_grid_coords.y) || (should_invert_door_y && building1_grid_coords.y > building2_grid_coords.y)) {
                building1_corner_options = [building1_grid_corners[2], building1_grid_corners[3]];

            // building 1 is below building 2
            } else {
                building1_corner_options = [building1_grid_corners[0], building1_grid_corners[1]];
            }

        // buildings are on the same y coordinate
        } else {

            // building 1 is to the left of building 2
            if (building1_grid_coords.x < building2_grid_coords.x) {
                building1_corner_options = [building1_grid_corners[1], building1_grid_corners[2]];

            // building 1 is to the right of building 2
            } else {
                building1_corner_options = [building1_grid_corners[3], building1_grid_corners[0]];
            }
        }

        // find the corner in the direction of building 2 that is closest to the start door
        best_building1_corner = calc_closest_point_to_points(building1_corner_options, door1_grid_coords);

        // messy indexing to get matching building 2 corner
        let building1_corner_index = building1_grid_corners.indexOf(best_building1_corner);
        let building1_corner_options_index = building1_corner_options.indexOf(best_building1_corner);
        let building2_corner_index_offset = building1_corner_options_index === 0 ? 3: 1;

        best_building2_corner = building2_grid_corners[(building1_corner_index + building2_corner_index_offset) % 4];

    // buildings are diagonal from each other
    } else {

        // building 1 is top left of building 2
        if (building1_grid_coords.x < building2_grid_coords.x 
            && ((!should_invert_door_y && building1_grid_coords.y < building2_grid_coords.y) || (should_invert_door_y && building1_grid_coords.y > building2_grid_coords.y))) {

            best_building1_corner = building1_grid_corners[2];
            best_building2_corner = building2_grid_corners[0];

        // building 1 is bottom left of building 2
        } else if (building1_grid_coords.x < building2_grid_coords.x 
            && ((!should_invert_door_y && building1_grid_coords.y > building2_grid_coords.y) || (should_invert_door_y && building1_grid_coords.y < building2_grid_coords.y))) {

            best_building1_corner = building1_grid_corners[1];
            best_building2_corner = building2_grid_corners[3];
            
        // building 1 is top right of building 2
        } else if (building1_grid_coords.x > building2_grid_coords.x 
            && ((!should_invert_door_y && building1_grid_coords.y < building2_grid_coords.y) || (should_invert_door_y && building1_grid_coords.y > building2_grid_coords.y))) {

            best_building1_corner = building1_grid_corners[3];
            best_building2_corner = building2_grid_corners[1];

        // building 1 is bottom right of building 2
        } else {

            best_building1_corner = building1_grid_corners[0];
            best_building2_corner = building2_grid_corners[2];
        }
    }

    // calculate points straight from door to cell border
    let door1_to_border_results = null;
    let door2_to_border_results = null;

    if (door1_id !== null) {
        door1_to_border_results = door_grid_path_to_border(building1_grid_coords, door1_id, path_grid_offset, door_grid_offset);
    } else {
        door1_to_border_results = door_grid_path_to_border_closest(building1_grid_coords, door1_grid_coords, path_grid_offset, door_grid_offset);
    }

    if (door2_id !== null) {
        door2_to_border_results = door_grid_path_to_border(building2_grid_coords, door2_id, path_grid_offset, door_grid_offset);
    } else {
        door2_to_border_results = door_grid_path_to_border_closest(building2_grid_coords, door2_grid_coords, path_grid_offset, door_grid_offset);
    }

    // extract the offsetted door coordinates the the border point from the results
    let offset_door1 = door1_to_border_results[0];
    let offset_door2 = door2_to_border_results[0];
    let offset_door1_to_border = door1_to_border_results[1];
    let offset_door2_to_border = door2_to_border_results[1];

    // generate both possible corners from the cell outline to the best chosen cell corner and select the one that is another cell corner
    let door1_border_to_cell_corner1 = calc_corner_between_points(offset_door1_to_border, best_building1_corner, true, false);
    let door1_border_to_cell_corner2 = calc_corner_between_points(offset_door1_to_border, best_building1_corner, false, false);
    let door1_border_cell_corner1_is_other_cell_corner = building1_grid_corners.some(function (cell_corner) {
        return floats_eq(cell_corner.x, door1_border_to_cell_corner1.x) && floats_eq(cell_corner.y, door1_border_to_cell_corner1.y)
    });
    let door1_outline_corner_to_cell_corner = door1_border_cell_corner1_is_other_cell_corner ? door1_border_to_cell_corner1 : door1_border_to_cell_corner2;

    // generate both possible corners from the cell outline to the best chosen cell corner and select the one that is another cell corner
    let door2_border_to_cell_corner1 = calc_corner_between_points(offset_door2_to_border, best_building2_corner, true, false);
    let door2_border_to_cell_corner2 = calc_corner_between_points(offset_door2_to_border, best_building2_corner, false, false);
    let door2_border_cell_corner1_is_other_cell_corner = building2_grid_corners.some(function (cell_corner) {
        return floats_eq(cell_corner.x, door2_border_to_cell_corner1.x) && floats_eq(cell_corner.y, door2_border_to_cell_corner1.y)
    });
    let door2_outline_corner_to_cell_corner = door2_border_cell_corner1_is_other_cell_corner ? door2_border_to_cell_corner1 : door2_border_to_cell_corner2;

    // convert points to stage coordinates
    let door1_stage = door_grid_coords_to_stage_coords(door1_grid_coords, building1_grid_coords, true);
    let door2_stage = door_grid_coords_to_stage_coords(door2_grid_coords, building2_grid_coords, true);
    let door1_offset_stage = door_grid_coords_to_stage_coords(offset_door1, building1_grid_coords, true);
    let door2_offset_stage = door_grid_coords_to_stage_coords(offset_door2, building2_grid_coords, true);
    let door1_offset_border_stage = door_grid_coords_to_stage_coords(offset_door1_to_border, building1_grid_coords, true);
    let door2_offset_border_stage = door_grid_coords_to_stage_coords(offset_door2_to_border, building2_grid_coords, true);
    let door1_border_corner_stage = door_grid_coords_to_stage_coords(door1_outline_corner_to_cell_corner, building1_grid_coords, true);
    let door2_border_corner_stage = door_grid_coords_to_stage_coords(door2_outline_corner_to_cell_corner, building2_grid_coords, true);
    let door1_cell_corner_stage = door_grid_coords_to_stage_coords(best_building1_corner, building1_grid_coords, true);
    let door2_cell_corner_stage = door_grid_coords_to_stage_coords(best_building2_corner, building2_grid_coords, true);

    // find the final corner between cells (in stage coords since otherwise would be annoying) (also convex vs concave doesn't matter)
    let cell_corners_corner = calc_corner_between_points(door1_cell_corner_stage, door2_cell_corner_stage, true, false);

    // construct final path
    let external_stage_path = [door1_stage, door1_offset_stage, door1_offset_border_stage, door1_border_corner_stage, door1_cell_corner_stage, 
        cell_corners_corner, door2_cell_corner_stage, door2_border_corner_stage, door2_offset_border_stage, door2_offset_stage, door2_stage];

    // create the shape for the external path
    let external_path_shape = new Konva.Line({
        points: flatten_points(external_stage_path),
        stroke: path_color,
        strokeWidth: path_width,
        perfectDrawEnabled: false,
        lineCap: path_line_cap,
        lineJoin: path_line_join,
    });

    // set the line dash style if necessary
    let path_dash = get_main_stage_path_dash(path_type);
    if (path_dash !== null) {
        external_path_shape.dash(path_dash);
    }

    parent.add(external_path_shape);
}


// draw internal path from one door to another of a given building
function draw_internal_path_part(building_grid_coords, door1_id, door2_id, parent, path_type) {

    console.log("internal path: building1: ", building_grid_coords, "door1: ", door1_id, "door2: ", door2_id);

    let cell_info = grid_object_at_coords(building_grid_coords);
    let cell_dims = get_cell_dims(true);
    let door_dims = get_door_dims(true);

    // get path display options
    let path_options = path_type_options[path_type];
    let path_color = show_path_type_color ? path_options.color : "green";
    let path_width = door_dims.size / 5;

    // get the path from each door to the center point
    let door1_to_center = door_grid_path_to_center(building_grid_coords, door1_id);
    let door2_to_center = door_grid_path_to_center(building_grid_coords, door2_id);

    // extract coordinates into variables for ease of reading
    let door1_grid_coords = door1_to_center[0];
    let door1_middle_grid_coords = door1_to_center[1];
    let door2_grid_coords = door2_to_center[0];
    let door2_middle_grid_coords = door2_to_center[1];
    let center_grid_coords = door1_to_center[2]; // doesn't really matter which path it comes from, it's the same

    let full_grid_path = null;

    // check if the lines from the doors to the middle line intersect
    let door_intersection = calc_lines_intersection([door1_grid_coords, door1_middle_grid_coords], [door2_grid_coords, door2_middle_grid_coords]);

    if (door_intersection !== null) {
        full_grid_path = [door1_grid_coords, door_intersection, door2_grid_coords];

    // check if either doors' middle coords are in a straight line to the center
    } else if (points_are_in_straight_line(door1_middle_grid_coords, door2_middle_grid_coords, center_grid_coords) ||
               points_are_in_straight_line(door2_middle_grid_coords, door1_middle_grid_coords, center_grid_coords)) {
        full_grid_path = [door1_grid_coords, door1_middle_grid_coords, door2_middle_grid_coords, door2_grid_coords];
    } else {
        full_grid_path = [door1_grid_coords, door1_middle_grid_coords, center_grid_coords, door2_middle_grid_coords, door2_grid_coords];
    }

    // convert internal path to stage coordinates
    let full_stage_path = full_grid_path.map((grid_point) => door_grid_coords_to_stage_coords(grid_point, building_grid_coords, true));

    let internal_path_shape = new Konva.Line({
        points: flatten_points(full_stage_path),
        stroke: path_color,
        strokeWidth: path_width,
        perfectDrawEnabled: false,
        lineCap: path_line_cap,
        lineJoin: path_line_join,
        opacity: 0.5
    });

    // draw a certain dash type if necessary
    let path_dash = get_main_stage_path_dash(path_type);
    if (path_dash !== null) {
        internal_path_shape.dash(path_dash);
    }

    parent.add(internal_path_shape);
}
