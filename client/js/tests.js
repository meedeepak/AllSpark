Page.class = class Tests extends Page {

	constructor() {

		super();

		this.sections = new Map;

		this.container.run = this.container.querySelector('#list .toolbar #run');
		this.container.run.on('click', () => this.run());

		this.load();

		Sections.show('list');
	}

	async load() {

		if(!this.user.privileges.has('superadmin')) {
			throw new Page.exception('Only superadmins can run tests.');
		}

		const environment = await API.call('environment/about');

		if(['production', 'staging'].includes(environment.name)) {
			throw new Page.exception('Tests cannot be run on production or staging.');
		}

		await this.process();

		this.render();
	}

	async process() {

		this.users = [
			{
				name: 'Current User',
				token: await Storage.get('token'),
			},
			{
				name: 'Current User',
				token: await Storage.get('token'),
			},
		];

		for(const key in tests) {
			this.sections.set(key, new TestSection(key, tests[key], this));
		}
	}

	render() {

		const container = this.container.querySelector('#list #tests');

		container.textContent = null;

		for(const section of this.sections.values()) {
			container.appendChild(section.container);
		}

		this.progress();
	}

	async run() {

		this.group_id = Math.floor(Math.random() * 10000000);
		this.scope = 'complete';

		for(const section of this.sections.values()) {
			section.reset();
		}

		for(const section of this.sections.values()) {
			await section.run();
		}
	}

	progress() {

		const
			container = this.container.querySelector('.toolbar #progress'),
			meter = container.querySelector('meter'),
			NA = container.querySelector('.NA'),
			total = this.container.querySelectorAll('.test').length,
			passed = this.container.querySelectorAll('.test.passed').length,
			failed = this.container.querySelectorAll('.test.failed').length;

		NA.innerHTML = `
			<span>Total: <strong>${Format.number(total)}</strong></span>
			<span>Passed: <strong>${Format.number(passed)}</strong></span>
			<span>Failed: <strong>${Format.number(failed)}</strong></span>
		`;

		meter.max = total;
		meter.value = passed;
	}
}

class TestSection extends Map {

	constructor(name, section, tests) {

		super();

		this.name = name;
		this.tests = tests;

		for(const key in section) {
			this.set(key, new section[key](key, this));
		}
	}

	get container() {

		if(this.containerElement) {
			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('section');

		container.innerHTML = `
			<h2>${this.name}</h2>
			<table>
				<thead>
					<tr>
						<th class="action name">Test</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		`;

		const
			h2 = container.querySelector('h2'),
			thead = container.querySelector('thead tr'),
			tbody = container.querySelector('tbody');

		h2.on('dblclick', () => {

			this.tests.group_id = Math.floor(Math.random() * 10000000);
			this.tests.scope = 'section';

			this.run();
		});

		for(const user of this.tests.users) {
			thead.insertAdjacentHTML('beforeend', `<th>${user.name}</th>`);
		}

		for(const test of this.values()) {
			tbody.appendChild(test.row);
		}

		if(!this.size) {
			tbody.innerHTML = '<tr class="NA"><td>No Tests Found</td></tr>';
		}

		return container;
	}

	reset() {

		for(const test of this.values()) {
			test.reset();
		}
	}

	async run() {

		for(const test of this.values()) {
			await test.run();
		}
	}
}

class Test {

	constructor(name, section) {

		this.name = name;
		this.section = section;

		this.users = new Set(this.section.tests.users.map(user => new TestUser(user, this)));
	}

	assert(condition) {

		if(!condition) {
			throw new Test.exception();
		}
	}

