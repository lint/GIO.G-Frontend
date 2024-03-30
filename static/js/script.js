
// default configuation values defined in GraphGenerator.scala
const default_config = {
    num_buildings: 25,
    coverage: 0.75,
    clustering: 0,
    constant_con: false,
    high_con: 0.3,
    med_con: 0.4,
    low_con: 0.3 
};

// store data about the current graph
let current_config = default_config;
let current_graph = null;
let current_paths = null;
let grid = null;

// allows access to the previously selected building
let editor_selected_cell_info = null;
let editor_selected_building_grid_coords = null;

// stage display variables
let main_cell_dims = null;
let editor_cell_dims = null;
let door_len_ratio = 0.1;
let cell_spacing = 10; // TODO: max spacing value? based on the size of the stage
let should_invert_door_y = false;
let road_size_ratio = 0.05;
let road_dashes_per_cell = 15;
let building_clipping_enabled = true;
let building_corridors_enabled = true;
let building_con_colors_enabled = true;
const building_con_colors = {
    low: "#CAFFBF", // pale green
    med: "#FFD6A5", // pale orange
    high: "#FFADAD", // pale red
    constant: "#A9DEF9" // pale blue
}
const corridor_con_colors = {
    low: "#B4D9AC",
    med: "#D9BC9A",
    high: "#D9A0A0",
    constant: "#93B8C4"
}

// variables to support panning on the main stage
let pan_start_pointer_pos = null;
let pan_start_stage_pos = null;
let is_panning = false;
let is_pan_attempted = false;
const pan_min_dist = 5;

// define congestion constants
const con_std_dev = 20;
const con_level_names = {
    low: "Low",
    med: "Medium",
    high: "High"
};
const con_vals = {
    low: 75,
    med: 125,
    high: 200,
    constant: 100
};

// define stages
let stage = new Konva.Stage({
    container: "graph-container",
    width: 650,
    height: 650
});

let editor_stage = new Konva.Stage({
    container: "selected-building-stage-container",
    width: 300,
    height: 300
});

// define layer variables for the main stage (created when main stage is drawn)
let selection_layer = null;
let building_layer = null;
let road_layer = null;
let path_layer = null;



// execute when the document is ready
document.addEventListener("DOMContentLoaded", function() { 

    // generate a graph with the default config
    // generate_graph(default_config);
    
    // load a preset graph
    let preset = "graph_25_0.75.json"
    update_preset_select_display(preset)
    load_preset_graph(preset);
    
    // show any necessary values on the config form
    update_config_form_display();
});


/* -------------------------------------------------------------------------- */
/*                               API connections                              */
/* -------------------------------------------------------------------------- */


// contact the graph generator with the given config
function generate_graph(config) {

    // TODO: connect with backend

    console.log("generating graph with config: ", config);
}

// contact the path recommender with the given options
function recommend_path(path_options) {
    
    // TODO: connect with backend

    console.log("recommending paths with options: ", path_options);

    // get the graph and draw its buildings on the response
    fetch("/static/assets/path.json")
    .then((res) => res.json())
    .then((json) => {
        console.log("path data: ", json);
        process_paths(json);
        draw_paths();
    })
    .catch((e) => console.error(e));
}


// load a local preset graph file
function load_preset_graph(graph_file) {

    // get the graph and draw its buildings on the response
    fetch(`/static/assets/${graph_file}`)
        .then((res) => res.json())
        .then((json) => {
            console.log("preset graph data: ", json);
            process_preset_graph(json);
            draw_main_stage();
        })
        .catch((e) => console.error(e));
}


/* -------------------------------------------------------------------------- */
/*                               grid management                              */
/* -------------------------------------------------------------------------- */


// processes an incoming graph 
function process_graph(buildings, config) {

    // store current graph and config data
    current_graph = buildings;
    current_config = config;
    
    // get size of grid based on current configuration 
    let grid_len = calc_grid_bounds(config);

    // define new empty grid array to store building information
    grid = create_empty_grid(grid_len);

    // recalculate any cell dimensions
    calculate_cell_dims(grid_len);

    // iterate over every building and process it into the grid
    for (let b = 0; b < buildings.length; b++) {
        let building = buildings[b];
        process_building(building);
    }
}


// processes a preset graph
function process_preset_graph(buildings) {

    // store current graph data
    current_graph = buildings;

    let max_grid_len = Number.MIN_SAFE_INTEGER;

    // iterate over every building to find the highest coordinate value
    for (let b = 0; b < buildings.length; b++) {
        let building = buildings[b];

        // not converting 1-indexed to 0-indexed here since this is finding the length of the grid, not building index in the grid

        if (building.x > max_grid_len) {
            max_grid_len = building.x;
        }

        if (building.y > max_grid_len) {
            max_grid_len = building.y
        }
    }

    // define new empty grid array to store building information
    grid = create_empty_grid(max_grid_len);
    
    // recalculate any cell dimensions
    calculate_cell_dims(max_grid_len);

    // actually process every building
    for (let b = 0; b < buildings.length; b++) {
        let building = buildings[b];
        process_building(building);
    }
}


// process a given building a set its grid information
function process_building(building) {

    // get building x and y coordinates (convert 1-indexed to 0-indexed)
    let building_grid_coords = grid_coords_for_building_or_door(building);

    // TODO: improve ordering and organizing of these functions calls?

    // update any coordinates of deep doors in the building
    update_deep_doors(building);

    // initialize the info object for the given building
    init_grid_cell_info(building);

    // create the building outline path and effective walls
    create_building_outline_path(building_grid_coords);
    find_building_effective_walls(building_grid_coords);

    // update door positions to respect effective walls
    update_doors_to_effective_walls(building_grid_coords);

    // find building center point
    find_building_center(building_grid_coords);
}


// calculate the length of a grid edge based on the config
function calc_grid_bounds(config) {
    let area = config["num_buildings"] / config["coverage"]
    let bounds = Math.ceil(Math.sqrt(area));
    return bounds;
}


// helper method to get the grid object at the provided coordinates
function grid_object_at_coords(grid_coords) {
    return grid[grid_coords.y][grid_coords.x];
}


// get the grid object for the provided building
function grid_object_for_id(building_id) {

    // use the id to get the grid coords directly
    let x = Math.round(building_id / grid.length) - 1;
    let y = building_id % grid.length - 1;

    let cell_info = grid[y][x];

    if (cell_info.building_data !== null) {
        return cell_info
    }

    return null;
}


// helper method to get the door object at the building at the provided coordinates
function door_object_at_coords(grid_coords, door_id) {
    let cell_info = grid_object_at_coords(grid_coords);
    let door_mods = cell_info.building_mods.entrance_mods;

    return door_mods[door_id]["data_ref"];
}


// returns a grid of objects describing every building cell for the graph
function create_empty_grid(length) {
    
    let new_grid = [];

    // iterate over every coordinate in the grid
    for (let y = 0; y < length; y++) {
        let row = [];
        for (let x = 0; x < length; x++) {

            // create empty object for each grid cell
            let cell_info = {
                building_data: null,
                shapes: {
                    building: null, // stores the building 
                    building_outline: null,
                    main_selection_overlay: null,
                    entrances: {},
                    building_group: null,
                    entrances_group: null,
                    corridors_group: null
                },
                building_mods: {
                    entrance_mods: {}, 
                    open: true,
                    orig_entrances: null,
                    next_new_door_id: 1,
                    outline_grid_path: [],
                    con_level: null,
                    outline_grid_center: null,
                    effective_grid_walls: []
                }
            };            

            row.push(cell_info);
        }
        new_grid.push(row);
    }

    return new_grid;
}


// initialize the grid cell info for a given building
function init_grid_cell_info(building) {
    
    let doors = building.entrances;

    // get building x and y coordinates (convert 1-indexed to 0-indexed)
    let building_grid_coords = grid_coords_for_building_or_door(building);

    // get the grid cell info object associated with the building
    let cell_info = grid_object_at_coords(building_grid_coords);

    // add necessary info about the building cell to the grid array
    cell_info.building_data = building;
    cell_info.building_mods.open = true;
    cell_info.building_mods.outline_grid_path = [];
    cell_info.building_mods.effective_grid_walls = [];
    cell_info.building_mods.entrance_mods = {};
    cell_info.building_mods.orig_entrances = building.entrances.map(a => {return {...a}});
    cell_info.building_mods.next_new_door_id = doors.length + 1;
    cell_info.building_mods.con_level = determine_con_level(building.congestion);

    // iterate over every door in the building
    for (let d = 0; d < doors.length; d++) {
        let door = doors[d];
        let door_id = door["id"];

        cell_info.building_mods.entrance_mods[door_id] = {
            open: true,
            data_ref: door,
            last_drag_time: 0,
            wall_direction: "none",
            attached_wall: null
        };
    }

    return cell_info;
}


/* ---------------------- building and door generation ---------------------- */


// generates a congestion array using a given config
function generate_congestion(config, con_level_override) {

    // get values from config
    let is_constant = config["constant_con"];
    let low_con_perc = config["low_con"];
    let med_con_perc = config["med_con"];
    
    let con_avg = 0;

    // congestion override provided
    if (con_level_override !== null) {
        con_avg = rand_gaussian(con_vals[con_level_override], con_std_dev);
    
    // no override, check if constant congestion enabled or not
    } else if (is_constant) {
        con_avg = con_vals["constant"];

    // variable random congestion
    } else {

        let rand = Math.random();

        // randomly selected high congestion
        if (rand > low_con_perc + med_con_perc) {
            con_avg = rand_gaussian(con_vals["high"], con_std_dev);

        // randomly selected med congestion
        } else if (rand > low_con_perc) {
            con_avg = rand_gaussian(con_vals["med"], con_std_dev);

        // randomly selected low congestion
        } else {
            con_avg = rand_gaussian(con_vals["low"], con_std_dev);
        }
    }

    // determine the min and max possible values of the congestion
    let min = is_constant ? 80 : Math.abs(con_avg - con_std_dev * 2);
    let max = is_constant ? 120 : con_avg + con_std_dev * 2;

    let cons = [];

    // write congestion for every 5 min window of a 24hr day
    for (let i = 0; i < 288; i++) {
        let lower = i * 5;
        let upper = lower + 5;

        // create congestion object
        let con = {
            id: i,
            timestep: i,
            lower: lower,
            upper: upper,
            min: min,
            max: max,
            avg: con_avg,
            stdDev: con_std_dev
        };
        cons.push(con);
    }

    return cons;
}


