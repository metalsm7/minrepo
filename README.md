# MinRepo

## 실행

### Source

```bash
$ npm run build # 빌드, 최초 1회
$ node dist/main.js # 실행시
```

### Docker

```bash
$ docker run -d -p 3000:3000 -v ${PWD}/minrepo:/usr/local/minrepo/data --name minrepo --restart unless-stopped mparang/minrepo:0.1.0
```