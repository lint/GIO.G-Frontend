

/* -------------------------------------------------------------------------- */
/*                      variable and constant definitions                     */
/* -------------------------------------------------------------------------- */


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

// store the next configuration's congestion values whenever they are updated
let next_config_con_values = {
    low: 0.3,
    med: 0.4,
    high: 0.3
};

// store data about the current graph
let current_config = default_config;
let current_graph = null;
let current_paths = null;
let grid = null;

// building selection variables
let editor_selected_grid_coords = null;
let path_start_selected_grid_coords = null;
let path_end_selected_grid_coords = null;
let path_start_selection_shape = null;
let path_end_selection_shape = null;
let is_selecting_path_start = false;
let is_selecting_path_end = false;

// stage display variables
let main_cell_dims = null;
let editor_cell_dims = null;
let door_len_ratio = 0.1;
let cell_spacing_ratio = 0.1;
let should_invert_door_y = false;
let road_size_ratio = 0.05;
let road_dashes_per_cell = 10;
let main_stage_scale_by = 1.05;
let building_clipping_enabled = true;
let building_corridors_enabled = true;
let building_con_colors_enabled = true;
let path_legend_enabled = true;
let highlight_colors_enabled = true;
let path_endpoints_enabled = true;
let road_hiding_drag_enabled = false;
let can_pan_enabled = true;
let can_zoom_enabled = true;

// color definitions
const building_con_colors = {
    low: "#CAFFBF", // pale green
    med: "#FFD6A5", // pale orange
    high: "#FFADAD", // pale red
    constant: "#A9DEF9" // pale blue
}
const corridor_con_colors = { // associated background congestion color with 0.5 opacity black overlay
    low: "#B4D9AC",
    med: "#D9BC9A",
    high: "#D9A0A0",
    constant: "#9ECBDF"
}
const con_text_color_classes = {
    low: "low-con-text-color",
    med: "med-con-text-color",
    high: "high-con-text-color"
};
const selection_colors = {
    editing: "rgba(0,0,255,0.5)",
    path_start: "rgba(0,255,0,0.5)",
    path_end: "rgba(255,0,0,0.5)"
};

// options to define path styles
const path_type_options = {
    solid: {
        dash: null,
        exterior_offset: 1,
        // color: "red", // Konva.Util.getRandomColor()
        color: "#023047"
    }, 
    dashed: {
        dash: [0.1, 0.1],
        exterior_offset: 2,
        // color: "cyan", //Konva.Util.getRandomColor()
        color: "#2a9d8f"
    },
    dotted: {
        dash: [0.00001, 0.05],
        exterior_offset: 3,
        // color: "fuchsia", // Konva.Util.getRandomColor()
        color: "#D10700",
    },
    dotdashed: {
        dash: [0.00001, 0.05, 0.1, 0.05],
        exterior_offset: 4,
        // color: "green", // Konva.Util.getRandomColor()
        color: "#E06900"
    },
    longdashed: {
        dash: [0.2, 0.05],
        exterior_offset: 5,
        // color: "purple", //Konva.Util.getRandomColor()
        color: "#DB508C"
    }
};
let path_line_cap = "round"; // round, square, or butt
let path_line_join = "round"; // round, mite, or bevel
let show_path_type_color = true;

// variables to support panning on the main stage
let pan_start_pointer_pos = null;
let pan_start_stage_pos = null;
let is_panning = false;
let is_pan_attempted = false;
const pan_min_dist = 5;

// store the original editor width to support responsive scaling
let orig_editor_width = 0;

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
let stage = null;
let editor_stage = null;

// define layer variables for the main stage (created when main stage is drawn)
let selection_layer = null;
let building_layer = null;
let road_layer = null;
let path_layer = null;

// define variables to support road hiding
let road_hide_start_pos = null;
let road_hide_cur_pos = null;
let is_dragging_road_hide = false;
let road_hiding_bounds_rect = null;



/* -------------------------------------------------------------------------- */
/*                            main event listeners                            */
/* -------------------------------------------------------------------------- */


// execute when the document is ready
document.addEventListener("DOMContentLoaded", function() { 

    // create the stages to fit to parent containers
    create_stages();

    // generate a graph with the default config
    // generate_graph(default_config);

    // load a preset graph
    let preset = "graph_25_0.75.json"
    update_preset_select_display(preset)
    load_preset_graph(preset);

    // create congestion multi thumb slider
    create_congestion_slider();
    
    // show any necessary values on the config form
    update_config_form_display();
    
    // set the initial values for the path selection buttons
    update_path_select_labels();
    
    // clear necessary content in the building editor
    reset_building_editor();
    
    // update sidebar accordion cell heights
    update_accordion_heights();
});


// execute when the window is resized
window.addEventListener("resize", function(event) {

    // update stage dimensions to fit parent container
    size_stages_to_containers();

    // update sidebar accordion cell heights
    update_accordion_heights();

}, true);


/* -------------------------------------------------------------------------- */
/*                                 connections                                */
/* -------------------------------------------------------------------------- */


/* --------------------------- controller connections ----------------------- */


// contact the graph generator with the given config
function generate_graph(config) {

    // TODO: connect with backend

    console.log("generating graph with config: ", config);
}

// contact the path recommender with the given options
function recommend_path(path_options) {
    
    // TODO: connect with backend

    // get a filtered version of the graph
    let filtered_graph = filter_current_graph(false, false);

    console.log("recommending paths with options: ", path_options);
    console.log("filtered graph: ", filtered_graph);

    // get the graph and draw its buildings on the response
    // fetch("/static/assets/graphs/paths/graph_25_0.75_path1.json")
    // .then((res) => res.json())
    // .then((json) => {
    //     console.log("path data: ", json);
    //     process_paths(json);
    //     draw_paths();
    // })
    // .catch((e) => console.error(e));

    Promise.all([
        fetch("/static/assets/paths/graph_example_paths_path1.json"),
        fetch("/static/assets/paths/graph_example_paths_path2.json"),
        fetch("/static/assets/paths/graph_example_paths_path3.json"),
    ]).then(responses =>
        Promise.all(responses.map(response => response.json()))
    ).then((json) => {
        console.log("paths data: ", json);
        process_paths(json);
        draw_paths();
    }).catch(err => console.log(err));
}


