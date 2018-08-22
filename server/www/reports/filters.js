const API = require('../../utils/api');
const auth = require('../../utils/auth');
const reportHistory = require('../../utils/reportLogs');

class Filters {

	async insert({name, query_id, placeholder, description, order = 0, default_value = '', offset, type, dataset, multiple} = {}) {

		let values = {
			name, query_id, placeholder, type, multiple,
			default_value: default_value || null,
			description: description || null,
			order: order || null,
			offset: offset || null,
			dataset: dataset || null,
		};

		if((await auth.report(query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

		return await this.mysql.query('INSERT INTO tb_query_filters SET  ?', [values], 'write');
	}

	async update({filter_id, name, placeholder, description, order, default_value, offset, type, dataset, multiple} = {}) {

		let
			values = {
				name, placeholder, type, multiple,
				default_value: default_value || null,
				description: description || null,
				order: order || null,
				offset: offset || null,
				dataset: dataset || null,
			},
			[filterQuery] = await this.mysql.query('SELECT * FROM tb_query_filters WHERE filter_id = ?', [filter_id]),
			compareJson = {};

		this.assert(filterQuery, 'Invalid filter id');

		if((await auth.report(filterQuery.query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

		for(const key in values) {

			compareJson[key] = filterQuery[key] == null ? null : filterQuery[key].toString();
		}

		if(JSON.stringify(compareJson) == JSON.stringify(values)) {

			return "0 rows affected";
		}

		values.default_value = values.default_value || '';

		const
			updateResponse = await this.mysql.query('UPDATE tb_query_filters SET ? WHERE filter_id = ?', [values, filter_id], 'write'),
			logs = {
				query_id: filterQuery.query_id,
				owner: 'filter',
				owner_id: filter_id,
				value: JSON.stringify(filterQuery),
				operation:'update',
			};

		reportHistory.insert(this, logs);

		return updateResponse;
	}

	async delete({filter_id} = {}) {

		const [filterQuery] = await this.mysql.query('SELECT * FROM tb_query_filters WHERE filter_id = ?', [filter_id]);

		this.assert(filterQuery, 'Invalid filter id');

		if((await auth.report(filterQuery.query_id, this.user)).error)
			throw new API.Exception(404, 'User not authenticated for this report');

		const
			deleteResponse = await this.mysql.query('DELETE FROM tb_query_filters WHERE filter_id = ?', [filter_id], 'write'),
			logs = {
				query_id: filterQuery.query_id,
				owner: 'filter',
				owner_id: filter_id,
				value: JSON.stringify(filterQuery),
				operation:'delete',
			};

		reportHistory.insert(this, logs);

		return deleteResponse;
	}

}

exports.insert = Filters;
exports.update = Filters;
exports.delete = Filters;