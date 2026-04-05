import express from "express";
import { getAddress, getToken, refreshToken } from "./scraper.js";

const app = express();
const port = process.env.PORT || 3002;
const API_PREFIX = "/v1";

const ADDRESS_VALIDATION_REGEX = /^[A-Z]{2,3}-\d{3,4}-\d{3,4}$/;

// Auto-refresh token every 12 hours
const TOKEN_REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
setInterval(async () => {
  try {
    const token = await refreshToken();
    console.log(`[${new Date().toISOString()}] Token refreshed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to refresh token:`, error.message);
  }
}, TOKEN_REFRESH_INTERVAL);

const addressHandler = async (req, res) => {
  const address = req.params.address;
  if (!address) {
    return res.status(400).json({ error: "address is required (format: XX-###-###)" });
  }

  if (!ADDRESS_VALIDATION_REGEX.test(address)) {
    return res.status(400).json({
      error: "invalid address format. Expected format: ^[A-Z]{2,3}-\\d{3,4}-\\d{3,4}$",
      example: "GD-016-8301",
    });
  }

  try {
    const result = await getAddress(address);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const LOOKUP_COORDS_REGEX = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;

function validateCoordinates(coords) {
  if (!LOOKUP_COORDS_REGEX.test(coords)) {
    return false;
  }

  const [lat, lng] = coords.split(",").map(Number);
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

const lookupHandler = async (req, res) => {
  const coords = req.params.coordinates;
  if (!coords) {
    return res.status(400).json({ error: "coordinates are required (format: lat,long)" });
  }

  if (!validateCoordinates(coords)) {
    return res.status(400).json({
      error: "invalid coordinate format or range. Expected format: lat,long with lat in [-90,90] and long in [-180,180]",
      example: "5.59897236,-0.17148545",
    });
  }

  try {
    const result = await getAddress(coords);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

app.get("/address/:address", addressHandler);
app.get(`${API_PREFIX}/address/:address`, addressHandler);
app.get("/lookup/:coordinates", lookupHandler);
app.get(`${API_PREFIX}/lookup/:coordinates`, lookupHandler);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
