
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

    if (for_main_stage) {
        return door_grid_coords_to_main_stage_coords(door_grid_coords, building_grid_coords);
    } else {
        let cell_info = grid_object_at_coords(building_grid_coords);
        let building_mods = cell_info.building_mods;
        let normalized_door_grid_coords = {
            x: door_grid_coords.x - building_mods.normal_offset.x,
            y: door_grid_coords.y - building_mods.normal_offset.y
        };
        return door_grid_coords_to_editor_stage_coords(normalized_door_grid_coords, building_mods.normalized_bounding_rect);
    }
}


// convert door grid coordinates to main stage coordinates
function door_grid_coords_to_main_stage_coords(door_grid_coords, building_grid_coords) {
    let building_stage_coords = grid_coords_to_main_stage_coords(building_grid_coords);
    let cell_dims = get_cell_dims(true);

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


// convert door grid coordinates to editor stage coordinates
function door_grid_coords_to_editor_stage_coords(normalized_door_grid_coords, building_bounding_grid_rect) {

    let cell_dims = get_cell_dims(false);

    let bounds_width = calc_dist(building_bounding_grid_rect[0], building_bounding_grid_rect[1]);
    let bounds_height = calc_dist(building_bounding_grid_rect[1], building_bounding_grid_rect[2]);

    let editor_inset = cell_dims.size * editor_inset_ratio;
    let scale = Math.min(cell_dims.size / bounds_width, cell_dims.size / bounds_height);

    let x_offset = editor_inset + ((cell_dims.size - bounds_width*scale) / 2) - (building_bounding_grid_rect[0].x * scale);
    let y_offset = editor_inset + ((cell_dims.size - bounds_height*scale) / 2) - (building_bounding_grid_rect[0].y * scale); 

    return {
        x: normalized_door_grid_coords.x * scale + x_offset,
        y: normalized_door_grid_coords.y * scale + y_offset
    };
}


// normalize a list of door coordinates as if they started in 0, 0
function normalize_door_grid_coords_list(door_grid_coords_list) {

    let best_left_door = {x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER};
    let best_up_door = {x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER};

    for (let i = 0; i < door_grid_coords_list.length; i++) {
        let curr_door = door_grid_coords_list[i];

        if (curr_door.x < best_left_door.x) {
            best_left_door = curr_door;
        }

        if (curr_door.y < best_up_door.y) {
            best_up_door = curr_door;
        }
    }

    let left_building_coords = estimate_building_grid_coords(best_left_door);
    let up_building_coords = estimate_building_grid_coords(best_up_door);

    let normalized_doors = door_grid_coords_list.map(function (door) {
        return {
            x: door.x - left_building_coords.x,
            y: door.y - up_building_coords.y
        };
    });

    return {
        door_coords: normalized_doors,
        normal_offset: {
            x: left_building_coords.x,
            y: up_building_coords.y
        }
    };
}


// get the building coords for given door coords by rounding
function estimate_building_grid_coords(door_grid_coords) {
    return {
        x: Math.round(door_grid_coords.x),
        y: Math.round(door_grid_coords.y)
    };
}


// convert door grid coords to main stage coords by rounding to get the building coords
function door_grid_coords_to_main_stage_coords_rounding(door_grid_coords) {

    let building_grid_coords = estimate_building_grid_coords(door_grid_coords);
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
    building_grid_coords = {
        x: Math.round(building_grid_coords.x),
        y: Math.round(building_grid_coords.y)
    };

    return {
        door: door_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords, true),
        building: building_grid_coords
    };
}


// convert door main stage coords to grid coords
function door_main_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords) {
    let building_stage_coords = grid_coords_to_main_stage_coords(building_grid_coords);
    let cell_dims = get_cell_dims(true);

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


// convert door editor stage coords to grid coords
function door_editor_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords) {
    
    let cell_dims = get_cell_dims(false);
    let cell_info = grid_object_at_coords(building_grid_coords);
    let building_bounding_grid_rect = cell_info.building_mods.normalized_bounding_rect;
    let normal_offset = cell_info.building_mods.normal_offset;

    let bounds_width = calc_dist(building_bounding_grid_rect[0], building_bounding_grid_rect[1]);
    let bounds_height = calc_dist(building_bounding_grid_rect[1], building_bounding_grid_rect[2]);
    let editor_inset = cell_dims.size * editor_inset_ratio;

    let scale = Math.min(cell_dims.size / bounds_width, cell_dims.size / bounds_height);

    let x_offset = editor_inset + ((cell_dims.size - bounds_width*scale) / 2) - (building_bounding_grid_rect[0].x * scale);
    let y_offset = editor_inset + ((cell_dims.size - bounds_height*scale) / 2) - (building_bounding_grid_rect[0].y * scale);
    
    return {
        x: (door_stage_coords.x - x_offset) / scale + normal_offset.x,
        y: (door_stage_coords.y - y_offset) / scale + normal_offset.y
    };
}


