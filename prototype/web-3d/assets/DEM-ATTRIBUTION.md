# Elevation data attribution

`aconcagua-dem.bin` is a 256×256 crop (about 22.6 km across) of the Aconcagua massif, baked by `tools/bake-dem.mjs` from the **Terrain Tiles** dataset hosted on AWS Open Data (Mapzen/Tilezen, Terrarium encoding): https://registry.opendata.aws/terrain-tiles/

Terrain Tiles combines several open elevation sources. For this area the underlying data is primarily NASA **SRTM** (public domain) with void filling from other open datasets. Required attribution for the tile set:

- Mapzen Terrain Tiles, https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- SRTM courtesy of the U.S. Geological Survey / NASA

The file is used only as a scenic backdrop. It is not the walkable terrain, which is procedural and compressed for pacing.