	get row() {

		if(this.containerElement) {
			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('tr');

		container.innerHTML = `
			<th class="action name">${this.name}</th>
		`;

		container.querySelector('.name').on('click', () => {

			const
				dialogBox = new DialogBox(),
				codeEditor = new CodeEditor({mode: 'javascript'});

			let body = this.execute.toString();

			dialogBox.heading = `${this.section.name} &nbsp; <i class="fas fa-angle-right"></i> &nbsp; ${this.name}`;

			dialogBox.body.classList.add('test-info');

			dialogBox.body.innerHTML = `
				<table class="static">
					<tbody>
						<tr>
							<th>Section</th>
							<td>${this.section.name}</td>
						</tr>
						<tr>
							<th>Name</th>
							<td>${this.name}</td>
						</tr>
						<tr>
							<th>Test</th>
							<td class="code"></td>
						</tr>
					</tbody>
				</table>
			`;

			body = body.replace('async execute() {', 'async function execute() {');
			body = body.replace(new RegExp('\n\t\t\t', 'g'), '\n');

			codeEditor.value = body;
			dialogBox.body.querySelector('.code').appendChild(codeEditor.container);

			dialogBox.show();
		});

		for(const testUser of this.users) {
			container.appendChild(testUser.cell);
		}

		return container;
	}

	reset() {

		for(const element of this.row.querySelectorAll('.test')) {
			element.classList.remove('passed', 'failed', 'executing');
		}
	}

	async run() {

		for(const user of this.users) {
			await user.run();
		}
	}
}

Test.exception = class extends Page.exception {}

class TestUser {

	constructor(user, test) {

		Object.assign(this, user);

		this.test = test;
	}

	get cell() {

		if(this.containerElement) {
			return this.containerElement;
		}

		const container = this.containerElement = document.createElement('td');

		container.classList.add('test');

		container.on('dblclick', () => {

			this.test.section.tests.group_id = Math.floor(Math.random() * 10000000);
			this.test.section.tests.scope = 'test';

			this.run();
		});
		container.on('click', () => setTimeout(this.show(), 300));

		return container;
	}

	async run() {

		if(this.test.section.tests.container.run.disabled) {
			return;
		}

		this.test.section.tests.container.run.disabled = true;

		const start = Date.now();

		this.cell.classList.remove('failed', 'passed');
		this.cell.classList.add('running');

		this.failed = false;

		const
			dialogBox = DialogBox.container,
			snackBar = SnackBar.container['bottom-left'],
			notificationBar = NotificationBar.container;

		for(const test of this.test.disabledModules || []) {

			if(test == 'DialogBox') {
				DialogBox.container = document.createElement('div');
			}

			else if(test == 'SnackBar') {
				SnackBar.container['bottom-left'] = document.createElement('div');
			}

			else if(test == 'NotificationBar') {
				NotificationBar.container =  document.createElement('div');
			}
		}

		try {

			await this.test.execute();

			this.response = 'Passed';
		}
		catch(e) {

			this.response = {
				message: e && e.message || e,
				stack: e && e.stack || '',
			};

			this.failed = true;
		}

		this.duration = Date.now() - start;

		this.cell.classList.remove('running');
		this.cell.classList.add(this.failed ? 'failed' : 'passed');

		this.test.section.tests.progress();

		const
			parameter = {
				section: this.test.section.name,
				test: this.test.name,
				executed_as: page.user.user_id,
				time: this.duration,
				result: this.failed ? 'Failed' : 'Passed',
				response: JSON.stringify(this.response),
				group_id: this.test.section.tests.group_id,
				scope: this.test.section.tests.scope,
			},
			options = {
				method: 'POST',
			};

		await API.call('tests/logs/save', parameter, options);

		for(const test of this.test.disabledModules || []) {

			if(test == 'DialogBox') {
				DialogBox.container = dialogBox;
			}

			else if(test == 'SnackBar') {
				SnackBar.container['bottom-left'] = snackBar;
			}

			else if(test == 'NotificationBar') {
				NotificationBar.container =  notificationBar;
			}
		}

		this.test.section.tests.container.run.disabled = false;
	}