// convert door grid coordinates to stage coordinates based on the provided dimensions
function door_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords, for_main_stage) {

    if (for_main_stage) {
        return door_main_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords);
    } else {
        return door_editor_stage_coords_to_grid_coords(door_stage_coords, building_grid_coords);
    }
}


// helper method to get the grid coordinates for a given building id
function grid_coords_for_building_id(building_id) {
    return {
        x: Math.floor(building_id / grid.length),
        y: building_id % grid.length
    };
}


// helper method to get the building id for a given set of coordinates
function grid_coords_to_building_id(grid_coords) {
    return grid_coords.x * grid.length + grid_coords.y;
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
/*                       building coordinate processing                       */
/* -------------------------------------------------------------------------- */


// modifies door positions for a given building such that no door is deeper than it's two adjacent doors
// a "deep" door is one where it's x or y coordinate is lower than both adjacent doors' x or y coordinates respectively
function update_deep_doors(building) {

    // let building = cell_info.building_data;
    let doors = building.entrances;

    // does not apply to buildings with three or less doors
    if (doors.length <= 3) {
        return
    }

    // iterate over every door
    for (let d = 0; d < doors.length; d++) {

        // find the door and its two neighbors
        let neighbor1 = doors[d];
        let target = doors[(d + 1) % doors.length];
        let neighbor2 = doors[(d + 2) % doors.length];

        let deep_status = check_deep_door(neighbor1, target, neighbor2, building);

        // found deep door in on left side of building
        if (deep_status === "left") {
            target.x = neighbor1.x > neighbor2.x ? neighbor1.x : neighbor2.x;
        } 
        
        // found deep door on right side of building
        if (deep_status === "right") {
            target.x = neighbor1.x < neighbor2.x ? neighbor1.x : neighbor2.x;
        } 
        
        // found deep door on top of building
        if (deep_status === "up") {
            target.y = neighbor1.y < neighbor2.y ? neighbor1.y : neighbor2.y;
        } 
        
        // found deep door on bottom of building
        if (deep_status === "down") {
            target.y = neighbor1.y > neighbor2.y ? neighbor1.y : neighbor2.y;
        }
    }
}


// check if target door is deep between three points
function check_deep_door(neighbor1, target, neighbor2, reference) {
    
    // found deep door in on left side of building
    if (target.x < reference.x && target.x > neighbor1.x && target.x > neighbor2.x) {
        return "left";
    } 
    
    // found deep door on right side of building
    if (target.x > reference.x && target.x < neighbor1.x && target.x < neighbor2.x) {
        return "right";
    } 
    
    // found deep door on top of building
    if (target.y > reference.y && target.y < neighbor1.y && target.y < neighbor2.y) {
        return "up";
    } 
    
    // found deep door on bottom of building
    if (target.y < reference.y && target.y > neighbor1.y && target.y > neighbor2.y) {
        return "down";
    }

    return null;
}


// creates the building outline grid path for the building at the given coordinates
function create_building_outline_path(cell_info) {

    // get list of doors based on door mods (in case of closed doors being removed from main list)
    let doors = [];
    for (let door_id in cell_info.building_mods.entrance_mods) {
        doors.push(cell_info.building_mods.entrance_mods[door_id].data_ref);
    }
    doors.sort((a, b) => a.id - b.id);
    // doors = sort_points_for_convex_polygon(doors).reverse();

    // store coordinates to draw building shape
    let grid_shape_path = [];

    let updating_2nd_deep_half = false;

    // iterate over every sequential pairs of doors
    for (let d = 0; d < doors.length; d++) {

        let door1 = doors[d];
        let door2 = doors[(d + 1) % doors.length];

        // get the deep status of the next
        let door2_deep_status = doors.length > 3 ? check_deep_door(door1, door2, doors[(d + 2) % doors.length], cell_info.building_data) : null;
        
        // get door x and y coordinates (convert 1-indexed to 0-indexed)
        let door1_grid_coords = grid_coords_for_building_or_door(door1);
        let door2_grid_coords = grid_coords_for_building_or_door(door2);

        // find the corner or corner cutout for the next door
        if (door2_deep_status !== null || updating_2nd_deep_half) {
            let corner_path = calc_cutout_corner_between_points(door1_grid_coords, door2_grid_coords, true, 0.5);
            grid_shape_path.push(door1_grid_coords, ...corner_path);

            if (door2_deep_status !== null) {
                updating_2nd_deep_half = true;
            } else if (updating_2nd_deep_half) {
                updating_2nd_deep_half = false;
            }

        } else {
            let corner = calc_corner_between_points(door1_grid_coords, door2_grid_coords, true, false);
            grid_shape_path.push(door1_grid_coords, corner);
        }
    }

    // simplify the grid path by removing duplicate points and points on the same line
    simplified_grid_path = simplify_path(grid_shape_path, true, 0.0001);

    // save the path to the cell_info
    cell_info.building_mods.outline_grid_path = simplified_grid_path;
    cell_info.building_mods.outline_grid_walls = lines_from_path(simplified_grid_path, true);
}


// calculates the building's effective wall grid lines (prevents doors from being positioned in corners)
function find_building_effective_walls(cell_info) {

    let grid_walls = cell_info.building_mods.outline_grid_walls;

    // calculate the usable wall lines for door placement
    let effective_grid_walls = [];

    for (let i = 0; i < grid_walls.length; i++) {

        let wall = grid_walls[i];
        let p1 = wall[0];
        let p2 = wall[1];

        let line_len = calc_dist(p1, p2);

        // do not use walls that are less than the length of a door
        if (line_len < door_len_ratio) {
            continue;
        }

        // translate points of the wall 1/2 the door length and stroke sizes ratios inwards to prevent doors in corners
        let new_p1 = calc_point_translation(p1, p1, p2, (door_len_ratio + building_stroke_size_ratio + door_stroke_size_ratio) / 2); 
        let new_p2 = calc_point_translation(p2, p2, p1, (door_len_ratio + building_stroke_size_ratio + door_stroke_size_ratio) / 2);

        let line = [new_p1, new_p2];
        effective_grid_walls.push(line);
    }

    cell_info.building_mods.effective_grid_walls = effective_grid_walls;
}


// find the bounding rectangle for a building
function find_building_bounding_rectangle(cell_info) {

    let grid_shape_path = cell_info.building_mods.outline_grid_path;
    // let entrance_points = grid_shape_path.map((door) => grid_coords_for_building_or_door(door));
    let normalized_data = normalize_door_grid_coords_list(grid_shape_path);
    let bounding_rect = calc_bounding_rect(normalized_data.door_coords);

    cell_info.building_mods.normalized_bounding_rect = bounding_rect;
    cell_info.building_mods.normalized_grid_outline = normalized_data.door_coords;
    cell_info.building_mods.normal_offset = normalized_data.normal_offset;
}


// updates all door coordinates for a building to the effective walls
function update_doors_to_effective_walls(cell_info) {
    
    let doors = cell_info.building_data.entrances;
    let door_mods = cell_info.building_mods.entrance_mods;
    let effective_walls = cell_info.building_mods.effective_grid_walls;

    // don't update door positions if there are no walls
    if (effective_walls.length === 0) {
        return;
    }

    // iterate over every door
    for (let door_id in door_mods) {

        let door_mod = door_mods[door_id];
        let door = door_mod.data_ref;

        // get the grid coordinate for the door (converts 1-indexed to 0-indexed)
        let door_grid_coords = grid_coords_for_building_or_door(door);

        // get the closest wall location to the current location
        let best_point_and_line = calc_closest_line_and_point_from_point_to_lines(effective_walls, door_grid_coords);
        let line_direction = calc_line_orthogonal_direction(best_point_and_line.line[0], best_point_and_line.line[1]);
        door_mod.wall_direction = line_direction;
        door_mod.attached_wall = best_point_and_line.line;

        // set door's new coordinates (and convert index back to 1-indexed)
        door.x = best_point_and_line.point.x + 1;
        door.y = best_point_and_line.point.y + 1;
    }
}


// find the center coordinate of the building shape
function find_building_center(cell_info) {

    let outline_grid_path = cell_info.building_mods.outline_grid_path;

    // convert the outline grid path to the input needed by polylabel and then find its center point
    let polylabel_polygon = outline_grid_path.map((p) => [p.x, p.y]);
    let center = polylabel([polylabel_polygon]);
    
    cell_info.building_mods.outline_grid_center = {x: center[0], y: center[1]};
}


// find the center point of all connected buildings
function find_building_centers_and_adjacent_walls(cell_info) {

    let door_mods = cell_info.building_mods.entrance_mods;
    let connection_mods = cell_info.building_mods.connection_mods;
    let outline_grid_path = cell_info.building_mods.outline_grid_path;

    // get doors associated with each building
    for (let i = 0; i < outline_grid_path.length; i++) {
        let coords = outline_grid_path[i];

        let estimated_building_grid_coords = estimate_building_grid_coords(coords);
        let estimated_building_id = grid_coords_to_building_id(estimated_building_grid_coords);

        if (estimated_building_id in connection_mods) {
            connection_mods[estimated_building_id].outline_path.push(coords);
        }
    }

    // get the center for each connected building
    for (let building_id in connection_mods) {
        let connection_mod = connection_mods[building_id];

        // average points to get the center
        connection_mod.center = calc_avg_point(connection_mod.outline_path);

        // let center = polylabel([connection_mod.outline_path.map(coord => [coord.x, coord.y])]);        
        // connection_mod.center = {x: center[0], y: center[1]};
    }

    // get grid coords for all connected buildings
    let connected_grid_coords = [cell_info.building_data, ...cell_info.building_mods.connected_building_coords].map(coords => grid_coords_for_building_or_door(coords));
    
    // this is so inefficient...

    // iterate over every connected grid coord
    for (let i = 0; i < connected_grid_coords.length && connected_grid_coords.length > 1; i++) {
        
        let coords = connected_grid_coords[i];
        let building_id = grid_coords_to_building_id(coords);
        let connection_mod = connection_mods[building_id];

        // get door grid coordinates representing the bounds of the grid cell
        let left_bounds     = [{x:coords.x-0.5, y:coords.y-0.5}, {x:coords.x-0.5, y:coords.y+0.5}];
        let down_bounds     = [{x:coords.x-0.5, y:coords.y+0.5}, {x:coords.x+0.5, y:coords.y+0.5}];
        let right_bounds    = [{x:coords.x+0.5, y:coords.y+0.5}, {x:coords.x+0.5, y:coords.y-0.5}];
        let up_bounds       = [{x:coords.x+0.5, y:coords.y-0.5}, {x:coords.x-0.5, y:coords.y-0.5}];

        let left_id = grid_coords_to_building_id({x:coords.x-1, y:coords.y});
        let right_id = grid_coords_to_building_id({x:coords.x+1, y:coords.y});
        let up_id = grid_coords_to_building_id({x:coords.x, y:coords.y-1});
        let down_id = grid_coords_to_building_id({x:coords.x, y:coords.y+1});

        let left_intersections = [];
        let down_intersections = [];
        let right_intersections = [];
        let up_intersections = [];

        // iterate over every wall in the outline path
        let outline_grid_path = cell_info.building_mods.outline_grid_path;
        for (let j = 0; j < outline_grid_path.length; j++) {

            let wall = [outline_grid_path[j], outline_grid_path[(j+1)%outline_grid_path.length]];

            // find intersections of grid cell bounds and building outline
            let left_intersection = calc_lines_intersection(left_bounds, wall);
            let down_intersection = calc_lines_intersection(down_bounds, wall);
            let right_intersection = calc_lines_intersection(right_bounds, wall);
            let up_intersection = calc_lines_intersection(up_bounds, wall);

            if (left_intersection !== null) {
                left_intersections.push(left_intersection);
            }
            if (down_intersection !== null) {
                down_intersections.push(down_intersection);
            }
            if (right_intersection !== null) {
                right_intersections.push(right_intersection);
            }
            if (up_intersection !== null) {
                up_intersections.push(up_intersection);
            }
        }

        // only add intersections if they were found
        if (left_intersections.length > 0) {
            // connection_mod.adjacent_walls.push(left_intersections);
            connection_mod.adjacent_cells[left_id] = {
                wall: left_intersections,
                path_to_wall: null
            };
        }
        if (down_intersections.length > 0) {
            // connection_mod.adjacent_walls.push(down_intersections);
            connection_mod.adjacent_cells[down_id] = {
                wall: down_intersections,
                path_to_wall: null
            };
        }
        if (right_intersections.length > 0) {
            // connection_mod.adjacent_walls.push(right_intersections);
            connection_mod.adjacent_cells[right_id] = {
                wall: right_intersections,
                path_to_wall: null
            };
        }
        if (up_intersections.length > 0) {
            // connection_mod.adjacent_walls.push(up_intersections);
            connection_mod.adjacent_cells[up_id] = {
                wall: up_intersections,
                path_to_wall: null
            };
        }
    }
}


// calculate building corridors
function calculate_building_corridors(cell_info) {

    let building_mods = cell_info.building_mods;
    let connection_mods = building_mods.connection_mods;
    let door_mods = building_mods.entrance_mods;

    let all_corridor_paths = [];

    // define all lines connecting centers
    let center_lines = [];

    // iterate over every connected building cell for the given building
    for (let building_id in connection_mods) {
        
        let building_grid_coords = grid_coords_for_building_id(building_id);
        let connection_mod = connection_mods[building_id];
        let center = connection_mod.center;

        // define a "line" that is just the center point as to include it for single cell buildings
        if (Object.keys(connection_mod.adjacent_cells).length === 0) {
            center_lines.push([center, center]);
        } else {

            // iterate over every adjacent building
            for (let adjacent_building_id in connection_mod.adjacent_cells) {
                let adjacent_info = connection_mod.adjacent_cells[adjacent_building_id];
                
                // get the target point on the current wall
                let wall = adjacent_info.wall;
                let wall_midpoint = calc_avg_point(wall);
    
                // find the corner between the center and the target wall point
                let corner_to_wall = calc_corner_between_points2(center, wall_midpoint, true);
                let center_corridor_path = [center, corner_to_wall, wall_midpoint];
                
                all_corridor_paths.push(center_corridor_path);
                center_lines.push(...lines_from_path(center_corridor_path, false));
                adjacent_info.path_to_wall = center_corridor_path;
            }
        }

        // make corridors from center point to non adjacent walls
        let non_connected_coords_list = get_non_connected_building_coords(building_id);
        let non_connected_path = [];

        for (let i = 0; i < non_connected_coords_list.length; i++) {
            let non_connected_grid_coords = non_connected_coords_list[i];

            let far_from_center = calc_point_translation(center, building_grid_coords, non_connected_grid_coords, grid.length * 2);
            let closest_wall_intersection = calc_closest_intersection_for_lines(building_mods.outline_grid_walls, [center, far_from_center], center);

            non_connected_path.push(center, closest_wall_intersection, center);
        }
        all_corridor_paths.push(non_connected_path);

    }
    building_mods.corridor_center_lines = center_lines;

    // make corridor to every door
    for (let door_id in door_mods) {
        let door_mod = door_mods[door_id];
        let door_grid_coords = grid_coords_for_building_or_door(door_mod.data_ref);

        let closest_center_corridor_point = calc_closest_point_to_lines(center_lines, door_grid_coords);
        let path_to_center = door_grid_path_to_center(cell_info, door_id);
        // let corner_to_center_line = calc_corner_between_points2(door_grid_coords, closest_center_corridor_point, true);
        // let path_to_center = [door_grid_coords, corner_to_center_line, closest_center_corridor_point];
        all_corridor_paths.push(path_to_center);
    }

    building_mods.corridor_all_grid_paths = all_corridor_paths;
}


// get the door grid path to center coordinate
function door_grid_path_to_center(cell_info, door_id, center_override=null) {

    // TODO: this does lots of repeated calculations if called multiple times in a row... fix it

    let building_mods = cell_info.building_mods;
    let door_mods = cell_info.building_mods.entrance_mods;
    let door_mod = door_mods[door_id];
    let door_grid_coords = grid_coords_for_building_or_door(door_mod.data_ref);

    let shape_grid_center = center_override;

    if (shape_grid_center === null) {

        // let estimated_building_grid_coords = estimate_building_grid_coords(door_grid_coords);
        // let estimated_building_id = grid_cell_id_for_coords(estimated_building_grid_coords);
    
        // // get the calculated center of the building shape
        // // let shape_grid_center = cell_info.building_mods.outline_grid_center;
        // shape_grid_center = cell_info.building_mods.connection_mods[estimated_building_id].center;

        let closest_center_corridor_point = calc_closest_point_to_lines(building_mods.corridor_center_lines, door_grid_coords);
        shape_grid_center = closest_center_corridor_point;
    }

    // calculate grid points in all directions from center
    let center_grid_left   = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:grid.length, y:0}, grid.length);
    let center_grid_right  = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:-grid.length, y:0}, grid.length);
    let center_grid_up     = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:0, y:grid.length}, grid.length);
    let center_grid_down   = calc_point_translation(shape_grid_center, {x:0, y:0}, {x:0, y:-grid.length}, grid.length);

    let center_line_end = null;

    // check quadrant of door and door orientation (quadrant names and checks are probably wrong since i'm not considering inverted y shenanigans)
    // top right quadrant
    if (door_grid_coords.x >= shape_grid_center.x && door_grid_coords.y >= shape_grid_center.y) {
        if (door_mod.wall_direction === "vertical") {
            center_line_end = center_grid_up;
        } else {
            center_line_end = center_grid_left;
        }
    
    // bottom right quadrant
    } else if (door_grid_coords.x >= shape_grid_center.x && door_grid_coords.y <= shape_grid_center.y) {
        if (door_mod.wall_direction === "vertical") {
            center_line_end = center_grid_down;
        } else {
            center_line_end = center_grid_left;
        }

    // top left quadrant
    } else if (door_grid_coords.x <= shape_grid_center.x && door_grid_coords.y >= shape_grid_center.y) {
        if (door_mod.wall_direction === "vertical") {
            center_line_end = center_grid_up;
        } else {
            center_line_end = center_grid_right;
        }

    // bottom left quadrant
    } else if (door_grid_coords.x <= shape_grid_center.x && door_grid_coords.y <= shape_grid_center.y) {
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


// get the path that connects the center points of two doors
function connect_door_grid_center_path(cell_info, door_id1, door_id2) {

    // get cell info
    let building_mods = cell_info.building_mods;
    let connection_mods = building_mods.connection_mods;
    let door_mods = building_mods.entrance_mods;
    
    // get info for each door to connect to
    let door_mod1 = door_mods[door_id1];
    let door_mod2 = door_mods[door_id2];

    let door1_grid_coords = grid_coords_for_building_or_door(door_mod1.data_ref);
    let door2_grid_coords = grid_coords_for_building_or_door(door_mod2.data_ref);

    let building1_grid_coords = estimate_building_grid_coords(door1_grid_coords);
    let building2_grid_coords = estimate_building_grid_coords(door2_grid_coords);

    let building1_id = grid_cell_id_for_coords(building1_grid_coords);
    let building2_id = grid_cell_id_for_coords(building2_grid_coords);

    // get the list of connected building ids as ints
    let connected_building_ids = Object.keys(building_mods.connection_mods).map(id => Number(id));

    // helper recursive function in order to find the path between connected buildings
    function find_building_path(remaining_ids, path, cur_id, end_id) {
        // console.log("find_building_path: ", remaining_ids, path, cur_id, end_id);

        // base case, the current line and end line are equal
        if (cur_id === end_id) {
            // console.log("base case! cur line is end line");
            return path;
        }

        let cur_adjacent_cells_info = building_mods.connection_mods[cur_id].adjacent_cells;

        // iterate over every remaining line
        for (let i = 0; i < remaining_ids.length; i++) {
            let next_id = remaining_ids[i];

            // check if the next line connects with the current line
            if (!(next_id in cur_adjacent_cells_info)) {
                continue;
            }

            // add the next line onto the path
            path.push(next_id);

            // TODO: probably a better way to do this than making a new array every time...
            let new_remaining = [...remaining_ids];
            new_remaining.splice(i, 1);

            // perform the recursion
            let res = find_building_path(new_remaining, path, next_id, end_id);

            if (res !== null) {
                return res;
            }

            // path not found, remove the previously added line from the path
            path.pop();
        }

        // could not find a path
        // console.log("backtrack case, could not find a path");
        return null;
    }

    // remove the start building from the search list
    connected_building_ids.splice(connected_building_ids.indexOf(building1_id), 1);

    // find the connected path through the buildings
    let connected_building_ids_path = find_building_path(connected_building_ids, [building1_id], building1_id, building2_id);

    // store the constructed the center path from the building path
    let connected_centers_path = [];

    let best_adjacency_id1 = null;
    let best_adjacency_point1 = null;
    let best_adjacency_dist = Number.MAX_SAFE_INTEGER;

    // find the closest point from the door1 to the building center lines
    for (let adjacent_building_id in connection_mods[building1_id].adjacent_cells) {

        let center_lines = lines_from_path(connection_mods[building1_id].adjacent_cells[adjacent_building_id].path_to_wall);

        let closest_point = calc_closest_point_to_lines(center_lines, door1_grid_coords);
        let dist = calc_dist(closest_point, door1_grid_coords);

        if (dist < best_adjacency_dist) {
            best_adjacency_dist = dist;
            best_adjacency_id1 = adjacent_building_id;
            best_adjacency_point1 = closest_point;
        }
    }

    let best_adjacency_id2 = null;
    let best_adjacency_point2 = null;
    best_adjacency_dist = Number.MAX_SAFE_INTEGER;

    // find the closest point from the door2 to the building center lines
    for (let adjacent_building_id in connection_mods[building2_id].adjacent_cells) {

        let center_lines = lines_from_path(connection_mods[building2_id].adjacent_cells[adjacent_building_id].path_to_wall);

        let closest_point = calc_closest_point_to_lines(center_lines, door2_grid_coords);
        let dist = calc_dist(closest_point, door2_grid_coords);

        if (dist < best_adjacency_dist) {
            best_adjacency_dist = dist;
            best_adjacency_id2 = adjacent_building_id;
            best_adjacency_point2 = closest_point;
        }
    }

    let center_path1 = connection_mods[building1_id].adjacent_cells[best_adjacency_id1].path_to_wall;
    let center_path2 = connection_mods[building2_id].adjacent_cells[best_adjacency_id2].path_to_wall;

    // there is only one connected building in the path
    if (connected_building_ids_path.length === 1) {

        if (best_adjacency_id1 === best_adjacency_id2) {
            connected_centers_path = [best_adjacency_point1, best_adjacency_point2];
        } else {
            let cutoff_path1 = calc_path_cutoff_at_point(center_path1, best_adjacency_point1).toReversed();
            let cutoff_path2 = calc_path_cutoff_at_point(center_path2, best_adjacency_point2);
            connected_centers_path = [...cutoff_path1, ...cutoff_path2];
        }

    // there are at least two connected buildings in the path
    } else {

        // construct the main connecting path between centers
        for (let i = 0; i < connected_building_ids_path.length - 1; i++) {

            let cur_id = connected_building_ids_path[i];
            let next_id = connected_building_ids_path[i + 1];
    
            // add the path from the current building center to the next adjacent cell wall
            connected_centers_path.push(...connection_mods[cur_id].adjacent_cells[next_id].path_to_wall);
    
            // add the path from the next building center to the current cell wall
            connected_centers_path.push(...connection_mods[next_id].adjacent_cells[cur_id].path_to_wall.toReversed());
        }

        // if connected to the start adjacency path of the first building, remove it and replace with cutoff path
        if (best_adjacency_id1 == connected_building_ids_path[1]) {
            let cutoff_path = calc_path_cutoff_at_point(center_path1.toReversed(), best_adjacency_point1).toReversed();
            connected_centers_path.splice(0, 3, ...cutoff_path);

        // otherwise, need to add a new path part for actual connection
        } else {
            let cutoff_path = calc_path_cutoff_at_point(center_path1, best_adjacency_point1).toReversed();
            connected_centers_path.splice(0, 0, ...cutoff_path);
        }

        console.log(connected_centers_path);
        
        // if connected to the end adjacency path of the last building, remove it and replace with cutoff path
        if (best_adjacency_id2 == connected_building_ids_path[connected_building_ids_path.length-2]) {
            let cutoff_path = calc_path_cutoff_at_point(center_path2.toReversed(), best_adjacency_point2);
            connected_centers_path.splice(connected_centers_path.length-3, 3, ...cutoff_path);

        // otherwise, need to add a new path part for actual connection
        } else {
            let cutoff_path = calc_path_cutoff_at_point(center_path2, best_adjacency_point2);
            connected_centers_path.push(...cutoff_path);
        }
    }

    return simplify_path(connected_centers_path, false);
}


// get the door grid path to center coordinate
function door_grid_path_to_border(cell_info, door_id, outline_offset, door_offset) {

    let door_mods = cell_info.building_mods.entrance_mods;
    let door_mod = door_mods[door_id];
    
    let door_grid_coords = grid_coords_for_building_or_door(door_mod.data_ref);
    // let building_grid_coords = grid_coords_for_building_or_door(cell_info.building_data);
    let building_grid_coords = estimate_building_grid_coords(door_grid_coords);
    let building_id = grid_coords_to_building_id(building_grid_coords);

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
    // console.log("orientation: ", door_mod.orientation);

    if (door_mod.orientation === "up") {
        let building_top_line = [building_grid_corners[0], building_grid_corners[1]];
        best_point = calc_closest_point(building_top_line[0], building_top_line[1], door_grid_coords);
    } else if (door_mod.orientation === "down") {
        let building_bottom_line = [building_grid_corners[2], building_grid_corners[3]];
        best_point = calc_closest_point(building_bottom_line[0], building_bottom_line[1], door_grid_coords);
    } else if (door_mod.orientation === "left") {
        let building_left_line = [building_grid_corners[3], building_grid_corners[0]];
        best_point = calc_closest_point(building_left_line[0], building_left_line[1], door_grid_coords);
    } else if (door_mod.orientation === "right") {
        let building_right_line = [building_grid_corners[1], building_grid_corners[2]];
        best_point = calc_closest_point(building_right_line[0], building_right_line[1], door_grid_coords);
    }

    // offset the best point
    best_point = calc_line_extend_point(door_grid_coords, best_point, -1 * outline_offset);

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

// find orientation of doors
function find_all_doors_orientations(cell_info) {

    // iterate over every door and find it's orientation
    for (let door_id in cell_info.building_mods.entrance_mods) {
        find_door_orientation(cell_info, door_id);
    }
}

// calculate and set the orientation of a given door
function find_door_orientation(cell_info, door_id, door_grid_coords_override=null) {

    let door_mods = cell_info.building_mods.entrance_mods;
    let door_mod = door_mods[door_id];
    let door_grid_coords = door_grid_coords_override !== null ? door_grid_coords_override : grid_coords_for_building_or_door(door_mod.data_ref);

    let building_grid_coords = estimate_building_grid_coords(door_grid_coords);
    let building_id = grid_coords_to_building_id(building_grid_coords);

    // find points guaranteed to exceed building coords
    let far_door_grid_coords  = {x: door_grid_coords.x - grid.length * 2, y: door_grid_coords.y};

    let orientation = null;
    let walls = cell_info.building_mods.outline_grid_walls;

    // door is vertical
    if (door_mod.wall_direction === "vertical") {

        let offset_door_grid_coords = {
            x: door_grid_coords.x+door_len_ratio/4, // offset is arbitrary, assuming it is small enough where it won't pass through other side of skinny building,
            y: door_grid_coords.y
        };
        let from_far_line = [far_door_grid_coords, offset_door_grid_coords];
        let num_intersections = 0;

        // calculate the number of intersections of line to right/left borders with each wall
        walls.forEach(function (wall) {

            let intersection_point = calc_lines_intersection(from_far_line, wall);

            if (intersection_point !== null) {
                num_intersections += 1;
            }
        });

        if (num_intersections % 2 === 0) {
            orientation = "right";
        } else {
            orientation = "left";
        }

    // door is horizontal
    } else {

        let offset_door_grid_coords = {
            x: door_grid_coords.x, 
            y: door_grid_coords.y+door_len_ratio/4 // offset is arbitrary, assuming it is small enough where it won't pass through other side of skinny building,
        };
        let from_far_line = [far_door_grid_coords, offset_door_grid_coords];
        let num_intersections = 0;

        // calculate the number of intersections of line to right/left borders with each wall
        walls.forEach(function (wall) {

            let intersection_point = calc_lines_intersection(from_far_line, wall);

            if (intersection_point !== null) {
                num_intersections += 1;
            }
        });

        if (num_intersections % 2 === 0) {
            orientation = "down";
        } else {
            orientation = "up";
        }
    }

    door_mod.orientation = orientation;
}


// get a list of non-connected building ids for a given building id
function get_non_connected_building_coords(building_id) {

    let building_grid_coords = grid_coords_for_building_id(building_id);
    let cell_info = grid_object_at_coords(building_grid_coords);

    let left_coords   = {x:building_grid_coords.x-1, y:building_grid_coords.y};
    let right_coords  = {x:building_grid_coords.x+1, y:building_grid_coords.y};
    let up_coords     = {x:building_grid_coords.x, y:building_grid_coords.y-1};
    let down_coords   = {x:building_grid_coords.x, y:building_grid_coords.y+1};

    let non_connected_coords = [left_coords, right_coords, up_coords, down_coords];
    return non_connected_coords.filter((coords) => {
        let id = grid_coords_to_building_id(coords);
        return !(id in cell_info.building_mods.connection_mods[building_id].adjacent_cells);
    });
}