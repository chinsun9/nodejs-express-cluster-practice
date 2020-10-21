# nodejs-express-cluster-practice

- https://smoh.tistory.com/m/339?category=694831 보고 따라하기

## 웹서버 생성

```
npx create-react-app my-react
cd my-react

npm i express express-favicon
```

```js my-react/server/index.js
const express = require('express');
const favicon = require('express-favicon');
const path = require('path');

const app = express();
const port = 3000;
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${server.address().port}.`);
});

app.use(favicon(path.join(__dirname, '../public/favicon.ico')));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '../build')));

app.get('/ping', (req, res) => {
  return res.send('pong');
});
app.get('/*', (req, res) => {
  return res.sendFile(path.join(__dirname, '../build', 'index.html'));
});
```

- 서버 코드 작성

```cmd cmd
npm run build
```

- 빌드

```cmd cmd
node server
```

- 서버 실행

  http://localhost:3000/
  http://localhost:3000/ping

- 잘 서빙하는지 확인

```
npm i uuid
```

```js my-react/server/index.js
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
```

- 코드 설명

  우리는 한 서버의 CPU개수의 절반만큼의 워커를 생성할 겁니다.
  만약 현재 생성된 클러스터가 마스터라면 워커 클러스터를 생성하고 관리하는 역할을 수행합니다.
  마스터는 미리 정해진 개수만큼 워커를 생성하고 만약 죽은 워커가 발견된 경우 새 워커를 생성시켜 항상 일정 개수의 워커가 서버에서 동작할 수 있도록 합니다.
  워커는 express 서버를 구동합니다.
  워커에는 어느 서버에서 수행되고 있는지 확인할 수 있는 기능과 현재 워커를 죽일 수 있는 기능이 추가되었습니다.
