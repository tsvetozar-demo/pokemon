import express from "express";
import type { Request, Response } from "express";

import { connect } from "./db.js";

import WorkerPool from "./worker-pool.js";
import Pokemon from "./models/pokemon.js";
import type { IPokemon } from "./models/pokemon.js";

connect(); // connect to DB

const app = express();
app.use(express.json());

const workerPool = new WorkerPool(10);

// Middleware to parse JSON (optional but common)
app.use(express.json());

// Basic route
app.get('/', (req: Request, res: Response) => {
    res.send('Hello World from Express!');
});

// Example API route
app.post('/api/pokemon', async (req: Request, res: Response) => {
    const { body } = req;
    
    // validity check of input data
    
    if (!(body.team1 instanceof Array)) {
        return res.status(400).json({ error: `Team 1 is empty` });
    }
    if (!(body.team2 instanceof Array)) {
        return res.status(400).json({ error: `Team 1 is empty` });
    }
    
    if (body.team1.some((id: any) => typeof id !== "number")) {
        return res.status(400).json({ error: `Team 1 must be integer IDs only` });
    }
    if (body.team2.some((id: any) => typeof id !== "number")) {
        return res.status(400).json({ error: `Team 2 must be integer IDs only` });
    }
    
    // fetch required pokemons from DB
    
    const ids = [
        ...(body.team1),
        ...(body.team2),
    ];
    
    const { pokemons, missing } = await Pokemon.fetchByIds(ids);
    
    if (missing.length) { // there are some missing IDs reported
        return res.status(422).json({ error: `Invalid pokemon IDs: ${missing}` });
    }
    
    const team1: IPokemon[] = [], team2: IPokemon[] = [];
    
    function populateTeam(idsArr: any[], team: IPokemon[]) {
        idsArr.forEach((id: any) => {
            const pokemon = pokemons.find((p: IPokemon) => p.id == id);
            if (!pokemon) return;
            team.push(pokemon);
        });
    }
    populateTeam(body.team1, team1);
    populateTeam(body.team2, team2);
    
    // this shouildn't happen, but a check is worth to make sure both teams are not empty
    if (!team1.length) {
        return res.status(422).json({ error: `Team 1 is empty` });
    }
    // this shouildn't happen, but a check is worth to make sure both teams are not empty
    if (!team2.length) {
        return res.status(422).json({ error: `Team 2 is empty` });
    }
    
    // delegate battle to a worker
    try {
        const result = await workerPool.run({ type: "battle", data: { team1, team2 } });
        res.json({ type: "battle", result });
    } catch (exc) {
        return res.status(400).json({ error: "Exception: " + String(exc) });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});