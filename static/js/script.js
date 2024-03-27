
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
let grid = null;

// allows access to the previously selected building
let last_selected_cell_info = null;

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
})

// define objects to store main and editor cell dimensions
let main_cell_dims = null;
let editor_cell_dims = null;
let cell_spacing = 0; // TODO: max spacing value? based on the size of the stage

// execute when the document is ready
document.addEventListener("DOMContentLoaded", function() { 

    // generate a graph with the default config
    generate_graph(default_config);
    
    // show any necessary values on the config form
    update_config_form_display();
});


/* -------------------------------------------------------------------------- */
/*                               API connections                              */
/* -------------------------------------------------------------------------- */


// contact the graph generator with the given config
function generate_graph(config) {

    console.log("generating graph with config: ", config);

    // config = default_config;

    // get the graph and draw its buildings on the response
    fetch(`static/assets/graph_${config["num_buildings"]}_0.75.json`)
        .then((res) => res.json())
        .then((json) => {
            console.log("graph data: ", json);
            draw_buildings(json, config);
        })
        .catch((e) => console.error(e));
}


/* -------------------------------------------------------------------------- */
/*                               grid management                              */
/* -------------------------------------------------------------------------- */


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


// helper method to get the door object at the building at the provided coordinates
function door_object_at_coords(grid_coords, door_id) {
    let cell_info = grid_object_at_coords(grid_coords);
    let door_mods = cell_info["building_mods"]["entrance_mods"];

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
                    background: null,
                    entrances: {},
                    group: null
                },
                building_mods: {
                    entrance_mods: {}, 
                    open: true,
                    orig_entrances: null,
                    next_new_door_id: 1,
                    outline_grid_coords: [],
                    con_level: null
                }
            };            

            row.push(cell_info);
        }
        new_grid.push(row);
    }

    return new_grid;
}


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


// initialize the grid cell info for a given building
function init_grid_cell_info(building) {
    
    let doors = building["entrances"];

    // get building x and y coordinates (convert 1-indexed to 0-indexed)
    let building_grid_coords = {
        x: building["x"] - 1,
        y: building["y"] - 1
    };

    // get the grid cell info object associated with the building
    let cell_info = grid_object_at_coords(building_grid_coords);

    // add necessary info about the building cell to the grid array
    cell_info["building_data"] = building;
    cell_info["building_mods"]["open"] = true;
    cell_info["building_mods"]["outline_grid_coords"] = [];
    cell_info["building_mods"]["entrance_mods"] = {};
    cell_info["building_mods"]["orig_entrances"] = building["entrances"].map(a => {return {...a}});
    cell_info["building_mods"]["next_new_door_id"] = doors.length + 1;
    cell_info["building_mods"]["con_level"] = determine_con_level(building["congestion"]);

    // iterate over every door in the building
    for (let d = 0; d < doors.length; d++) {
        let door = doors[d];
        let door_id = door["id"];

        cell_info["building_mods"]["entrance_mods"][door_id] = {
            open: true,
            data_ref: door,
            last_drag_time: 0
        };
    }

    return cell_info;
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

    return building;
}


// adds a new door to the given building
function add_new_building_door(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info["building_mods"];
    let door_id = building_mods["next_new_door_id"]++;

    // generate a new door object
    let door = generate_new_doors(building_grid_coords, 1, door_id)[0];

    let door_grid_coords = {
        x: door["x"] - 1, // adjust back to 0 indexed coords
        y: door["y"] - 1
    };

    // move the door point to the outline of the building
    if (building_mods["outline_grid_coords"].length > 0) {
        door_grid_coords = calc_closest_point_to_shape(building_mods["outline_grid_coords"], door_grid_coords);
        door["x"] = door_grid_coords.x + 1;
        door["y"] = door_grid_coords.y + 1;
    }

    // create a new door modification object
    let door_mod =  {
        open: true,
        data_ref: door,
        last_drag_time: 0
    };

    // add new door structures to grid data
    cell_info["building_data"]["entrances"].push(door);
    building_mods["entrance_mods"][door_id] = door_mod;

    return door_id
}


// deletes a given door from the given building
function delete_building_door(building_grid_coords, door_id) {
    
    let cell_info = grid_object_at_coords(building_grid_coords);
    let doors = cell_info["building_data"]["entrances"];

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
    delete cell_info["building_mods"]["entrance_mods"][door_id];
}