// detect the congestion level from a given array of congestion objects
function determine_con_level(congestion) {

    let con_avg = congestion[0]["avg"];

    // find the number of standard deviations away from the avg each congestion level is
    let high_std_devs = Math.abs(con_vals["high"] - con_avg) / con_std_dev;
    let med_std_devs = Math.abs(con_vals["med"] - con_avg) / con_std_dev;
    let low_std_devs = Math.abs(con_vals["low"] - con_avg) / con_std_dev;

    // construct an array to get the minimum std and its associated name
    let std_devs = [[high_std_devs, "high"], [med_std_devs, "med"], [low_std_devs, "low"]];
    let sorted_std_devs = std_devs.sort((a, b) => a[0] - b[0]);

    // return the name of congestion that's the lowest number of standard deviations away
    return sorted_std_devs[0][1];
}


// creates a list of building doors with the provided information (they are just generated, not added to any data structure)
function generate_new_doors(building_grid_coords, num_doors, door_id_start) {

    let doors = [];
    let angle_partition = 360 / num_doors;

    for (let i = 0; i < num_doors; i++) {
        let door_r = rand_in_range(0.1, 0.4); // ensures doors are not too close to the center nor outside the grid cell
        let door_theta = (i * angle_partition + rand_in_range(0, angle_partition)) * (Math.PI / 180); // convert to radians from degrees
        
        let door_graph_coords = {
            x: building_grid_coords.x + door_r * Math.cos(door_theta) + 1, // convert polar coordinates to area around building, and 
            y: building_grid_coords.y + door_r * Math.sin(door_theta) + 1  // add 1 to convert from 0-indexed to 1-indexed
        };

        let accessibility = Math.random() > 0.5 ? 1 : 0;

        // create new door object
        let door = {
            id: door_id_start + i,
            x: door_graph_coords.x,
            y: door_graph_coords.y,
            accessible: accessibility
        };

        doors.push(door);
    }

    return doors;
}


// creates a new building object with the provided information
function generate_building(building_grid_coords) {
    
    let grid_len = grid.length;

    // initialize new building object
    let building = {
        id: building_grid_coords.x * grid_len + building_grid_coords.y,
        x: building_grid_coords.x + 1, // convert from 0-indexed to 1-indexed
        y: building_grid_coords.y + 1,
        congestion: generate_congestion(current_config, null), 
        entrances: generate_new_doors(building_grid_coords, rand_int_in_range(3, 6), 1)
    };

    // update coordinates of any deep doors from the building (they cause issues with shape generation)
    update_deep_doors(building);

    return building;
}


// adds a new door to the given building
function add_new_building_door(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info.building_mods;
    let door_id = building_mods.next_new_door_id++;

    // generate a new door object
    let door = generate_new_doors(building_grid_coords, 1, door_id)[0];

    let door_grid_coords = grid_coords_for_building_or_door(door);

    // move the door point to the outline of the building
    if (building_mods.outline_grid_path.length > 0) {
        door_grid_coords = calc_closest_point_to_shape(building_mods.outline_grid_path, door_grid_coords);
        door.x = door_grid_coords.x + 1; // convert from 0-indexed to 1-indexed
        door.y = door_grid_coords.y + 1;
    }

    // create a new door modification object
    let door_mod =  {
        open: true,
        data_ref: door,
        last_drag_time: 0
    };

    // add new door structures to grid data
    cell_info.building_data.entrances.push(door);
    building_mods.entrance_mods[door_id] = door_mod;

    return door_id
}


// deletes a given door from the given building
function delete_building_door(building_grid_coords, door_id) {
    
    let cell_info = grid_object_at_coords(building_grid_coords);
    let doors = cell_info.building_data.entrances;

    // iterate over the doors array
    for (let d = 0; d < doors.length; d++) {
        let door = doors[d];

        if (door["id"] == door_id) {

            // remove the door from the doors array
            doors.splice(d, 1);
            break;
        }
    }

    // remove the door from the building modifications doors array
    delete cell_info.building_mods.entrance_mods[door_id];
}


// creates a new building at the given coords
function add_new_building(building_grid_coords) {

    // get the current grid cell info
    let cell_info = grid_object_at_coords(building_grid_coords);

    // if there is a building at the given location, delete it first
    if (cell_info.building_data !== null) {
        delete_building(building_grid_coords);
    }

    // create a new building object
    let building = generate_building(building_grid_coords);

    // initialize data structures used by and need by the building
    process_building(building);

    // add the new door to the graph data
    current_graph.push(building);
}


// deletes a building at the given coords 
function delete_building(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building = cell_info.building_data;

    // remove the building from the graph data
    let building_index = current_graph.indexOf(building);
    current_graph.splice(building_index, 1);

    // TODO: do i really need to do this?
    // reset the cell info for the selected building
    cell_info.building_data = null;
    cell_info.building_mods.open = true;
    cell_info.building_mods.outline_grid_path = [];
    cell_info.building_mods.entrance_mods = {};
    cell_info.building_mods.orig_entrances = [];
    cell_info.building_mods.next_new_door_id = 1;
    cell_info.building_mods.con_level = null;
    cell_info.building_mods.effective_grid_walls = [];
    cell_info.building_mods.outline_grid_center = null;
    cell_info.shapes.building = null;
    cell_info.shapes.building_outline = null;
    cell_info.shapes.entrances = {};
    cell_info.shapes.building_group = null;
    cell_info.shapes.entrances_group = null;
    cell_info.shapes.corridors_group = null;
}


/* --------------------- building coordinate processing --------------------- */


// modifies door positions for a given building such that no door is deeper than it's two adjacent doors
// a "deep" door is one where it's x or y coordinate is lower than both adjacent doors' x or y coordinates respectively
function update_deep_doors(building) {

    let doors = building.entrances;
    let found_deep_door = false;

    // does not apply to buildings with three or less doors
    if (doors.length <= 3) {
        return found_deep_door;
    }

    // iterate over every door
    for (let d = 0; d < doors.length; d++) {

        // find the door and its two neighbors
        let neighbor1 = doors[d];
        let target = doors[(d + 1) % doors.length];
        let neighbor2 = doors[(d + 2) % doors.length];

        // found deep door in on left side of building
        if (target.x < building.x && target.x > neighbor1.x && target.x > neighbor2.x) {
            target.x = neighbor1.x > neighbor2.x ? neighbor1.x : neighbor2.x;
        } 
        
        // found deep door on right side of building
        if (target.x > building.x && target.x < neighbor1.x && target.x < neighbor2.x) {
            target.x = neighbor1.x < neighbor2.x ? neighbor1.x : neighbor2.x;
        } 
        
        // found deep door on top of building
        if (target.y > building.y && target.y < neighbor1.y && target.y < neighbor2.y) {
            target.y = neighbor1.y < neighbor2.y ? neighbor1.y : neighbor2.y;
        } 
        
        // found deep door on bottom of building
        if (target.y < building.y && target.y > neighbor1.y && target.y > neighbor2.y) {
            target.y = neighbor1.y > neighbor2.y ? neighbor1.y : neighbor2.y;
        }
    }
}


// creates the building outline grid path for the building at the given coordinates
function create_building_outline_path(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let doors = cell_info.building_data.entrances;

    // store coordinates to draw building shape
    let grid_shape_path = [];

    // iterate over every sequential pairs of doors
    for (let d = 0; d < doors.length; d++) {

        let door1 = doors[d];
        let door2 = doors[(d + 1) % doors.length];
        
        // get door x and y coordinates (convert 1-indexed to 0-indexed)
        let door1_grid_coords = grid_coords_for_building_or_door(door1);
        let door2_grid_coords = grid_coords_for_building_or_door(door2);

        // find a corner between the two door coordinates
        let corner = calc_corner_between_points(door1_grid_coords, door2_grid_coords, true, false);

        // store the path coordinates
        grid_shape_path.push(door1_grid_coords, corner);
    }

    // simplify the grid path by removing duplicate points and points on the same line
    simplified_grid_path = simplify_closed_path(grid_shape_path, 0.0001);

    // save the path to the cell_info
    cell_info.building_mods.outline_grid_path = simplified_grid_path;
}


// calculates the building's effective wall grid lines (prevents doors from being positioned in corners)
function find_building_effective_walls(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let grid_path = cell_info.building_mods.outline_grid_path;

    // calculate the usable wall lines for door placement
    let effective_grid_walls = [];

    for (let i = 0; i < grid_path.length; i++) {

        let p1 = grid_path[i];
        let p2 = grid_path[(i + 1) % grid_path.length];

        let line_len = calc_dist(p1, p2);

        // do not use walls that are less than the length of a door
        if (line_len < door_len_ratio) {
            continue;
        }

        // translate points of the wall 1/2 the door length ratio inwards to prevent doors in corners
        let new_p1 = calc_point_translation(p1, p1, p2, door_len_ratio / 2); // TODO: make this perfect with considering stroke width ... it's close but not quite
        let new_p2 = calc_point_translation(p2, p2, p1, door_len_ratio / 2);

        let line = [new_p1, new_p2];
        effective_grid_walls.push(line);
    }

    cell_info.building_mods.effective_grid_walls = effective_grid_walls;
}


// updates all door coordinates for a building to the effective walls
function update_doors_to_effective_walls(building_grid_coords) {
    
    let cell_info = grid_object_at_coords(building_grid_coords);
    let doors = cell_info.building_data.entrances;
    let door_mods = cell_info.building_mods.entrance_mods;
    let effective_walls = cell_info.building_mods.effective_grid_walls;

    // don't update door positions if there are no walls
    if (effective_walls.length === 0) {
        return;
    }

    // iterate over every door
    for (let d = 0; d < doors.length; d++) {

        let door = doors[d];
        let door_mod = door_mods[door.id];

        // get the grid coordinate for the door (converts 1-indexed to 0-indexed)
        let door_grid_coords = grid_coords_for_building_or_door(door);

        // get the closest wall location to the current location
        let best_point_and_line = calc_closest_line_and_point_from_point_to_lines(effective_walls, door_grid_coords);
        let line_direction = calc_line_orthogonal_direction(best_point_and_line.line[0], best_point_and_line.line[1]);
        door_mod["wall_direction"] = line_direction;
        door_mod["attached_wall"] = best_point_and_line.line;

        // set door's need coordinates (and convert index back to 1-indexed)
        door.x = best_point_and_line.point.x + 1;
        door.y = best_point_and_line.point.y + 1;
    }
}


