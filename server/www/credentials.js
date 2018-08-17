const mysql = require('../utils/mysql');
const bigquery = require('../utils/bigquery').BigQuery;
const API = require('../utils/api');
const sql = require('mysql');
const mssql = require('../utils/mssql');
const {Client} = require('pg');
const Sequelize = require('sequelize');
const {MongoClient} = require('mongodb');
const auth = require('../utils/auth');
const commonFun = require('../utils/commonFunctions');


exports.insert = class extends API {

	async insert() {

		this.user.privilege.needs('connection');

		const response = await this.mysql.query(
			'INSERT INTO tb_credentials(account_id, connection_name, host, port, user, password, db, `limit`, type, file, project_name, added_by) VALUES (?)',
			[[
				this.account.account_id,
				this.request.body.connection_name,
				this.request.body.host,
				this.request.body.port || null,
				this.request.body.user,
				this.request.body.password,
				this.request.body.db,
				this.request.body.limit || 10,
				this.request.body.type.toLowerCase(),
				this.request.body.file,
				this.request.body.project_name,
				this.user.user_id
			]],
			'write'
		);

		if (this.request.body.type.toLowerCase() === "mysql") {

			await mysql.crateExternalPool(this.request.body.id);
		}

		else if (this.request.body.type.toLowerCase() === "mssql") {

			await mssql.crateExternalPool(this.request.body.id);
		}

		if (bigquery)
			await bigquery.setup();

		return response;
	}
}

exports.list = class extends API {

	async list() {

		const
			response = [],
			connections = await this.mysql.query(
				'SELECT * FROM tb_credentials WHERE account_id = ? AND status = 1',
				[this.account.account_id]
			);

		for (const row of connections) {

			if (!(await auth.connection(row, this.user)).error)
				response.push(row);
		}

		return response;
	}
}

exports.delete = class extends API {

	async delete() {

		this.user.privilege.needs('connection');

		const authResponse = await auth.connection(this.request.body.id, this.user);
		this.assert(!authResponse.error, authResponse.message);

		const response = await this.mysql.query(
			'UPDATE tb_credentials SET status = 0 WHERE id = ? AND account_id = ?',
			[this.request.body.id, this.account.account_id],
			'write'
		);

		if (this.request.body.type.toLowerCase() === "mysql") {

			await mysql.crateExternalPool(this.request.body.id);
		}

		else if (this.request.body.type.toLowerCase() === "mssql") {

			await mssql.crateExternalPool(this.request.body.id);
		}

		if (bigquery)
			await bigquery.setup();

		return response;
	}
}

exports.update = class extends API {

	async update() {

		const authResponse = await auth.connection(this.request.body.id, this.user);

		this.assert(!authResponse.error, authResponse.message);

		let id = this.request.body['id'];

		delete this.request.body.id;
		delete this.request.body.token;
		delete this.request.body.refresh_token;

		this.request.body.port = this.request.body.port || null;

		const response = await this.mysql.query(
			'UPDATE tb_credentials SET ? WHERE id = ?',
			[this.request.body, id],
			'write'
		);

		if (this.request.body.type.toLowerCase() === "mysql") {

			await mysql.crateExternalPool(this.request.body.id);
		}

		else if (this.request.body.type.toLowerCase() === "mssql") {

			await mssql.crateExternalPool(this.request.body.id);
		}

		if (bigquery)
			await bigquery.setup();

		return response;
	}
}


exports.testConnections = class extends API {

	async testConnections() {

		const authResponse = await auth.connection(this.request.body.id, this.user);
		this.assert(!authResponse.error, authResponse.message);

		let conConfig = await this.mysql.query(
			'SELECT * FROM tb_credentials WHERE id = ?',
			[this.request.body['id']]
		);

		if (!conConfig.length) {
			throw new API.Exception(400, 'Connection Not Found');
		}

		conConfig = conConfig[0];
		conConfig['database'] = conConfig['db'];

		const conClass = testClasses.get(conConfig.type);

		if (!conClass) {
			throw new API.Exception(400, 'Connection Type Not Yet Supported');
		}

		const obj = new conClass(conConfig);

		const startTime = Date.now();
		const result = await obj.checkPulse();
		return {
			'time': Date.now() - startTime,
			'status': result
		};
	}
};

const testClasses = new Map();
testClasses.set("mysql",
	class {

		constructor(config) {
			this.host = config.host;
			this.user = config.user;
			this.password = config.password;
			if (config.port)
				this.port = config.port;
		}

		checkPulse() {
			const con = sql.createConnection(this);

			return new Promise((resolve, reject) => {

				con.connect(function (err) {
					if (err) resolve(0);

					return con.query('select 1 as "status"', (err, result) => {
						if (err) return resolve([{'status': 0}]);

						con.end();
						return resolve(result[0].status);
					});
				});
			});
		}
	}
);

testClasses.set("pgsql",
	class {
		constructor(config) {
			this.host = config.host;
			this.user = config.user;
			this.password = config.password;
			this.database = config.database;
			if (config.port)
				this.port = config.port;
		}

		checkPulse() {
			const client = new Client(this);
			client.connect();

			return new Promise((resolve, reject) => {

				return client.query('select 1 as "status"', (err, result) => {
					if (err) return resolve(0);

					client.end();
					return resolve(result.rows[0].status);
				});
			});
		}
	}
);


