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

type PendingTask = {
    id: number;
    data: any;
    task: Task;
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
    private taskQueue: PendingTask[] = [];

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
                
                this.pickNextJob(); // process any pending task immediately when a new worker has been just releaves and is available
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
                console.log(`*** [WORKER] WorkerPool.run (no workers available) QUEUEING jobID: ${id} ...`);
                this.taskQueue.push({
                    id,
                    data,
                    task: { resolve, reject },
                });
                return;
            }

            console.log(`*** [WORKER] WorkerPool.run jobID: ${id} ...`);
            this.tasks.set(workerData.id, { resolve, reject });

            const job: Job = { id, data };

            workerData.worker.postMessage(job);
        });
    }
    
    pickNextJob() {
        if (!this.taskQueue.length) {
            //console.log(`*** [WORKER] WorkerPool.pickNextJob no pending tasks ...`);
            return;
        }
        
        const workerData = this.available.pop();
        if (!workerData) {
            console.log(`*** [WORKER] WorkerPool.pickNextJob (no workers still available) ...`);
            return;
        }
        
        const pendingTask = this.taskQueue.shift(); // take first element
        if (!pendingTask) return;
        
        const { id, data, task } = pendingTask;
        
        console.log(`*** [WORKER] WorkerPool.run RESUMING QUEUED jobID: ${id} ...`);
        this.tasks.set(workerData.id, task);
        
        const job: Job = { id, data };

        workerData.worker.postMessage(job);
    }

    async close() {
        await Promise.all(this.workers.map(WorkerObj => WorkerObj.worker.terminate()));
    }
}