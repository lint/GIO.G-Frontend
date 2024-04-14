
/* -------------------------------------------------------------------------- */
/*                            math helper functions                           */
/* -------------------------------------------------------------------------- */


// calculate a round number for a given resolution
function round_partial(num, resolution) {
    return Math.round(num / resolution) * resolution;
}


// calculates a bounding rectangle given a list of points
function calc_bounding_rect(points) {

    let min_x = Number.MAX_SAFE_INTEGER;
    let max_x = Number.MIN_SAFE_INTEGER;
    let min_y = Number.MAX_SAFE_INTEGER;
    let max_y = Number.MIN_SAFE_INTEGER;

    // find the minimum and maximum x and y values
    for (let i = 0; i < points.length; i++) {
        let point = points[i];

        if (point.x > max_x) {
            max_x = point.x;
        }
        if (point.x < min_x) {
            min_x = point.x;
        }
        if (point.y > max_y) {
            max_y = point.y;
        }
        if (point.y < min_y) {
            min_y = point.y;
        }
    }

    // find and return the corners of the bounding rectangle
    return [
        {x: min_x, y: min_y},
        {x: max_x, y: min_y},
        {x: max_x, y: max_y},
        {x: min_x, y: max_y}
    ]
}


// calculates a midpoint between two given points
function calc_midpoint(p1, p2) {
    return {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2};
}


// calculates a weighted midpoint between two given points
function calc_weighted_midpoint(p1, p2, end_weight) {
    let start_weight = 1 - end_weight;
    return {
        x: p1.x * start_weight + p2.x * end_weight,
        y: p1.y * start_weight + p2.y * end_weight
    };
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


// calculates three corner points to construct a cutout corner 
function calc_cutout_corner_between_points(p1, p2, convex, cutout_weight=0.5) {

    // assumes points are sorted counter clockwise around a circle to determine which direction is convex vs concave

    let main_corner = calc_corner_between_points(p1, p2, convex, false);

    let p1_midpoint = calc_weighted_midpoint(p1, main_corner, cutout_weight);
    let p2_midpoint = calc_weighted_midpoint(p2, main_corner, cutout_weight);

    let cutout_corner = calc_corner_between_points(p1_midpoint, p2_midpoint, !convex, false);

    return [p1_midpoint, cutout_corner, p2_midpoint];
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


// gets a list of lines from a shape path
function lines_from_path(path, closed) {

    let lines = [];

    for (let i = 0; i < path.length; i++) {

        let p1 = path[i];
        let p2 = path[(i+1) % path.length];
        lines.push([p1, p2]);
    }

    // remove the last line if path is not closed
    if (!closed) {
        lines.pop();
    }

    return lines;
}


// helper method to determine equality of floats 
function floats_eq(f1, f2, tol=0.0001) {
    return Math.abs(f1 - f2) < tol
}


// helper method to determine equality of floats
function floats_leq(f1, f2, tol=0.0001) {
    return f1 < f2 || floats_eq(f1, f2, tol);
}


// helper method to determine equality of floats
function floats_geq(f1, f2, tol=0.0001) {
    return f1 > f2 || floats_eq(f1, f2, tol);
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


// determine if a pair of coordinates are adjacent
function coords_are_adjacent(p1, p2) {

    let p1_left = {x:p1.x-1, y:p1.y};
    let p1_right = {x:p1.x+1, y:p1.y};
    let p1_up = {x:p1.x, y:p1.y+1};
    let p1_down = {x:p1.x, y:p1.y-1};

    if (coords_eq(p1_left, p2)) {
        return "left";
    }
    if (coords_eq(p1_right, p2)) {
        return "right";
    } 
    if (coords_eq(p1_up, p2)) {
        return "up";
    }
    if (coords_eq(p1_down, p2)) {
        return "down";
    }

    return false;
}


// get the average point from a list of points
function calc_avg_point(points) {

    let avg = {
        x:0,
        y:0
    };

    for (let i = 0; i < points.length; i++) {
        let point = points[i];
        avg.x += point.x;
        avg.y += point.y;
    }

    avg.x /= points.length;
    avg.y /= points.length;

    return avg;
}


/* ------------------------------ point sorting ----------------------------- */


// sort points such that they form a polygon
function sort_points_for_convex_polygon(points) {
    
    points = points.splice(0);
    
    let p0 = {};
    p0.y = Math.min.apply(null, points.map(p=>p.y));
    p0.x = Math.max.apply(null, points.filter(p=>p.y == p0.y).map(p=>p.x));

    points.sort((a,b) => point_angle_compare(p0, a, b));
    return points;
};


// comparison function using angle between points
function point_angle_compare(p0, a, b) {
    let left = point_left_compare(p0, a, b);
    
    if (left == 0) {
        return point_dist_compare(p0, a, b);
    }

    return left;
}


// comparision function using right/left location
function point_left_compare(p0, a, b) {
    return (a.x-p0.x) * (b.y-p0.y) - (b.x-p0.x) * (a.y-p0.y);
}


// comparision function using point distance
function point_dist_compare(p0, a, b) {
    let dist_a = (p0.x-a.x) * (p0.x-a.x) + (p0.y-a.y) * (p0.y-a.y);
    let dist_b = (p0.x-b.x) * (p0.x-b.x) + (p0.y-b.y) * (p0.y-b.y);
    return dist_a - dist_b;
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