// creates a new building at the given coords
function add_new_building(building_grid_coords) {

    // get the current grid cell info
    let cell_info = grid_object_at_coords(building_grid_coords);

    // if there is a building at the given location, delete it first
    if (cell_info["building_data"] !== null) {
        delete_building(building_grid_coords);
    }

    // create a new building object
    let building = generate_building(building_grid_coords);

    // initialize the cell info object for the given building
    init_grid_cell_info(building);

    // add the new door to the graph data
    current_graph.push(building);
}


// deletes a building at the given coords 
function delete_building(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building = cell_info["building_data"];

    // remove the building from the graph data
    let building_index = current_graph.indexOf(building);
    current_graph.splice(building_index, 1);

    // reset the cell info for the selected building
    cell_info["building_data"] = null;
    cell_info["building_mods"]["open"] = true;
    cell_info["building_mods"]["outline_grid_coords"] = [];
    cell_info["building_mods"]["entrance_mods"] = {};
    cell_info["building_mods"]["orig_entrances"] = [];
    cell_info["building_mods"]["next_new_door_id"] = 1;
    cell_info["building_mods"]["con_level"] = null;
    cell_info["shapes"]["building"] = null;
    cell_info["shapes"]["building_outline"] = null;
    cell_info["shapes"]["entrances"] = {};
    cell_info["shapes"]["group"] = null;
}


/* -------------------------------------------------------------------------- */
/*                             drawing dimensions                             */
/* -------------------------------------------------------------------------- */


