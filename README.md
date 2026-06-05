# build and run
App is written in TypeScript. Because there are workers started when it's built to .js it needs to know to load the .ts/.js file properly.
The built .js version needs JSBUILD env variable to indicate to load a .js file as a worker.
```
npm build
JSBUILD=1 node dist/index.js
```
You can use nodemon to run and monitor it
```
JSBUILD=1 npx nodemon dist/index.js
```


# run with tsx .ts sources
Sources are watched for changes and automatically server restarted.
```
npm run dev
```

# Description
Server uses worker threads to delegate battles and work to external threads (as jobs to be processed). The idea is that any heavy computational work in loops that (potentially) can consume too much CPU power must be left outside of the main loop so it can serve and process the event queue.

Thinking in terms of scalability this later can be amended quickly to using message brokers and multiple servers to pick up and process jobs and distribute the work and load accordingly. Same parallel used right now with local workers.

For this particular case, probably, this worker functionality is pointless. The code however is left to be extended with any kind of pokemon job or action, can be delegated to the worker threads where it gets executed and run.

Worker pool size is static.

# Docker
NOTE: sudo may be required for docker.

There's a script `build:docker` in package.json
On command line you can run it manually:
Build
```
docker build -t pokemon-server .
```

Running docker:
```
docker run pokemon-server
```

Attach to the docker to inspect it through the shell and manually test and run commands:
```
docker run -it pokemon-server sh
```

# example HTTP POST request
```
curl -X POST \
	-H 'Content-Type: application/json' \
	--data '{"team1":[1,2,3],"team2":[4,5,6]}' \
	http://localhost:3000/api/pokemon
```

# import test data in MongoDB
```
mongoimport --db pokemon --collection pokemons --file src/test-data/import.json --jsonArray
```