/* ---------------------------- local connections --------------------------- */


// load a local preset graph file
function load_preset_graph(graph_file) {

    // get the graph and draw its buildings on the response
    fetch(`/static/assets/graphs/${graph_file}`)
        .then((res) => res.json())
        .then((json) => {
            console.log("preset graph data: ", json);
            process_preset_graph(json);
            draw_main_stage();
        })
        .catch((e) => console.error(e));
}


/* ----------------------------- preparing data ----------------------------- */


// prepare a filtered version of the current graph 
function filter_current_graph(include_closed_doors_and_buildings, include_few_doors_buildings) {
    
    let filtered_graph = [];

    // iterate over every grid cell
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid.length; x++) {

            let grid_coords = {x:x, y:y};
            let cell_info = grid_object_at_coords(grid_coords);
            let building_mods = cell_info.building_mods;
            let door_mods = building_mods.entrance_mods;

            // do not add the building to the list if it does not exist or if it is closed
            if (cell_info.building_data === null || (!building_mods.open && !include_closed_doors_and_buildings)) {
                continue;
            }

            let building = {
                ...cell_info.building_data
            };

            // filter the entrances to only include open ones
            let filtered_entrances = building.entrances.filter(function (door) {
                let door_mod = door_mods[door.id];
                return door_mod.open || (!door_mod.open && include_closed_doors_and_buildings);
            });
            building.entrances = filtered_entrances;

            // do not include buildings that have too few doors
            if (filtered_entrances.length < 2 && !include_few_doors_buildings) {
                continue;
            }

            filtered_graph.push(building);
        }
    }

    return filtered_graph;
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

    if (grid_coords.x >= grid.length || grid_coords.x < 0 || grid_coords.y >= grid.length || grid_coords.y < 0) {
        return null;
    }

    return grid[grid_coords.y][grid_coords.x];
}


// get the grid object for the provided building
function grid_object_for_id(building_id) {

    // use the id to get the grid coords directly
    let x = Math.floor(building_id / grid.length);
    let y = building_id % grid.length;

    if (x >= grid.length || x < 0 || y >= grid.length || y < 0) {
        return null;
    }

    let cell_info = grid[y][x];

    // TODO: why do i do this check? is it actually necessary?
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
                    building: null,
                    building_outline: null,
                    selection_overlay: null,
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
        let door_r = rand_in_range(0.25, 0.45); // ensures doors are not too close to the center nor outside the grid cell
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

    // add the new building to the graph data
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
function door_grid_path_to_border(building_grid_coords, door_id, outline_offset, door_offset) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door_mods = cell_info.building_mods.entrance_mods;
    let door_mod = door_mods[door_id];

    let door_grid_coords = grid_coords_for_building_or_door(door_mod.data_ref);

    // offset door grid coords
    if (door_mod.wall_direction === "vertical") {
        door_grid_coords.y += door_offset;
    } else {
        door_grid_coords.x += door_offset;
    }

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

        if (left_intersections < right_intersections) {
            best_point = calc_line_extend_point(door_grid_coords, to_left_point, -1 * outline_offset);
        } else {
            best_point = calc_line_extend_point(door_grid_coords, to_right_point, -1 * outline_offset);
        }
    
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

        if (top_intersections < bottom_intersections) {
            best_point = calc_line_extend_point(door_grid_coords, to_top_point, -1 * outline_offset);
        } else {
            best_point = calc_line_extend_point(door_grid_coords, to_bottom_point, -1 * outline_offset);
        }
    }

    return [door_grid_coords, best_point];
}


// find the path from a door to the border simply based on closest border
function door_grid_path_to_border_closest(building_grid_coords, door_grid_coords, outline_offset, door_offset) {

    // TODO: offset the door coords

    // adjusted to be door coordinates
    let building_grid_corners = [
        {x:building_grid_coords.x-0.5+outline_offset, y:building_grid_coords.y-0.5+outline_offset}, 
        {x:building_grid_coords.x+0.5-outline_offset, y:building_grid_coords.y-0.5+outline_offset}, 
        {x:building_grid_coords.x+0.5-outline_offset, y:building_grid_coords.y+0.5-outline_offset},
        {x:building_grid_coords.x-0.5+outline_offset, y:building_grid_coords.y+0.5-outline_offset}
    ];

    // calculate walls from the corners
    let walls = [];
    for (let i = 0; i < building_grid_corners.length; i++) {
        let corner1 = building_grid_corners[i];
        let corner2 = building_grid_corners[(i + 1) % building_grid_corners.length];

        walls.push([corner1, corner2]);
    }

    let wall_dist_points = walls.map(function (wall) {
        let closest_point = calc_closest_point(wall[0], wall[1], door_grid_coords);
        let dist = calc_dist(closest_point, door_grid_coords);

        return {
            point: closest_point,
            dist: dist
        };
    });

    // sort the walls based on closest point
    wall_dist_points.sort((a, b) => a.dist - b.dist);

    return [door_grid_coords, wall_dist_points[0].point];
}


/* ----------------------------- path management ---------------------------- */


// process returned path recommendation results
function process_paths(paths) {
    current_paths = paths;
}


/* ---------------------- building selection management --------------------- */


// handler for when a point has been clicked on the main stage
function select_point() {
    
    // get the stage coords of the current pointer position
    let scale = stage.scaleX();
    let pointer = stage.getPointerPosition();
    let stage_coords = {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale,
    };
    console.log("click detected at stage coords: ", stage_coords);

    // convert the stage coords of the click to door grid coords
    let grid_coords = door_main_stage_coords_to_grid_coords_rounding(stage_coords);

    // determine the selection to make based on the current system state
    if (is_selecting_path_start) {
        select_path_endpoint(grid_coords.door, grid_coords.building, true);
    } else if (is_selecting_path_end) {
        select_path_endpoint(grid_coords.door, grid_coords.building, false);
    } else {
        select_building_to_edit(grid_coords.building, true);
    }
}


