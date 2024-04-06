
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
