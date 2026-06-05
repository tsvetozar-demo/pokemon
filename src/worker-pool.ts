import { Worker } from "node:worker_threads";
import { isJsBuild } from "./utils.js";

type Job = {
    id: number;
    data: any;
};

type Task = {
    resolve: (value: any) => void;
    reject: (err: any) => void;
};

type WorkerObj = {
    worker: Worker,
    id: number
}

export default class WorkerPool {
    private workers: WorkerObj[] = [];
    private available: WorkerObj[] = [];
    private tasks = new Map<number, Task>();
    private jobId = 1; // counting number of jobs a single worker has performed from e debugging point of view, not related to any relations of jobs or anything (much easier to spot integers in dev logs)

    constructor(size: number) {
        for (let i = 0; i < size; i++) {
            const workerData = {
                workerId: i,
                workerType: "pokemon",
            };
  
            const worker = !isJsBuild()
                ? new Worker(new URL("./worker.ts", import.meta.url), { execArgv: ["--import=tsx"], workerData })
                : new Worker(new URL("./worker.js", import.meta.url), { workerData });
            
            const workerObj = { worker, id: i };

            worker.on("message", (msg) => {
                const task = this.tasks.get(i);
                //console.log('worker msg result received:', msg, task);
                if (task) {
                    if (msg.success) task.resolve(msg.result);
                    else task.reject(msg.result);
                    this.tasks.delete(i);
                }

                // mark worker available again
                this.available.push(workerObj);
            });

            worker.on("error", (err) => {
                console.error("Worker error:", err);
            });

            this.workers.push(workerObj);
            this.available.push(workerObj);
        }
    }

    run(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.jobId++;

            const workerData = this.available.pop();
            if (!workerData) {
                return reject(new Error("No workers available"));
            }

            console.log(`*** [WORKER] WorkerPool.run jobID: ${id} ...`);
            this.tasks.set(workerData.id, { resolve, reject });

            const job: Job = { id, data };

            workerData.worker.postMessage(job);
        });
    }

    async close() {
        await Promise.all(this.workers.map(WorkerObj => WorkerObj.worker.terminate()));
    }
}