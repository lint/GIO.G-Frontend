
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
    let editor_inset_size = cell_dims.size - 2 * editor_inset;

    let scale = Math.min(editor_inset_size / bounds_width, editor_inset_size / bounds_height) * editor_stage.scaleX();

    let x_offset = editor_inset + ((editor_inset_size - bounds_width*scale) / 2) - (building_bounding_grid_rect[0].x * scale);
    let y_offset = editor_inset + ((editor_inset_size - bounds_height*scale) / 2) - (building_bounding_grid_rect[0].y * scale);

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
    let editor_inset_size = cell_dims.size - 2 * editor_inset;

    let scale = Math.min(editor_inset_size / bounds_width, editor_inset_size / bounds_height) * editor_stage.scaleX();

    let x_offset = editor_inset + ((editor_inset_size - bounds_width*scale) / 2) - (building_bounding_grid_rect[0].x * scale);
    let y_offset = editor_inset + ((editor_inset_size - bounds_height*scale) / 2) - (building_bounding_grid_rect[0].y * scale);

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

    let doors = cell_info.building_data.entrances;

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
    simplified_grid_path = simplify_closed_path(grid_shape_path, 0.0001);

    // save the path to the cell_info
    cell_info.building_mods.outline_grid_path = simplified_grid_path;
}


// calculates the building's effective wall grid lines (prevents doors from being positioned in corners)
function find_building_effective_walls(cell_info) {

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
function find_building_center(cell_info) {

    let outline_grid_path = cell_info.building_mods.outline_grid_path;

    // convert the outline grid path to the input needed by polylabel and then find its center point
    let polylabel_polygon = outline_grid_path.map((p) => [p.x, p.y]);
    let center = polylabel([polylabel_polygon]);
    
    cell_info.building_mods.outline_grid_center = {x: center[0], y: center[1]};
}


// get the door grid path to center coordinate
function door_grid_path_to_center(cell_info, door_id) {

    // TODO: this does lots of repeated calculations if called multiple times in a row... fix it

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
function door_grid_path_to_border(cell_info, door_id, outline_offset, door_offset) {

    let building_grid_coords = grid_coords_for_building_or_door(cell_info.building_data);
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