// handler for when a given grid cell has been clicked
// function select_grid_cell(grid_coords, can_unselect) {

//     // do not select when currently panning
//     if (grid === null || is_panning) {
//         return;
//     }

//     // determine the selection to make based on the current system state
//     if (is_selecting_path_start) {
//         select_path_endpoint(grid_coords, true);
//     } else if (is_selecting_path_end) {
//         select_path_endpoint(grid_coords, false);
//     } else {
//         select_building_to_edit(grid_coords, can_unselect);
//     }
// }


// handle a path or end point being selected
function select_path_endpoint(door_grid_coords, building_grid_coords, is_start) {

    // set the new selected grid coords
    if (is_start) {
        path_start_selected_grid_coords = door_grid_coords;
    
    // set the new selected grid coords
    } else {
        path_end_selected_grid_coords = door_grid_coords;
    }

    draw_point_selection(door_grid_coords, building_grid_coords, selection_layer, is_start);

    // after selection is made, neither selection type should be active
    is_selecting_path_start = false;
    is_selecting_path_end = false;

    // update the path options display
    update_path_select_labels();
    update_path_select_buttons_active();
}


// reset all selected coordinates
function reset_cell_selections() {
    path_start_selected_grid_coords = null;
    path_end_selected_grid_coords = null;
    editor_selected_grid_coords = null;
}


/* -------------------------------------------------------------------------- */
/*                               building editor                              */
/* -------------------------------------------------------------------------- */


// clear the building editor stage and selected building info
function reset_building_editor() {

    // get selected building elements
    let info_container = document.getElementById("selected-cell-info-controls-container");
    let info_text_container = document.getElementById("selected-cell-info-text-container");
    let doors_list_container = document.getElementById("selected-building-doors-container");
    let building_options_container = document.getElementById("selected-building-options-container");
    let building_actions_container = document.getElementById("selected-building-actions-container");

    // clear elements relevant to the previous selected building
    info_text_container.innerHTML = "";
    doors_list_container.innerHTML = "";
    building_options_container.innerHTML = "";
    building_actions_container.innerHTML = "";

    info_container.style.display = "none";
    doors_list_container.style.display = "none";
    building_options_container.style.display = "none";
    // building_actions_container.style.display = "none";

    // clear the editor stage
    editor_stage.destroyChildren();
}