// calculate cell dimensions for the main stage and editor stage based on a given config 
function calculate_cell_dims(config) {

    // get size of grid based on current configuration 
    let grid_len = calc_grid_bounds(config);

    // get number of spaces between grid cells
    let num_spaces = grid_len - 1;

    // calculate the dimensions of each building cell
    let main_cell_width = (stage.width() - num_spaces * cell_spacing) / grid_len;
    let main_cell_height = (stage.height() - num_spaces * cell_spacing) / grid_len;

    main_cell_dims = {
        width: main_cell_width,
        height: main_cell_height,
        spacing: cell_spacing
    };

    editor_cell_dims = {
        width: editor_stage.width(),
        height: editor_stage.height(),
        spacing: 0
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
        width: cell_dims.width / 10,
        height: cell_dims.height / 10,
        stroke: for_main_stage ? 1 : 2
    };
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


// handle the selected building delete button click
function handle_delete_building_button(building_grid_coords) {

    console.log("building deleted: ", building_grid_coords);

    let cell_info = grid_object_at_coords(building_grid_coords);

    // delete the building group from the main stage
    let group = cell_info["shapes"]["group"];
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
    draw_buildings(current_graph, current_config);

    // reselect the filled cell
    select_building(building_grid_coords);
}


// handle the selected building open checkbox being changed
function building_open_checkbox_checked(building_grid_coords) {

    // get the information for the given building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building = cell_info["building_data"];
    let building_mods = cell_info["building_mods"];

    // get the previous open status
    let prev_open = building_mods["open"];
    let new_open = !prev_open;

    // if closing an open door, remove the door from the building data
    if (prev_open) {
        let building_index = current_graph.indexOf(building);
        current_graph.splice(building_index, 1);
    
    // add the biulding back to the graph array
    } else {
        current_graph.push(building);
    }
    
    // assign the new open status to the door
    building_mods["open"] = new_open;
    
    // redraw the building to reflect the changes in accessibility
    redraw_selected_building(building_grid_coords);
}

// handle the selected building congestion radio being checked
function building_con_radio_checked(building_grid_coords, con_level) {
    console.log("new con level: ", con_level);

    // get the information for the given building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building = cell_info["building_data"];
    let building_mods = cell_info["building_mods"];

    // generate new congestion based on the given value
    let new_con = generate_congestion(current_config, con_level);

    // update building data
    building["congestion"] = new_con;
    building_mods["con_level"] = con_level;
}

// handle dragging an entrance in the drag editor
function selected_door_moved(building_grid_coords, door_id, editor_door_shape) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door = door_object_at_coords(building_grid_coords, door_id);
    let door_mods = cell_info["building_mods"]["entrance_mods"]
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
    let doors = cell_info["building_data"]["entrances"];
    let door_mod = cell_info["building_mods"]["entrance_mods"][door_id];

    // get the previous open status
    let prev_open = door_mod["open"];
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
    door_mod["open"] = new_open;
    
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


// returns a new list item for a given door at a given building
function create_door_list_item(building_grid_coords, door_id) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let door = door_object_at_coords(building_grid_coords, door_id);
    let door_mod = cell_info["building_mods"]["entrance_mods"][door_id];

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
    open_chkbox.checked = door_mod["open"];
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
    let building_mods = cell_info["building_mods"];

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
    con_radio.checked = building_mods["con_level"] === con_level;
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


// select a building at the given coordinates and open it in the editor
function select_building(building_grid_coords) {

    console.log("selecting building: ", building_grid_coords);

    if (grid === null || is_panning) {
        return;
    }

    // get the info object for the building at the given coords
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info["building_mods"];

    console.log("cell info:", cell_info);

    // reset the building editor elements
    reset_building_editor();
    
    // get container elements to build elements into
    let info_div = document.getElementById("selected-building-info");
    let doors_list_container = document.getElementById("selected-building-doors-container");
    let building_options_container = document.getElementById("selected-building-options-container");

    let info = `Grid Cell: (${building_grid_coords.x + 1}, ${building_grid_coords.y + 1})`;
    
    if (cell_info["building_data"] !== null) {

        let building_id = cell_info["building_data"]["id"];
        let doors = cell_info["building_data"]["entrances"];

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
        for (let door_id in cell_info["building_mods"]["entrance_mods"]) {
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
        buildling_open_chkbox.checked = building_mods["open"];
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
    if (cell_info["building_data"] !== null) {
        redraw_selected_building(building_grid_coords);
    }

    // highlight the selected building in the main stage
    let background_cell = cell_info["shapes"]["background"];
    background_cell.stroke("green");

    // clear last selected cell highlight
    if (last_selected_cell_info !== null && last_selected_cell_info !== cell_info) {
        last_selected_cell_info["shapes"]["background"].stroke("");
    }

    last_selected_cell_info = cell_info;
}


/* -------------------------------------------------------------------------- */
/*                               canvas drawing                               */
/* -------------------------------------------------------------------------- */


/* ------------------------------ path drawing ------------------------------ */


function test_draw_paths() {



    let path_layer = new Konva.Layer();
    stage.add(path_layer);


    let test_point = {
        x: 0,
        y: 0
    };

    let test_point2 = {
        x: 1,
        y: 0
    };

    console.log("NEW POINT: ", calc_line_extend_point(test_point, test_point2, 1));


    let target_grid_coords = {
        x: 5,
        y: 5
    };

    let target_stage_coords = grid_coords_to_main_stage_coords(target_grid_coords);

    
    for (let y = 0; y < grid.length; y++) {
        let grid_row = grid[y];

        for (let x = 0; x < grid_row.length; x++) {

            let cell_info = grid_row[x];
            let building = cell_info["building_data"];
            
            if (building === null) {
                continue;
            }

            let doors = building["entrances"];

            let building_grid_coords = {
                x: x,
                y: y
            };

            // find all corner points of the grid cell 
            let grid_corners = [{x:x, y:y}, {x:x+1, y:y}, {x:x+1, y:y+1}, {x:x, y:y+1}];
            let stage_corners = grid_corners.map((p) => grid_coords_to_main_stage_coords(p));

            for (let d = 0; d < doors.length; d++) {
                
                let door = doors[d];

                // get door x and y coordinates (convert 1-indexed to 0-indexed)
                let door_grid_coords = {
                    x: door["x"] - 1,
                    y: door["y"] - 1
                };

                // convert grid coordinates to stage coordinates
                let door_stage_coords = door_grid_coords_to_stage_coords(door_grid_coords, building_grid_coords, true);

                let closest_cell_corner = calc_closest_point_to_points(stage_corners, door_stage_coords);
                let closest_corner_to_cell_corner = calc_corner_between_points2(door_stage_coords, closest_cell_corner, true);
                let corner_to_target = calc_corner_between_points(closest_cell_corner, target_stage_coords, false, false);
                
                console.log("closest cell corner: ", closest_cell_corner);
                console.log("closest corner to cell corner: ", closest_corner_to_cell_corner);
                console.log("corner to target: ", corner_to_target)

                let path = points_to_path_array([door_stage_coords, closest_corner_to_cell_corner, closest_cell_corner, corner_to_target, target_stage_coords]);
                // let path = points_to_path_array([closest_cell_corner, corner_to_target, target_stage_coords]);
                
                let path_shape = new Konva.Line({
                    points: path,
                    stroke: Konva.Util.getRandomColor(),
                    strokeWidth: 4,
                });
                path_layer.add(path_shape);

                // early return for testing
                // if (building !== null) {
                //     return;
                // }
            }

            // early return for testing
            if (building !== null) {
                return;
            }
        }
    }
}


/* ---------------------------- building drawing ---------------------------- */


// draw buildings on the main stage
function draw_buildings(buildings, config) {

    // store current graph and config data
    current_graph = buildings;
    current_config = config;
    
    // get size of grid based on current configuration 
    let grid_len = calc_grid_bounds(config);

    // define new empty grid array to store building information
    grid = create_empty_grid(grid_len);

    // recalculate any cell dimensions
    calculate_cell_dims(config);

    // clear any previous layers
    stage.destroyChildren();

    // create and add new layers
    let background_layer = new Konva.Layer({

    });
    let building_layer = new Konva.Layer({
        listening: false
    });

    stage.add(background_layer);
    stage.add(building_layer);

    // create background layer grid cells
    for (let x = 0; x < grid_len; x++) {
        for (let y = 0; y < grid_len; y++) {

            let grid_coords = {x: x, y: y};
            draw_background(grid_coords, background_layer);
        }
    }

    // iterate over every building
    for (let b = 0; b < buildings.length; b++) {

        let building = buildings[b];

        // get building x and y coordinates (convert 1-indexed to 0-indexed)
        let building_grid_coords = {
            x: building["x"] - 1,
            y: building["y"] - 1
        };

        // initialize the info object for the given building
        init_grid_cell_info(building);

        // draw the building
        draw_building(building_grid_coords, building_layer, true) 
    }
}


// redraw the selected building on the main stage and the editor stage
function redraw_selected_building(building_grid_coords) {

    let cell_info = grid_object_at_coords(building_grid_coords);
    let building = cell_info["building_data"];

    // clear the editor stage
    editor_stage.destroyChildren();

    // create a new layer to draw the building on
    let editor_layer = new Konva.Layer();
    editor_stage.add(editor_layer);

    if (building !== null) {
        // draw the building on the editor stage
        draw_building(building_grid_coords, editor_layer, false);
    
        // get previous building group and the layer it was drawn on
        let prev_building_group = cell_info["shapes"]["group"];
        let main_building_layer = prev_building_group.getLayer();
        
        // draw the building on the main stage
        draw_building(building_grid_coords, main_building_layer, true);
    }
}


// draw a given building: its shape and doors
function draw_building(building_grid_coords, parent, for_main_stage) {
    
    // define the stroke width for the building
    let outline_stroke_width = for_main_stage ? 2 : 4;

    // get information about the given building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info["building_mods"];

    // create a group to contain the building and its entrances
    let building_group = new Konva.Group();
    parent.add(building_group);
    
    if (for_main_stage) {

        // remove previous shapes if they exist
        let prev_group = cell_info["shapes"]["group"];
        if (prev_group !== null) {
            prev_group.destroy();
        }
    }

    // construct and draw the building shape
    let building_shape = draw_building_shape(building_grid_coords, building_group, for_main_stage);
    let points = building_shape.points();

    // add a clipping function to the building group to hide doors from appearing outside of building
    building_group.clipFunc(function(ctx) {
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);

        for (let i = 2; i < points.length - 1; i += 2) {
          ctx.lineTo(points[i], points[i+1]);
        }

        ctx.closePath();
    });

    // draw building entrances
    draw_entrances(building_grid_coords, building_group, for_main_stage);

    // draw building outline (ensures doors have an outer border along the building shape)
    let outline_color = building_mods["open"] ? "black" : "red";
    let building_outline = building_shape.clone({
        fill: "",
        listening: false,
        stroke: outline_color,
        strokeWidth: outline_stroke_width
    });
    building_group.add(building_outline);

    // store main stage shapes
    if (for_main_stage) {
        cell_info["shapes"]["building_outline"] = building_outline;
        cell_info["shapes"]["group"] = building_group;
    }
}


// draw the building shape for the building at the given coordinates
function draw_building_shape(building_grid_coords, parent, for_main_stage) {

    // get the grid cell info object associated with the building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let doors = cell_info["building_mods"]["orig_entrances"];

    // destroy previous building shape if there is one
    if (for_main_stage) {
        let prev_building_shape = cell_info["shapes"]["building"];
        if (prev_building_shape !== null) {
            prev_building_shape.destroy();
        }
    }
    
    // store coordinates to draw building shape
    let stage_shape_path = [];
    let grid_shape_path = [];


    

    let prev_start_coord = {
        x: doors[0]["x"] - 1,
        y: doors[0]["y"] - 1
    };

    for (let d = 1; d <= doors.length; d++) {

        let next_door = doors[d % doors.length];
        let next_door_grid_coords_unscaled = {
            x: doors[0]["x"] - 1,
            y: doors[0]["y"] - 1
        };
        let corner_unscaled = calc_corner_between_points(prev_start_coord, next_door, true, false);


    }

    // iterate over every sequential pairs of doors
    for (let d = 0; d < doors.length; d++) {

        let door1 = doors[d];
        let door2 = doors[(d + 1) % doors.length];
        
        // get door x and y coordinates (convert 1-indexed to 0-indexed)
        let door1_grid_coords_unscaled = {
            x: door1["x"] - 1,
            y: door1["y"] - 1
        };

        let door2_grid_coords_unscaled = {
            x: door2["x"] - 1,
            y: door2["y"] - 1
        };

        // find a corner between the two door coordinates
        let corner_unscaled = calc_corner_between_points(door1_grid_coords_unscaled, door2_grid_coords_unscaled, true, false);

        // convert door grid coordinates to stage coordinates
        let door1_stage_coords = door_grid_coords_to_stage_coords(door1_grid_coords_unscaled, building_grid_coords, for_main_stage);;
        // let door2_stage_coords = door_grid_coords_to_stage_coords(door2_grid_coords_unscaled, building_grid_coords, for_main_stage);
        let corner_stage_coords = door_grid_coords_to_stage_coords(corner_unscaled, building_grid_coords, for_main_stage);
        
        // store the path coordinates
        grid_shape_path.push(door1_grid_coords_unscaled, corner_unscaled);
        stage_shape_path.push(door1_stage_coords.x, door1_stage_coords.y, corner_stage_coords.x, corner_stage_coords.y);
    }

    // construct a building shape given the door coordinates and calculated corners
    let building_shape = new Konva.Line({
        points: stage_shape_path,
        fill: 'lightblue',
        // stroke: 'black',
        // strokeWidth: building_stroke_width,
        closed: true,
    });
    parent.add(building_shape);

    // add necessary info about the building cell to the grid array
    cell_info["building_mods"]["outline_grid_coords"] = grid_shape_path;
    if (for_main_stage) {
        cell_info["shapes"]["building"] = building_shape;
    }

    return building_shape;
}


// draw the doors for the building at the given coordinates
function draw_entrances(building_grid_coords, parent, for_main_stage) {

    // get cell and door dimensions
    let cell_dims = get_cell_dims(for_main_stage);
    let door_dims = get_door_dims(for_main_stage);

    // get the grid cell info object associated with the building
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_mods = cell_info["building_mods"];
    let door_mods = building_mods["entrance_mods"];
    let doors = cell_info["building_data"]["entrances"];

    // remove previous door shapes if they exist
    if (for_main_stage) {

        for (let door_id in cell_info["shapes"]["entrances"]) {
            let prev_door_shape = cell_info["shapes"]["entrances"][door_id];
            if (prev_door_shape !== null) {
                prev_door_shape.destroy();
            }
        }
        cell_info["shapes"]["entrances"] = {};
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

    // iterate over every door in the draw order
    for (let d = 0; d < door_draw_order.length; d++) {
        
        let door = door_draw_order[d][1];
        let door_id = door["id"];
        let door_mod = door_mods[door_id];        
        
        // get door x and y coordinates (convert 1-indexed to 0-indexed)
        let door_grid_coords_unscaled = {
            x: door["x"] - 1,
            y: door["y"] - 1
        };

        // convert grid coordinates to stage coordinates
        let door_stage_coords = door_grid_coords_to_stage_coords(door_grid_coords_unscaled, building_grid_coords, for_main_stage);
        
        let door_color = door["accessible"] == 1 ? "blue" : "gray";
        let door_stroke_color = door_mod["open"] ? "black" : "red";

        let door_shape = new Konva.Rect({
            width: door_dims.width,
            height: door_dims.height,
            fill: door_color,
            stroke: door_stroke_color,
            strokeWidth: door_dims.stroke,
            x: door_stage_coords.x - door_dims.width/2, // adjust for rect positioning being top left corner
            y: door_stage_coords.y - door_dims.height/2
        });
        
        if (for_main_stage) {
            
            // add necessary info about the building's doors to the grid array
            cell_info["shapes"]["entrances"][door_id] = door_shape;

        } else {
            
            // enable dragging to reposition doors in editor view
            door_shape.draggable(true);

            // make the current dragged door always appear on top of other doors on drag start
            door_shape.on("dragstart", function (e) {
                door_shape.zIndex(door_draw_order.length); 
            });

            // get the stage coordinates of the building shape outline
            let outline_grid_points = cell_info["building_mods"]["outline_grid_coords"];
            let outline_stage_points = outline_grid_points.map((p) => door_grid_coords_to_stage_coords(p, building_grid_coords, for_main_stage));

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
                let best_point = calc_closest_point_to_shape(outline_stage_points, current_pos);

                // adjust the point to door top left coordinate rather than center
                let best_point_adjusted = {
                    x: best_point.x - door_dims.width/2,
                    y: best_point.y - door_dims.height/2
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

        parent.add(door_shape);
    }
}


// draw a background / overlay cell for given grid coordinates
function draw_background(grid_coords, parent) {

    // get the building info object at the given grid coordinates
    let cell_info = grid_object_at_coords(grid_coords);
    let cell_dims = get_cell_dims(true);

    // destroy previous background shape if there is one
    let prev_background = cell_info["shapes"]["background"];
    if (prev_background !== null) {
        prev_background.destroy();
    }

    // find the coordinates to draw the cell at
    let cell_coords = grid_coords_to_main_stage_coords(grid_coords);

    // create the cell
    let background = new Konva.Rect({
        width: cell_dims.width,
        height: cell_dims.height,
        // fill: 'white',
        // stroke: 'black',
        strokeWidth: 4,
        cornerRadius: 5,
        x: cell_coords.x,
        y: cell_coords.y
    });

    // define a function for when the cell is clicked
    background.on("mouseup", function (e) {
        select_building(grid_coords);
    });
    
    // store the background cell for easy access later
    cell_info["shapes"]["background"] = background;

    // add the cell to the layer
    parent.add(background);
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
    
    // extract the door's offset from the building to properly scale to cell size
    let door_grid_coord_offset = {
        x: door_grid_coords.x - building_grid_coords.x,
        y: -1 * (door_grid_coords.y - building_grid_coords.y) // * -1 to invert y coordinate system
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

    // unscale and untranslate the stage coords to get the offset of the door to the building
    let door_grid_coord_offset = {
        x: (door_stage_coords.x - building_cell_coords.x - (cell_dims.width / 2)) / cell_dims.width,
        y: (door_stage_coords.y - building_cell_coords.y - (cell_dims.height / 2)) / cell_dims.height,
    };

    // get the door grid coords by adding the offset to the building coords
    return {
        x: building_grid_coords.x + door_grid_coord_offset.x,
        y: building_grid_coords.y + (-1 * door_grid_coord_offset.y)
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

    let dist = calc_dist(l1, l2);

    return {
        x: l2.x + (l2.x - l1.x) / dist * len,
        y: l2.y + (l2.y - l1.y) / dist * len
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


// helper method to calculate the point closest to a shape defined by a list of lines
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


// helper method to construct a path array from a list of points 
function points_to_path_array(points) {

    let path = [];

    points.forEach(function (p) {
        path.push(p.x, p.y);
    });

    return path;
}


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
/*                                form controls                               */
/* -------------------------------------------------------------------------- */


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