const API = require("../utils/api");

class Translations extends API {

	async insert({owner, owner_id, phrase = "", translation, locale_id}) {

		try {

			const [locale] = await this.mysql.query(`select * from tb_locales where id = ?`, [locale_id]);

			this.assert(locale, `The locale does not exist`);

			return await this.mysql.query(
				`INSERT INTO 
					tb_object_translations
					(
						owner,
						owner_id, 
						phrase, 
						translation, 
						locale_id,
						added_by,
						account_id
					)
				VALUES(?, ?, ?, ?, ?, ?, ?)`,
				[owner, owner_id, phrase, translation, locale_id, this.user.user_id, this.account.acocunt_id],
				"write"
			);
		}
		catch (e) {

			const [existingData] = await this.mysql.query(`
					SELECT
						phrase,
						translation
					FROM 
						tb_object_translations
					WHERE
						owner = ? 
						AND owner_id = ?
						AND phrase = ?
						AND locale_id = ?
						AND account_id = ?
				`,
				[owner, owner_id, phrase, locale_id, this.account, account_id]
			);

			return `Translation with ${existingData.phrase} to ${existingData.translation} already exists, please delete it first`;
		}
	}

	async update({id}) {

		let [existingData] = await this.mysql.query(`
			SELECT 
				o.* 
			FROM
				tb_object_translations o 
			JOIN 
				tb_locales l 
			ON
				l.id = o.locale_id 
			WHERE
				id = ?`,
			[id]
		);

		this.assert(existingData, "Data or locale does not exist for the translation you are trying to update");

		const fields = [
			'owner',
			'owner_id',
			'phrase',
			'translation',
			'locale_id'
		];

		const updateData = {};

		fields.forEach(x => updateData[x] = this.request.body.hasOwnProperty(x) ? this.request.body[x] : existingData[x]);

		try {
			await this.mysql.query(`
				UPDATE tb_object_transformations
				SET ? WHERE id = ?
				`,
				[updateData, id],
				"write"
			);
		}
		catch (e) {

			[existingData] = await this.mysql.query(`
					SELECT
						phrase,
						translation
					FROM
						tb_object_translations
					WHERE
						owner = ? 
						AND owner_id = ?
						AND phrase = ?
						AND locale_id = ?
						AND account_id = ?
				`[updateData.owner, updateData.owner_id, updateData.phrase, updateData.locale_id, this.account.account_id]
			);

			return `Translation with ${existingData.phrase} to ${existingData.translation} already exists, please delete it first`;
		}
	}

	async delete({id}) {

		return await this.mysql.query(
			`DELETE FROM tb_object_translations WHERE id = ? AND account_id = ?`,
			[id, this.account.account_id],
			"write"
		)
	}

	async list({owner = 0, owner_id = 0, phrase = "", locale_id = 0}) {

		return await this.mysql.query(`
			SELECT
				o.*, l.name
			FROM
				tb_object_translations o
			JOIN
				tb_locales l
			ON
				l.id = o.locale_id
			WHERE
				(owner = ? OR 0 = ?)
				AND (owner_id = ? OR 0 = ?)
				AND (phrase = ? OR "" = ?)
				AND (locale_id = ? OR 0 = ?)
				AND account_id = ?
			`,
			[owner, owner, owner_id, owner_id, phrase, phrase, locale_id, locale_id, account_id]);
	}
}

exports.insert = Translations;
exports.update = Translations;
exports.delete = Translations;
exports.list = Translations;