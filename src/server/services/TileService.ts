import { Components } from "@flamework/components";
import { Service, OnStart, OnInit } from "@flamework/core";
import { ServerStorage, Workspace } from "@rbxts/services";

import { Tile } from "server/components/Tile";

const GRID_SIZE = 25;
const MINE_COUNT = 20;

const TILE_ASSET = ServerStorage.Assets.Tile;
const [, TILE_BOUNDS] = TILE_ASSET.GetBoundingBox();

@Service({})
export class TileService implements OnStart, OnInit {
	private tiles?: Tile[][];

	constructor(private readonly components: Components) {}

	public createMap(startX: number, startY: number, mineCount = MINE_COUNT, gridSize = GRID_SIZE) {
		assert(mineCount < gridSize * gridSize, "Too many mines");

		assert(startX < GRID_SIZE, "Start X is out of bounds");
		assert(startY < GRID_SIZE, "Start Y is out of bounds");

		if (this.tiles) {
			for (let x = 0; x < GRID_SIZE; x++) {
				for (let y = 0; y < GRID_SIZE; y++) {
					const tile = this.getTile(x, y);
					if (!tile) continue;

					tile.instance.Destroy();
				}
			}
		}

		this.tiles = new Array<Array<Tile>>();

		for (let x = 0; x < GRID_SIZE; x++) {
			const row = new Array<Tile>();
			this.tiles[x] = row;

			for (let y = 0; y < GRID_SIZE; y++) {
				const tile = this.createTile(x, y);
				row[y] = tile;
			}
		}

		const possible = new Array<[number, number]>();
		const safe = new Array<[number, number]>();

		for (let x = 0; x < GRID_SIZE; x++) {
			for (let y = 0; y < GRID_SIZE; y++) {
				if (startX <= x + 1 && startX >= x - 1 && startY <= y + 1 && startY >= y - 1) {
					safe.push([x, y]);
					continue;
				}

				possible.push([x, y]);
			}
		}

		print(`Possible Spawns: ${possible.size()}`);

		let spawnCount = 0;
		while (spawnCount < mineCount) {
			const index = math.random(0, possible.size() - 1);

			if (possible[index] === undefined) {
				warn(`Index ${index} is undefined`);
				break;
			}

			const [x, y] = possible[index];

			const tile = this.getTile(x, y);
			if (!tile) continue;

			tile.setBomb(true);
			possible.remove(index);

			spawnCount++;
		}

		print(`Mines Spawned: ${spawnCount}`);

		for (const [x, y] of safe) {
			const tile = this.getTile(x, y);
			if (!tile) continue;

			if (tile.getBombCount() > 0) continue;
			tile.activate();
		}
	}

	public getTile(x: number, y: number): Tile | undefined {
		if (!this.tiles) return;
		if (!this.tiles[x]) return;

		return this.tiles[x][y];
	}

	private createTile(x: number, y: number): Tile {
		if (!this.tiles) error("Tiles not created");

		const tile = TILE_ASSET.Clone();

		tile.PivotTo(new CFrame(x * TILE_BOUNDS.X, 0, y * TILE_BOUNDS.Z));
		tile.Parent = Workspace;

		const tileComponent = this.components.getComponent<Tile>(tile);
		if (!tileComponent) error("Tile component not found");

		tileComponent.setCoordinate(x, y);

		this.tiles[x][y] = tileComponent;

		return tileComponent;
	}

	onInit() {}

	onStart() {
		this.createMap(math.floor(GRID_SIZE / 2), math.floor(GRID_SIZE / 2), 120);
	}
}
