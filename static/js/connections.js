
/* -------------------------------------------------------------------------- */
/*                                 connections                                */
/* -------------------------------------------------------------------------- */


/* --------------------------- controller connections ----------------------- */


// contact the graph generator with the given config
function generate_graph(config) {

    // TODO: connect with backend

    console.log("generating graph with config: ", config);

    // // send request to generate a new graph
    // fetch("BACKEND_GRAPH_GEN_URL_HERE", {
    //     method: 'POST',
    //     headers: {
    //       'Accept': 'application/json, text/plain, */*',
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(config)})
    // // get json response data
    // .then((res) => res.json())
    // // process the graph and draw it
    // .then((json) => {
    //     console.log("preset graph data: ", json);
    //     process_generated_graph(json, config);
    // })
    // .catch((e) => console.error(e));
}

// contact the path recommender with the given options
function recommend_paths(path_configs) {
    
    // TODO: connect with backend

    // get a filtered version of the graph
    let filtered_graph = filter_current_graph(false, false);

    console.log("recommending paths with options: ", path_configs);
    console.log("filtered graph: ", filtered_graph);

    // // send the current graph to the backend graph update endpoint
    // fetch("BACKEND_UPDATE_GRAPH_URL_HERE", {
    //     method: 'POST',
    //     headers: {
    //       'Accept': 'application/json, text/plain, */*',
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(filtered_graph)})
    // // check response for graph update
    // .then((res) => {

    //     // check if request failed
    //     if (res.status !== 200) {
    //         throw new Error("ERROR: graph update request not successful");
    //     }

    //     // make requests for each algorithm
    //     return Promise.all(path_configs.map((path_config) => 
    //         fetch("BACKEND_PATH_RECOMMENDATION_URL_HERE", {
    //             method: 'POST',
    //             headers: {
    //               'Accept': 'application/json, text/plain, */*',
    //               'Content-Type': 'application/json'
    //             },
    //             body: JSON.stringify(path_config)})
    //     ));
    // // get json objects from responses
    // }).then(responses =>
    //     Promise.all(responses.map(response => response.json()))
    
    // // process and draw the paths
    // ).then((jsons) => {
    //     // associate each returned stats and path with the algorithm name
    //     let alg_results = path_configs.map(function (path_config, i) {
    //         return [path_config.algorithm, jsons[i]];
    //     });
    //     console.log("paths data: ", alg_results);
    //     process_paths(alg_results);
    // }).catch(err => console.log(err));


    Promise.all([
        fetch("/static/assets/paths/graph_example_paths_path1.json"),
        fetch("/static/assets/paths/graph_example_paths_path2.json"),
        fetch("/static/assets/paths/graph_example_paths_path3.json"),
    ]).then(responses =>
        Promise.all(responses.map(response => response.json()))
    ).then((json) => {
        console.log("paths data: ", json);
        process_paths(json);
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
        })
        .catch((e) => console.error(e));
}