testClasses.set("mssql",
	class {
		constructor(config) {
			this.host = config.host;
			this.user = config.user;
			this.password = config.password;
			this.database = config.database;
			if (config.port)
				this.port = config.port;
		}

		async checkPulse() {

			const sequelize = new Sequelize(this.database, this.user, this.password, {
				host: this.host,
				dialect: 'mssql',
				operatorsAliases: false,

				pool: {
					max: 10,
					min: 0,
					acquire: 30000,
					idle: 10000
				},

			});

			let result;

			try {
				result = await sequelize.query(`select 1 as status`, {
					replacements: [],
					type: Sequelize.QueryTypes.SELECT,
					logging: console.log
				});
			}

			catch (e) {

				console.log(e);
				result = [{status: 0}];
			}

			return result[0].status || 0;
		}
	}
);

testClasses.set("mongo",
	class {
		constructor(credential) {
			this.credential = credential
		}

		async checkPulse() {

			const connectionString = `mongodb://${this.credential.user ? this.credential.user + ':' + this.credential.password + '@' : ''}${this.credential.host}:${this.credential.port || 27017}/${this.credential.db}`;

			try {
				let db = (await MongoClient.connect(connectionString, {useNewUrlParser: true})).db(this.credential.db);
				return 1;
			}
			catch (e) {
				console.log(e);
				return 0
			}
		}
	}
);

exports.schema = class extends API {

	async schema() {

		const authResponse = await auth.connection(this.request.query.id, this.user);
		this.assert(!authResponse.error, authResponse.message);


		const databases = [];

		let [connection] = await this.mysql.query("select * from tb_credentials where id = ?", [this.request.query.id]);

		if (!connection) {

			return "not found"
		}

		let columns;

		let selectQuery = `
			SELECT
				table_schema as table_schema,
				table_name as table_name,
				column_name as column_name,
				column_type as column_type
			FROM
				information_schema.columns `;

		switch (connection.type) {

			case "mysql":

				columns = await this.mysql.query(selectQuery, [], this.request.query.id);
				break;

			case "pgsql":

				columns = await this.pgsql.query(selectQuery.replace(/column_type/, "data_type"), [], this.request.query.id);
				break;

			case "mssql":
				columns = await this.mssql.query(selectQuery.replace(/table_schema/, "table_catalog").replace(/column_type/, "data_type"), [], this.request.query.id);
				break;


			case "mongo":
				const mongoSchema = new MongoScehma(connection);
				return await mongoSchema.mongoSchema();

			default:
				return [];
		}

		for (const column of columns) {

			if (column.table_schema == 'information_schema')
				continue;

			let foundDatabase = false;

			for (const database of databases) {
				if (database.name == column.table_schema)
					foundDatabase = true;
			}

			if (!foundDatabase) {

				const database = {
					name: column.table_schema,
					tables: []
				};

				databases.push(database);
			}

			for (const database of databases) {
				if (database.name == column.table_schema) {
					foundDatabase = database;
				}
			}


			let foundTable = false;

			for (const table of foundDatabase.tables) {
				if (table.name == column.table_name)
					foundTable = true;
			}

			if (!foundTable) {

				const table = {
					name: column.table_name,
					columns: []
				};

				foundDatabase.tables.push(table);
			}

			for (const table of foundDatabase.tables) {
				if (table.name == column.table_name) {
					foundTable = table;
				}
			}

			let foundColumns = false;

			for (const column of foundTable.columns) {
				if (column.name == column.column_name)
					foundColumns = true;
			}

			if (!foundColumns) {

				const columns = {
					name: column.column_name,
					type: column.column_type || column.data_type,
				};

				foundTable.columns.push(columns);
			}

			for (const column of foundTable.columns) {
				if (column.name == columns.column_name) {
					foundColumns = column;
				}
			}
		}

		return databases;
	}
};

class MongoScehma {

	constructor(credential) {

		this.credential = credential;
	}

	async mongoSchema() {

		const connectionString = `mongodb://${this.credential.user ? this.credential.user + ':' + this.credential.password + '@' : ''}${this.credential.host}:${this.credential.port || 27017}/${this.credential.db}`;
		const connection = (await MongoClient.connect(connectionString ,{useNewUrlParser: true})).db(this.credential.db);
		const collections = await connection.listCollections().toArray();

		const schemaPromiseList = [];

		for(const collection of collections) {

			schemaPromiseList.push(connection.collection(collection.name).findOne({}));
		}

		const schema = await commonFun.promiseParallelLimit(7, schemaPromiseList);

		const result = [{
			name: this.credential.db,
		}];

		const tables = [];

		for(const [index, collection] of collections.entries()) {


			let columns;

			try {

				columns = Object.keys(schema[index]).map(x => {

					return {
						name: x
					}
				});
			}

			catch(e) {

				columns = [];
			}

			tables.push({
				name: collection.name,
				columns,
			})
		}

		result[0].tables = tables;

		return result;
	}
}
