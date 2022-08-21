const sqlite = require('sqlite')
const sqlite3 = require('sqlite3')
const db = sqlite.open({filename: "data.db", mode: sqlite3.OPEN_READWRITE, driver: sqlite3.Database}).
catch(err => console.error(err))

const createTable = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER NOT NULL,
    first_name TEXT,
    last_name TEXT,
    state INTEGER NOT NULL
)
`

const showAll = `
SELECT * FROM users
`
const saveUser = `
INSERT INTO users (id, first_name, last_name, state) VALUES (?, ?, ?, ?)
`

var arr = [{'id': 12312, 'name': 'nodir', 'last_name': 'bb', 'state': 0}]

function init(db)
{
	for(user of arr)
		db.run(saveUser, user['id'], user['name'], user['last_name'], user['state'])
}


db.then((db) => {
    // db.exec(createTable);
    // init(db)
    // for(user of arr)
    // {
    //     db.run(saveUser, user)
    // }
    var d = db.all(showAll);
    d.then(value => console.log(value))
}).catch(err => console.error(err))