// select a building at the given coordinates and open it in the editor
function select_building_to_edit(building_grid_coords, can_unselect) {

    console.log("selecting cell to edit: ", building_grid_coords);

    // get the info object for the building at the given coords
    let cell_info = grid_object_at_coords(building_grid_coords);

    if (cell_info === null) {
        console.log("can't select building, cell_info null");
        return;
    }

    let building_mods = cell_info.building_mods;

    console.log("cell info:", cell_info);

    // reset the building editor elements
    reset_building_editor();

    // unselect if clicked same building (by doing nothing)
    if (editor_selected_grid_coords !== null && coords_eq(building_grid_coords, editor_selected_grid_coords) && can_unselect) {
        console.log("unselecting", editor_selected_grid_coords);
        editor_selected_grid_coords = null;
        return;
    }

    // set the currently selected editor selected grid cell
    editor_selected_grid_coords = building_grid_coords;

    // get container elements to build elements into
    let info_container = document.getElementById("selected-cell-info-controls-container");
    let info_text_container = document.getElementById("selected-cell-info-text-container");
    let doors_list_container = document.getElementById("selected-building-doors-container");
    let building_options_container = document.getElementById("selected-building-options-container");
    let building_actions_container = document.getElementById("selected-building-actions-container");

    info_container.style.display = "flex";

    // create content for the current selected grid cell
    let cell_info_label = document.createElement("span");
    cell_info_label.classList.add("subsubtitle");
    cell_info_label.innerHTML = "Grid Cell: ";
    info_text_container.appendChild(cell_info_label);

    let cell_info_content = document.createElement("span");
    cell_info_content.innerHTML = `(${building_grid_coords.x + 1}, ${building_grid_coords.y + 1})  `;
    info_text_container.appendChild(cell_info_content);
    
    if (cell_info.building_data !== null) {

        doors_list_container.style.display = "block";
        building_options_container.style.display = "block";

        let building_id = cell_info.building_data["id"];
        let doors = cell_info.building_data.entrances;

        // create a span to show the building id
        let building_info_label = document.createElement("span");
        building_info_label.classList.add("subsubtitle");
        building_info_label.innerHTML = "Building ID:  ";
        info_text_container.appendChild(building_info_label);
    
        let building_info_content = document.createElement("span");
        building_info_content.innerHTML = building_id;
        info_text_container.appendChild(building_info_content);

        // create a div to contain the title and add doors button
        let edit_doors_title_container = document.createElement("div");
        doors_list_container.appendChild(edit_doors_title_container);

        // create a title for the edit doors list
        let edit_doors_list_title = document.createElement("span");
        edit_doors_list_title.classList.add("subsubtitle");
        edit_doors_list_title.innerHTML = "Doors:";
        edit_doors_title_container.appendChild(edit_doors_list_title);

        // create container for the add door button
        let add_door_button_container = document.createElement("span");
        add_door_button_container.id = "edit-doors-add-button-container";
        edit_doors_title_container.appendChild(add_door_button_container);
        
        // create a button that adds a door to the current building
        let add_door_button = document.createElement("button");
        add_door_button.innerHTML = "+ Door";
        add_door_button.addEventListener("click", function (e) {
            handle_add_door_button(building_grid_coords);
        });
        add_door_button_container.appendChild(add_door_button);

        // create list to store door info in
        let edit_doors_list = document.createElement("ul");
        edit_doors_list.setAttribute("id", "edit-doors-list");
        
        // iterate over every door in the building
        for (let door_id in cell_info.building_mods.entrance_mods) {
            let door_list_item = create_door_list_item(building_grid_coords, door_id);
            edit_doors_list.appendChild(door_list_item);
        }
        doors_list_container.appendChild(edit_doors_list);

        // create label and radio buttons to represent open or closed status for the building
        let building_open_container = document.createElement("div");
        building_options_container.appendChild(building_open_container);

        let building_open_title = document.createElement("span");
        building_open_title.classList.add("subsubtitle");
        building_open_title.innerHTML = "Availability:";
        building_open_container.appendChild(building_open_title);

        // create span wrapped radios and label for each congestion level
        let open_radio = create_open_radio(building_grid_coords, "open");
        let closed_radio = create_open_radio(building_grid_coords, "closed");
        building_open_container.appendChild(open_radio);
        building_open_container.appendChild(closed_radio);

        // create label and input checkbox to represent whether the building is open or closed (i.e. usable or not)        
        let building_open_label = document.createElement("label");
        building_open_label.innerHTML = "Open";
        building_open_label.htmlFor = "building-open-cb";

        // only show congestion radio if the graph does not use constant congestion
        if (!current_config["constant_con"]) {

            // TODO: still show for constant congestion? since you want to be able to edit it?
            // or at least update how you check for this, since if you import a graph or use a preset it will not match the current config

            // create a container for the congestion radio element
            let building_con_container = document.createElement("div");
            building_con_container.id = "building-con-container";
            building_options_container.appendChild(building_con_container);

            // create labels and input radios to select building congestion level
            let building_con_label = document.createElement("span");
            building_con_label.classList.add("subsubtitle");
            building_con_label.innerHTML = "Congestion:";
            building_con_container.appendChild(building_con_label);

            // create span wrapped radios and label for each congestion level
            let low_con_radio = create_con_radio(building_grid_coords, "low");
            let med_con_radio = create_con_radio(building_grid_coords, "med");
            let high_con_radio = create_con_radio(building_grid_coords, "high");

            building_con_container.appendChild(low_con_radio);
            building_con_container.appendChild(med_con_radio);
            building_con_container.appendChild(high_con_radio);
        }
        
        // create a button to delete the current building
        let delete_building_button = document.createElement("button");
        delete_building_button.innerHTML = "Delete Building";
        delete_building_button.addEventListener("click", function (e) {
            handle_delete_building_button(building_grid_coords);
        });

        building_actions_container.appendChild(delete_building_button);
        

    } else {

        // create a button to create a new
        let add_building_button = document.createElement("button");
        add_building_button.innerHTML = "Create Building";
        add_building_button.addEventListener("click", function (e) {
            handle_add_building_button(building_grid_coords);
        });
        building_actions_container.appendChild(add_building_button);
    }

    // redraw the selected building in both the editor stage and main stage
    if (cell_info.building_data !== null) {
        redraw_selected_building(building_grid_coords);
    }

    // update accordian heights
    update_accordion_heights();
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

    // ID label to identify each door
    let door_label = document.createElement("span");
    door_label.innerHTML = "ID: ";
    door_label.classList.add("bold-text");

    let door_label_value = document.createElement("span");
    door_label_value.innerHTML = door_id;

    // define ids for different checkboxes
    let open_chkbox_id = `door-${door_id}-open-cb`;
    let access_chkbox_id = `door-${door_id}-accessible-cb`;

    // define span to group parts of the list item
    let open_span = document.createElement("span");
    open_span.classList.add("options-short-group");
    open_span.classList.add("edit-doors-list-item-control");

    let access_span = document.createElement("span");
    access_span.classList.add("options-short-group");
    access_span.classList.add("edit-doors-list-item-control");

    let delete_span = document.createElement("span");
    delete_span.classList.add("options-short-group");
    delete_span.classList.add("edit-doors-list-item-control");
    
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
    delete_button.classList.add("edit-doors-list-item-control");
    delete_button.addEventListener("click", function (e) {
        handle_delete_door_button(building_grid_coords, door_id);
    });

    // add created items as children to the list item
    li.appendChild(door_label);
    li.appendChild(door_label_value);
    open_span.appendChild(open_chkbox);
    open_span.appendChild(open_label);
    li.appendChild(open_span);
    access_span.appendChild(access_chkbox);
    access_span.appendChild(access_label);
    li.appendChild(access_span);
    delete_span.appendChild(delete_button);
    li.appendChild(delete_span);

    return li;
}


// creates a radio option and label for congestion level for a given building
function create_con_radio(building_grid_coords, con_level) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info.building_mods;

    let con_radio_id = `building-${con_level}-con-radio`;
    
    // create container for the radio and label
    let span = document.createElement("span");
    span.classList.add("options-short-group");

    // create label for the radio
    let con_label = document.createElement("label");
    con_label.htmlFor = con_radio_id;
    con_label.innerHTML = con_level_names[con_level];

    // create the radio button 
    let con_radio = document.createElement("input");
    con_radio.type = "radio";
    con_radio.classList.add(con_text_color_classes[con_level]);
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


// creates a radio option and label for building openness status
function create_open_radio(building_grid_coords, openness) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info.building_mods;

    let openness_id = `building-availability-${openness}`;

    // create container for the radio and label
    let span = document.createElement("span");
    span.classList.add("options-short-group");

    // create label for the radio
    let label = document.createElement("label");
    label.htmlFor = openness_id;
    label.innerHTML = openness.charAt(0).toUpperCase() + openness.slice(1);;

    // create the radio button 
    let radio = document.createElement("input");
    radio.type = "radio";
    radio.id = openness_id;
    radio.checked = (building_mods.open && openness === "open") || (!building_mods.open && openness === "closed");
    radio.name = "building-availability";
    radio.addEventListener("change", function(e) {
        if (this.checked) {
            building_open_radio_changed(building_grid_coords, openness);
        }
    });

    // add radio button and text to the label
    span.appendChild(radio);
    span.appendChild(label);

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
    select_building_to_edit(building_grid_coords, false);
}