// find the center coordinate of the building shape
function find_building_center(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let outline_grid_path = cell_info.building_mods.outline_grid_path;

    // convert the outline grid path to the input needed by polylabel and then find its center point
    let polylabel_polygon = outline_grid_path.map((p) => [p.x, p.y]);
    let center = polylabel([polylabel_polygon]);
    
    cell_info.building_mods.outline_grid_center = {x: center[0], y: center[1]};
}


// get the door grid path to center coordinate
function door_grid_path_to_center(building_grid_coords, door_id) {

    // TODO: this does lots of repeated calculations if called multiple times in a row... fix it

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door_mods = cell_info.building_mods.entrance_mods;
    let door_mod = door_mods[door_id];

    let door_grid_coords = grid_coords_for_building_or_door(door_mod.data_ref);

    // get the calculated center of the building shape
    let shape_grid_center = cell_info.building_mods.outline_grid_center;

    // calculate grid points in all directions from center
    let center_grid_left   = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:1, y:0}, 1);
    let center_grid_right  = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:-1, y:0}, 1);
    let center_grid_up     = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:0, y:1}, 1);
    let center_grid_down   = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:0, y:-1}, 1);

    let center_line_end = null;

    // check quadrant of door and door orientation (quadrant names and checks are probably wrong since i'm not considering inverted y shenanigans)
    // top right quadrant
    if (door_grid_coords.x > shape_grid_center.x && door_grid_coords.y > shape_grid_center.y) {
        if (door_mod.wall_direction === "vertical") {
            center_line_end = center_grid_up;
        } else {
            center_line_end = center_grid_left;
        }
    
    // bottom right quadrant
    } else if (door_grid_coords.x > shape_grid_center.x && door_grid_coords.y < shape_grid_center.y) {
        if (door_mod.wall_direction === "vertical") {
            center_line_end = center_grid_down;
        } else {
            center_line_end = center_grid_left;
        }

    // top left quadrant
    } else if (door_grid_coords.x < shape_grid_center.x && door_grid_coords.y > shape_grid_center.y) {
        if (door_mod.wall_direction === "vertical") {
            center_line_end = center_grid_up;
        } else {
            center_line_end = center_grid_right;
        }

    // bottom left quadrant
    } else if (door_grid_coords.x < shape_grid_center.x && door_grid_coords.y < shape_grid_center.y) {
        if (door_mod.wall_direction === "vertical") {
            center_line_end = center_grid_down;
        } else {
            center_line_end = center_grid_right;
        }
    }

    // calculate closest point to the determined center line
    let closest_point = calc_closest_point(shape_grid_center, center_line_end, door_grid_coords);

    // return the list of points representing the path to the center of the building
    return [door_grid_coords, closest_point, shape_grid_center];
}


// get the door grid path to center coordinate
function door_grid_path_to_border(building_grid_coords, door_id) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door_mods = cell_info.building_mods.entrance_mods;
    let door_mod = door_mods[door_id];

    let door_grid_coords = grid_coords_for_building_or_door(door_mod.data_ref);

    // adjusted to be door coordinates
    let building_grid_corners = [
        {x:building_grid_coords.x-0.5, y:building_grid_coords.y-0.5}, 
        {x:building_grid_coords.x+0.5, y:building_grid_coords.y-0.5}, 
        {x:building_grid_coords.x+0.5, y:building_grid_coords.y+0.5},
        {x:building_grid_coords.x-0.5, y:building_grid_coords.y+0.5}
    ];

    let best_point = null;

    // construct walls from the outline path
    let walls = [];
    let outline_grid_path = cell_info.building_mods.outline_grid_path
    for (let i = 0; i < outline_grid_path.length; i++) {
        let p1 = outline_grid_path[i];
        let p2 = outline_grid_path[(i + 1) % outline_grid_path.length];

        walls.push([p1, p2]);
    }

    // door is vertical
    if (door_mod.wall_direction === "vertical") {

        // calculate points to right/left borders
        let building_right_line = [building_grid_corners[1], building_grid_corners[2]];
        let building_left_line = [building_grid_corners[3], building_grid_corners[0]];

        let to_right_point = calc_closest_point(building_right_line[0], building_right_line[1], door_grid_coords);
        let to_left_point = calc_closest_point(building_left_line[0], building_left_line[1], door_grid_coords);

        let right_intersections = 0;
        let left_intersections = 0;

        // calculate the number of intersections of line to right/left borders with each wall
        walls.forEach(function (wall) {

            let right_intersection_point = calc_lines_intersection([door_grid_coords, to_right_point], wall);
            let left_intersection_point = calc_lines_intersection([door_grid_coords, to_left_point], wall);
    
            if (right_intersection_point !== null) {
                right_intersections += 1;
            }
    
            if (left_intersection_point !== null) {
                left_intersections += 1;
            }
        });

        best_point = left_intersections < right_intersections ? to_left_point : to_right_point;
    
    // door is horizontal
    } else {

        // calculate points to top/bottom borders
        let building_top_line = [building_grid_corners[0], building_grid_corners[1]];
        let building_bottom_line = [building_grid_corners[2], building_grid_corners[3]];

        let to_top_point = calc_closest_point(building_top_line[0], building_top_line[1], door_grid_coords);
        let to_bottom_point = calc_closest_point(building_bottom_line[0], building_bottom_line[1], door_grid_coords);

        let top_intersections = 0;
        let bottom_intersections = 0;

        // calculate the number of intersections of line to top/bottom borders with each wall
        walls.forEach(function (wall) {

            let top_intersection_point = calc_lines_intersection([door_grid_coords, to_top_point], wall);
            let bottom_intersection_point = calc_lines_intersection([door_grid_coords, to_bottom_point], wall);
    
            if (top_intersection_point !== null) {
                top_intersections += 1;
            }
    
            if (bottom_intersection_point !== null) {
                bottom_intersections += 1;
            }
        });

        best_point = top_intersections < bottom_intersections ? to_top_point : to_bottom_point;
    }

    return [door_grid_coords, best_point];
}


/* ----------------------------- path management ---------------------------- */


// process returned path recommendation results
function process_paths(paths) {
    current_paths = paths;
}


/* -------------------------------------------------------------------------- */
/*                               building editor                              */
/* -------------------------------------------------------------------------- */


// clear the building editor stage and selected building info
function reset_building_editor() {

    // get selected building elements
    let info_div = document.getElementById("selected-building-info");
    let doors_list_container = document.getElementById("selected-building-doors-container");
    let building_options_container = document.getElementById("selected-building-options-container");

    // clear elements relevant to the previous selected building
    info_div.innerHTML = '';
    doors_list_container.innerHTML = '';
    building_options_container.innerHTML = '';

    // clear the editor stage
    editor_stage.destroyChildren();
}


// select a building at the given coordinates and open it in the editor
function select_building(building_grid_coords) {

    console.log("selecting building: ", building_grid_coords);

    if (grid === null || is_panning) {
        return;
    }

    // get the info object for the building at the given coords
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info.building_mods;

    console.log("cell info:", cell_info);

    // reset the building editor elements
    reset_building_editor();

    // clear last selected cell highlight
    if (editor_selected_cell_info !== null) {
        editor_selected_cell_info.shapes["main_selection_overlay"].stroke("");
    }

    // unselect if clicked same building (by doing nothing)
    if (editor_selected_cell_info === cell_info) {
        // TODO: fix this unselecting the cell when deleting a building
        // editor_selected_cell_info = null;
        // return;
    } else {
        editor_selected_cell_info = cell_info;
        editor_selected_building_grid_coords = building_grid_coords;
    }

    // highlight the selected building in the main stage
    let background_cell = cell_info.shapes["main_selection_overlay"];
    background_cell.stroke("green");
    
    // get container elements to build elements into
    let info_div = document.getElementById("selected-building-info");
    let doors_list_container = document.getElementById("selected-building-doors-container");
    let building_options_container = document.getElementById("selected-building-options-container");

    let info = `Grid Cell: (${building_grid_coords.x + 1}, ${building_grid_coords.y + 1})`;
    
    if (cell_info.building_data !== null) {

        let building_id = cell_info.building_data["id"];
        let doors = cell_info.building_data.entrances;

        info += `<BR>Building ID: ${building_id}`
        
        // create a title for the edit doors list
        let edit_doors_list_title = document.createElement("div");
        edit_doors_list_title.id="edit-doors-list-title";
        edit_doors_list_title.innerHTML = "Doors:";
        doors_list_container.appendChild(edit_doors_list_title);
        
        // create a button that adds a door to the current building
        let add_door_button = document.createElement("button");
        add_door_button.innerHTML = "+ Door";
        add_door_button.addEventListener("click", function (e) {
            handle_add_door_button(building_grid_coords);
        });
        doors_list_container.appendChild(add_door_button);

        // create list to store door info in
        let edit_doors_list = document.createElement("ul");
        edit_doors_list.setAttribute("id", "edit-doors-list");
        
        // iterate over every door in the building
        for (let door_id in cell_info.building_mods.entrance_mods) {
            let door_list_item = create_door_list_item(building_grid_coords, door_id);
            edit_doors_list.appendChild(door_list_item);
        }
        doors_list_container.appendChild(edit_doors_list);

        // create title element for the options section
        let building_options_title = document.createElement("div");
        building_options_title.id="edit-doors-list-title";
        building_options_title.innerHTML = "Options:";
        building_options_container.appendChild(building_options_title);

        // create label and input checkbox to represent whether the building is open or closed (i.e. usable or not)        
        let building_open_label = document.createElement("label");
        building_open_label.innerHTML = "Open";
        building_open_label.htmlFor = "building-open-cb";

        let buildling_open_chkbox = document.createElement("input");
        buildling_open_chkbox.type = "checkbox";
        buildling_open_chkbox.id = "building-open-cb";
        buildling_open_chkbox.checked = building_mods.open;
        buildling_open_chkbox.addEventListener("change", function(e) {
            building_open_checkbox_checked(building_grid_coords);
        });
        building_options_container.appendChild(buildling_open_chkbox);
        building_options_container.appendChild(building_open_label);

        // only show congestion radio if the graph does not use constant congestion
        if (!current_config["constant_con"]) {

            // create a container for the congestion radio element
            let building_con_container = document.createElement("div");
            building_con_container.id = "building-con-container";
            building_options_container.appendChild(building_con_container);

            // create labels and input radios to select building congestion level
            let building_con_label = document.createElement("label");
            building_con_label.innerHTML = "Congestion Level:";
            building_con_container.appendChild(building_con_label);

            // create span wrapped radios and label for each congestion level
            let low_con_radio = create_con_radio(building_grid_coords, "low");
            let med_con_radio = create_con_radio(building_grid_coords, "med");
            let high_con_radio = create_con_radio(building_grid_coords, "high");

            building_con_container.appendChild(low_con_radio);
            building_con_container.appendChild(med_con_radio);
            building_con_container.appendChild(high_con_radio);
        }

        
        // create a container to hold the buttons for the building
        let building_options_actions_container = document.createElement("div");
        building_options_actions_container.id = "building-options-actions-container";
        building_options_container.appendChild(building_options_actions_container);

        // create a button to delete the current building
        let delete_building_button = document.createElement("button");
        delete_building_button.innerHTML = "Delete Building";
        delete_building_button.addEventListener("click", function (e) {
            handle_delete_building_button(building_grid_coords);
        });

        building_options_actions_container.appendChild(delete_building_button);
        

    } else {

        // create a button to create a new
        let add_building_button = document.createElement("button");
        add_building_button.innerHTML = "Create Building";
        add_building_button.addEventListener("click", function (e) {
            handle_add_building_button(building_grid_coords);
        });
        building_options_container.appendChild(add_building_button);
    }

    // set the info text
    info_div.innerHTML = info;

    // redraw the selected building in both the editor stage and main stage
    if (cell_info.building_data !== null) {
        redraw_selected_building(building_grid_coords);
    }
}


