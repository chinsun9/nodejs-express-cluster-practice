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