// handle the selected empty grid cell add button click
function handle_add_building_button(building_grid_coords) {

    console.log("building added: ", building_grid_coords);

    // create a new building object
    add_new_building(building_grid_coords);

    // draw the building on the main stage
    draw_building(building_grid_coords, building_layer, true);

    // reselect the filled cell
    select_building_to_edit(building_grid_coords, false);
}


// handle the selected building open checkbox being changed
function building_open_radio_changed(building_grid_coords, openness) {

    // get the information for the given building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building = cell_info.building_data;
    let building_mods = cell_info.building_mods;

    // assign the new open status to the building
    building_mods.open = openness === "open";
    
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
    door.x = new_door_grid_coords.x + 1;
    door.y = new_door_grid_coords.y + 1;

    // log this door as being the last dragged door for this building (so it is drawn on top of other doors)
    door_mod.last_drag_time = Date.now();
    
    // redraw the building to reflect the changes in position
    redraw_selected_building(building_grid_coords);
}


// handle the open checkbox being clicked for a given building door
function door_open_checkbox_checked(building_grid_coords, door_id) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door = door_object_at_coords(building_grid_coords, door_id);
    let doors = cell_info.building_data.entrances;
    let door_mod = cell_info.building_mods.entrance_mods[door_id];

    // toggle the door's open status
    door_mod.open = !door_mod.open;
    
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

    // update accordian heights
    update_accordion_heights();
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

    // update accordian heights
    update_accordion_heights();
}


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
        // listening: false // TODO: add listening false back after custom movement is not needed
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
    let building_group = new Konva.Group({draggable: true}); // TODO: remove draggable after custom movement is no longer needed
    
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


/* ------------------------ selection overlay drawing ----------------------- */


// // draws an overlay over every grid cell so you can select buildings
// function draw_selection_overlays(parent) {
    
//     // create background layer grid cells
//     for (let x = 0; x < grid.length; x++) {
//         for (let y = 0; y < grid.length; y++) {

//             let grid_coords = {x: x, y: y};
//             draw_selection_overlay(grid_coords, parent);
//         }
//     }
// }


// // draw a background / overlay cell for given grid coordinates
// function draw_selection_overlay(building_grid_coords, parent) {

//     // TODO: include spacing

//     // get the building info object at the given grid coordinates
//     let cell_info = grid_object_at_coords(building_grid_coords);
//     let cell_dims = get_cell_dims(true);

//     // destroy previous background shape if there is one
//     let prev_background = cell_info.shapes.selection_overlay;
//     if (prev_background !== null) {
//         prev_background.destroy();
//     }

//     // find the coordinates to draw the cell at
//     let cell_coords = grid_coords_to_main_stage_coords(building_grid_coords);
//     cell_coords = {
//         x: cell_coords.x - cell_dims.spacing/2,
//         y: cell_coords.y - cell_dims.spacing/2
//     }

//     // create the cell
//     let overlay = new Konva.Rect({
//         width: cell_dims.size + cell_dims.spacing,
//         height: cell_dims.size + cell_dims.spacing,
//         strokeWidth: cell_dims.size / 20,
//         cornerRadius: 5,
//         x: cell_coords.x,
//         y: cell_coords.y,
//         perfectDrawEnabled: false
//     });

//     // define a function for when the cell is clicked
//     overlay.on("mouseup", function (e) {
//         select_grid_cell(building_grid_coords, true);
//     });
    
//     // store the overlay cell for easy access later
//     cell_info.shapes.selection_overlay = overlay;

//     // set the color of the overlay
//     set_overlay_highlight(building_grid_coords, null);

//     // add the cell to the layer
//     parent.add(overlay);
// }


// set the highlight color of an overlay cell
// function set_overlay_highlight(grid_coords, highlight_color_override) {

//     if (grid_coords === null) {
//         return;
//     }

//     let highlight_color = "";

//     // check if highlight colors are enabled as a whole
//     if (!highlight_colors_enabled) {
//         highlight_color = "";

//     // check if a highlight color override has been provided
//     } else if (highlight_color_override !== null) {
//         highlight_color = highlight_color_override;

//     // no override provided, check if grid cell is currently selected
//     } else {

//         // check if the building is currently selected for editing
//         if (editor_selected_grid_coords !== null && coords_eq(grid_coords, editor_selected_grid_coords)) {
//             highlight_color = selection_colors.editing;
//         // check if the building is currently selected as the path start
//         } else if (path_start_selected_grid_coords !== null && coords_eq(grid_coords, path_start_selected_grid_coords)) {
//             highlight_color = selection_colors.path_start;
//         // check if the building is currently selected as the path end
//         } else if (path_end_selected_grid_coords !== null && coords_eq(grid_coords, path_end_selected_grid_coords)) {
//             highlight_color = selection_colors.path_end;
//         }
//     }

//     let cell_info = grid_object_at_coords(grid_coords);
//     let overlay_shape = cell_info.shapes.selection_overlay;

//     if (overlay_shape !== null) {
//         overlay_shape.stroke(highlight_color);
//     }
// }


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


/* -------------------------------------------------------------------------- */
/*                           coordinate conversions                           */
/* -------------------------------------------------------------------------- */


// convert grid coordinates to stage cell coordinates based on the provided dimensions
function grid_coords_to_main_stage_coords(grid_coords) {
    return {
        x: grid_coords.x * (main_cell_dims.size + main_cell_dims.spacing),
        y: grid_coords.y * (main_cell_dims.size + main_cell_dims.spacing)
    };
}


// convert main stage coords to grid coords
function main_stage_coords_to_grid_coords(stage_coords) {
    return {
        x: stage_coords.x / (main_cell_dims.size + main_cell_dims.spacing),
        y: stage_coords.y / (main_cell_dims.size + main_cell_dims.spacing)
    };
}


