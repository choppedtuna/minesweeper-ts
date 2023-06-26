interface ServerStorage extends Instance {
	TagList: Folder & {
		Tile: Configuration;
	};
	Assets: Folder & {
		Tile: Model & {
			Base: Part;
			Pad: Part & {
				Display: SurfaceGui & {
					Number: TextLabel & {
						UIStroke: UIStroke;
					};
				};
			};
		};
	};
}
