# GhanaPost API

A small Node.js API wrapper for GhanaPost GPS address lookup.

## Versioning

This API is versioned under `/v1`.
The publicly exposed endpoint is:

- `/address/:address` and `/v1/address/:address`

## Endpoints

### GET /v1/address/:address

Lookup an address using the cached bearer token.

Path parameter:
- `address` (required): postal address ID in format `XX-####-####` or `XXX-####-####`

Example:

```bash
curl "http://localhost:3002/v1/address/GD-016-8301"
```


### GET /v1/lookup/:coordinates

Lookup a location by latitude/longitude using the cached bearer token.
The request sends `address=<lat>,<long>` to the upstream API and uses the default internal `user_latitude` and `user_longitude` values.

Path parameter:
- `coordinates` (required): latitude and longitude joined by a comma
- latitude must be between `-90` and `90`
- longitude must be between `-180` and `180`

Example:

```bash
curl "http://localhost:3002/v1/lookup/5.59897236,-0.17148545"
```


## Address validation

The API validates `address` against the regex:

```regex
^[A-Z]{2,3}-\d{3,4}-\d{3,4}$
```

So valid values include:
- `GD-016-8301`
- `AB-123-4567`
- `XYZ-1234-5678`

## Running locally

Install dependencies and start the API:

```bash
npm install
npm start
```

Then use the curl commands above to test.

## Deployment notes

This service is currently implemented as a Node.js Express app. When deploying to Cloudflare Workers,
port the same endpoint behavior into a worker script, preserving the `/v1/*` routes and the token caching flow.