// convert door grid coordinates to stage coordinates based on the provided dimensions
function door_grid_coords_to_stage_coords(door_grid_coords, building_grid_coords, for_main_stage) {

    let building_stage_coords = for_main_stage ? grid_coords_to_main_stage_coords(building_grid_coords) : {x:0, y:0};
    let cell_dims = get_cell_dims(for_main_stage);

    let invert_y = should_invert_door_y ? -1 : 1;
    
    // extract the door's offset from the building to properly scale to cell size
    let door_grid_coord_offset = {
        x: door_grid_coords.x - building_grid_coords.x,
        y: invert_y * (door_grid_coords.y - building_grid_coords.y) // * -1 to invert y coordinate system
    };

    // get final door coordinates by scaling and translating
    return {
        x: building_stage_coords.x + (door_grid_coord_offset.x * cell_dims.size) + (cell_dims.size / 2), // +size/2 to get cell center coordinates rather than top left (used in rect positioning)
        y: building_stage_coords.y + (door_grid_coord_offset.y * cell_dims.size) + (cell_dims.size / 2),
    };
}


// get the building coords for given door coords by rounding
function door_grid_coords_to_building_grid_coords_rounding(door_grid_coords) {
    return {
        x: Math.round(door_grid_coords.x),
        y: Math.round(door_grid_coords.y)
    };
}


// convert door grid coords to main stage coords by rounding to get the building coords
function door_grid_coords_to_main_stage_coords_rounding(door_grid_coords) {

    let building_grid_coords = door_grid_coords_to_building_grid_coords_rounding(door_grid_coords);
    return door_grid_coords_to_stage_coords(door_grid_coords, building_grid_coords, true);
}


// convert door main stage coords to grid coords by rounding to get the building coords
function door_main_stage_coords_to_grid_coords_rounding(door_stage_coords) {

    // ugly but hey it works

    let cell_dims = get_cell_dims(true);
    let resolution = cell_dims.size + cell_dims.spacing;
    let building_stage_coords = {
        x: round_partial(door_stage_coords.x - (cell_dims.size + cell_dims.spacing/2) / 2, resolution),
        y: round_partial(door_stage_coords.y - (cell_dims.size + cell_dims.spacing/2) / 2, resolution)
    };
    let building_grid_coords = main_stage_coords_to_grid_coords(building_stage_coords);

    return {
        door: door_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords, true),
        building: building_grid_coords
    };
}


// convert door grid coordinates to stage coordinates based on the provided dimensions
function door_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords, for_main_stage) {

    let building_stage_coords = for_main_stage ? grid_coords_to_main_stage_coords(building_grid_coords) : {x:0, y:0};
    let cell_dims = get_cell_dims(for_main_stage);

    let invert_y = should_invert_door_y ? -1 : 1;

    // unscale and untranslate the stage coords to get the offset of the door to the building
    let door_grid_coord_offset = {
        x: (door_stage_coords.x - building_stage_coords.x - (cell_dims.size / 2)) / cell_dims.size,
        y: (door_stage_coords.y - building_stage_coords.y - (cell_dims.size / 2)) / cell_dims.size,
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
        x: Math.floor(building_id / grid.length),
        y: building_id % grid.length
    };
}