// returns a new list item for a given door at a given building
function create_door_list_item(building_grid_coords, door_id) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door = door_object_at_coords(building_grid_coords, door_id);
    let door_mod = cell_info.building_mods.entrance_mods[door_id];

    // create a list item to contain door properties
    let li = document.createElement("li");
    li.classList.add("edit-doors-list-item");
    li.id = `door-${door_id}-list-item`

    // label to identify each door
    let door_label = document.createElement("label");
    door_label.innerHTML = `ID: ${door_id}`;

    // define ids for different checkboxes
    let open_chkbox_id = `door-${door_id}-open-cb`;
    let access_chkbox_id = `door-${door_id}-accessible-cb`;
    
    // create label and input checkbox to represent whether a door is open or closed (i.e. usable or not)        
    let open_label = document.createElement("label");
    open_label.innerHTML = "Open";
    open_label.htmlFor = open_chkbox_id;

    let open_chkbox = document.createElement("input");
    open_chkbox.type = "checkbox";
    open_chkbox.id = open_chkbox_id;
    open_chkbox.checked = door_mod.open;
    open_chkbox.addEventListener("change", function(e) {
        door_open_checkbox_checked(building_grid_coords, door_id);
    });
    
    // create label and input checkbox to represent whether a door is accessible or not
    let access_label = document.createElement("label");
    access_label.innerHTML = "Accessible";
    access_label.htmlFor = access_chkbox_id;

    let access_chkbox = document.createElement("input");
    access_chkbox.type = "checkbox";
    access_chkbox.id = access_chkbox_id;
    access_chkbox.checked = door["accessible"];
    access_chkbox.addEventListener("change", function(e) {
        door_accessible_checkbox_checked(building_grid_coords, door_id);
    });

    // create button to delete the door
    let delete_button = document.createElement("button");
    delete_button.innerHTML = "Delete";
    delete_button.addEventListener("click", function (e) {
        handle_delete_door_button(building_grid_coords, door_id);
    });

    // add created items as children to the list item
    li.appendChild(door_label);
    li.appendChild(open_chkbox);
    li.appendChild(open_label);
    li.appendChild(access_chkbox);
    li.appendChild(access_label);
    li.appendChild(delete_button);

    return li;
}


// creates a radio option and label for congestion level for a given building
function create_con_radio(building_grid_coords, con_level) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info.building_mods;

    let con_radio_id = `building-${con_level}-con-radio`;
    
    // create container for the radio and label
    let span = document.createElement("span");

    // create label for the radio
    let con_label = document.createElement("label");
    con_label.htmlFor = con_radio_id;
    con_label.innerHTML = con_level_names[con_level];

    // create the radio button 
    let con_radio = document.createElement("input");
    con_radio.type = "radio";
    con_radio.id = con_radio_id;
    con_radio.checked = building_mods.con_level === con_level;
    con_radio.name = "con_level";
    con_radio.addEventListener("change", function(e) {
        if (this.checked) {
            building_con_radio_checked(building_grid_coords, con_level);
        }
    });
    
    // add radio button and text to the label
    span.appendChild(con_radio);
    span.appendChild(con_label);

    return span;
}


/* ------------------------ building options handlers ----------------------- */


// handle the selected building delete button click
function handle_delete_building_button(building_grid_coords) {

    console.log("building deleted: ", building_grid_coords);

    let cell_info = grid_object_at_coords(building_grid_coords);

    // delete the building group from the main stage
    let group = cell_info.shapes.building_group;
    if (group !== null) {
        group.destroy();
    }

    // remove the building from the graph & grid data structures
    delete_building(building_grid_coords);

    // reselect the empty cell
    select_building(building_grid_coords);
}

// handle the selected empty grid cell add button click
function handle_add_building_button(building_grid_coords) {

    console.log("building added: ", building_grid_coords);

    // create a new building object
    add_new_building(building_grid_coords);

    // TODO: better way to add the building to the stage without redrawing all of them (this method should be reserved for the first draw)
    draw_main_stage();

    // reselect the filled cell
    select_building(building_grid_coords);
}


// handle the selected building open checkbox being changed
function building_open_checkbox_checked(building_grid_coords) {

    // get the information for the given building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building = cell_info.building_data;
    let building_mods = cell_info.building_mods;

    // get the previous open status
    let prev_open = building_mods.open;
    let new_open = !prev_open;

    // if closing an open building, remove the building from the graph data array
    if (prev_open) {
        let building_index = current_graph.indexOf(building);
        current_graph.splice(building_index, 1);
    
    // add the building back to the graph array
    } else {
        current_graph.push(building);
    }
    
    // assign the new open status to the door
    building_mods.open = new_open;
    
    // redraw the building to reflect the changes in accessibility
    redraw_selected_building(building_grid_coords);
}


// handle the selected building congestion radio being checked
function building_con_radio_checked(building_grid_coords, con_level) {
    console.log("new con level: ", con_level);

    // get the information for the given building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building = cell_info.building_data;
    let building_mods = cell_info.building_mods;

    // generate new congestion based on the given value
    let new_con = generate_congestion(current_config, con_level);

    // update building data
    building.congestion = new_con;
    building_mods.con_level = con_level;

    // redraw the building to reflect the changes in congestion
    redraw_selected_building(building_grid_coords);
}


/* -------------------------- door options handlers ------------------------- */


// handle dragging an entrance in the drag editor
function selected_door_moved(building_grid_coords, door_id, editor_door_shape) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door = door_object_at_coords(building_grid_coords, door_id);
    let door_mods = cell_info.building_mods.entrance_mods
    let door_mod = door_mods[door_id];

    // get the editor stage coordinates of the moved door shape
    let new_door_stage_coords = {
        x: editor_door_shape.x() + editor_door_shape.width()/2, // +size/2 since rects are positioned from top left corner rather than center
        y: editor_door_shape.y() + editor_door_shape.height()/2
    };

    // convert the stage coordinates to grid coordinates
    let new_door_grid_coords = door_stage_coords_to_grid_coords(new_door_stage_coords, building_grid_coords, false);

    // set the door's new coordinates (convert back from 0-indexed to 1-indexed)
    door["x"] = new_door_grid_coords.x + 1;
    door["y"] = new_door_grid_coords.y + 1;

    // log this door as being the last dragged door for this building (so it is drawn on top of other doors)
    door_mod["last_drag_time"] = Date.now();
    
    // redraw the building to reflect the changes in position
    redraw_selected_building(building_grid_coords);
}


// handle the open checkbox being clicked for a given building door
function door_open_checkbox_checked(building_grid_coords, door_id) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door = door_object_at_coords(building_grid_coords, door_id);
    let doors = cell_info.building_data.entrances;
    let door_mod = cell_info.building_mods.entrance_mods[door_id];

    // get the previous open status
    let prev_open = door_mod.open;
    let new_open = !prev_open;

    // if closing an open door, remove the door from the building data
    if (prev_open) {
        let door_index = doors.indexOf(door);
        doors.splice(door_index, 1);
    
    // add the door back to the entrances array in the building data
    } else {
        doors.push(door);
    }

    // assign the new open status to the door
    door_mod.open = new_open;
    
    // redraw the building to reflect the changes in accessibility
    redraw_selected_building(building_grid_coords);
}


// handle the accessible checkbox being clicked for a given building door
function door_accessible_checkbox_checked(building_grid_coords, door_id) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door = door_object_at_coords(building_grid_coords, door_id);

    // get the previous accessibility status
    let prev_access = door["accessible"];
    let new_access = Math.abs(prev_access - 1); // flips 0 to 1 and 1 to 0

    // assign the new accessibility status to the door
    door["accessible"] = new_access;
    
    // redraw the building to reflect the changes in accessibility
    redraw_selected_building(building_grid_coords);
}


// remove the door with the given id from the given buildling
function handle_delete_door_button(building_grid_coords, door_id) {
    console.log("delete door: ", building_grid_coords, door_id);

    // remove the door from the grid data structure
    delete_building_door(building_grid_coords, door_id);

    // remove the door list item from the editor
    let li = document.getElementById(`door-${door_id}-list-item`);
    li.parentNode.removeChild(li);

    // redraw the building to reflect the changes in doors
    redraw_selected_building(building_grid_coords);
}


// adds a new door to the given building 
function handle_add_door_button(building_grid_coords) {
    console.log("add door: ", building_grid_coords);

    // add a new door to the grid data structure
    let door_id = add_new_building_door(building_grid_coords);
 
    // add a new door list item to the editor list
    let li = create_door_list_item(building_grid_coords, door_id);
    let ul = document.getElementById("edit-doors-list");
    ul.appendChild(li);

    // redraw the building to display the new door
    redraw_selected_building(building_grid_coords);
}


