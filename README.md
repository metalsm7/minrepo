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

### 버전확인
```bash
$ curl -X GET http://localhost:3000/version
```

### 초기 사용자 등록
> local 및 사설망 주소(class B/C) 허용

```sh
$ docker exec -it minrepo sh # docker 연결
$ sqlite3 data/db/db.sqlite # sqlite 연결
sqlite> insert into auth (access_key, target_repos, is_admin, created_at) values ('userkeysample1',1,0,1638347959);
sqlite> insert into auth_remote_expires (auth_idx, remote_addr, is_regexp) values (1,'^(::ffff:)?127\.0\.0\.1$',1);
sqlite> insert into auth_remote_expires (auth_idx, remote_addr, is_regexp) values (1,'^(::ffff:)?172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$',1);
sqlite> insert into auth_remote_expires (auth_idx, remote_addr, is_regexp) values (1,'^(::ffff:)?192\.168\.\d{1,3}\.\d{1,3}$',1);
sqlite> .exit # sqlite 연결 종료
$ exit # docker 연결 종료
```

### Maven url
- http://localhost:3000/v1/userkeysample1/maven
- ssl 미사용시 allowInsecureProtocol: true 설정 추가 필요