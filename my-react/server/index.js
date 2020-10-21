const cluster = require('cluster');
const os = require('os');
const uuid = require('uuid');

const port = 3000;
const instance_id = uuid.v4();

//// Create worker.
const cpu_count = os.cpus().length;
const worker_count = cpu_count / 2;

//// If master, create workers and revive dead worker.
if (cluster.isMaster) {
  console.log(`Server ID: ${instance_id}`);
  console.log(`Number of server's CPU: ${cpu_count}`);
  console.log(`Number of workers to create: ${worker_count}`);
  console.log(`Now create total ${worker_count} workers ...`);

  //// Message listener
  const workerMsgListener = (msg) => {
    const worker_id = msg.worker_id;
    //// Send master's id.
    if (msg.cmd === 'MASTER_ID') {
      cluster.workers[worker_id].send({
        cmd: 'MASTER_ID',
        master_id: instance_id,
      });
    }
  };

  //// Create workers
  for (var i = 0; i < worker_count; i++) {
    const worker = cluster.fork();
    console.log(`Worker is created. [${i + 1}/${worker_count}]`);
    worker.on('message', workerMsgListener);
  }

  //// Worker is now online.
  cluster.on('online', (worker) => {
    console.log(`Worker is now online: ${worker.process.pid}`);
  });

  //// Re-create dead worker.
  cluster.on('exit', (deadWorker) => {
    console.log(`Worker is dead: ${deadWorker.process.pid}`);
    const worker = cluster.fork();
    console.log(`New worker is created.`);
    worker.on('message', workerMsgListener);
  });
}
//// If worker, run servers.
else if (cluster.isWorker) {
  const express = require('express');
  const favicon = require('express-favicon');
  const path = require('path');

  const app = express();
  const worker_id = cluster.worker.id;
  const server = app.listen(port, () => {
    console.log(`Server is listening on port ${server.address().port}.`);
  });

  let master_id = '';

  //// Request master's id to master.
  process.send({ worker_id: worker_id, cmd: 'MASTER_ID' });
  process.on('message', (msg) => {
    if (msg.cmd === 'MASTER_ID') {
      master_id = msg.master_id;
    }
  });

  app.use(favicon(path.join(__dirname, '../public/favicon.ico')));
  app.use(express.static(__dirname));
  app.use(express.static(path.join(__dirname, '../build')));

  app.get('/ping', (req, res) => {
    return res.send('pong');
  });
  app.get('/where', (req, res) => {
    return res.send(
      `Running server: ${master_id} \n Running worker: ${worker_id}`
    );
  });
  app.get('/kill', (req, res) => {
    cluster.worker.kill();
    return res.send(`Called worker killer.`);
  });
  app.get('/*', (req, res) => {
    return res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}
