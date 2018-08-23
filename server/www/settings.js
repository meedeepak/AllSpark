const API = require("../utils/api");
const account = require('../onServerStart');
const commonFun = require("../utils/commonFunctions");

exports.insert = class extends API {

	async insert({profile, owner, value, account_id} = {}) {

		this.user.privilege.needs("administrator");

		this.assert(profile, "profile not found");
		this.assert(owner, "owner not found");
		this.assert(account_id, "account id not found");
		this.assert(commonFun.isJson(value), "Please send valid JSON");

		return await this.mysql.query(`
				INSERT INTO
					tb_settings
					(
						account_id,
						profile,
						owner,
						value
					)
				VALUES
					(?, ?, ?, ?)
				`,
			[account_id, profile, owner, value],
			"write");
	}
};

exports.update = class extends API {

	async update({id, value, profile} = {}) {

		this.user.privilege.needs("administrator");

		this.assert(id, "no id found to update");
		this.assert(commonFun.isJson(value), "Please send valid JSON");

		await account.loadAccounts();

		return await this.mysql.query(
			"UPDATE tb_settings SET profile = ?, value = ? WHERE id = ?",
			[profile || null, value, id],
			"write"
		);
	}
};


exports.delete = class extends API {

	async delete({id} = {}) {

		this.user.privilege.needs("administrator");

		this.assert(id, "no id found to delete");

		await account.loadAccounts();

		return await this.mysql.query("DELETE FROM tb_settings WHERE id = ?", [id], "write");
	}
};

exports.list = class extends API {

	async list({account_id} = {}) {

		this.user.privilege.needs("administrator");

		this.assert(account_id, 'No account id found');

		const settingsList = await this.mysql.query("select * from tb_settings where account_id = ?", [account_id]);

		for(const row of settingsList) {
			try {
				row.value = JSON.parse(row.value);
			}
			catch(e) {}
		}

		await account.loadAccounts();

		return settingsList;
	}
};

