drop table info;
create table info (
    version     text    not null
);
INSERT INTO info (version) VALUES ('0.1.0');

drop table auth;
create table auth (
    auth_idx        integer  not null constraint auth_pk primary key autoincrement,
	access_key      text not null,
    target_repos    integer not null default 0,
    is_admin        integer not null default 0,
    created_at      numeric not null
);
create unique index auth_access_key_unique on auth (access_key);

drop table auth_remote_expires;
create table auth_remote_expires (
    expire_idx  integer  not null constraint auth_remote_expires_pk primary key autoincrement,
    auth_idx    integer not null,
    remote_addr text not null,
    is_regexp   integer not null default 0,
    enable_at   numeric null,
    expire_at   numeric null
);
create index auth_remote_expires_enable_at_expire_at_index on auth_remote_expires (enable_at, expire_at);

drop table maven_repo;
create table maven_repo (
    repo_id         integer not null constraint maven_repo_pk primary key autoincrement,
    group_id        text    not null,
    artifact_id     text    not null,
    release_version text    not null,
    latest_version  text    not null,
    created_at      numeric not null,
    updated_at      numeric null
);

drop table maven_repo_detail;
create table maven_repo_detail (
	repo_detail_id  integer not null
	                constraint maven_repo_detail_pk
	                primary key autoincrement,
	repo_id         integer not null constraint maven_repo_detail_maven_repo_repo_id_fk references maven_repo,
	version         text    not null,
	module          text    null,
	md5             text    null,
	sha1            text    null,
	sha256          text    null,
	sha512          text    null,
	file_path       text    null,
	file_size       integer null,
	is_release      integer not null default 1,
	created_at      numeric not null
);

drop table maven_repo_detail_dependency;
create table maven_repo_detail_dependency (
	repo_detail_id  integer not null constraint maven_repo_detail_info_maven_repo_detail_repo_detail_id_fk references maven_repo_detail,
	group_id        text    null,
	artifact_id     text    null,
	version         text    null,
	scope           text    null
);

drop table maven_repo_access_history;
create table maven_repo_access_history (
    repo_id         integer not null primary key ,
    access_count    integer not null default 0,
    updated_at      numeric null
);

drop table maven_repo_access_history_log;
create table maven_repo_access_history_log (
    repo_id         integer not null,
    repo_detail_id  integer not null,
    access_key      text null,
    remote_addr     text null,
    created         numeric null
);


drop table archive_repo;
create table archive_repo (
    repo_id         integer not null constraint archive_repo_pk primary key autoincrement,
    group_id        text    not null,
    artifact_id     text    not null,
    latest_version  text    not null,
    created_at      numeric not null,
    updated_at      numeric null
);

drop table archive_repo_detail;
create table archive_repo_detail (
	repo_detail_id  integer not null
	                constraint archive_repo_detail_pk
	                primary key autoincrement,
	repo_id         integer not null constraint archive_repo_detail_archive_repo_repo_id_fk references archive_repo,
	version         text    not null,
	file_path       text    null,
	file_ext        text    null,
	file_size       integer null,
	is_release      integer not null default 1,
	created_at      numeric not null
);

drop table archive_repo_access_history;
create table archive_repo_access_history (
    repo_id         integer not null primary key ,
    access_count    integer not null default 0,
    updated_at      numeric null
);

drop table archive_repo_access_history_log;
create table archive_repo_access_history_log (
    repo_id         integer not null,
    repo_detail_id  integer not null,
    access_key      text null,
    remote_addr     text null,
    created         numeric null
);

insert into auth (access_key, target_repos, is_admin, created_at) values ('local_admin',1,1,0);
insert into auth_remote_expires (auth_idx, remote_addr, is_regexp) values (1,'^::1$',1);
insert into auth_remote_expires (auth_idx, remote_addr, is_regexp) values (1,'^(::ffff:)?127\.0\.0\.1$',1);
insert into auth_remote_expires (auth_idx, remote_addr, is_regexp) values (1,'^(::ffff:)?172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$',1);