/* -------------------------------------------------------------------------- */
/*                               canvas drawing                               */
/* -------------------------------------------------------------------------- */


/* --------------------------- drawing dimensions --------------------------- */


// calculate cell dimensions for the main stage and editor stage based on a given config 
function calculate_cell_dims(grid_len) {

    // get number of spaces between grid cells
    let num_spaces = grid_len - 1;

    // calculate the dimensions of each building cell
    let main_cell_width = (stage.width() - num_spaces * cell_spacing) / grid_len;
    let main_cell_height = (stage.height() - num_spaces * cell_spacing) / grid_len;

    main_cell_dims = {
        width: main_cell_width,
        height: main_cell_height,
        spacing: cell_spacing,
        stroke: 2
    };

    editor_cell_dims = {
        width: editor_stage.width(),
        height: editor_stage.height(),
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
        width: cell_dims.width * door_len_ratio,
        height: cell_dims.height * door_len_ratio,
        stroke: for_main_stage ? 1 : 2
    };
}


/* ---------------------------- building drawing ---------------------------- */


// initialize and draw all elements for the main stage
function draw_main_stage() {
    
    // clear any previous layers
    stage.destroyChildren();

    // create the necessary layers to draw
    create_main_layers();

    // draw selection overlay
    draw_selection_overlays(selection_layer);

    // draw buildings 
    draw_buildings(building_layer);

    // draw roads display
    draw_roads(road_layer);
}


// create and add layers to the main stage
function create_main_layers() {

    // create and add new layers
    selection_layer = new Konva.Layer({
    });
    building_layer = new Konva.Layer({
        listening: false
    });
    road_layer = new Konva.Layer({
        listening: false
    });
    path_layer = new Konva.Layer({
        listening: false
    });
    
    stage.add(road_layer);
    stage.add(building_layer);
    stage.add(path_layer);
    stage.add(selection_layer);
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

    let building_color = building_con_colors_enabled ? building_con_colors[cell_info.building_mods.con_level] : building_con_colors["constant"];

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
    let outline_color = building_mods.open ? "black" : "red";
    let building_outline = new Konva.Line({
        points: stage_shape_path,
        stroke: outline_color,
        strokeWidth: get_cell_dims(for_main_stage).stroke,
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
        door_draw_order.push([door_mod["last_drag_time"], door_mod["data_ref"]]);
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
            width: door_dims.width,
            height: door_dims.height,
            fill: door_color,
            // fill: door_colors[d],
            stroke: door_stroke_color,
            strokeWidth: door_dims.stroke,
            x: door_stage_coords.x - door_dims.width/2, // adjust for rect positioning being top left corner
            y: door_stage_coords.y - door_dims.height/2,
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
                    x: best_point_and_line.point.x - door_dims.width/2,
                    y: best_point_and_line.point.y - door_dims.height/2
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

    let corridor_color = building_con_colors_enabled ? corridor_con_colors[cell_info.building_mods.con_level] : corridor_con_colors["constant"];
    let corridor_width = door_dims.width / 3;

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
        strokeWidth: corridor_width*1.5,
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


/* ------------------------ selection overlay drawing ----------------------- */


// draws an overlay over every grid cell so you can select buildings
function draw_selection_overlays(parent) {
    // create background layer grid cells
    for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < grid.length; y++) {

            let grid_coords = {x: x, y: y};
            draw_selection_overlay(grid_coords, parent);
        }
    }
}


// draw a background / overlay cell for given grid coordinates
function draw_selection_overlay(building_grid_coords, parent) {

    // TODO: include spacing

    // get the building info object at the given grid coordinates
    let cell_info = grid_object_at_coords(building_grid_coords);
    let cell_dims = get_cell_dims(true);

    // destroy previous background shape if there is one
    let prev_background = cell_info.shapes["main_selection_overlay"];
    if (prev_background !== null) {
        prev_background.destroy();
    }

    // find the coordinates to draw the cell at
    let cell_coords = grid_coords_to_main_stage_coords(building_grid_coords);
    cell_coords = {
        x: cell_coords.x - cell_spacing/2,
        y: cell_coords.y - cell_spacing/2
    }

    // create the cell
    let background = new Konva.Rect({
        width: cell_dims.width + cell_spacing,
        height: cell_dims.height + cell_spacing,
        // fill: 'white',
        // stroke: 'black',
        strokeWidth: 4,
        cornerRadius: 5,
        x: cell_coords.x,
        y: cell_coords.y,
        perfectDrawEnabled: false
    });

    // define a function for when the cell is clicked
    background.on("mouseup", function (e) {
        select_building(building_grid_coords);
    });
    
    // store the background cell for easy access later
    cell_info.shapes["main_selection_overlay"] = background;

    // add the cell to the layer
    parent.add(background);
}


/* ------------------------------ road drawing ------------------------------ */


// draws roads in the background 
function draw_roads(parent) {

    // draw roads squares around each grid cell
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid.length; x++) {

            let grid_coords = {x: x, y: y};
            draw_road_rect(grid_coords, parent);
        }
    }

    // draw horizontal and vertical roads
    for (let i = 0; i <= 1; i++) {

        // draw background on first iteration, dashed lines on second iteration
        let is_dashed = i == 1;
    
        // draw vertical roads 
        for (let x = 0; x <= grid.length; x++) {

            let start_grid_point = { x: x, y: 0 };
            let end_grid_point   = { x: x, y: grid.length };

            draw_road_line(start_grid_point, end_grid_point, is_dashed, true, parent);
        }

        // draw horizontal roads 
        for (let y = 0; y <= grid.length; y++) {

            let start_grid_point = { x: 0, y: y };
            let end_grid_point   = { x: grid.length, y: y };

            draw_road_line(start_grid_point, end_grid_point, is_dashed, false, parent);
        }
    }
}

// draw a road background for a given start and end grid point
function draw_road_line(start_grid_point, end_grid_point, is_dashed, is_vertical, parent) {

    let cell_dims = get_cell_dims(true);
    let road_size = (cell_dims.width + cell_spacing) * road_size_ratio;

    let dash_spacing = road_size / 2;
    let dash_size = ((cell_dims.width + cell_spacing) - ((road_dashes_per_cell ) * dash_spacing)) / road_dashes_per_cell;

    // get amount to offset dash in certain direction based on input (creates pluses at intersections)
    let dash_size_offset = is_dashed ? dash_size / 2 : 0;
    let dash_size_offset_x = !is_vertical ? dash_size_offset : 0;
    let dash_size_offset_y = is_vertical ? dash_size_offset : 0;

    // convert the given grid coords to stage coords
    let start_stage_point = grid_coords_to_main_stage_coords(start_grid_point);
    let end_stage_point = grid_coords_to_main_stage_coords(end_grid_point);

    // adjust stage coords to be in the middle of spacing
    start_stage_point = {
        x: start_stage_point.x - cell_spacing/2 - dash_size_offset_x,
        y: start_stage_point.y - cell_spacing/2 - dash_size_offset_y
    };

    end_stage_point = {
        x: end_stage_point.x - cell_spacing/2,
        y: end_stage_point.y - cell_spacing/2
    };

    let path = flatten_points([start_stage_point, end_stage_point]);

    // google maps road color 
    let road_background_color = "#AAB9C9";

    // pale yellow
    let road_dash_color = "#fffcc9";

    // determine drawing values
    let road_color = is_dashed ? road_dash_color : road_background_color;
    let stroke_width = is_dashed ?  road_size / 5 : road_size;

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
    let road_size = cell_dims.width * road_size_ratio;

    // convert the given grid coords to stage coords
    let stage_coords = grid_coords_to_main_stage_coords(building_grid_coords);

    stage_coords = {
        x: stage_coords.x - cell_spacing/2,
        y: stage_coords.y - cell_spacing/2
    };

    // google maps road color 
    let road_background_color = "#AAB9C9";
    let stroke_width = road_size;


    // create new road rect
    let road = new Konva.Rect({
        x: stage_coords.x,
        y: stage_coords.y,
        width: cell_dims.width + cell_spacing,
        height: cell_dims.height + cell_spacing,
        stroke: road_background_color,
        strokeWidth: stroke_width,
        cornerRadius: road_size * 1.5,
        perfectDrawEnabled: false
    });

    parent.add(road);
}


/* ------------------------------ path drawing ------------------------------ */


function test_draw_paths() {

    // reset the path layer
    path_layer.destroy();
    path_layer = new Konva.Layer();
    stage.add(path_layer);
    
    draw_internal_path_part({x:0, y:5}, 1, 4, path_layer);
    draw_external_path_part({x:0, y:5}, 4, {x: 1, y: 3}, 1, path_layer);
    draw_internal_path_part({x:1, y:3}, 1, 3, path_layer);
    draw_external_path_part({x:1, y:3}, 3, {x: 3, y: 1}, 3, path_layer);
    draw_internal_path_part({x:3, y:1}, 3, 2, path_layer);
    draw_external_path_part({x:3, y:1}, 2, {x: 5, y: 0}, 1, path_layer);
    draw_internal_path_part({x:5, y:0}, 1, 2, path_layer);
}

// draw the current paths on the main stage
function draw_paths() {

    // reset the path layer
    path_layer.destroy();
    path_layer = new Konva.Layer();
    stage.add(path_layer);

    for (let i = 1; i < current_paths.length - 1; i++) {

        let building1 = current_paths[i];
        let building2 = current_paths[i+1];

        // let building_x = Math.round(building.id / grid.length) + 1;
        // let building_y = building.id % grid.length + 1;
        
        // // x and y values are getting swapped for some reason in path gen
        // let actual_building_id = (building_y - 1) * grid.length + (building_x - 1);

        // console.log("actual building id", actual_building_id);

        let cell_info1 = grid_object_for_id(building1.id);
        let cell_info2 = grid_object_for_id(building2.id);

        if (cell_info1 === null || cell_info2 === null) {
            continue;
        }
        
        let building1_grid_coords = grid_coords_for_building_or_door(cell_info1.building_data);
        let building2_grid_coords = grid_coords_for_building_or_door(cell_info2.building_data);

        // draw internal path if buildings have the same id
        if (building1.id === building2.id) {
            draw_internal_path_part(building1_grid_coords, building1.entrances[0].id, building2.entrances[0].id, path_layer);
        } else {
            draw_external_path_part(building1_grid_coords, building1.entrances[0].id, building2_grid_coords, building2.entrances[0].id, path_layer);
        }

    }
}


