import { FRUITS } from './fruitConstants'; // Hằng số riêng biệt để tránh circular dependency

export type Point = { r: number, c: number };
export type Cell = { fruit: string | null, id: number };

export const checkConnection = (currentGrid: Cell[][], p1: Point, p2: Point): Point[] | null => {
    const rows = currentGrid.length;
    const cols = currentGrid[0].length;

    const isPassable = (r: number, c: number) => {
        if (r === p2.r && c === p2.c) return true;
        if (r < -1 || r > rows || c < -1 || c > cols) return false;
        if (r === -1 || r === rows || c === -1 || c === cols) return true;
        return currentGrid[r][c].fruit === null;
    };

    const queue: { r: number, c: number, dir: number, turns: number, path: Point[] }[] = [
        { r: p1.r, c: p1.c, dir: -1, turns: 0, path: [p1] }
    ];

    const visited = new Map<string, number>();

    while (queue.length > 0) {
        const { r, c, dir, turns, path: currentPath } = queue.shift()!;

        if (r === p2.r && c === p2.c) return currentPath;
        if (turns > 2) continue;

        const dr = [-1, 0, 1, 0];
        const dc = [0, 1, 0, -1];

        for (let i = 0; i < 4; i++) {
            const nr = r + dr[i];
            const nc = c + dc[i];

            if (nr < -1 || nr > rows || nc < -1 || nc > cols) continue;
            if (!isPassable(nr, nc)) continue;

            const newTurns = (dir === -1 || dir === i) ? turns : turns + 1;
            if (newTurns > 2) continue;

            const key = `${nr},${nc},${i}`;
            if (!visited.has(key) || visited.get(key)! > newTurns) {
                visited.set(key, newTurns);
                queue.push({ r: nr, c: nc, dir: i, turns: newTurns, path: [...currentPath, { r: nr, c: nc }] });
            }
        }
    }
    return null;
};

export function findAllValidPairs(grid: Cell[][]): { p1: Point, p2: Point }[] {
    const fruitsMap = new Map<string, Point[]>();
    const rows = grid.length;
    const cols = grid[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const fruit = grid[r][c].fruit;
            if (fruit) {
                if (!fruitsMap.has(fruit)) fruitsMap.set(fruit, []);
                fruitsMap.get(fruit)!.push({ r, c });
            }
        }
    }

    const validPairs: { p1: Point, p2: Point }[] = [];
    fruitsMap.forEach((points) => {
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                if (checkConnection(grid, points[i], points[j])) {
                    validPairs.push({ p1: points[i], p2: points[j] });
                }
            }
        }
    });

    return validPairs;
}

export function isClearable(grid: Cell[][]): boolean {
    let currentGrid = grid.map(row => row.map(cell => ({ ...cell })));
    let hasFruit = true;

    while (hasFruit) {
        const pairs = findAllValidPairs(currentGrid);
        if (pairs.length === 0) {
            // Check if grid is empty
            const remaining = currentGrid.flat().filter(c => c.fruit !== null);
            return remaining.length === 0;
        }

        // Greedy approach: clear the first pair found
        // In Onet, sometimes clearing a pair might make it unsolvable, 
        // but for a simple generator, a greedy clear is a good heuristic.
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        currentGrid[pair.p1.r][pair.p1.c].fruit = null;
        currentGrid[pair.p2.r][pair.p2.c].fruit = null;

        const remaining = currentGrid.flat().filter(c => c.fruit !== null);
        if (remaining.length === 0) return true;
    }

    return false;
}

export function generateSolvableGrid(rows: number, cols: number, fruitCount: number, fruits: string[]): Cell[][] {
    const totalTiles = rows * cols;
    const fruitSubSet = fruits.slice(0, fruitCount);
    
    let attempts = 0;
    while (attempts < 100) {
        attempts++;
        let tiles: string[] = [];
        for (let i = 0; i < totalTiles / 2; i++) {
            const f = fruitSubSet[i % fruitSubSet.length];
            tiles.push(f, f);
        }

        // Shuffle
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }

        const newGrid: Cell[][] = [];
        let idx = 0;
        for (let r = 0; r < rows; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < cols; c++) {
                row.push({ fruit: tiles[idx++], id: idx });
            }
            newGrid.push(row);
        }

        if (isClearable(newGrid)) {
            return newGrid;
        }
    }
    
    // Fallback: if we can't find one by shuffling (rare for small grids), we could use a backward generation approach here
    return []; // Should not happen with enough attempts
}
