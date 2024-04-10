
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
let cell_spacing_ratio = 0;
let editor_inset_ratio = 0.05;
let should_invert_door_y = false;
let road_size_ratio = 0.1;
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

    // set the widths for each legend name
    update_path_legend_title_widths();
    
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
