const {DatabaseSync}=require('node:sqlite');
const fs=require('fs');
function createDB(filename=':memory:') {
  const sql=new DatabaseSync(filename);
  sql.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()) {
    if(!sql.prepare('SELECT name FROM local_migrations WHERE name=?').get(file)) {
      sql.exec('BEGIN');try{sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));sql.prepare('INSERT INTO local_migrations VALUES (?)').run(file);sql.exec('COMMIT')}catch(error){sql.exec('ROLLBACK');throw error}
    }
  }
  const db={
    prepare(query){let args=[];return {bind(...values){args=values;return this},async all(){return {results:sql.prepare(query).all(...args)}},async first(){return sql.prepare(query).get(...args)||null},async run(){return sql.prepare(query).run(...args)}}},
    async batch(statements){sql.exec('BEGIN');try{const out=[];for(const stmt of statements)out.push(await stmt.run());sql.exec('COMMIT');return out}catch(error){sql.exec('ROLLBACK');throw error}},
    sql,close(){sql.close()}
  };
  return db;
}
module.exports={createDB};
