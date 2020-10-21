# nodejs-express-cluster-practice

- [Express를 이용한 서버 클러스터 구성](https://smoh.tistory.com/339) 보고 따라하였습니다.

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

## 클러스터 구성

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

- [코드 설명](https://smoh.tistory.com/m/339?category=694831)

  - 우리는 한 서버의 CPU개수의 절반만큼의 워커를 생성할 겁니다.
  - 만약 현재 생성된 클러스터가 마스터라면 워커 클러스터를 생성하고 관리하는 역할을 수행합니다.
  - 마스터는 미리 정해진 개수만큼 워커를 생성하고 만약 죽은 워커가 발견된 경우 새 워커를 생성시켜 항상 일정 개수의 워커가 서버에서 동작할 수 있도록 합니다.
  - 워커는 express 서버를 구동합니다.
  - 워커에는 어느 서버에서 수행되고 있는지 확인할 수 있는 기능과 현재 워커를 죽일 수 있는 기능이 추가되었습니다.

## 도커로 서버 구동

```Dockerfile my-react/Dockerfile
FROM node:slim

# app 폴더 생성.
RUN mkdir -p /app

# 작업 폴더를 app폴더로 지정.
WORKDIR /app

# dockerfile과 같은 경로의 파일들을 app폴더로 복사
ADD ./ /app

# 패키지 파일 설치.
RUN npm install

# 환경을 배포 환경으로 변경.
ENV NODE_ENV=production

#빌드 수행
RUN npm run build

ENV HOST=0.0.0.0 PORT=3000
EXPOSE ${PORT}

#서버 실행
CMD ["node", "server"]
```

- Dockerfile 생성

```
docker build . -t my-react:0.0.1
```

- 이미지 생성
- 시간이 쫌 걸린다..

```
Step 5/10 : RUN npm install
 ---> Running in 659aad486ae1
npm ERR! Object for dependency "@babel/generator" is empty.
npm ERR! Something went wrong. Regenerate the package-lock.json with "npm install".
npm ERR! If using a shrinkwrap, regenerate with "npm shrinkwrap".

npm ERR! A complete log of this run can be found in:
npm ERR!     /root/.npm/_logs/2020-10-21T08_10_46_045Z-debug.log
The command '/bin/sh -c npm install' returned a non-zero code: 1
```

- 이미지 생성 중 발생한 오류.
- https://stackoverflow.com/questions/63321707/react-npm-install-fails

- node_modules, package-lock.json 삭제

```cmd cmd
npm i
```

- 다시 설치

```
docker build . -t my-react:0.0.1
```

- 다시 이미지 생성시도 > 성공!

```
docker run -itd -p 8080:3000 my-react:0.0.1
```

- localhost:8080 접속
- /where, /kill 테스트해보기

![result](/readmeRes/result.jpg)