// draw external path from a given building to another building
function draw_external_path_part(building1_grid_coords, door1_id, building2_grid_coords, door2_id, parent) {

    // figuring this method out was way more complicated than it had any right or need to be ...

    let cell_dims = get_cell_dims(true);
    let door_dims = get_door_dims(true);

    let path_color = "red";
    let path_width = door_dims.width / 4.5;

    let cell1_info = grid_object_at_coords(building1_grid_coords);
    let cell2_info = grid_object_at_coords(building2_grid_coords);

    // console.log(cell1_info, cell2_info);

    let door1_mods = cell1_info.building_mods.entrance_mods[door1_id];
    let door2_mods = cell2_info.building_mods.entrance_mods[door2_id];

    let door1_grid_coords = grid_coords_for_building_or_door(door1_mods.data_ref);
    let door2_grid_coords = grid_coords_for_building_or_door(door2_mods.data_ref)

    // get different cell corners for building 1 (adjusted to door coordinates)
    let building1_grid_corners = [
        {x:building1_grid_coords.x-0.5, y:building1_grid_coords.y-0.5}, 
        {x:building1_grid_coords.x+0.5, y:building1_grid_coords.y-0.5}, 
        {x:building1_grid_coords.x+0.5, y:building1_grid_coords.y+0.5},
        {x:building1_grid_coords.x-0.5, y:building1_grid_coords.y+0.5}
    ];

    let building2_grid_corners = [
        {x:building2_grid_coords.x-0.5, y:building2_grid_coords.y-0.5}, 
        {x:building2_grid_coords.x+0.5, y:building2_grid_coords.y-0.5}, 
        {x:building2_grid_coords.x+0.5, y:building2_grid_coords.y+0.5},
        {x:building2_grid_coords.x-0.5, y:building2_grid_coords.y+0.5}
    ];

    let best_building1_corner = null;
    let best_building2_corner = null;

    // buildings are on a straight line 
    if (building1_grid_coords.x === building2_grid_coords.x || building1_grid_coords.y === building2_grid_coords.y) {

        let building1_corner_options = null;
        
        // buildings are on the same x coordinate
        if (building1_grid_coords.x === building2_grid_coords.x) {

            // building 1 is above building 2
            if (building1_grid_coords.y < building2_grid_coords.y) {
                building1_corner_options = [building1_grid_corners[2], building1_grid_corners[3]];
                console.log("building 1 above");

            // building 1 is below building 2
            } else {
                building1_corner_options = [building1_grid_corners[0], building1_grid_corners[1]];
                console.log("building 1 below");
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

        console.log("building1_corner_index: ", building1_corner_index);
        
        best_building2_corner = building2_grid_corners[(building1_corner_index + building2_corner_index_offset) % 4];


    // buildings are diagonal from each other
    } else {

        // building 1 is top left of building 2
        if (building1_grid_coords.x < building2_grid_coords.x && building1_grid_coords.y < building2_grid_coords.y) {

            best_building1_corner = building1_grid_corners[2];
            best_building2_corner = building2_grid_corners[0];

        // building 1 is bottom left of building 2
        } else if (building1_grid_coords.x < building2_grid_coords.x && building1_grid_coords.y > building2_grid_coords.y) {

            best_building1_corner = building1_grid_corners[1];
            best_building2_corner = building2_grid_corners[3];
            
        // building 1 is top right of building 2
        } else if (building1_grid_coords.x > building2_grid_coords.x && building1_grid_coords.y < building2_grid_coords.y) {

            best_building1_corner = building1_grid_corners[3];
            best_building2_corner = building2_grid_corners[1];

        // building 1 is bottom right of building 2
        } else {

            best_building1_corner = building1_grid_corners[0];
            best_building2_corner = building2_grid_corners[2];
        }
    }

    // calculate points straight from door to cell border
    let door1_to_border = door_grid_path_to_border(building1_grid_coords, door1_id)[1];
    let door2_to_border = door_grid_path_to_border(building2_grid_coords, door2_id)[1];

    // generate both possible corners from the cell outline to the best chosen cell corner and select the one that is another cell corner
    let door1_border_to_cell_corner1 = calc_corner_between_points(door1_to_border, best_building1_corner, true, false);
    let door1_border_to_cell_corner2 = calc_corner_between_points(door1_to_border, best_building1_corner, false, false);
    let door1_border_cell_corner1_is_other_cell_corner = building1_grid_corners.some(function (cell_corner) {
        return floats_eq(cell_corner.x, door1_border_to_cell_corner1.x) && floats_eq(cell_corner.y, door1_border_to_cell_corner1.y)
    });
    let door1_outline_corner_to_cell_corner = door1_border_cell_corner1_is_other_cell_corner ? door1_border_to_cell_corner1 : door1_border_to_cell_corner2;

    // generate both possible corners from the cell outline to the best chosen cell corner and select the one that is another cell corner
    let door2_border_to_cell_corner1 = calc_corner_between_points(door2_to_border, best_building2_corner, true, false);
    let door2_border_to_cell_corner2 = calc_corner_between_points(door2_to_border, best_building2_corner, false, false);
    let door2_border_cell_corner1_is_other_cell_corner = building2_grid_corners.some(function (cell_corner) {
        return floats_eq(cell_corner.x, door2_border_to_cell_corner1.x) && floats_eq(cell_corner.y, door2_border_to_cell_corner1.y)
    });
    let door2_outline_corner_to_cell_corner = door2_border_cell_corner1_is_other_cell_corner ? door2_border_to_cell_corner1 : door2_border_to_cell_corner2;

    // convert points to stage coordinates
    let door1_stage = door_grid_coords_to_stage_coords(door1_grid_coords, building1_grid_coords, true);
    let door2_stage = door_grid_coords_to_stage_coords(door2_grid_coords, building2_grid_coords, true);
    let door1_border_stage = door_grid_coords_to_stage_coords(door1_to_border, building1_grid_coords, true);
    let door2_border_stage = door_grid_coords_to_stage_coords(door2_to_border, building2_grid_coords, true);
    let door1_border_corner_stage = door_grid_coords_to_stage_coords(door1_outline_corner_to_cell_corner, building1_grid_coords, true);
    let door2_border_corner_stage = door_grid_coords_to_stage_coords(door2_outline_corner_to_cell_corner, building2_grid_coords, true);
    let door1_cell_corner_stage = door_grid_coords_to_stage_coords(best_building1_corner, building1_grid_coords, true);
    let door2_cell_corner_stage = door_grid_coords_to_stage_coords(best_building2_corner, building2_grid_coords, true);

    // find the final corner between cells (in stage coords since otherwise would be annoying) (also convex vs concave doesn't matter)
    let cell_corners_corner = calc_corner_between_points(door1_cell_corner_stage, door2_cell_corner_stage, true, false);

    // construct final path
    let external_stage_path = [door1_stage, door1_border_stage, door1_border_corner_stage, door1_cell_corner_stage, 
        cell_corners_corner, door2_cell_corner_stage, door2_border_corner_stage, door2_border_stage, door2_stage];

    // create the shape for the external path
    let external_path_shape = new Konva.Line({
        points: flatten_points(external_stage_path),
        stroke: path_color,
        strokeWidth: path_width,
        perfectDrawEnabled: false
    });

    parent.add(external_path_shape);
}


// draw internal path from one door to another of a given building
function draw_internal_path_part(building_grid_coords, door1_id, door2_id, parent) {

    console.log(building_grid_coords, door1_id, door2_id, parent);
    
    let cell_info = grid_object_at_coords(building_grid_coords);
    let cell_dims = get_cell_dims(true);
    let door_dims = get_door_dims(true);

    let path_color = "green";
    let path_width = door_dims.width / 4.5;

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

    // cpnvert internal path to stage coordinates
    let full_stage_path = full_grid_path.map((grid_point) => door_grid_coords_to_stage_coords(grid_point, building_grid_coords, true));

    let internal_path_shape = new Konva.Line({
        points: flatten_points(full_stage_path),
        stroke: path_color,
        strokeWidth: path_width,
        perfectDrawEnabled: false
    });

    parent.add(internal_path_shape);
}



/* -------------------------------------------------------------------------- */
/*                           coordinate conversions                           */
/* -------------------------------------------------------------------------- */


// convert grid coordinates to stage cell coordinates based on the provided dimensions
function grid_coords_to_main_stage_coords(grid_coords) {
    return {
        x: grid_coords.x * (main_cell_dims.width + main_cell_dims.spacing),
        y: grid_coords.y * (main_cell_dims.height + main_cell_dims.spacing)
    };
}


// convert door grid coordinates to stage coordinates based on the provided dimensions
function door_grid_coords_to_stage_coords(door_grid_coords, building_grid_coords, for_main_stage) {

    let building_cell_coords = for_main_stage ? grid_coords_to_main_stage_coords(building_grid_coords) : {x:0, y:0};
    let cell_dims = get_cell_dims(for_main_stage);

    let invert_y = should_invert_door_y ? -1 : 1;
    
    // extract the door's offset from the building to properly scale to cell size
    let door_grid_coord_offset = {
        x: door_grid_coords.x - building_grid_coords.x,
        y: invert_y * (door_grid_coords.y - building_grid_coords.y) // * -1 to invert y coordinate system
    };

    // get final door coordinates by scaling and translating
    return {
        x: building_cell_coords.x + (door_grid_coord_offset.x * cell_dims.width) + (cell_dims.width / 2), // +size/2 to get cell center coordinates rather than top left (used in rect positioning)
        y: building_cell_coords.y + (door_grid_coord_offset.y * cell_dims.height) + (cell_dims.height / 2),
    };
}


// convert door grid coordinates to stage coordinates based on the provided dimensions
function door_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords, for_main_stage) {

    let building_cell_coords = for_main_stage ? grid_coords_to_main_stage_coords(building_grid_coords) : {x:0, y:0};
    let cell_dims = get_cell_dims(for_main_stage);

    let invert_y = should_invert_door_y ? -1 : 1;

    // unscale and untranslate the stage coords to get the offset of the door to the building
    let door_grid_coord_offset = {
        x: (door_stage_coords.x - building_cell_coords.x - (cell_dims.width / 2)) / cell_dims.width,
        y: (door_stage_coords.y - building_cell_coords.y - (cell_dims.height / 2)) / cell_dims.height,
    };

    // get the door grid coords by adding the offset to the building coords
    return {
        x: building_grid_coords.x + door_grid_coord_offset.x,
        y: building_grid_coords.y + (invert_y * door_grid_coord_offset.y)
    };
}


// helper method to get the grid coordinates for a given building id
function grid_coords_for_building_id(building_id) {
    return {
        x: Math.round(building_id / grid.length) - 1,
        y: building_id % grid.length - 1
    };
}


// helper method to get the grid coordinates for a given building or door object
function grid_coords_for_building_or_door(bod) {

    // converts 1-indexed coordinates to 0-indexed
    return {
        x: bod.x - 1,
        y: bod.y - 1
    };
}


// helper method to get the grid coordinates for a given building or door object
function building_or_door_coords_for_grid_coords(grid_coords) {

    // converts 0-indexed coordinates to 1-indexed
    return {
        x: grid_coords.x + 1,
        y: grid_coords.y + 1
    };
}


/* -------------------------------------------------------------------------- */
/*                            math helper functions                           */
/* -------------------------------------------------------------------------- */


// calculates a corner point from the rectangle bounding the two given points
function calc_corner_between_points(p1, p2, convex, invert_y) {

    // assumes points are sorted counter clockwise around a circle to determine which direction is convex vs concave
    // invert_y == false : y increases as you go up (normal Cartesian coordinate system), 
    //          == true  : y increases as you go down (typically used in computer graphics coordinate systems)

    // convert input to boolean expressions
    let c = convex;
    let a = p1.x > p2.x;
    let b = (invert_y && p1.y > p2.y) || (!invert_y && p1.y < p2.y);

    // determine which points' x and y coordinates should be used for the corner
    if ((c && ((a && b) || (!a && !b))) || (!c && ((a && !b) || (!a && b)))) {
        return {
            x: p1.x,
            y: p2.y
        };
    } else {
        return {
            x: p2.x,
            y: p1.y
        };
    }
}


// calculates a corner point from the rectangle bounding the two given points
function calc_corner_between_points2(p1, p2, choose_closest) {

    // uses distance between p1 and possible corner points to choose the returned corner

    // calculate possible corner points
    let corner1 = calc_corner_between_points(p1, p2, true, false);
    let corner2 = calc_corner_between_points(p1, p2, false, false);

    // get the distance between the first point and each of the corners
    let corner1_dist = calc_dist(p1, corner1);
    let corner2_dist = calc_dist(p1, corner2);

    // determine which corner is closer than the other
    let closest_corner = corner1_dist < corner2_dist ? corner1 : corner2;
    let farthest_corner = corner1_dist < corner2_dist ? corner2 : corner1;

    // return the corner based on which one should be selected given the input
    return choose_closest ? closest_corner : farthest_corner;    
}


// helper method to calculate the distance between two points
function calc_dist(p1, p2) {
    return Math.hypot(p2.x-p1.x, p2.y-p1.y);
}


// calculates a new end-point a given distance beyond a given line 
function calc_line_extend_point(l1, l2, len) {
    return calc_point_translation(l2, l1, l2, len);
}


// translates a point in the direction of a line by a given length
function calc_point_translation(p, l1, l2, len) {
    let dist = calc_dist(l1, l2);

    return {
        x: p.x + (l2.x - l1.x) / dist * len,
        y: p.y + (l2.y - l1.y) / dist * len
    };
}


// helper method to calculate the nearest point on a line segment (defined by two points) from another point
// t1 and t2 are the lower and upper bound percentages for the line (0 to 1)
function calc_closest_point_bounded(l1, l2, p, t1, t2) {

    let b = {
        x: l2.x-l1.x,
        y: l2.y-l1.y
    };

    // return the start point if the line has a length of 0
    let line_len_squared = b.x*b.x + b.y*b.y;
    if (line_len_squared === 0) {
        return l1;
    }

    let a = {
        x: p.x - l1.x,
        y: p.y - l1.y
    };

    let dot = a.x * b.x + a.y * b.y;
    let t = Math.max(t1, Math.min(t2, dot / line_len_squared));

    return {
        x: l1.x + t * b.x,
        y: l1.y + t * b.y
    };
}


// helper method to calculate the nearest point on a line segment (defined by two points) from another point
function calc_closest_point(l1, l2, p) {
    return calc_closest_point_bounded(l1, l2, p, 0, 1);
}


// helper method to calculate the point closest to a shape defined by a path of points
function calc_closest_point_to_shape(shape_points, point) {

    let best_point = null;
    let best_dist = Number.MAX_SAFE_INTEGER;

    // iterate over every pair of points on the shape border
    for (let i = 0; i < shape_points.length; i++) {

        // get the grid coordinates of the line
        let l1 = shape_points[i];
        let l2 = shape_points[(i + 1) % shape_points.length];

        // find the closest point on the line and its distance
        let closest_point = calc_closest_point(l1, l2, point);
        let dist = calc_dist(point, closest_point);

        // check if the current line is the best line (closest)
        if (dist < best_dist) {
            best_point = closest_point;
            best_dist = dist;
        }
    }

    return best_point
}


// helper method to calculate the point closest to a list of lines
function calc_closest_point_to_lines(lines, point) {

    let best_point = null;
    let best_dist = Number.MAX_SAFE_INTEGER;

    // iterate over every pair of points on the shape border
    for (let i = 0; i < lines.length; i++) {

        let line = lines[i];

        // find the closest point on the line and its distance
        let closest_point = calc_closest_point(line[0], line[1], point);
        let dist = calc_dist(point, closest_point);

        // check if the current line is the best line (closest)
        if (dist < best_dist) {
            best_point = closest_point;
            best_dist = dist;
        }
    }

    return best_point
}


// helper method to calculate the point closest to a list of lines
function calc_closest_line_from_point_to_lines(lines, point) {

    let best_line = null;
    let best_dist = Number.MAX_SAFE_INTEGER;

    // iterate over every pair of points on the shape border
    for (let i = 0; i < lines.length; i++) {

        let line = lines[i];

        // find the closest point on the line and its distance
        let closest_point = calc_closest_point(line[0], line[1], point);
        let dist = calc_dist(point, closest_point);

        // check if the current line is the best line (closest)
        if (dist < best_dist) {
            best_line = line;
            best_dist = dist;
        }
    }

    return best_line
}


// helper method to calculate the point closest to a list of lines
function calc_closest_line_and_point_from_point_to_lines(lines, point) {

    let best_point = null;
    let best_line = null;
    let best_dist = Number.MAX_SAFE_INTEGER;

    // iterate over every pair of points on the shape border
    for (let i = 0; i < lines.length; i++) {

        let line = lines[i];

        // find the closest point on the line and its distance
        let closest_point = calc_closest_point(line[0], line[1], point);
        let dist = calc_dist(point, closest_point);

        // check if the current line is the best line (closest)
        if (dist < best_dist) {
            best_point = closest_point;
            best_line = line;
            best_dist = dist;
        }
    }

    return {
        point: best_point,
        line: best_line
    };
}


// helper method to calculate the point closest to a list of points
function calc_closest_point_to_points(points_set, point) {

    let best_point = null;
    let best_dist = Number.MAX_SAFE_INTEGER;

    // iterate over every pair of points on the shape border
    for (let i = 0; i < points_set.length; i++) {

        let other_point = points_set[i];

        // find the closest point on the line and its distance
        let dist = calc_dist(point, other_point);

        // check if the current line is the best line (closest)
        if (dist < best_dist) {
            best_point = other_point;
            best_dist = dist;
        }
    }

    return best_point
}


// helper method to determine if a line is vertical or horizontal
function calc_line_orthogonal_direction(p1, p2) {

    // check if the points are the same
    if (floats_eq(p1.x, p2.x) && floats_eq(p1.y, p2.y)) {
        return "same";
    }

    // check if points are vertical
    if (floats_eq(p1.x, p2.x)) {
        return "vertical";
    }

    // check if points are horizontal
    if (floats_eq(p1.y, p2.y)) {
        return "horizontal";
    }

    return "none";
}


// helper method to construct a flat path array from a list of points 
function flatten_points(points) {

    let path = [];

    points.forEach(function (p) {
        path.push(p.x, p.y);
    });

    return path;
}


// helper method to determine equality of floats 
function floats_eq(f1, f2, tol=0.0001) {
    return Math.abs(f1 - f2) < tol
}


// remove points from path list that are in a straight line with neighboring points
function simplify_closed_path(points, tol=0.0001) {

    let indexes_to_remove = [];

    // first remove duplicates
    for (let i = 0; i < points.length; i++) {
        let p1 = points[i];
        let p2 = points[(i + 1) % points.length];

        // check if points are in a line in the x direction
        if (floats_eq(p1.y, p2.y, tol) && floats_eq(p1.x, p2.x, tol)) {
            indexes_to_remove.push(i);
            // console.log("found duplicate point: ", i, p1, p2);
        }
    }

    // remove the duplicate points from the array
    let new_points = points.filter(function(value, index) {
        return indexes_to_remove.indexOf(index) == -1;
    });
    indexes_to_remove = [];

    // now remove points in the middle of a straight line
    for (let i = 0; i < new_points.length; i++) {

        let left = new_points[i];
        let target = new_points[(i + 1) % new_points.length];
        let right = new_points[(i + 2) % new_points.length];
        
        // check if points are in a line in the x direction
        if (floats_eq(target.x, left.x, tol) && floats_eq(target.x, right.x, tol) && floats_eq(left.x, right.x, tol)) {
            indexes_to_remove.push((i + 1) % new_points.length);
            // console.log("found point in x line: ", i + 1, left, target, right);

        // check if points are in a line in the y direction
        } else if (floats_eq(target.y, left.y, tol) && floats_eq(target.y, right.y, tol) && floats_eq(right.y, left.y, tol)) {
            indexes_to_remove.push((i + 1) % new_points.length);
            // console.log("found point in y line: ", i + 1, left, target, right);
        }
    }

    // remove the points from the array
    new_points = new_points.filter(function(value, index) {
        return indexes_to_remove.indexOf(index) == -1;
    });

    return new_points;
}


// helper function to determine if three points are in a line (only works for horizontal and vertical lines)
function points_are_in_straight_line(p1, p2, p3, tol=0.0001) {

    // check if points are in a line in the x direction
    if (floats_eq(p2.x, p1.x, tol) && floats_eq(p1.x, p3.x, tol) && floats_eq(p1.x, p3.x, tol)) {
        return true;
    // check if points are in a line in the y direction
    } else if (floats_eq(p2.y, p1.y, tol) && floats_eq(p2.y, p3.y, tol) && floats_eq(p3.y, p1.y, tol)) {
        return true;
    }

    return false;
}


// helper function to calculate the intersection of two lines
function calc_lines_intersection(l1, l2) {

    let v1 = {
        x: l1[1].x - l1[0].x,
        y: l1[1].y - l1[0].y 
    };

    let v2 = {
        x: l2[1].x - l2[0].x,
        y: l2[1].y - l2[0].y 
    };

    let s = (-v1.y * (l1[0].x - l2[0].x) + v1.x * (l1[0].y - l2[0].y)) / (-v2.x * v1.y + v1.x * v2.y);
    let t = ( v2.x * (l1[0].y - l2[0].y) - v2.y * (l1[0].x - l2[0].x)) / (-v2.x * v1.y + v1.x * v2.y);
    
    // intersection detected
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        return {
            x: l1[0].x + (t * v1.x),
            y: l1[0].y + (t * v1.y)
        };
    }

    return null;
}


