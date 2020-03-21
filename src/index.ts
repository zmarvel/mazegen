

enum CellValue {
    Empty,
    Wall,
}

interface Board {
    dims: [number, number],
    // walls is an array of bitmasks:
    // - 0x1 = north
    // - 0x2 = east
    // - 0x4 = south
    // - 0x8 = west
    // so 0xf means there are walls in all directions
    walls: Array<number>,
}

interface Point {
    x: number,
    y: number,
}

enum Direction {
    North = 1,
    East = 2,
    South = 4,
    West = 8,
}

/**
 * Make an empty `Board`.
 *
 * @param dims Tuple of (width, height).
 *
 * @returns A `Board` of the specified dimensions, and with every cell
 *   separated by walls.
 */
function makeBoard(dims: [number, number]): Board {
    const [width, height] = dims;
    let walls: Array<number> = new Array(width*height);
    walls.fill(0xf);
    return {
        dims: dims,
        walls: walls,
    }
}

function isInBounds(board: Board): (point: Point) => boolean {
    // curry it for easier use with Array.filter
    return (point: Point) => {
        const { x: x, y: y } = point;
        const [width, height] = board.dims;
        return x >= 0 && x < width && y >= 0 && y < height;
    }
}

/**
 * Find the neighbors in `board` of cell `curr`.
 *
 * @param board `Board` object, used to determine which neighbors are within
 *   bounds.
 * @param curr This is the cell for which the neighbors will be determined.
 *
 * @returns List of `Point`s that neighbor `curr`.
 */
function neighbors(board: Board, curr: Point): Array<Point> {
    const { x: currx, y: curry } = curr;
    const [width, height] = board.dims;
    const deltas: Array<[number, number]> = [
        [-1, 0], // west
        [0, -1], // north
        [1, 0],  // east
        [0, 1],  // south
    ];
    const neighbors: Array<Point> = deltas.map(([dx, dy]) => {
        return { x: currx + dx, y: curry + dy }
    })
    return neighbors.filter(isInBounds(board))
}

/**
 * Return a random integer in the given range.
 *
 * @param start Lower end of the range, inclusive. If the second argument is not
 *   provided, this is used as the upper end of the range (exclusive) and start
 *   is assumed to be 0.
 * @param end Upper end of the range, exclusive.
 *
 * @returns Integer in the range [start, end).
 */
function randomInt(start: number, end?: number): number {
    if (end === undefined) {
        return randomInt(0, start)
    }
    let randFloat = Math.random();
    let scale = end - start;
    // Scale the random value and round
    return Math.floor(randFloat * scale)
}

/**
 * Randomly arrange the elements of an array. Does not modify its argument.
 *
 * @param arr An unshuffled array.
 *
 * @returns The original array with its elements randomly rearranged.
 */
function shuffle<T>(arr: Array<T>): Array<T> {
    let unshuffled = Array.from(arr);
    let result: Array<T> = [];

    for (let i = 0; i < arr.length; i++) {
        let nextIdx = randomInt(unshuffled.length);
        result.push(unshuffled.splice(nextIdx, 1)[0]);
    }

    return result
}

/**
 * Return the set of all elements in both `set1` and `set2`.
 */
function setIntersect<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    let result: Set<T> = new Set();
    set1.forEach((x1) => {
        if (set2.has(x1)) {
            result.add(x1);
        }
    });
    return result
}

/**
 * Return the set of all elements in `set1` that are not in `set2`.
 */
function setDifference<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    let result: Set<T> = new Set();
    set1.forEach((x) => {
        if (!set2.has(x)) {
            result.add(x);
        }
    })
    return result
}


interface DFSBoard {
    dims: [number, number],
    walls: Array<number>,
    visited: Array<boolean>,
}

function directionToDelta(direction: Direction): [number, number] {
    switch (direction) {
        case Direction.North:
            return [0, -1];
        case Direction.East:
            return [1, 0];
        case Direction.South:
            return [0, 1];
        case Direction.West:
            return [-1, 0];
    }
}

type Vector = [number, number];

function addVector(curr: Point, vec: Vector): Point {
    const [dx, dy] = vec;
    const { x: x, y: y } = curr;
    return { x: x + dx, y: y + dy };
}

function advancePoint(curr: Point, direction: Direction) {
    return addVector(curr, directionToDelta(direction));
}

function clearWallInDirection(walls: number, direction: Direction): number {
    return walls & ~direction;
}

function flipDirection(direction: Direction): Direction {
    switch (direction) {
        case Direction.North:
            return Direction.South;
        case Direction.East:
            return Direction.West;
        case Direction.South:
            return Direction.North;
        case Direction.West:
            return Direction.East;
    }
}

function visitCell(board: DFSBoard, curr: Point, direction: Direction): DFSBoard {
    const [width, _] = board.dims;
    const { x: currx, y: curry } = curr;
    const other = advancePoint(curr, direction);
    const { x: otherx, y: othery } = other;
    const curri = curry * width + currx;
    const otheri = othery * width + otherx;
    board.visited[otheri] = true;

    board.walls[curri] = clearWallInDirection(board.walls[curri], direction);
    board.walls[otheri] = clearWallInDirection(
        board.walls[otheri], flipDirection(direction));
    return board;
}

function isCellVisited(board: DFSBoard, point: Point): boolean {
    const [width, _] = board.dims;
    const { x: x, y: y } = point;
    const i = y * width + x;
    return board.visited[i];
}

const DIRECTIONS = [
    Direction.North, Direction.East, Direction.South, Direction.West];

/**
 * Use the depth-first search algorithm to generate a maze in the board. Takes
 * a board and returns the modified board.
 *
 * @param board Empty board, full of walls.
 * @param curr Optional current position. If not provided, a position will be
 *   chosen randomly.
 *
 * @returns The modified board.
 */
function fillBoardDFS(board: DFSBoard, curr?: Point): Board {
    if (!curr) {
        curr = { x: 0, y: 0 };
        board.visited.fill(false);
        board.walls.fill(0xf)
    }
    const [width, height] = board.dims;
    let shuffled = shuffle(DIRECTIONS);
    for (const dir of shuffled) {
        const neighbor = addVector(curr, directionToDelta(dir))
        if (!isCellVisited(board, neighbor)) {
            visitCell(board, curr, dir)
            fillBoardDFS(board, neighbor);
        }
    }
    return board;
}


function drawBoard(board: Board, ctx: CanvasRenderingContext2D): void {
    // Moving left to right and top to bottom, look at the southern and eastern
    // edges of each cell and draw it if it's present. We can assume the
    // outermost cells have a solid outer border.

    const cellSize = 16;

    const [width, height] = board.dims;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const cx = x * cellSize;
            const cy = y * cellSize;
            if (board.walls[i] & Direction.East) {
                // draw eastern wall
                ctx.moveTo(cx + cellSize, cy);
                ctx.lineTo(cx + cellSize, cy + cellSize);
            }
            if (board.walls[i] & Direction.South) {
                // draw southern wall
                ctx.moveTo(cx, cy + cellSize);
                ctx.lineTo(cx + cellSize, cy + cellSize);
            }
        }
    }

    // draw borders
    ctx.moveTo(0, 0);
    ctx.lineTo(width * cellSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, height * cellSize);
}
