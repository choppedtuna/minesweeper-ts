import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { t } from "@rbxts/t";

import { TileService } from "server/services/TileService";

export type TileValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Minesweeper colors
const TILE_COLORS = {
	1: Color3.fromRGB(0, 0, 255),
	2: Color3.fromRGB(0, 128, 0),
	3: Color3.fromRGB(255, 0, 0),
	4: Color3.fromRGB(0, 0, 128),
	5: Color3.fromRGB(128, 0, 0),
	6: Color3.fromRGB(0, 128, 128),
	7: Color3.fromRGB(0, 0, 0),
	8: Color3.fromRGB(128, 128, 128),
};

// Corner tile pattern
const CORNER_PATTERN = [
	[-1, -1],
	[-1, 1],
	[1, -1],
	[1, 1],
];

// Adjacent tile pattern
const ADJACENT_PATTERN = [
	[0, -1],
	[0, 1],
	[-1, 0],
	[1, 0],
];

interface TileInstance extends Model {
	Base: Part;
	Pad: Part & {
		Display: SurfaceGui & {
			Number: TextLabel;
			Bomb: ImageLabel;
		};
	};
}

interface TileAttributes {
	value: TileValue;
	x?: number;
	y?: number;
}

@Component({
	tag: "Tile",
	attributes: {
		value: t.numberConstrained(0, 8),
	},
	defaults: {
		value: 0,
	},
})
export class Tile extends BaseComponent<TileAttributes, TileInstance> implements OnStart {
	private readonly Display = this.instance.Pad.Display;

	private IsBomb = false;
	private IsActivated = false;

	constructor(private readonly tileService: TileService) {
		super();

		this.Display = this.instance.Pad.Display;
	}

	public setValue(value: TileValue) {
		this.setAttribute("value", value);
	}

	// Can only be called once
	public setCoordinate(x: number, y: number) {
		if (this.attributes.x !== undefined && this.attributes.y !== undefined)
			return warn("Tile already has a coordinate");

		this.setAttribute("x", x);
		this.setAttribute("y", y);
	}

	public setBomb(isBomb: boolean) {
		this.IsBomb = isBomb;
		this.updateIcon();
	}

	private getTilePattern(pattern: number[][]) {
		const { x, y } = this.attributes;
		if (x === undefined || y === undefined) return [];

		const neighbourTiles = new Array<Tile>();
		for (const [xOffset, yOffset] of pattern) {
			const tile = this.tileService.getTile(x + xOffset, y + yOffset);
			if (tile) neighbourTiles.push(tile);
		}

		return neighbourTiles;
	}

	public getAdjacentTiles(): Array<Tile> {
		return this.getTilePattern(ADJACENT_PATTERN);
	}

	private getCornerTiles(): Array<Tile> {
		return this.getTilePattern(CORNER_PATTERN);
	}

	public getNeighbourTiles(): Array<Tile> {
		return [...this.getAdjacentTiles(), ...this.getCornerTiles()];
	}

	public getBombs(): Array<Tile> {
		return this.getAdjacentTiles().filter((tile) => tile.IsBomb);
	}

	public getBombCount(): number {
		return this.getBombs().size();
	}

	public activate(shouldDetonate = false) {
		if (this.IsActivated) return;

		this.IsActivated = true;

		this.instance.Pad.Transparency = 1;
		this.instance.Pad.CanCollide = false;

		// if detonate, explode
		if (this.IsBomb && shouldDetonate) {
			print("boom");
			return this.updateIcon();
		}

		// else reveal
		const adjacentTiles = this.getAdjacentTiles();
		const bombCount = this.getBombCount();

		this.setValue(bombCount as TileValue);

		if (this.getBombCount() > 0) return;

		// try activate all surrounding tiles (if zero bomb count)
		for (const tile of adjacentTiles) {
			tile.activate();
		}
	}

	private updateIcon() {
		this.Display.Bomb.Visible = this.IsBomb && this.IsActivated;
		this.Display.Number.Visible = !this.IsBomb && this.attributes.value > 0;
	}

	private onValueChanged(value: TileValue) {
		this.updateIcon();

		this.Display.Number.Text = tostring(value);

		if (this.IsBomb) return;
		if (value === 0 || value <= 0) return;

		const color = TILE_COLORS[value];
		this.Display.Number.TextColor3 = color;
	}

	onStart() {
		this.onAttributeChanged("value", (number) => this.onValueChanged(number));
		this.onValueChanged(this.attributes.value);
	}
}
