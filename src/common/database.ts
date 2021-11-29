import * as sqlite3 from 'sqlite3';
import * as path from 'path';

export class Database {
    private static _database: Database|null = null;
    private _db: sqlite3.Database;
    constructor() {
        this._db = new sqlite3.Database(path.join(process.cwd(), 'data', 'db.sqlite'));
    }

    static getInstance(): Database {
        Database._database === null && (Database._database = new Database());
        return Database._database;
    }

    get connection(): sqlite3.Database {
        return this._db;
    }
}
