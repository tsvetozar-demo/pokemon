import { workerData, parentPort } from "worker_threads";
import { isJsBuild } from "./utils.js";

if (!parentPort) {
    throw new Error('This file must be run as a Worker');
}

const jobFns: any = {
    battle: battle,
    // TODO: add more pokemon actions
};

console.log(`Running worker #${workerData.workerId} (${isJsBuild() ? ".js build" : ".ts verion"}) ...`);

parentPort.on('message', (job: any) => {
    if (!parentPort) {
        return;
    }
    
    console.log(`>>> [WORKER#${workerData.workerId}] job received:`, JSON.stringify(job));
    
    const jobFn = jobFns[job.data.type];
    if (!jobFn) {
        console.error(`!!! [WORKER#${workerData.workerId}] No such job type: ${job.data.type}`);
        parentPort.postMessage({ success: false, error: `No such job type: ${job.data.type}` });
        return;
    }

    try {
        const result = jobFn(job.data.data);
        console.log(`<<< [WORKER#${workerData.workerId}] job result:`, JSON.stringify(result));
        parentPort.postMessage({ success: true, result });
    } catch (exc) {
        console.error(`!!! [WORKER#${workerData.workerId}] job error:`, exc);
        parentPort.postMessage({ success: false, result: { error: String(exc) } });
    }
});

function battle(data: any) {
    
    const team1 = [...data.team1];
    const team2 = [...data.team2];
    
    const duels: any = [];
    let error: string | undefined;
    let status: number | undefined;

    while (team1.length && team2.length) {
        const duelData = {
            team1: team1.map((p: any) => p.id),
            team2: team2.map((p: any) => p.id),
            ...duel(team1[0], team2[0]),
        };
        //console.log(duelData)
        let playerLost = false;
        if (duelData.loser == team1[0].id) {
            team1.shift();
            playerLost = true;
        }
        if (duelData.loser == team2[0].id) {
            team2.shift();
            playerLost = true;
        }
        duels.push(duelData);
        
        if (!playerLost) { // avoid looping without a winner and loser from a duel
            error = `Fatal error: battle must end with an winner and loser.`;
            status = 500;
            break;
        }
    }
    
    const result: any = {
        start: {
            team1: data.team1.map((p: any) => p.id),
            team2: data.team2.map((p: any) => p.id),
        },
        end: {
            team1: team1.map((p: any) => p.id),
            team2: team2.map((p: any) => p.id),
        },
        duels,
    };
    if (error) result.error = error;
    if (status) result.status = status;
    
    return result;
}

function attack(attacker: any, defender: any) {
    const crit = Math.random() < 0.1 ? 2 : 1;

    const damage = Math.max(
        1,
        Math.floor(
            (attacker.attack - defender.defense * 0.5) *
            (0.8 + Math.random() * 0.4) *
            crit
        )
    );

    const initialHp = defender.hp;
    defender.hp -= damage;

    //console.log(`${attacker.name} attacks ${defender.name} for ${damage} damage${crit === 2 ? " (CRITICAL HIT!)" : ""}.`);
    
    return {
        attackerID: attacker.id,
        defenderID: defender.id,
        damage,
        hp: defender.hp,
        initialHp,
    };
}

function createPokemon(pokemon: any) {
    const weight = parseFloat(pokemon.weight);

    return {
        ...pokemon,
        maxHp: 100 + weight * 2,
        hp: 100 + weight * 2,
        attack: 15 + weight,
        defense: 10 + weight / 2
    };
}

function duel(p1Data: any, p2Data: any) {
    const p1 = createPokemon(p1Data);
    const p2 = createPokemon(p2Data);

    //console.log(`⚔️ Battle Start: ${p1.name} vs ${p2.name}\n`);

    let round = 1;
    
    const duelData: any = {
        team1member: p1.id,
        team2member: p2.id,
        turns: [],
    };

    while (p1.hp > 0 && p2.hp > 0) {
        //console.log(`--- Round ${round} ---`);

        let attackData = attack(p1, p2);
        duelData.turns.push({
            round,
            type: 'attack',
            ...attackData
        });

        if (p2.hp <= 0) {
            //console.log(`\n🏆 ${p1.name} wins!`);
            duelData.turns.push({
                type: 'victory',
                id: p1.id,
            });
            duelData.winner = p1.id;
            duelData.loser = p2.id;
            return duelData;
        }

        attackData = attack(p2, p1);
        duelData.turns.push({
            type: 'attack',
            ...attackData
        });

        if (p1.hp <= 0) {
            //console.log(`\n🏆 ${p2.name} wins!`);
            duelData.turns.push({
                type: 'victory',
                id: p2.id,
            });
            duelData.winner = p2.id;
            duelData.loser = p1.id;
            return duelData;
        }

        //console.log(`${p1.name}: ${Math.max(0, p1.hp)} HP | ${p2.name}: ${Math.max(0, p2.hp)} HP\n`);

        round++;
    }

    return duelData;
}