	show() {

		if(!this.response) {
			return;
		}

		if(!this.dialogBox) {
			this.dialogBox = new DialogBox();
		}

		if(!this.codeEditor) {
			this.codeEditor = new CodeEditor({mode: 'json'});
		}

		this.dialogBox.heading = `
			${this.test.section.name} &nbsp;
			<i class="fas fa-angle-right"></i> &nbsp;
			${this.test.name} &nbsp;
			<i class="fas fa-angle-right"></i> &nbsp;
			${this.name}
		`;

		this.dialogBox.body.classList.add('test-description');

		this.codeEditor.value = JSON.stringify(this.response, 0, 1);

		this.dialogBox.body.innerHTML = `
			<table class="static">
				<tbody>
					<tr>
						<th>Duration</th>
						<td>${Format.number(this.duration / 1000)}s</th>
					</tr>
					<tr>
						<th>Status</th>
						<td>${this.failed ? 'Failed' : 'Passed'}</th>
					</tr>
					<tr>
						<th>User</th>
						<td>${this.name}</th>
					</tr>
					<tr>
						<th>Token</th>
						<td>${this.token.body.slice(0, 25)}&hellip;${this.token.body.slice(-25)}</th>
					</tr>
					<tr>
						<th>Response</th>
						<td class="response"></th>
					</tr>
				</tbody>
			</table>
		`;

		this.dialogBox.body.querySelector('.response').appendChild(this.codeEditor.container);

		this.dialogBox.show();
	}
}

const tests = {

	Requests: {

		AJAX: class RequestsAJAX extends Test {

			async execute() {

				this.assert(await AJAX.call('data:text/plain;charset=utf-8;base64,YQ==') == 'a')
			}
		},

		API: class RequestsAJAX extends Test {

			async execute() {

				this.assert((await API.call('tests/test') == 'a'))
			}
		},
	},

	'Storage.Storage': {

		SetGet: class StorageStorageSetGet extends Test {

			async execute() {

				await Storage.delete('test');

				await Storage.set('test', 'a');

				this.assert(await Storage.get('test') == 'a');

				await Storage.delete('test');
			}
		},

		Delete: class StorageStorageDelete extends Test {

			async execute() {

				await Storage.set('test', 'a');

				await Storage.delete('test');

				this.assert(await Storage.get('test') != 'a')
			}
		},

		Has: class StorageStorageHas extends Test {

			async execute() {

				await Storage.delete('test');

				await Storage.set('test', 'a');

				this.assert(await Storage.has('test'));

				await Storage.delete('test');
			}
		},
	},

	'Storage.IndexedDb': {

		SetGet: class StorageIndexedDbSetGet extends Test {

			async execute() {

				await IndexedDb.instance.delete('test');

				await IndexedDb.instance.set('test', 'a');

				this.assert(await IndexedDb.instance.get('test') == 'a');

				await IndexedDb.instance.delete('test');
			}
		},

		Delete: class StorageIndexedDbDelete extends Test {

			async execute() {

				await IndexedDb.instance.set('test', 'a');

				await IndexedDb.instance.delete('test');

				this.assert(await IndexedDb.instance.get('test') != 'a')
			}
		},

		Has: class StorageIndexedDbHas extends Test {

			async execute() {

				await IndexedDb.instance.delete('test');

				await IndexedDb.instance.set('test', 'a');

				this.assert(await IndexedDb.instance.has('test'));

				await IndexedDb.instance.delete('test');
			}
		},
	},

	'Storage.Cookies': {

		SetGet: class StorageCookiesSetGet extends Test {

			async execute() {

				Cookies.set('test', 'a');

				this.assert(Cookies.get('test') == 'a');

				Cookies.set('test', '');
			}
		},

		Has: class StorageCookiesHas extends Test {

			async execute() {

				Cookies.set('test', 'a');

				this.assert(Cookies.has('test'));

				Cookies.set('test', '');
			}
		},
	},

	CodeEditor: {

		Construction: class CodeEditorConstruction extends Test {

			async execute() {

				new CodeEditor();
			}
		},

		SetGetValue: class CodeEditorSetGetValue extends Test {

			async execute() {

				const editor = new CodeEditor();

				editor.container;

				editor.value = 'a';

				this.assert(editor.value == 'a')
			}
		},
	},

	DialogBox: {

		ShowHide: class DialogBoxShowHide extends Test {

			get disabledModules() {
				return [
					'DialogBox',
				];
			}

			async execute() {

				const dialogBox = new DialogBox();

				dialogBox.show();
				dialogBox.hide();
			}
		},

		SetHeadingBody: class DialogBoxSetHeadingBody extends Test {

			get disabledModules() {
				return [
					'DialogBox',
				];
			}

			async execute() {

				const dialogBox = new DialogBox();

				dialogBox.heading = 'a';
				dialogBox.body.textContent = 'a';

				dialogBox.show();
				dialogBox.hide();
			}
		},
	},

	SnackBar: {

		ShowHide: class SnackBarShowHide extends Test {

			get disabledModules() {
				return [
					'SnackBar',
				];
			}

			async execute() {

				const snackbar = new SnackBar({message: 'a'});

				snackbar.show();
				snackbar.hide();
			}
		},
	},

	NotificationBar: {

		ShowHide: class NotificationBarShowHide extends Test {

			get disabledModules() {
				return [
					'NotificationBar',
				];
			}

			async execute() {

				const notificationBar = new NotificationBar({ message: 'Test', type: 'success', allowClose: true});

				notificationBar.hide();
			}
		},
	},

	ServiceWorker: {

		message: class SnackBarShowHide extends Test {

			async execute() {

				this.assert(await page.serviceWorker.message('test') == 'test response');
			}
		},
	},

	'Format.Ago': {

		InvalidDate: class InvalidDate extends Test {

			async execute() {

				const string = Format.ago('2018-08-29 29:36:08');

				this.assert(string == 'Invalid Date');
			}
		},

		FutureDate: class FutureDate extends Test {

			async execute() {

				//added 1 day to today to check future case.

				const date = new Date(Date.now() + (60 * 60 * 1000 * 24));

				const string = Format.ago(date);

				this.assert(string == '');
			}
		},

		Justnow: class Justnow extends Test {

			async execute() {

				const date = new Date(Date.now() - 4000);

				const string = Format.ago(date);

				this.assert(string == 'Just Now');
			}
		},

		SecondsAgo: class SecondsAgo extends Test {

			async execute() {

				const date = new Date(Date.now() - 10000);

				const string = Format.ago(date);

				this.assert(string == '10 seconds ago');
			}
		},

		minutesAgo: class minutesAgo extends Test {

			async execute() {

				const date = new Date(Date.now() - (60000 * 5));

				const string = Format.ago(date);

				this.assert(string == '5 minutes ago');
			}
		},

		hoursAgo: class hoursAgo extends Test {

			async execute() {

				const date = new Date(Date.now() - (3600000 * 5));

				const string = Format.ago(date);

				this.assert(string == '5 hours ago');
			}
		},

		daysAgo: class daysAgo extends Test {

			async execute() {

				const date = new Date(Date.now() - (86400000 * 5));

				const string = Format.ago(date);

				this.assert(string == '5 days ago');
			}
		},

		weeksAgo: class weeksAgo extends Test {

			async execute() {

				const date = new Date(Date.now() - (86400000 * 15));

				const string = Format.ago(date);

				this.assert(string == '2 weeks ago');
			}
		},

		yearAgo: class yearAgo extends Test {

			async execute() {

				const date = new Date(Date.now() - (86400000 * 365));

				const string = Format.ago(date);

				this.assert(string == 'A year ago');
			}
		},

		monthsAgo: class monthsAgo extends Test {

			async execute() {

				const date = new Date(Date.now() - (86400000 * 40));

				const string = Format.ago(date);

				this.assert(string == 'A month ago');
			}
		},
	},

	SettingsManager: {

		Load: class SettingsManagerLoad extends Test {

			async execute() {

				const settings_json = [
					{
						key: 'test',
						type: 'url',
						name: 'test',
					},
				];

				const settingsManger = new SettingsManager({
					owner: 'user',
					owner_id: user.user_id,
					format: settings_json,
					disable_aside: false,
				});

				await settingsManger.load();
			}
		},

		Add: class SettingsManagerProfileAdd extends Test {

			async execute() {

				const settings_json = [
					{
						key: 'test',
						type: 'url',
						name: 'test',
					},
				];

				const settingsManger = new SettingsManager({
					owner: 'user',
					owner_id: user.user_id,
					format: settings_json,
					disable_aside: false,
				});

				await settingsManger.load();

				const string = 'test' + Math.random();

				settingsManger.container.querySelector('aside form').profile.value = string;

				await settingsManger.add();

				this.assert(Array.from(settingsManger.profiles.values()).some(s => s.profile.includes(string)));
			}
		},

		Delete: class SettingsManagerProfileDelete extends Test {

			async execute() {

				const settings_json = [
					{
						key: 'test',
						type: 'url',
						name: 'test',
					},
				];

				const settingsManger = new SettingsManager({
					owner: 'user',
					owner_id: user.user_id,
					format: settings_json,
					disable_aside: false,
				});

				await settingsManger.load();

				const string = 'test' + Math.random();

				settingsManger.container.querySelector('aside form').profile.value = string;

				await settingsManger.add();

				await Array.from(settingsManger.profiles.values()).filter(s => s.profile.includes(string))[0].delete();

				this.assert(!Array.from(settingsManger.profiles.values()).filter(s => s.profile.includes(string)).length);
			}
		},
	},

	ObjectRoles: {

		Load: class ObjectRolesLoad extends Test {

			get disabledModules() {
				return [
					'SnackBar',
				];
			}

			async execute() {

				const objectRoles = new ObjectRoles('user', 100);

				await objectRoles.load();
			}
		},

		Render: class ObjectRolesRender extends Test {

			get disabledModules() {
				return [
					'SnackBar',
				];
			}

			async execute() {

				const objectRoles = new ObjectRoles('user', 100);

				await objectRoles.load();

				objectRoles.container;
			}
		},

		AddUser: class ObjectRolesAddUser extends Test {

			get disabledModules() {
				return [
					'SnackBar',
				];
			}

			async execute() {

				const objectRoles = new ObjectRoles('user', 100);

				await objectRoles.load();

				objectRoles.container;

				objectRoles.multiSelect.value = objectRoles.multiSelect.datalist[0].value;

				await objectRoles.insert();
			}
		},

		Delete: class ObjectRolesDelete extends Test {

			get disabledModules() {
				return [
					'SnackBar',
				];
			}

			async execute() {

				const objectRoles = new ObjectRoles('user', 100);

				await objectRoles.load();

				objectRoles.container;

				objectRoles.multiSelect.value = objectRoles.multiSelect.datalist[0].value;

				await objectRoles.insert();

				objectRoles.container.querySelector('table td.action.red').click();
			}
		},
	},

	Reports: {

		LoadList: class ReportsLoadList extends Test {

			async execute() {

				await DataSource.load();
			}
		},

		Construction: class ReportsConstruction extends Test {

			async execute() {

				await DataSource.load(true);

				new DataSource(Array.from(DataSource.list.values())[0]);
			}
		},

		Container: class ReportsConstruction extends Test {

			async execute() {

				await DataSource.load();

				const report = new DataSource(Array.from(DataSource.list.values())[0]);

				report.container;
			}
		},

		Load: class ReportsConstruction extends Test {

			async execute() {

				await DataSource.load();

				const report = new DataSource(Array.from(DataSource.list.values())[0]);

				report.container;

				await report.visualizations.selected.load();
			}
		},
	},
};