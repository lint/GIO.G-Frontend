
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