// helper function to get a grid cell ID based on coordinates
function grid_cell_id_for_coords(grid_coords) {
    return grid_coords.x * grid.length + grid_coords.y;
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


// calculate a round number for a given resolution
function round_partial(num, resolution) {
    return Math.round(num / resolution) * resolution;
}


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


// helper method to determine if coordinates are equal
function coords_eq(p1, p2, tol=0.0001) {
    return floats_eq(p1.x, p2.x, tol) && floats_eq(p1.y, p2.y, tol);
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

// reverse coordinates
function invert_rect_coords(r1, r2){
    let r1x = r1.x, r1y = r1.y, r2x = r2.x, r2y = r2.y, d;
    if (r1x > r2x) {
        d = Math.abs(r1x - r2x);
        r1x = r2x; r2x = r1x + d;
    }
    if (r1y > r2y) {
        d = Math.abs(r1y - r2y);
        r1y = r2y; r2y = r1y + d;
    }
    return ({x1: r1x, y1: r1y, x2: r2x, y2: r2y});   
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


/* ----------------------- import/export form controls ---------------------- */


// process a graph file from user input
function submit_uploaded_graph() {

    let import_input = document.getElementById("import-graph-input");

    // check if a file has been selected
    if (import_input.files.length === 0) {
        alert("ERROR: Choose a file to upload");
    }

    let file = import_input.files[0];

    // set up the file reader
    let reader = new FileReader();
    reader.onload = event => process_uploaded_graph(event.target.result)
    // reader.onerror = error => reject(error)

    // read the uploaded file
    reader.readAsText(file)
}


// process the uploaded file
function process_uploaded_graph(graph_text) {

    // convert the data to a json object
    let json = JSON.parse(graph_text);

    // TODO: input validation?

    process_preset_graph(json);
    draw_main_stage();
}


// download an export file of the current graph
function download_graph_export() {

    // determine whether or not to prettify the export data
    let pretty_chkbox = document.getElementById("export-pretty-cb");
    let json_spaces = pretty_chkbox.checked ? 2 : 0;

    // get the current graph data (includes closed doors and buildings, as well as buildings with < 2 doors)
    let filtered_graph = filter_current_graph(true, true);

    // setup the file data and name
    let data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filtered_graph, null, json_spaces));
    let file_name = "graph_export.json";

    // create e temporary link node
    let download_node = document.createElement('a');
    download_node.setAttribute("href", data);
    download_node.setAttribute("download", file_name);
    document.body.appendChild(download_node);
    
    // click the node to download the file, then remove the node from the body
    download_node.click();
    download_node.remove();
}


/* -------------------------- config form controls -------------------------- */


// detect when changes are made to the config form
document.getElementById("config-form-container").addEventListener("input", function (e) {
    update_config_form_display();
});

// add event listeners to each accordion button
Array.from(document.getElementsByClassName("accordion-button")).forEach(function (button) {
    button.addEventListener("click", function() {
        this.classList.toggle("accordion-active");
        let panel = this.nextElementSibling;

        // set panel transition here so that it animates every time except for initially expanded nodes on page load
        panel.style.transition = "max-height 0.3s ease-out";

        if (panel.style.maxHeight) {
          panel.style.maxHeight = null;
        } else {
          panel.style.maxHeight = panel.scrollHeight + panel.offsetHeight + "px";
        } 
    });
});


// update all accordion heights 
function update_accordion_heights() {

    Array.from(document.getElementsByClassName("accordion-button")).forEach(function (button) {
        
        let panel = button.nextElementSibling;

        // set the max height of the panel
        if (button.classList.contains("accordion-active")) {
            panel.style.maxHeight = panel.scrollHeight + "px";
        } else {
            panel.style.maxHeight = null;
        } 
    });
}


// update config form visuals based on the input values
function update_config_form_display() {

    let config_form = document.getElementById("config-form-container");
    let range_inputs = config_form.querySelectorAll("input[type=range]");

    // iterate over every range input in the form
    for (let i = 0; i < range_inputs.length; i++) {
        
        // set the percentage label for each range input
        let range_input = range_inputs[i];
        let perc_label = range_input.nextElementSibling;
        perc_label.innerHTML = Math.round(range_input.value * 100) + "%";
    }

    // enable or disable the congestion slider depending on if constant congestion is enabled
    let constant_con_input = document.getElementById("constant-congestion-input");
    let con_slider = document.getElementById("congestion-slider");
    let con_levels_labels_container = document.getElementById("congestion-labels-values-container");
    let con_slider_label = document.getElementById("congestion-slider-label");
    let con_levels_percents = con_levels_labels_container.querySelectorAll(".congestion-value-percent");

    if (constant_con_input.checked) {
        con_slider.setAttribute("disabled", "");
        con_levels_labels_container.style.opacity = "0.5";
        con_slider_label.style.opacity = "0.5";
    } else {
        con_slider.removeAttribute("disabled");
        con_levels_labels_container.style.opacity = "1";
        con_slider_label.style.opacity = "1";
    }

    Array.from(con_levels_percents).forEach(function (percent_label) {
        if (constant_con_input.checked) {
            percent_label.classList.add("black-text-color");
        } else {
            percent_label.classList.remove("black-text-color");
        }
    });
}


// attempt to submit the configuration form
function submit_config_form() {

    // get the input elements
    let num_buildings_input = document.getElementById("num-buildings-input");
    let coverage_input = document.getElementById("coverage-input");
    let clustering_input = document.getElementById("clustering-input");
    let constant_con_input = document.getElementById("constant-congestion-input");

    // convert input elements to proper types
    let num_buildings_value = parseInt(num_buildings_input.value, 10);
    let coverage_value = parseFloat(coverage_input.value);
    let clustering_value = parseFloat(clustering_input.value);

    let constant_con_value = constant_con_input.checked;
    let high_con_value = next_config_con_values.high / 100;
    let med_con_value = next_config_con_values.med / 100;
    let low_con_value = next_config_con_values.low / 100;

    // perform basic input validation
    let has_error = false;
    let error_message = "";

    // check the number of buildings
    if (num_buildings_value <= 0 || isNaN(num_buildings_value)) {
        has_error = true;
        error_message += "ERROR: Number of buildings must be at least 1\n";
    }

    // verify that the congestion values sum to one
    let con_sum = high_con_value + med_con_value + low_con_value;
    if (Math.abs(con_sum - 1) > 0.00001) {
        has_error = true;
        error_message += "ERROR: High, Medium, and Low congestion values must sum to 100%\n";
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


// create the multi thumb slider for congestion levels
function create_congestion_slider() {
    
    let con_slider = document.getElementById("congestion-slider");

    // create the noUiSlider 
    noUiSlider.create(con_slider, {
        start: [30, 70],
        range: { min: [0], max: [100] },
        step: 1,
        connect: [true, true, true]
    });

    // update display and current congestion values whenver a value has changed
    con_slider.noUiSlider.on("update", function (values, handle) {
        update_config_con_labels(values);
    });
    
    // color the different connections of the slider
    let connect = con_slider.querySelectorAll('.noUi-connect');
    let classes = ["low-con-color", "med-con-color", "high-con-color"];

    for (let i = 0; i < connect.length; i++) {
        connect[i].classList.add(classes[i]);
    }
}


// update the labels for congestion level %s
function update_config_con_labels(handle_values) {

    // calculate each of the congestion values
    let low_val = parseInt(handle_values[0]);
    let high_val = 100 - parseInt(handle_values[1]);
    let med_val = 100 - (high_val + low_val);

    // get the labels for each of the congestion levels
    let low_label = document.getElementById("low-con-value");
    let med_label = document.getElementById("med-con-value");
    let high_label = document.getElementById("high-con-value");

    // set the values of the labels
    low_label.innerHTML = low_val + "%";
    med_label.innerHTML = med_val + "%";
    high_label.innerHTML = high_val + "%";

    // store the congestion values
    next_config_con_values.low = low_val;
    next_config_con_values.med = med_val;
    next_config_con_values.high = high_val;
}


/* ------------------------- path gen form controls ------------------------- */


// attempt to submit the path generation form
function submit_path_gen_form() {

    let path_gen_form = document.getElementById("path-gen-form-container");
    let alg_chkboxes = path_gen_form.querySelectorAll("input[type=checkbox]");
    let access_radio_value = path_gen_form.querySelector("input[name=accessibility-type]:checked").value;

    let selected_algs = [];
    let start_id = null;
    let end_id = null;

    // iterate over every checkbox in the form and return the value of selected algs
    for (let i = 0; i < alg_chkboxes.length; i++) {
    
        let chkbox = alg_chkboxes[i];
        
        if (chkbox.checked) {
            selected_algs.push(chkbox.value);
        }
    }

    let error_message = "";
    let has_error = false;

    // check that at least one algorithm is selected
    if (selected_algs.length === 0) {
        error_message += "ERROR: Select at least one algorithm\n";
        has_error = true;
    }

    // check if there is a selected start cell
    if (path_start_selected_grid_coords === null) {
        error_message += "ERROR: Select a start cell\n";
        has_error = true;
    } else {
        start_id = grid_cell_id_for_coords(path_start_selected_grid_coords);
    }

    // check if there is a selected end cell
    if (path_end_selected_grid_coords === null) {
        error_message += "ERROR: Select an end cell\n"
        has_error = true;
    } else {
        end_id = grid_cell_id_for_coords(path_end_selected_grid_coords);
    }

    // TODO: reenable this
    // check if an error has been detected
    // if (has_error) {
    //     alert(error_message);
    //     return;
    // }

    // create an object containing the path recommendation options
    let path_options = {
        algs: selected_algs,
        accessible: access_radio_value === "accessible",
        start_id: start_id,
        end_id: end_id
    };

    // visualize returned path
    recommend_path(path_options);
}


// update the path start and end selection info text
function update_path_select_labels() {

    let start_text = "";
    let end_text = "";
    
    // get the id of the currently selected start cell
    if (path_start_selected_grid_coords !== null) {
        // let start_cell_id = grid_cell_id_for_coords(path_start_selected_grid_coords);
        start_text = `(${path_start_selected_grid_coords.x.toFixed(1)}, ${path_start_selected_grid_coords.y.toFixed(1)})`;
    }

    // get the id of the currently selected end cell
    if (path_end_selected_grid_coords !== null) {
        end_text = `(${path_end_selected_grid_coords.x.toFixed(1)}, ${path_end_selected_grid_coords.y.toFixed(1)})`;
    }
    
    document.getElementById("path-start-building-info").innerHTML = start_text;
    document.getElementById("path-end-building-info").innerHTML = end_text;
}


// update the path start and end selection buttons to be active or not
function update_path_select_buttons_active() {

    let start_button = document.getElementById("select-path-start-button");
    let end_button = document.getElementById("select-path-end-button");

    if (is_selecting_path_start) {
        start_button.classList.add("path-endpoints-button-active");
    } else {
        start_button.classList.remove("path-endpoints-button-active");
    }

    if (is_selecting_path_end) {
        end_button.classList.add("path-endpoints-button-active");
    } else {
        end_button.classList.remove("path-endpoints-button-active");
    }
}


// begin selecting path start cell
function handle_select_start_building_button() {

    // toggle the variables for currently selecting start / end
    is_selecting_path_start = !is_selecting_path_start;
    is_selecting_path_end = false;

    update_path_select_buttons_active();
}


// begin selecting path end cell
function handle_select_end_building_button() {
    
    // toggle the variables for currently selecting start / end
    is_selecting_path_end = !is_selecting_path_end;
    is_selecting_path_start = false;

    update_path_select_buttons_active();
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
    redraw_selected_building(editor_selected_grid_coords);
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

    redraw_selected_building(editor_selected_grid_coords);
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

    redraw_selected_building(editor_selected_grid_coords);
}


// selected cell highlight colors visibility toggle
function handle_cell_highlights_visible_button() {

    // TODO: change for just selected building highlight

    // toggle the highlight color boolean
    highlight_colors_enabled = !highlight_colors_enabled;

    // update the highlight color for every cell
    // for (let x = 0; x < grid.length; x++) {
    //     for (let y = 0; y < grid.length; y++) {
            
    //         let cell_info = grid[y][x];
    //         if (cell_info.shapes.selection_overlay === null) {
    //             continue;
    //         }

    //         set_overlay_highlight({x:x, y:y}, null);
    //     }
    // }
}


// handle legend visibility toggle
function handle_legend_visible_button() {

    let legend = document.getElementById("graph-legend");
    path_legend_enabled = !path_legend_enabled;

    if (path_legend_enabled) {
        legend.style.display = "";
    } else {
        legend.style.display = "none";
    }
}


// handle path end points visibility toggle
function handle_path_endpoint_visibility_button() {

    if (path_endpoints_enabled) {
        if (path_start_selection_shape) {
            path_start_selection_shape.hide();
        }
        if (path_end_selection_shape) {
            path_end_selection_shape.hide();
        }
    } else {
        if (path_start_selection_shape) {
            path_start_selection_shape.show();
        }
        if (path_end_selection_shape) {
            path_end_selection_shape.show();
        }
    }

    path_endpoints_enabled = !path_endpoints_enabled;
}


// toggles the road hiding variable
function handle_road_hiding_button() {
    road_hiding_drag_enabled = !road_hiding_drag_enabled;
}


// toggles the can pan variable
function handle_panning_toggle_button() {
    can_pan_enabled = !can_pan_enabled;
}


// toggles the can zoom variable
function handle_zooming_toggle_button() {
    can_zoom_enabled = !can_zoom_enabled;
}


/* -------------------------------------------------------------------------- */
/*                               stage controls                               */
/* -------------------------------------------------------------------------- */


/* ----------------------------- stage resizing ----------------------------- */


// create stage objects using their containers' height
function create_stages() {

    let main_stage_initial_size = 700;

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
    orig_editor_width = Math.floor(editor_container_width) - 1;

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

    // get the scale of the editor stage based on the container width compared with the first editor width
    let editor_scale = editor_container_width / orig_editor_width;

    // set the widths and heights of the stages (slightly under container size to not cause weird overflow issues)
    stage.width(Math.floor(main_container_width) - 1);
    stage.height(Math.floor(main_container_height) - 1);
    editor_stage.width(Math.floor(editor_container_width) - 1);
    editor_stage.height(Math.floor(editor_container_width) - 1);

    // scale the editor stage
    editor_stage.scale({ x: editor_scale, y: editor_scale });
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