// get the angle in radians of a point around circle
function calc_point_angle_around_circle(point, circle_center) {

    let angle = Math.atan2(point.y - circle_center.y, point.x - circle_center.x);

    if (angle < 0) {
        angle += 2 * Math.PI;
    } 

    return angle;
}


/* ---------------------------- random functions ---------------------------- */


// calculate random number in range
function rand_in_range(min, max) {
    return Math.random() * (max - min) + min;
}


// calculate random int in range
function rand_int_in_range(min, max) {
    const min_ceiled = Math.ceil(min);
    const max_floored = Math.floor(max);
    return Math.floor(Math.random() * (max_floored - min_ceiled) + min_ceiled);
}


// calculate a random number in a normal distribution
function rand_gaussian(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}


/* -------------------------------------------------------------------------- */
/*                                page controls                               */
/* -------------------------------------------------------------------------- */


/* ----------------------- preset graph form controls ----------------------- */


// handle submit button pressed on load preset graph form
function submit_load_graph_preset() {

    // get the selected graph file value
    let graph_select = document.getElementById("preset-graph-select-input");
    let graph_file = graph_select.value;

    // don't submit empty option
    if (graph_file === "") {
        alert("Please select a preset from the list");
        return;
    }

    load_preset_graph(graph_file);
}


// ensure that the preset selection resets on page refresh
function update_preset_select_display(select_value) {
    
    let graph_select = document.getElementById("preset-graph-select-input");
    graph_select.value = select_value;
}


/* -------------------------- config form controls -------------------------- */


// detect when changes are made to the config form
document.getElementById("config-form-container").addEventListener("input", function (e) {
    update_config_form_display();
});


// update config form visuals based on the input values
function update_config_form_display() {

    let config_form = document.getElementById("config-form-container");
    let range_inputs = config_form.querySelectorAll('input[type=range]');

    // iterate over every range input in the form
    for (let i = 0; i < range_inputs.length; i++) {
        
        // set the percentage label for each range input
        let range_input = range_inputs[i];
        let perc_label = range_input.nextElementSibling;
        perc_label.innerHTML = Math.round(range_input.value * 100) + "%";
    }
}


// attempt to submit the configuration form
function submit_config_form() {

    // get the input elements
    let num_buildings_input = document.getElementById("num-buildings-input");
    let coverage_input = document.getElementById("coverage-input");
    let clustering_input = document.getElementById("clustering-input");

    let constant_con_input = document.getElementById("constant-congestion-input");
    let high_con_input = document.getElementById("high-congestion-input");
    let med_con_input = document.getElementById("med-congestion-input");
    let low_con_input = document.getElementById("low-congestion-input");

    // convert input elements to proper types
    let num_buildings_value = parseInt(num_buildings_input.value, 10);
    let coverage_value = parseFloat(coverage_input.value);
    let clustering_value = parseFloat(clustering_input.value);

    let constant_con_value = constant_con_input.checked;
    let high_con_value = parseFloat(high_con_input.value);
    let med_con_value = parseFloat(med_con_input.value);
    let low_con_value = parseFloat(low_con_input.value);

    // perform basic input validation
    let has_error = false;
    let error_message = "";

    // check the number of buildings
    if (num_buildings_value <= 0 || isNaN(num_buildings_value)) {
        has_error = true;
        error_message += "Number of buildings must be at least 1\n";
    }

    // verify that the congestion values sum to one
    let con_sum = high_con_value + med_con_value + low_con_value;
    if (Math.abs(con_sum - 1) > 0.00001) {
        has_error = true;
        error_message += "High, Medium, and Low congestion values must sum to 100%\n";
    }

    // display the error
    if (has_error) {
        alert(error_message);
        return;
    }

    // construct a config object based on the input values
    let new_config = {
        num_buildings: num_buildings_value,
        coverage: coverage_value,
        clustering: clustering_value,
        constant_con: constant_con_value,
        high_con: high_con_value,
        med_con: med_con_value,
        low_con: low_con_value 
    };

    // generate a new graph with the given config
    generate_graph(new_config);
}


/* ------------------------- path gen form controls ------------------------- */


// attempt to submit the path generation form
function submit_path_gen_form() {


    let path_options = {

    };

    // visualize returned path
    recommend_path(path_options);
}


/* ----------------------- right sidebar nav controls ----------------------- */


// handle the building editor button clicked
function handle_building_editor_nav_button() {

    // get the container divs on the right sidebar
    let building_editor_container = document.getElementById("building-editor-container");
    let path_stats_container = document.getElementById("path-stats-container");

    // show the necessary container and hide the other
    building_editor_container.style.display = "block";
    path_stats_container.style.display = "none";
}


// handle the building editor button clicked
function handle_path_stats_nav_button() {

    // get the container divs on the right sidebar
    let building_editor_container = document.getElementById("building-editor-container");
    let path_stats_container = document.getElementById("path-stats-container");

    // show the necessary container and hide the other
    building_editor_container.style.display = "none";
    path_stats_container.style.display = "block";
}


/* ----------------------------- display options ---------------------------- */


// buildings visibility toggle
function handle_buildings_visible_button() {

    if (building_layer.visible()) {
        building_layer.hide();
    } else {
        building_layer.show();
    }
}


// roads visibility toggle
function handle_roads_visible_button() {
    if (road_layer.visible()) {
        road_layer.hide();
    } else {
        road_layer.show();
    }
}


// paths visibility toggle
function handle_paths_visible_button() {
    if (path_layer.visible()) {
        path_layer.hide();
    } else {
        path_layer.show();
    }
}


// building clipping toggle
function handle_clipping_visible_button() {

    // TODO: probably a better way to do this, but it's just a test method so..

    // toggle the clipping boolean
    building_clipping_enabled = !building_clipping_enabled;

    // redraw every building on the main stage
    for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < grid.length; y++) {
            
            let cell_info = grid[y][x];
            if (cell_info.building_data === null) {
                continue;
            }
            
            draw_building({x:x, y:y}, building_layer, true);
        }
    }

    // redraw the building in the editor
    redraw_selected_building(editor_selected_building_grid_coords);
}


// building corridors toggle
function handle_corridors_visible_button() {
    
    // find the corridor group of every building and toggle it visible or not visible
    for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < grid.length; y++) {
            
            let cell_info = grid[y][x];
            if (cell_info.building_data === null) {
                continue;
            }
            
            let corridors_group = cell_info.shapes.corridors_group;
            if (building_corridors_enabled) {
                corridors_group.hide();
            } else {
                corridors_group.show();
            }
        }
    }

    building_corridors_enabled = !building_corridors_enabled;
}


// congestion colors visibility toggle
function handle_congestion_colors_button() {

    // toggle the colors boolean
    building_con_colors_enabled = !building_con_colors_enabled;

    // update the building color for every current building
    for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < grid.length; y++) {
            
            let cell_info = grid[y][x];
            if (cell_info.building_data === null) {
                continue;
            }
            
            update_building_colors({x:x, y:y});
        }
    }

    redraw_selected_building(editor_selected_building_grid_coords);
}


/* -------------------------------------------------------------------------- */
/*                           stage movement controls                          */
/* -------------------------------------------------------------------------- */


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


// detect any mouse down events on the stage
stage.on("mousedown", (e) => {
    // console.log("stage mouse down!");

    is_pan_attempted = true;

    // set panning start positions
    pan_start_pointer_pos = stage.getPointerPosition();
    pan_start_stage_pos = {
        x: stage.x(),
        y: stage.y()
    };
    // e.evt.preventDefault();
});


// detect mouse movement events on the stage
stage.on("mousemove", (e) => {

    // do nothing if not currently panning
    if ((!is_pan_attempted && !is_panning) || pan_start_pointer_pos === null || pan_start_stage_pos === null) {
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
});


// detect when the cursor moves out of the stage
stage.on("mouseout", (e) => {

    // console.log("stage mouseout!");
    // disable panning if it is enabled
    // if (is_panning) {
    //     is_panning = false;
    //     return;
    // }

    // TODO: causes weird behavior when going over shapes / layers (mouseout is triggered for some reason, find a way to prevent this)
});


// detect when the cursor is released in the stage
stage.on("mouseup", (e) => {
    // console.log("stage mouse up");
    
    // e.evt.preventDefault();
    // e.evt.stopImmediatePropagation();
    // e.evt.stopPropagation();

    // disable panning if it is enabled
    if (is_panning || is_pan_attempted) {
        is_panning = false;
        is_pan_attempted = false;
    }
});


/* -------------------------- stage zooming support ------------------------- */


let scaleBy = 1.05;
stage.on('wheel', (e) => {
    // stop default scrolling
    e.evt.preventDefault();

    if (is_panning) {
        return;
    }

    let oldScale = stage.scaleX();
    let pointer = stage.getPointerPosition();

    let stage_coords = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    // how to scale? Zoom in? Or zoom out?
    let direction = e.evt.deltaY > 0 ? -1 : 1;

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey) {
        direction = -direction;
    }

    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage.scale({ x: newScale, y: newScale });

    let newPos = {
        x: pointer.x - stage_coords.x * newScale,
        y: pointer.y - stage_coords.y * newScale,
    };
    stage.position(newPos);
});